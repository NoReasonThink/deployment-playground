import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import {
  addEdge,
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import './App.css'
import { TermHelp } from './components/TermHelp'
import { nodeParameterBounds } from './config/guardrails'
import { eventTemplates } from './data/events'
import { type GlossaryTermKey } from './data/glossary'
import { buildNodeData, paletteItems } from './data/catalog'
import { scenarios } from './data/scenarios'
import { topologyTemplates } from './data/templates'
import { validateConnection } from './engine/connectionRules'
import {
  createDebugStateSnapshot,
  nextReplayFrame,
  readDebugSnapshots,
  removeDebugSnapshot,
  saveDebugSnapshot,
  summarizeProfilerSamples,
  type DebugStateSnapshot,
} from './engine/debugTools'
import { createEventInstance, reduceActiveEvents } from './engine/events'
import { applyHeatmapStyle, type HeatmapMetric } from './engine/heatmap'
import { executeOrchestrationTick, type RuntimeOrchestrationPlan } from './engine/orchestration'
import { generatePostmortemReport } from './engine/postmortem'
import { readDraftState, saveDraftState } from './engine/draft'
import { createSeededRandom, hashSeed } from './engine/random'
import {
  evaluateScenario,
  isScenarioUnlocked,
  readScenarioProgress,
  saveScenarioProgress,
  updateScenarioProgress,
} from './engine/scenarioProgress'
import { changeSchedulerSpeed, nextSchedulerTick, resetScheduler, toggleScheduler } from './engine/scheduler'
import {
  buildSnapshotsExportContent,
  mergeSnapshots,
  parseSnapshotsImportContent,
  readSnapshots,
  removeSnapshot,
  saveSnapshot,
} from './engine/snapshots'
import { computeScoreCard } from './engine/scoring'
import { simulateTick } from './engine/simulate'
import { readUserTemplates, removeUserTemplate, saveUserTemplate } from './engine/templateMarket'
import { buildTraceSegments } from './engine/trace'
import { computeQps } from './engine/traffic'
import { usePlaygroundStore } from './store/usePlaygroundStore'
import type {
  ActiveEvent,
  ArchitectureSnapshot,
  NodeKind,
  OrchestrationMode,
  PlaygroundNode,
  ScenarioDefinition,
  ScenarioProgress,
  SchedulerState,
  SimulationMetrics,
  TopologyTemplate,
  TrafficPattern,
} from './types'

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

const componentTermKeyByKind: Record<NodeKind, GlossaryTermKey> = {
  cdn: 'component.cdn',
  'load-balancer': 'component.load-balancer',
  'api-gateway': 'component.api-gateway',
  waf: 'component.waf',
  'rate-limiter': 'component.rate-limiter',
  'circuit-breaker': 'component.circuit-breaker',
  'service-mesh': 'component.service-mesh',
  observability: 'component.observability',
  tracing: 'component.tracing',
  iam: 'component.iam',
  'object-storage': 'component.object-storage',
  web: 'component.web',
  service: 'component.service',
  redis: 'component.redis',
  mq: 'component.mq',
  database: 'component.database',
  search: 'component.search',
}

const eventTermKeyById: Partial<Record<string, GlossaryTermKey>> = {
  'traffic-spike': 'event.traffic-spike',
  'hot-key': 'event.hot-key',
  'cdn-origin-fail': 'event.cdn-origin-fail',
  'redis-eviction-storm': 'event.redis-eviction-storm',
  'deploy-regression': 'event.deploy-regression',
  'cert-expired': 'event.cert-expired',
  'manual-scale-delay': 'event.manual-scale-delay',
  'region-a-partition': 'event.region-a-partition',
  'canary-regression': 'event.canary-regression',
  'kms-rotation-failure': 'event.kms-rotation-failure',
}

function App() {
  const termLabel = (text: string, key: GlossaryTermKey) => (
    <span className="term-label">
      {text}
      <TermHelp termKey={key} />
    </span>
  )
  const [scenarioId, setScenarioId] = useState<ScenarioDefinition['id']>(scenarios[0].id)
  const selectedScenario = useMemo(
    () => scenarios.find((scenario) => scenario.id === scenarioId) ?? scenarios[0],
    [scenarioId],
  )
  const [nodes, setNodes, onNodesChange] = useNodesState<PlaygroundNode>(selectedScenario.nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(selectedScenario.edges)
  const [fixedQps, setFixedQps] = useState(selectedScenario.fixedQps)
  const [search, setSearch] = useState('')
  const [selectedTemplateId, setSelectedTemplateId] = useState(topologyTemplates[0].id)
  const [selectedEventId, setSelectedEventId] = useState(eventTemplates[0].id)
  const [orchestrationMode, setOrchestrationMode] = useState<OrchestrationMode>('serial')
  const [orchestrationProbability, setOrchestrationProbability] = useState(0.6)
  const [orchestrationStartTick, setOrchestrationStartTick] = useState('3')
  const [orchestrationEndTick, setOrchestrationEndTick] = useState('30')
  const [stagedEventIds, setStagedEventIds] = useState<string[]>([])
  const [orchestrationPlans, setOrchestrationPlans] = useState<RuntimeOrchestrationPlan[]>([])
  const [trafficPattern, setTrafficPattern] = useState<TrafficPattern>('constant')
  const [scheduler, setScheduler] = useState<SchedulerState>(resetScheduler(1))
  const [activeEvents, setActiveEvents] = useState<ActiveEvent[]>([])
  const [eventLogs, setEventLogs] = useState<string[]>([])
  const [faultSeed, setFaultSeed] = useState('20260309')
  const [seedCycle, setSeedCycle] = useState(0)
  const [batchCapacity, setBatchCapacity] = useState('')
  const [batchLatency, setBatchLatency] = useState('')
  const [heatMetric, setHeatMetric] = useState<HeatmapMetric>('cpu')
  const [rightTab, setRightTab] = useState<'node' | 'observe' | 'events' | 'report'>('node')
  const [scenarioProgress, setScenarioProgress] = useState<ScenarioProgress>({})
  const [snapshots, setSnapshots] = useState<ArchitectureSnapshot[]>([])
  const [userTemplates, setUserTemplates] = useState<TopologyTemplate[]>([])
  const [snapshotName, setSnapshotName] = useState('')
  const [debugSnapshotName, setDebugSnapshotName] = useState('')
  const [debugSnapshots, setDebugSnapshots] = useState<DebugStateSnapshot[]>([])
  const [profileSamples, setProfileSamples] = useState<number[]>([])
  const [replayLines, setReplayLines] = useState<string[]>([])
  const [replayCursor, setReplayCursor] = useState(0)
  const [replayRunning, setReplayRunning] = useState(false)
  const [userTemplateName, setUserTemplateName] = useState('')
  const [compareBaseId, setCompareBaseId] = useState('')
  const [compareTargetId, setCompareTargetId] = useState('')
  const [connectHint, setConnectHint] = useState('连接节点定义流量路径，点击“开始”运行连续仿真。')
  const [metrics, setMetrics] = useState<SimulationMetrics>({
    qps: fixedQps,
    p95LatencyMs: 0,
    p99LatencyMs: 0,
    errorRate: 0,
    availability: 100,
  })
  const [bottlenecks, setBottlenecks] = useState<string[]>([])
  const setCanvasLayer = usePlaygroundStore((state) => state.setCanvasLayer)
  const setSimulationLayer = usePlaygroundStore((state) => state.setSimulationLayer)
  const setMonitorLayer = usePlaygroundStore((state) => state.setMonitorLayer)
  const setScenarioLayer = usePlaygroundStore((state) => state.setScenarioLayer)
  const idRef = useRef(1000)
  const nodesRef = useRef<PlaygroundNode[]>(nodes)
  const edgesRef = useRef<Edge[]>(edges)
  const activeEventsRef = useRef<ActiveEvent[]>(activeEvents)
  const orchestrationPlansRef = useRef<RuntimeOrchestrationPlan[]>(orchestrationPlans)
  const schedulerRef = useRef<SchedulerState>(scheduler)
  const skipScenarioResetRef = useRef(false)
  const snapshotImportInputRef = useRef<HTMLInputElement>(null)
  const replayCursorRef = useRef(0)
  const rngRef = useRef(createSeededRandom(hashSeed('20260309:0')))
  const selectedNodes = useMemo(() => nodes.filter((node) => node.selected), [nodes])
  const primarySelectedNode = selectedNodes[0]
  const heatmapNodes = useMemo(() => applyHeatmapStyle(nodes, heatMetric), [nodes, heatMetric])
  const heatmapRows = useMemo(
    () =>
      [...nodes]
        .sort((a, b) => {
          const av = Number(a.data[heatMetric] ?? 0)
          const bv = Number(b.data[heatMetric] ?? 0)
          return bv - av
        })
        .slice(0, 8),
    [heatMetric, nodes],
  )
  const traceSegments = useMemo(() => buildTraceSegments(nodes, edges), [edges, nodes])
  const allTemplates = useMemo(
    () => [...topologyTemplates, ...userTemplates],
    [userTemplates],
  )
  const selectedTemplate = useMemo(
    () => allTemplates.find((item) => item.id === selectedTemplateId) ?? allTemplates[0],
    [allTemplates, selectedTemplateId],
  )
  const isSelectedUserTemplate = useMemo(
    () => userTemplates.some((item) => item.id === selectedTemplateId),
    [selectedTemplateId, userTemplates],
  )
  const scoreCard = useMemo(
    () => computeScoreCard(nodes, metrics, activeEvents, selectedScenario.scoreWeights),
    [activeEvents, metrics, nodes, selectedScenario.scoreWeights],
  )
  const scenarioEvaluation = useMemo(
    () => evaluateScenario(selectedScenario, metrics, scoreCard),
    [metrics, scoreCard, selectedScenario],
  )
  const unlockedScenarioIds = useMemo(
    () =>
      new Set(
        scenarios.filter((scenario) => isScenarioUnlocked(scenario, scenarioProgress)).map((scenario) => scenario.id),
      ),
    [scenarioProgress],
  )
  const postmortem = useMemo(
    () => generatePostmortemReport(selectedScenario.name, metrics, bottlenecks, scoreCard, activeEvents, nodes),
    [activeEvents, bottlenecks, metrics, nodes, scoreCard, selectedScenario.name],
  )
  const snapshotById = useMemo(
    () => new Map(snapshots.map((snapshot) => [snapshot.id, snapshot])),
    [snapshots],
  )
  const compareBase = compareBaseId ? snapshotById.get(compareBaseId) : undefined
  const compareTarget = compareTargetId ? snapshotById.get(compareTargetId) : undefined
  const compareRows = useMemo(() => {
    if (!compareBase || !compareTarget) {
      return []
    }
    const metricsRows = [
      { label: 'QPS', base: compareBase.result.metrics.qps, target: compareTarget.result.metrics.qps, unit: '' },
      { label: 'P95', base: compareBase.result.metrics.p95LatencyMs, target: compareTarget.result.metrics.p95LatencyMs, unit: 'ms' },
      { label: 'P99', base: compareBase.result.metrics.p99LatencyMs, target: compareTarget.result.metrics.p99LatencyMs, unit: 'ms' },
      { label: 'Error', base: compareBase.result.metrics.errorRate, target: compareTarget.result.metrics.errorRate, unit: '%' },
      { label: 'Availability', base: compareBase.result.metrics.availability, target: compareTarget.result.metrics.availability, unit: '%' },
      { label: 'Cost', base: compareBase.result.estimatedCost, target: compareTarget.result.estimatedCost, unit: '' },
      { label: 'Score', base: compareBase.result.totalScore, target: compareTarget.result.totalScore, unit: '' },
      { label: 'Nodes', base: compareBase.nodes.length, target: compareTarget.nodes.length, unit: '' },
      { label: 'Edges', base: compareBase.edges.length, target: compareTarget.edges.length, unit: '' },
    ]
    return metricsRows.map((row) => {
      const delta = Number((row.target - row.base).toFixed(2))
      const deltaPrefix = delta > 0 ? '+' : ''
      return {
        ...row,
        delta,
        deltaText: `${deltaPrefix}${delta}${row.unit}`,
      }
    })
  }, [compareBase, compareTarget])
  const profileSummary = useMemo(() => summarizeProfilerSamples(profileSamples), [profileSamples])
  const replaySourceLogs = useMemo(() => [...eventLogs].reverse(), [eventLogs])

  useEffect(() => {
    nodesRef.current = nodes
  }, [nodes])

  useEffect(() => {
    edgesRef.current = edges
  }, [edges])

  useEffect(() => {
    activeEventsRef.current = activeEvents
  }, [activeEvents])

  useEffect(() => {
    orchestrationPlansRef.current = orchestrationPlans
  }, [orchestrationPlans])

  useEffect(() => {
    schedulerRef.current = scheduler
  }, [scheduler])

  useEffect(() => {
    setScenarioProgress(readScenarioProgress())
  }, [])

  useEffect(() => {
    rngRef.current = createSeededRandom(hashSeed(`${faultSeed}:${seedCycle}`))
  }, [faultSeed, seedCycle])

  useEffect(() => {
    const draft = readDraftState()
    if (!draft) {
      return
    }
    const matchedScenario = scenarios.find((item) => item.id === draft.scenarioId)
    if (!matchedScenario) {
      return
    }
    skipScenarioResetRef.current = true
    setScenarioId(draft.scenarioId)
    setNodes(draft.nodes.map((node) => ({ ...node, data: { ...node.data }, position: { ...node.position } })))
    setEdges(draft.edges.map((edge) => ({ ...edge })))
    setFixedQps(draft.fixedQps)
    setConnectHint('已恢复最近一次草稿。')
  }, [setEdges, setNodes])

  useEffect(() => {
    setSnapshots(readSnapshots())
  }, [])

  useEffect(() => {
    setDebugSnapshots(readDebugSnapshots())
  }, [])

  useEffect(() => {
    setUserTemplates(readUserTemplates())
  }, [])

  useEffect(() => {
    if (!allTemplates.some((item) => item.id === selectedTemplateId)) {
      setSelectedTemplateId(allTemplates[0]?.id ?? topologyTemplates[0].id)
    }
  }, [allTemplates, selectedTemplateId])

  useEffect(() => {
    if (snapshots.length === 0) {
      setCompareBaseId('')
      setCompareTargetId('')
      return
    }
    if (!snapshotById.has(compareBaseId)) {
      setCompareBaseId(snapshots[0].id)
    }
    if (!snapshotById.has(compareTargetId)) {
      setCompareTargetId(snapshots[1]?.id ?? snapshots[0].id)
    }
  }, [compareBaseId, compareTargetId, snapshotById, snapshots])

  useEffect(() => {
    saveScenarioProgress(scenarioProgress)
  }, [scenarioProgress])

  useEffect(() => {
    if (!unlockedScenarioIds.has(scenarioId)) {
      const fallback = scenarios.find((scenario) => unlockedScenarioIds.has(scenario.id)) ?? scenarios[0]
      setScenarioId(fallback.id)
    }
  }, [scenarioId, unlockedScenarioIds])

  useEffect(() => {
    saveDraftState({
      savedAt: Date.now(),
      scenarioId,
      fixedQps,
      nodes: nodes.map((node) => ({ ...node, data: { ...node.data }, position: { ...node.position } })),
      edges: edges.map((edge) => ({ ...edge })),
    })
  }, [edges, fixedQps, nodes, scenarioId])

  useEffect(() => {
    setCanvasLayer({
      nodes,
      edges,
      selectedScenarioId: scenarioId,
    })
  }, [edges, nodes, scenarioId, setCanvasLayer])

  useEffect(() => {
    setSimulationLayer({
      scheduler,
      metrics,
      activeEvents,
    })
  }, [activeEvents, metrics, scheduler, setSimulationLayer])

  useEffect(() => {
    setMonitorLayer({
      bottlenecks,
      eventLogs,
    })
  }, [bottlenecks, eventLogs, setMonitorLayer])

  useEffect(() => {
    setScenarioLayer({
      unlockedScenarioIds: [...unlockedScenarioIds],
    })
  }, [setScenarioLayer, unlockedScenarioIds])

  useEffect(() => {
    if (skipScenarioResetRef.current) {
      skipScenarioResetRef.current = false
      return
    }
    setNodes(selectedScenario.nodes.map((node) => ({ ...node, data: { ...node.data }, position: { ...node.position } })))
    setEdges(selectedScenario.edges.map((edge) => ({ ...edge })))
    setFixedQps(selectedScenario.fixedQps)
    const reset = resetScheduler(schedulerRef.current.speed)
    schedulerRef.current = reset
    setScheduler(reset)
    setMetrics({
      qps: selectedScenario.fixedQps,
      p95LatencyMs: 0,
      p99LatencyMs: 0,
      errorRate: 0,
      availability: 100,
    })
    setBottlenecks([])
    setActiveEvents([])
    setOrchestrationPlans([])
    setStagedEventIds([])
    setEventLogs([])
    setReplayLines([])
    setReplayCursor(0)
    replayCursorRef.current = 0
    setReplayRunning(false)
    setConnectHint('连接节点定义流量路径，点击“开始”运行连续仿真。')
  }, [selectedScenario, setEdges, setNodes])

  useEffect(() => {
    replayCursorRef.current = replayCursor
  }, [replayCursor])

  useEffect(() => {
    if (!replayRunning) {
      return
    }
    const timer = window.setInterval(() => {
      const frame = nextReplayFrame(replaySourceLogs, replayCursorRef.current, replayLines, 1)
      replayCursorRef.current = frame.nextCursor
      setReplayCursor(frame.nextCursor)
      setReplayLines(frame.lines)
      if (frame.done) {
        setReplayRunning(false)
      }
    }, 380)
    return () => window.clearInterval(timer)
  }, [replayLines, replayRunning, replaySourceLogs])

  useEffect(() => {
    if (!scheduler.running) {
      return
    }
    const timer = window.setInterval(() => {
      const nextSchedule = nextSchedulerTick(schedulerRef.current)
      schedulerRef.current = nextSchedule
      setScheduler(nextSchedule)
      const orchestrated = executeOrchestrationTick(
        orchestrationPlansRef.current,
        nextSchedule.tick,
        eventTemplates,
        () => rngRef.current(),
      )
      orchestrationPlansRef.current = orchestrated.nextPlans
      setOrchestrationPlans(orchestrated.nextPlans)
      const runtimeEvents = [...orchestrated.generated, ...activeEventsRef.current]
      activeEventsRef.current = runtimeEvents
      setActiveEvents(runtimeEvents)
      if (orchestrated.logs.length > 0) {
        setEventLogs((current) => [...orchestrated.logs, ...current].slice(0, 12))
      }
      const runtimeQps = computeQps(trafficPattern, fixedQps, nextSchedule.tick)
      const tickStartedAt = performance.now()
      const result = simulateTick(
        nodesRef.current,
        edgesRef.current,
        selectedScenario.sourceNodeId,
        runtimeQps,
        runtimeEvents,
      )
      const tickDuration = performance.now() - tickStartedAt
      setProfileSamples((current) => [...current, tickDuration].slice(-120))
      setNodes(result.nextNodes)
      setMetrics(result.snapshot.metrics)
      setBottlenecks(result.snapshot.bottlenecks)
      const { next, expired } = reduceActiveEvents(runtimeEvents)
      activeEventsRef.current = next
      setActiveEvents(next)
      const nextScore = computeScoreCard(result.nextNodes, result.snapshot.metrics, next, selectedScenario.scoreWeights)
      const nextPostmortem = generatePostmortemReport(
        selectedScenario.name,
        result.snapshot.metrics,
        result.snapshot.bottlenecks,
        nextScore,
        next,
        result.nextNodes,
      )
      const nextEval = evaluateScenario(selectedScenario, result.snapshot.metrics, nextScore)
      setScenarioProgress((current) =>
        updateScenarioProgress(current, selectedScenario.id, nextEval, nextScore, nextPostmortem.summary, nextSchedule.tick),
      )
      if (expired.length > 0) {
        setEventLogs((current) => [
          ...expired.map((item) => `事件恢复：${item.name}`),
          ...current,
        ].slice(0, 12))
      }
    }, Math.max(120, Math.floor(850 / scheduler.speed)))
    return () => window.clearInterval(timer)
  }, [fixedQps, scheduler.running, scheduler.speed, selectedScenario, setNodes, trafficPattern])

  const onConnect = (connection: Connection) => {
    const validation = validateConnection(nodesRef.current, edgesRef.current, connection)
    setConnectHint(validation.reason)
    if (!validation.valid) {
      return
    }
    setEdges((currentEdges) =>
      addEdge(
        {
          ...connection,
          id: `e-${connection.source}-${connection.target}-${Date.now()}`,
        },
        currentEdges,
      ),
    )
  }

  const addNode = (kind: NodeKind) => {
    const item = paletteItems.find((entry) => entry.kind === kind)
    if (!item) {
      return
    }
    idRef.current += 1
    setNodes((currentNodes) => [
      ...currentNodes,
      {
        id: `${kind}-${idRef.current}`,
        position: { x: 220 + (idRef.current % 5) * 130, y: 80 + (idRef.current % 4) * 120 },
        type: 'default',
        data: buildNodeData(item.kind),
      },
    ])
  }

  const filteredPalette = paletteItems.filter((item) =>
    `${item.label}${item.group}${item.kind}`.toLowerCase().includes(search.toLowerCase()),
  )

  const runOnce = () => {
    const nextSchedule = {
      ...schedulerRef.current,
      tick: schedulerRef.current.tick + 1,
      running: false,
    }
    schedulerRef.current = nextSchedule
    setScheduler(nextSchedule)
    const orchestrated = executeOrchestrationTick(
      orchestrationPlansRef.current,
      nextSchedule.tick,
      eventTemplates,
      () => rngRef.current(),
    )
    orchestrationPlansRef.current = orchestrated.nextPlans
    setOrchestrationPlans(orchestrated.nextPlans)
    const runtimeEvents = [...orchestrated.generated, ...activeEvents]
    if (orchestrated.logs.length > 0) {
      setEventLogs((current) => [...orchestrated.logs, ...current].slice(0, 12))
    }
    const runtimeQps = computeQps(trafficPattern, fixedQps, nextSchedule.tick)
    const tickStartedAt = performance.now()
    const result = simulateTick(nodes, edges, selectedScenario.sourceNodeId, runtimeQps, runtimeEvents)
    const tickDuration = performance.now() - tickStartedAt
    setProfileSamples((current) => [...current, tickDuration].slice(-120))
    setNodes(result.nextNodes)
    setMetrics(result.snapshot.metrics)
    setBottlenecks(result.snapshot.bottlenecks)
    const { next, expired } = reduceActiveEvents(runtimeEvents)
    const nextScore = computeScoreCard(result.nextNodes, result.snapshot.metrics, next, selectedScenario.scoreWeights)
    const nextPostmortem = generatePostmortemReport(
      selectedScenario.name,
      result.snapshot.metrics,
      result.snapshot.bottlenecks,
      nextScore,
      next,
      result.nextNodes,
    )
    const nextEval = evaluateScenario(selectedScenario, result.snapshot.metrics, nextScore)
    setScenarioProgress((current) =>
      updateScenarioProgress(current, selectedScenario.id, nextEval, nextScore, nextPostmortem.summary, nextSchedule.tick),
    )
    setActiveEvents(next)
    activeEventsRef.current = next
    if (expired.length > 0) {
      setEventLogs((current) => [...expired.map((item) => `事件恢复：${item.name}`), ...current].slice(0, 12))
    }
  }

  const patchPrimaryNode = (patch: Partial<PlaygroundNode['data']>) => {
    if (!primarySelectedNode) {
      return
    }
    setNodes((currentNodes) =>
      currentNodes.map((node) =>
        node.id === primarySelectedNode.id ? { ...node, data: { ...node.data, ...patch } } : node,
      ),
    )
  }

  const applyBatchUpdate = () => {
    if (selectedNodes.length < 2) {
      return
    }
    const selectedIds = new Set(selectedNodes.map((node) => node.id))
    const nextCapacity = batchCapacity === '' ? undefined : Number(batchCapacity)
    const nextLatency = batchLatency === '' ? undefined : Number(batchLatency)
    setNodes((currentNodes) =>
      currentNodes.map((node) => {
        if (!selectedIds.has(node.id)) {
          return node
        }
        return {
          ...node,
          data: {
            ...node.data,
            capacity: Number.isFinite(nextCapacity)
              ? clampNumber(nextCapacity!, nodeParameterBounds.capacity.min, nodeParameterBounds.capacity.max)
              : node.data.capacity,
            baseLatencyMs: Number.isFinite(nextLatency)
              ? clampNumber(nextLatency!, nodeParameterBounds.baseLatencyMs.min, nodeParameterBounds.baseLatencyMs.max)
              : node.data.baseLatencyMs,
          },
        }
      }),
    )
    setConnectHint(`已批量更新 ${selectedNodes.length} 个节点参数。`)
  }

  const applyTemplate = () => {
    const template = selectedTemplate ?? topologyTemplates[0]
    setNodes(template.nodes.map((node) => ({ ...node, data: { ...node.data }, position: { ...node.position } })))
    setEdges(template.edges.map((edge) => ({ ...edge })))
    setFixedQps(template.fixedQps)
    const reset = resetScheduler(schedulerRef.current.speed)
    schedulerRef.current = reset
    setScheduler(reset)
    setActiveEvents([])
    activeEventsRef.current = []
    setOrchestrationPlans([])
    orchestrationPlansRef.current = []
    setStagedEventIds([])
    setEventLogs([])
    setConnectHint(`已加载模板：${template.name}`)
  }

  const saveAsUserTemplate = () => {
    const name = userTemplateName.trim() || `我的模板 ${new Date().toLocaleString('zh-CN')}`
    const sourceNodeId =
      nodesRef.current.find((node) => node.id === selectedScenario.sourceNodeId)?.id ?? nodesRef.current[0]?.id ?? 'cdn-1'
    const template: TopologyTemplate = {
      id: `my-${Date.now()}`,
      name,
      description: `由 ${selectedScenario.name} 保存`,
      fixedQps,
      sourceNodeId,
      nodes: nodesRef.current.map((node) => ({ ...node, data: { ...node.data }, position: { ...node.position } })),
      edges: edgesRef.current.map((edge) => ({ ...edge })),
    }
    const next = saveUserTemplate(template)
    setUserTemplates(next)
    setSelectedTemplateId(template.id)
    setUserTemplateName('')
    setConnectHint(`已保存我的模板：${name}`)
  }

  const deleteCurrentUserTemplate = () => {
    if (!isSelectedUserTemplate) {
      setConnectHint('当前选择的是官方模板，无法删除。')
      return
    }
    const templateId = selectedTemplateId
    const next = removeUserTemplate(templateId)
    setUserTemplates(next)
    setSelectedTemplateId(topologyTemplates[0].id)
    setConnectHint('已删除我的模板。')
  }

  const injectEvent = () => {
    const template = eventTemplates.find((item) => item.id === selectedEventId)
    if (!template) {
      return
    }
    const event = createEventInstance(template)
    const next = [event, ...activeEventsRef.current]
    activeEventsRef.current = next
    setActiveEvents(next)
    setEventLogs((current) => [`注入事件：${template.name}`, ...current].slice(0, 12))
  }

  const toggleStagedEvent = (eventId: string) => {
    setStagedEventIds((current) =>
      current.includes(eventId) ? current.filter((id) => id !== eventId) : [...current, eventId],
    )
  }

  const saveCurrentDebugSnapshot = () => {
    const name = debugSnapshotName.trim() || `内部快照 ${new Date().toLocaleString('zh-CN')}`
    const snapshot = createDebugStateSnapshot({
      name,
      tick: scheduler.tick,
      scheduler,
      metrics,
      bottlenecks,
      eventLogs,
      activeEvents,
      nodes,
      edgeCount: edges.length,
    })
    const next = saveDebugSnapshot(snapshot)
    setDebugSnapshots(next)
    setDebugSnapshotName('')
    setConnectHint(`已保存内部状态快照：${name}`)
  }

  const loadDebugSnapshot = (snapshot: DebugStateSnapshot) => {
    const nextSchedule = { ...schedulerRef.current, tick: snapshot.tick, running: false }
    schedulerRef.current = nextSchedule
    setScheduler(nextSchedule)
    setMetrics(snapshot.metrics)
    setBottlenecks(snapshot.bottlenecks)
    setEventLogs(snapshot.eventLogs)
    setReplayLines([])
    setReplayCursor(0)
    replayCursorRef.current = 0
    setReplayRunning(false)
    setRightTab('observe')
    setConnectHint(`已加载内部状态快照：${snapshot.name}`)
  }

  const deleteDebugSnapshotItem = (snapshotId: string) => {
    const next = removeDebugSnapshot(snapshotId)
    setDebugSnapshots(next)
    setConnectHint('已删除内部状态快照。')
  }

  const replayNextStep = () => {
    if (replaySourceLogs.length === 0) {
      setConnectHint('暂无可回放的事件日志。')
      return
    }
    const frame = nextReplayFrame(replaySourceLogs, replayCursorRef.current, replayLines, 1)
    replayCursorRef.current = frame.nextCursor
    setReplayCursor(frame.nextCursor)
    setReplayLines(frame.lines)
    if (frame.done) {
      setReplayRunning(false)
    }
  }

  const startReplay = () => {
    if (replaySourceLogs.length === 0) {
      setConnectHint('暂无可回放的事件日志。')
      return
    }
    setReplayRunning(true)
  }

  const resetReplay = () => {
    setReplayRunning(false)
    setReplayCursor(0)
    replayCursorRef.current = 0
    setReplayLines([])
  }

  const createOrchestrationPlan = () => {
    if (stagedEventIds.length === 0) {
      setConnectHint('请先选择至少一个事件加入编排。')
      return
    }
    const startTick = Math.max(0, Number(orchestrationStartTick) || 0)
    const endTick = Math.max(startTick, Number(orchestrationEndTick) || startTick + 10)
    const probability = Math.max(0.05, Math.min(1, orchestrationProbability))
    const plan: RuntimeOrchestrationPlan = {
      id: `plan-${Date.now()}`,
      name: `编排-${orchestrationPlansRef.current.length + 1}`,
      mode: orchestrationMode,
      eventIds: stagedEventIds,
      probability,
      startTick,
      endTick,
      enabled: true,
      serialCursor: 0,
    }
    const nextPlans = [plan, ...orchestrationPlansRef.current].slice(0, 6)
    orchestrationPlansRef.current = nextPlans
    setOrchestrationPlans(nextPlans)
    setEventLogs((current) => [`创建编排：${plan.name}`, ...current].slice(0, 12))
    setConnectHint(`已创建事件编排 ${plan.name}。`)
  }

  const toggleOrchestrationPlan = (planId: string) => {
    const nextPlans = orchestrationPlansRef.current.map((plan) =>
      plan.id === planId ? { ...plan, enabled: !plan.enabled } : plan,
    )
    orchestrationPlansRef.current = nextPlans
    setOrchestrationPlans(nextPlans)
  }

  const removeOrchestrationPlan = (planId: string) => {
    const nextPlans = orchestrationPlansRef.current.filter((plan) => plan.id !== planId)
    orchestrationPlansRef.current = nextPlans
    setOrchestrationPlans(nextPlans)
  }

  const copyPostmortem = async () => {
    const reportText = [
      postmortem.summary,
      '根因：',
      ...postmortem.rootCauses.map((item, index) => `${index + 1}. ${item}`),
      '改进项：',
      ...postmortem.improvements.map((item, index) => `${index + 1}. ${item}`),
      '推荐架构调整：',
      ...postmortem.architectureAdjustments.map((item, index) => `${index + 1}. ${item}`),
    ].join('\n')
    try {
      await navigator.clipboard.writeText(reportText)
      setConnectHint('已复制复盘报告。')
    } catch {
      setConnectHint('复制失败，请检查浏览器剪贴板权限。')
    }
  }

  const saveCurrentSnapshot = () => {
    const name = snapshotName.trim() || `${selectedScenario.name} @Tick ${scheduler.tick}`
    const snapshot: ArchitectureSnapshot = {
      id: `snap-${Date.now()}`,
      name,
      createdAt: Date.now(),
      scenarioId: selectedScenario.id,
      fixedQps,
      trafficPattern,
      nodes: nodesRef.current.map((node) => ({ ...node, data: { ...node.data }, position: { ...node.position } })),
      edges: edgesRef.current.map((edge) => ({ ...edge })),
      result: {
        tick: scheduler.tick,
        metrics,
        bottlenecks,
        totalScore: scoreCard.total,
        stars: scoreCard.star,
        grade: scoreCard.grade,
        estimatedCost: scoreCard.estimatedCost,
        reportSummary: postmortem.summary,
      },
    }
    const next = saveSnapshot(snapshot)
    setSnapshots(next)
    setSnapshotName('')
    setConnectHint(`已保存快照：${name}`)
  }

  const loadSnapshot = (snapshot: ArchitectureSnapshot) => {
    skipScenarioResetRef.current = true
    setScenarioId(snapshot.scenarioId)
    setFixedQps(snapshot.fixedQps)
    setTrafficPattern(snapshot.trafficPattern)
    setNodes(snapshot.nodes.map((node) => ({ ...node, data: { ...node.data }, position: { ...node.position } })))
    setEdges(snapshot.edges.map((edge) => ({ ...edge })))
    const reset = resetScheduler(schedulerRef.current.speed)
    schedulerRef.current = reset
    setScheduler(reset)
    setActiveEvents([])
    activeEventsRef.current = []
    setOrchestrationPlans([])
    orchestrationPlansRef.current = []
    setStagedEventIds([])
    setEventLogs([])
    setMetrics(snapshot.result.metrics)
    setBottlenecks(snapshot.result.bottlenecks)
    setRightTab('report')
    setConnectHint(`已加载快照：${snapshot.name}`)
  }

  const deleteSnapshot = (snapshotId: string) => {
    const next = removeSnapshot(snapshotId)
    setSnapshots(next)
    setConnectHint('已删除快照。')
  }

  const exportSnapshots = () => {
    if (snapshots.length === 0) {
      setConnectHint('暂无可导出的快照。')
      return
    }
    const content = buildSnapshotsExportContent(snapshots)
    const blob = new Blob([content], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `deploy-playground-snapshots-${Date.now()}.json`
    anchor.click()
    URL.revokeObjectURL(url)
    setConnectHint(`已导出 ${snapshots.length} 个快照。`)
  }

  const triggerImportSnapshots = () => {
    snapshotImportInputRef.current?.click()
  }

  const importSnapshots = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }
    try {
      const text = await file.text()
      const parsed = parseSnapshotsImportContent(text)
      if (!parsed.valid) {
        setConnectHint('导入失败：文件格式不正确。')
        event.target.value = ''
        return
      }
      const next = mergeSnapshots(parsed.snapshots)
      setSnapshots(next)
      setConnectHint(`已导入 ${parsed.snapshots.length} 个快照。`)
    } catch {
      setConnectHint('导入失败：文件读取异常。')
    } finally {
      event.target.value = ''
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <h1>Deployment Playground</h1>
        <div className="topbar-controls">
          <label>
            {termLabel('场景', 'scenario')}
            <select value={scenarioId} onChange={(event) => setScenarioId(event.target.value as ScenarioDefinition['id'])}>
              {scenarios.map((scenario) => (
                <option key={scenario.id} value={scenario.id} disabled={!unlockedScenarioIds.has(scenario.id)}>
                  {scenario.name}{unlockedScenarioIds.has(scenario.id) ? '' : '（未解锁）'}
                </option>
              ))}
            </select>
          </label>
          <button
            onClick={() => {
              const next = toggleScheduler(schedulerRef.current)
              schedulerRef.current = next
              setScheduler(next)
            }}
          >
            {scheduler.running ? '暂停' : '开始'}
          </button>
          <button onClick={runOnce}>单步仿真</button>
          <label>
            {termLabel('曲线', 'traffic-pattern')}
            <select value={trafficPattern} onChange={(event) => setTrafficPattern(event.target.value as TrafficPattern)}>
              <option value="constant">固定</option>
              <option value="sine">正弦</option>
              <option value="step">阶梯</option>
              <option value="pulse">脉冲</option>
            </select>
          </label>
          <label>
            {termLabel('速度', 'scheduler-speed')}
            <select
              value={scheduler.speed}
              onChange={(event) => {
                const next = changeSchedulerSpeed(schedulerRef.current, Number(event.target.value) as SchedulerState['speed'])
                schedulerRef.current = next
                setScheduler(next)
              }}
            >
              <option value={1}>1x</option>
              <option value={2}>2x</option>
              <option value={4}>4x</option>
            </select>
          </label>
          <label>
            {termLabel('模板', 'template')}
            <select
              value={selectedTemplateId}
              onChange={(event) => setSelectedTemplateId(event.target.value)}
            >
              <optgroup label="官方模板">
                {topologyTemplates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="我的模板">
                {userTemplates.length === 0 ? (
                  <option value="" disabled>
                    暂无
                  </option>
                ) : (
                  userTemplates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))
                )}
              </optgroup>
            </select>
          </label>
          <button onClick={applyTemplate}>应用模板</button>
          <label>
            保存为
            <input
              value={userTemplateName}
              onChange={(event) => setUserTemplateName(event.target.value)}
              placeholder="我的模板名称"
            />
          </label>
          <button onClick={saveAsUserTemplate}>保存模板</button>
          <button className="ghost-btn" onClick={deleteCurrentUserTemplate}>删除我的模板</button>
        </div>
      </header>

      <section className="scenario-desc">{selectedScenario.description}</section>

      <main className="workspace">
        <aside className="left-panel">
          <h2>{termLabel('组件库', 'component-library')}</h2>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="搜索组件"
          />
          <div className="palette-list">
            {filteredPalette.map((item) => (
              <div key={item.kind} className="palette-item-row">
                <button onClick={() => addNode(item.kind)} className="palette-item">
                  <span>{item.label}</span>
                  <small>{item.group}</small>
                </button>
                <TermHelp termKey={componentTermKeyByKind[item.kind]} />
              </div>
            ))}
          </div>
        </aside>

        <section className="canvas-panel">
          <ReactFlow
            fitView
            nodes={heatmapNodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
          >
            <Background />
            <MiniMap />
            <Controls />
          </ReactFlow>
        </section>

        <aside className="right-panel">
          <h2>{termLabel('仿真参数', 'simulation-config')}</h2>
          <div className="right-tabs">
            <div className="term-tab-item">
              <button className={rightTab === 'node' ? 'active' : ''} onClick={() => setRightTab('node')}>节点</button>
              <TermHelp termKey="node-tab" />
            </div>
            <div className="term-tab-item">
              <button className={rightTab === 'observe' ? 'active' : ''} onClick={() => setRightTab('observe')}>观测</button>
              <TermHelp termKey="observe-tab" />
            </div>
            <div className="term-tab-item">
              <button className={rightTab === 'events' ? 'active' : ''} onClick={() => setRightTab('events')}>事件</button>
              <TermHelp termKey="event-tab" />
            </div>
            <div className="term-tab-item">
              <button className={rightTab === 'report' ? 'active' : ''} onClick={() => setRightTab('report')}>复盘</button>
              <TermHelp termKey="report-tab" />
            </div>
          </div>

          {rightTab === 'node' && (
            <>
              <section className="inspector-panel">
                <h3>{termLabel('Inspector', 'inspector')}</h3>
                <p>已选择 {selectedNodes.length} 个节点</p>
                {primarySelectedNode ? (
                  <>
                    <div className="inspector-fields">
                      <label>
                        节点名称
                        <input
                          value={primarySelectedNode.data.label}
                          onChange={(event) => patchPrimaryNode({ label: event.target.value })}
                        />
                      </label>
                      <label>
                        {termLabel('容量', 'capacity')}
                        <input
                          type="number"
                          min={nodeParameterBounds.capacity.min}
                          max={nodeParameterBounds.capacity.max}
                          value={primarySelectedNode.data.capacity}
                          onChange={(event) =>
                            patchPrimaryNode({
                              capacity: clampNumber(
                                Number(event.target.value) || nodeParameterBounds.capacity.defaultValue,
                                nodeParameterBounds.capacity.min,
                                nodeParameterBounds.capacity.max,
                              ),
                            })
                          }
                        />
                      </label>
                      <label>
                        {termLabel('基础延迟(ms)', 'base-latency')}
                        <input
                          type="number"
                          min={nodeParameterBounds.baseLatencyMs.min}
                          max={nodeParameterBounds.baseLatencyMs.max}
                          value={primarySelectedNode.data.baseLatencyMs}
                          onChange={(event) =>
                            patchPrimaryNode({
                              baseLatencyMs: clampNumber(
                                Number(event.target.value) || nodeParameterBounds.baseLatencyMs.defaultValue,
                                nodeParameterBounds.baseLatencyMs.min,
                                nodeParameterBounds.baseLatencyMs.max,
                              ),
                            })
                          }
                        />
                      </label>
                      <label>
                        {termLabel('可用区', 'zone')}
                        <input
                          value={primarySelectedNode.data.zone}
                          onChange={(event) => patchPrimaryNode({ zone: event.target.value })}
                        />
                      </label>
                    </div>
                    <div className="inspector-stats">
                      <span>成功率 {primarySelectedNode.data.successRate.toFixed(1)}%</span>
                      <span>超时率 {primarySelectedNode.data.timeoutRate.toFixed(1)}%</span>
                      <span>副本 {primarySelectedNode.data.replicas}</span>
                      <span>CPU {primarySelectedNode.data.cpu.toFixed(1)}%</span>
                      <span>内存 {primarySelectedNode.data.memory.toFixed(1)}%</span>
                      <span>队列 {Math.round(primarySelectedNode.data.queueDepth)}</span>
                      <span>限流 {primarySelectedNode.data.throttledRate.toFixed(1)}%</span>
                      <span>降级 {primarySelectedNode.data.degradedRate.toFixed(1)}%</span>
                      <span>连接池 {primarySelectedNode.data.poolUtilization.toFixed(1)}%</span>
                      <span>{primarySelectedNode.data.circuitOpen ? '熔断开启' : '熔断关闭'}</span>
                    </div>
                  </>
                ) : (
                  <p>请先点击节点后再编辑参数。</p>
                )}
              </section>
              <section className="batch-panel">
                <h3>{termLabel('批量编辑', 'batch-edit')}</h3>
                <div className="batch-fields">
                  <label>
                    {termLabel('容量', 'capacity')}
                    <input
                      type="number"
                      min={nodeParameterBounds.capacity.min}
                      max={nodeParameterBounds.capacity.max}
                      value={batchCapacity}
                      onChange={(event) => setBatchCapacity(event.target.value)}
                      placeholder="留空不修改"
                    />
                  </label>
                  <label>
                    {termLabel('基础延迟(ms)', 'base-latency')}
                    <input
                      type="number"
                      min={nodeParameterBounds.baseLatencyMs.min}
                      max={nodeParameterBounds.baseLatencyMs.max}
                      value={batchLatency}
                      onChange={(event) => setBatchLatency(event.target.value)}
                      placeholder="留空不修改"
                    />
                  </label>
                </div>
                <button onClick={applyBatchUpdate} disabled={selectedNodes.length < 2}>
                  批量应用到已选节点
                </button>
              </section>
              <label>
                {termLabel(`固定 QPS: ${fixedQps}`, 'fixed-qps')}
                <input
                  type="range"
                  min={300}
                  max={12000}
                  step={100}
                  value={fixedQps}
                  onChange={(event) => setFixedQps(Number(event.target.value))}
                />
              </label>
            </>
          )}

          {rightTab === 'observe' && (
            <>
              <section className="metric-grid">
                <article>
                  <h3>{termLabel('Tick', 'tick')}</h3>
                  <p>{scheduler.tick}</p>
                </article>
                <article>
                  <h3>{termLabel('Active QPS', 'active-qps')}</h3>
                  <p>{metrics.qps}</p>
                </article>
                <article>
                  <h3>{termLabel('QPS', 'qps')}</h3>
                  <p>{fixedQps}</p>
                </article>
                <article>
                  <h3>{termLabel('P95', 'p95')}</h3>
                  <p>{metrics.p95LatencyMs} ms</p>
                </article>
                <article>
                  <h3>{termLabel('P99', 'p99')}</h3>
                  <p>{metrics.p99LatencyMs} ms</p>
                </article>
                <article>
                  <h3>{termLabel('Error Rate', 'error-rate')}</h3>
                  <p>{metrics.errorRate}%</p>
                </article>
                <article>
                  <h3>{termLabel('Availability', 'availability')}</h3>
                  <p>{metrics.availability}%</p>
                </article>
                <article>
                  <h3>{termLabel('Cost', 'cost')}</h3>
                  <p>${scoreCard.estimatedCost}</p>
                </article>
              </section>
              <section className="score-panel">
                <div className="score-head">
                  <h3>{termLabel('评分模型', 'score-model')}</h3>
                  <strong>
                    {scoreCard.total} / {scoreCard.grade}
                  </strong>
                </div>
                <p className="score-stars">{'★'.repeat(scoreCard.star)}{'☆'.repeat(5 - scoreCard.star)}</p>
                <ul>
                  <li><span>{termLabel('性能', 'score-performance')}</span><span>{scoreCard.breakdown.performance}</span></li>
                  <li><span>{termLabel('稳定性', 'score-stability')}</span><span>{scoreCard.breakdown.stability}</span></li>
                  <li><span>{termLabel('成本', 'cost')}</span><span>{scoreCard.breakdown.cost}</span></li>
                  <li><span>{termLabel('可恢复性', 'score-recoverability')}</span><span>{scoreCard.breakdown.recoverability}</span></li>
                  <li><span>{termLabel('安全性', 'score-security')}</span><span>{scoreCard.breakdown.security}</span></li>
                </ul>
              </section>
              <section className="heatmap-panel">
                <div className="heatmap-header">
                  <h3>{termLabel('资源热力图', 'resource-heatmap')}</h3>
                  <select value={heatMetric} onChange={(event) => setHeatMetric(event.target.value as HeatmapMetric)}>
                    <option value="cpu">CPU</option>
                    <option value="memory">Memory</option>
                    <option value="bandwidthMbps">Bandwidth</option>
                    <option value="queueDepth">Queue</option>
                    <option value="poolUtilization">Pool</option>
                  </select>
                </div>
                {heatmapRows.length === 0 ? (
                  <p>暂无节点数据。</p>
                ) : (
                  <ul>
                    {heatmapRows.map((node) => {
                      const value = Number(node.data[heatMetric] ?? 0)
                      const normalized = heatMetric === 'bandwidthMbps' || heatMetric === 'queueDepth'
                        ? Math.min(100, Math.log10(1 + value) * 25)
                        : Math.min(100, value)
                      return (
                        <li key={`${node.id}-${heatMetric}`}>
                          <div className="heatmap-row-top">
                            <span>{node.data.label}</span>
                            <span>{value.toFixed(1)}</span>
                          </div>
                          <div className="heatmap-bar">
                            <div style={{ width: `${normalized}%` }} />
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </section>
              <section className="trace-panel">
                <h3>{termLabel('调用链路视图', 'trace-view')}</h3>
                {traceSegments.length === 0 ? (
                  <p>请先建立链路并运行仿真。</p>
                ) : (
                  <ul>
                    {traceSegments.map((segment, index) => (
                      <li key={segment.id} className={index < 2 ? 'trace-hot' : ''}>
                        <div className="trace-line">
                          <span>
                            {segment.from} → {segment.to}
                          </span>
                          <strong>{segment.latencyMs} ms</strong>
                        </div>
                        <small>
                          QPS {segment.qps} · 评分 {segment.score}
                        </small>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
              <section className="score-panel">
                <div className="score-head">
                  <h3>{termLabel('性能剖析', 'perf-profile')}</h3>
                  <strong>{profileSummary.sampleCount} samples</strong>
                </div>
                <ul>
                  <li><span>平均 Tick</span><span>{profileSummary.avgTickMs} ms</span></li>
                  <li><span>P95 Tick</span><span>{profileSummary.p95TickMs} ms</span></li>
                  <li><span>仿真吞吐</span><span>{profileSummary.throughputTicksPerSecond} tick/s</span></li>
                  <li><span>估算帧率</span><span>{profileSummary.estimatedFps} fps</span></li>
                </ul>
                <button className="inline-action-btn" onClick={() => setProfileSamples([])}>清空剖析数据</button>
              </section>
              <section className="score-panel">
                <div className="score-head">
                  <h3>{termLabel('内部状态快照', 'debug-snapshot')}</h3>
                  <strong>{debugSnapshots.length}</strong>
                </div>
                <div className="inline-actions">
                  <input
                    value={debugSnapshotName}
                    onChange={(event) => setDebugSnapshotName(event.target.value)}
                    placeholder="内部快照名称（可选）"
                  />
                  <button className="inline-action-btn" onClick={saveCurrentDebugSnapshot}>保存状态</button>
                </div>
                {debugSnapshots.length === 0 ? (
                  <p>暂无内部状态快照。</p>
                ) : (
                  <ul>
                    {debugSnapshots.slice(0, 6).map((snapshot) => (
                      <li key={snapshot.id}>
                        <span>
                          Tick {snapshot.tick} · Nodes {snapshot.topology.nodeCount} · Events {snapshot.activeEventNames.length}
                        </span>
                        <div className="inline-actions">
                          <button className="inline-action-btn" onClick={() => loadDebugSnapshot(snapshot)}>加载</button>
                          <button className="inline-action-btn ghost" onClick={() => deleteDebugSnapshotItem(snapshot.id)}>删除</button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          )}

          {rightTab === 'events' && (
            <>
              <section className="events-panel">
                <h3>{termLabel('故障注入', 'fault-injection')}</h3>
                <div className="event-controls">
                  <select value={selectedEventId} onChange={(event) => setSelectedEventId(event.target.value)}>
                    {eventTemplates.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                  <button onClick={injectEvent}>注入事件</button>
                  {selectedEventId && eventTermKeyById[selectedEventId] && <TermHelp termKey={eventTermKeyById[selectedEventId]!} />}
                </div>
                <div className="event-active-list">
                  {activeEvents.length === 0 ? (
                    <p>当前无激活事件。</p>
                  ) : (
                    <ul>
                      {activeEvents.map((event) => (
                        <li key={event.instanceId}>
                          <span className="term-label">
                            {event.name}
                            {eventTermKeyById[event.id] && <TermHelp termKey={eventTermKeyById[event.id]!} />}
                          </span>
                          （剩余 {event.remainingTicks} tick）
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="orchestration-panel">
                  <h4>{termLabel('事件编排', 'orchestration')}</h4>
                  <div className="orchestration-options">
                    <label>
                      {termLabel('故障种子', 'fault-seed')}
                      <input
                        value={faultSeed}
                        onChange={(event) => setFaultSeed(event.target.value || 'seed')}
                      />
                    </label>
                    <label>
                      {termLabel('模式', 'orchestration-mode')}
                      <select value={orchestrationMode} onChange={(event) => setOrchestrationMode(event.target.value as OrchestrationMode)}>
                        <option value="serial">串行</option>
                        <option value="parallel">并行</option>
                      </select>
                    </label>
                    <label>
                      {termLabel(`概率 ${Math.round(orchestrationProbability * 100)}%`, 'orchestration-probability')}
                      <input
                        type="range"
                        min={5}
                        max={100}
                        step={5}
                        value={Math.round(orchestrationProbability * 100)}
                        onChange={(event) => setOrchestrationProbability(Number(event.target.value) / 100)}
                      />
                    </label>
                    <label>
                      起始 Tick
                      <input
                        type="number"
                        min={0}
                        value={orchestrationStartTick}
                        onChange={(event) => setOrchestrationStartTick(event.target.value)}
                      />
                    </label>
                    <label>
                      结束 Tick
                      <input
                        type="number"
                        min={0}
                        value={orchestrationEndTick}
                        onChange={(event) => setOrchestrationEndTick(event.target.value)}
                      />
                    </label>
                  </div>
                  <div className="inline-actions">
                    <button className="inline-action-btn" onClick={() => setSeedCycle((value) => value + 1)}>
                      重置随机序列
                    </button>
                    <small>当前序列 {seedCycle}</small>
                  </div>
                  <div className="orchestration-events">
                    {eventTemplates.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => toggleStagedEvent(item.id)}
                        className={stagedEventIds.includes(item.id) ? 'chip active' : 'chip'}
                      >
                        {item.name}
                      </button>
                    ))}
                  </div>
                  <button onClick={createOrchestrationPlan}>创建编排计划</button>
                  <div className="orchestration-list">
                    {orchestrationPlans.length === 0 ? (
                      <p>暂无编排计划。</p>
                    ) : (
                      <ul>
                        {orchestrationPlans.map((plan) => (
                          <li key={plan.id}>
                            <span>
                              {plan.name} · {plan.mode === 'serial' ? '串行' : '并行'} · {Math.round(plan.probability * 100)}% · Tick {plan.startTick}-{plan.endTick}
                            </span>
                            <div>
                              <button onClick={() => toggleOrchestrationPlan(plan.id)}>{plan.enabled ? '暂停' : '启用'}</button>
                              <button onClick={() => removeOrchestrationPlan(plan.id)}>删除</button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </section>
              <section className="timeline">
                <h3>{termLabel('事件时间线', 'timeline')}</h3>
                {eventLogs.length === 0 ? (
                  <p>尚无注入或恢复事件。</p>
                ) : (
                  <ul>
                    {eventLogs.map((item, index) => (
                      <li key={`${item}-${index}`}>{item}</li>
                    ))}
                  </ul>
                )}
              </section>
              <section className="timeline">
                <h3>{termLabel('事件回放', 'event-replay')}</h3>
                <div className="inline-actions">
                  <button className="inline-action-btn" onClick={replayNextStep}>回放一步</button>
                  <button className="inline-action-btn" onClick={replayRunning ? () => setReplayRunning(false) : startReplay}>
                    {replayRunning ? '暂停回放' : '自动回放'}
                  </button>
                  <button className="inline-action-btn ghost" onClick={resetReplay}>重置回放</button>
                </div>
                <p>进度 {replayCursor}/{replaySourceLogs.length}</p>
                {replayLines.length === 0 ? (
                  <p>尚未开始回放。</p>
                ) : (
                  <ul>
                    {replayLines.map((line, index) => (
                      <li key={`${line}-${index}`}>{line}</li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          )}

          {rightTab === 'report' && (
            <section className="review">
              <div className="progress-summary">
                <h4>{termLabel('场景进度', 'scenario-progress')}</h4>
                <ul>
                  {scenarios.map((scenario) => {
                    const entry = scenarioProgress[scenario.id]
                    const unlocked = unlockedScenarioIds.has(scenario.id)
                    return (
                      <li key={scenario.id} className={scenario.id === selectedScenario.id ? 'active' : ''}>
                        <span className="term-label">
                          {scenario.name}
                          <TermHelp termKey="scenario" />
                        </span>
                        <strong>
                          {!unlocked ? '未解锁' : entry?.passed ? `已通关 ${'★'.repeat(entry.bestStars)}` : '进行中'}
                        </strong>
                      </li>
                    )
                  })}
                </ul>
              </div>
              <div className="snapshot-panel">
                <div className="snapshot-head">
                  <h4>{termLabel('架构快照', 'architecture-snapshot')}</h4>
                  <div className="snapshot-head-actions">
                    <button onClick={saveCurrentSnapshot}>保存当前</button>
                    <button onClick={exportSnapshots}>导出文件</button>
                    <button onClick={triggerImportSnapshots}>导入文件</button>
                  </div>
                </div>
                <input
                  ref={snapshotImportInputRef}
                  type="file"
                  accept="application/json"
                  className="snapshot-import-input"
                  onChange={importSnapshots}
                />
                <div className="snapshot-controls">
                  <input
                    value={snapshotName}
                    onChange={(event) => setSnapshotName(event.target.value)}
                    placeholder="快照名称（可选）"
                  />
                </div>
                {snapshots.length === 0 ? (
                  <p>暂无快照。</p>
                ) : (
                  <ul>
                    {snapshots.map((item) => (
                      <li key={item.id}>
                        <div className="snapshot-line">
                          <span>{item.name}</span>
                          <strong>
                            {item.scenarioId} · {item.result.grade} · {'★'.repeat(item.result.stars)}
                          </strong>
                        </div>
                        <small>
                          Tick {item.result.tick} · P99 {item.result.metrics.p99LatencyMs}ms · Error {item.result.metrics.errorRate}% · $
                          {item.result.estimatedCost}
                        </small>
                        <div className="snapshot-actions">
                          <button onClick={() => loadSnapshot(item)}>加载</button>
                          <button onClick={() => deleteSnapshot(item.id)}>删除</button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="compare-panel">
                <h4>{termLabel('方案对比', 'compare')}</h4>
                {snapshots.length < 2 ? (
                  <p>至少保存 2 个快照后可进行对比。</p>
                ) : (
                  <>
                    <div className="compare-controls">
                      <label>
                        基线
                        <select value={compareBaseId} onChange={(event) => setCompareBaseId(event.target.value)}>
                          {snapshots.map((item) => (
                            <option key={`base-${item.id}`} value={item.id}>
                              {item.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        对比项
                        <select value={compareTargetId} onChange={(event) => setCompareTargetId(event.target.value)}>
                          {snapshots.map((item) => (
                            <option key={`target-${item.id}`} value={item.id}>
                              {item.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    {compareBase && compareTarget && (
                      <div className="compare-summary">
                        <small>
                          {compareBase.name} ({compareBase.scenarioId}) vs {compareTarget.name} ({compareTarget.scenarioId})
                        </small>
                      </div>
                    )}
                    <ul>
                      {compareRows.map((row) => (
                        <li key={row.label}>
                          <span>{row.label}</span>
                          <span>{row.base}{row.unit} → {row.target}{row.unit}</span>
                          <strong className={row.delta > 0 ? 'delta-up' : row.delta < 0 ? 'delta-down' : 'delta-flat'}>
                            {row.deltaText}
                          </strong>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
              <div className="goal-summary">
                <h4>{termLabel('当前场景目标', 'scenario-goal')}</h4>
                <ul>
                  {scenarioEvaluation.goalResults.map((item) => (
                    <li key={item.goal.id} className={item.passed ? 'passed' : 'failed'}>
                      <span>{item.goal.label}</span>
                      <strong>{item.actual}</strong>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="review-head">
                <h3>{termLabel('自动复盘报告', 'postmortem')}</h3>
                <button onClick={copyPostmortem}>复制报告</button>
              </div>
              <p>{postmortem.summary}</p>
              <h4>{termLabel('根因', 'root-cause')}</h4>
              <ul>
                {postmortem.rootCauses.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <h4>{termLabel('改进项', 'improvement')}</h4>
              <ul>
                {postmortem.improvements.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <h4>{termLabel('推荐架构调整', 'architecture-adjustment')}</h4>
              <ul>
                {postmortem.architectureAdjustments.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </main>

      <footer className="footer">
        <span>{connectHint}</span>
      </footer>
    </div>
  )
}

export default App
