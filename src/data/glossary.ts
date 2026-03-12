export type GlossaryTermKey =
  | 'scenario'
  | 'traffic-pattern'
  | 'scheduler-speed'
  | 'template'
  | 'component-library'
  | 'simulation-config'
  | 'node-tab'
  | 'observe-tab'
  | 'event-tab'
  | 'report-tab'
  | 'inspector'
  | 'capacity'
  | 'base-latency'
  | 'zone'
  | 'batch-edit'
  | 'fixed-qps'
  | 'tick'
  | 'active-qps'
  | 'qps'
  | 'p95'
  | 'p99'
  | 'error-rate'
  | 'availability'
  | 'cost'
  | 'score-model'
  | 'score-performance'
  | 'score-stability'
  | 'score-recoverability'
  | 'score-security'
  | 'resource-heatmap'
  | 'trace-view'
  | 'perf-profile'
  | 'debug-snapshot'
  | 'fault-injection'
  | 'orchestration'
  | 'fault-seed'
  | 'orchestration-mode'
  | 'orchestration-probability'
  | 'timeline'
  | 'event-replay'
  | 'scenario-progress'
  | 'architecture-snapshot'
  | 'compare'
  | 'scenario-goal'
  | 'postmortem'
  | 'root-cause'
  | 'improvement'
  | 'architecture-adjustment'
  | 'component.cdn'
  | 'component.load-balancer'
  | 'component.api-gateway'
  | 'component.waf'
  | 'component.rate-limiter'
  | 'component.circuit-breaker'
  | 'component.service-mesh'
  | 'component.web'
  | 'component.service'
  | 'component.redis'
  | 'component.mq'
  | 'component.database'
  | 'component.search'
  | 'component.object-storage'
  | 'component.observability'
  | 'component.tracing'
  | 'component.iam'
  | 'event.traffic-spike'
  | 'event.hot-key'
  | 'event.cdn-origin-fail'
  | 'event.redis-eviction-storm'
  | 'event.deploy-regression'
  | 'event.cert-expired'
  | 'event.manual-scale-delay'
  | 'event.region-a-partition'
  | 'event.canary-regression'
  | 'event.kms-rotation-failure'

export interface GlossaryTerm {
  title: string
  explanation: string
  usage: string
}

export const glossary: Record<GlossaryTermKey, GlossaryTerm> = {
  scenario: {
    title: '场景',
    explanation: '场景定义了目标指标、拓扑约束、评分权重和通关条件。',
    usage: '用于课程分关卡演练，如新手、秒杀洪峰、容灾切换。',
  },
  'traffic-pattern': {
    title: '流量曲线',
    explanation: '控制仿真输入流量随时间的变化方式，如固定、正弦、阶梯、脉冲。',
    usage: '用于模拟业务高峰、潮汐流量和突发冲击。',
  },
  'scheduler-speed': {
    title: '仿真速度',
    explanation: '控制每秒推进的 Tick 数，影响观测节奏而不改变模型逻辑。',
    usage: '演示时可加速观测趋势，调试时可降速分析细节。',
  },
  template: {
    title: '模板',
    explanation: '模板是可复用的拓扑初始结构，包含节点、连线和固定流量。',
    usage: '用于快速起盘或对比不同架构方案。',
  },
  'component-library': {
    title: '组件库',
    explanation: '组件库提供可拖入画布的基础设施与治理节点。',
    usage: '用于构建业务链路、数据链路与治理链路。',
  },
  'simulation-config': {
    title: '仿真参数',
    explanation: '控制节点、事件、观测与复盘相关交互的参数集合。',
    usage: '用于运行前调参和运行中分析。',
  },
  'node-tab': {
    title: '节点面板',
    explanation: '用于修改节点属性与查看节点级运行状态。',
    usage: '用于容量调整、延迟校准和批量配置。',
  },
  'observe-tab': {
    title: '观测面板',
    explanation: '汇总系统级指标、热力图、调用链和性能剖析。',
    usage: '用于定位瓶颈与判断系统健康程度。',
  },
  'event-tab': {
    title: '事件面板',
    explanation: '用于故障注入、事件编排和时间线回放。',
    usage: '用于演练故障发生、扩散与恢复过程。',
  },
  'report-tab': {
    title: '复盘面板',
    explanation: '展示场景进度、快照对比和自动复盘结论。',
    usage: '用于培训考核、方案复盘和汇报留档。',
  },
  inspector: {
    title: 'Inspector',
    explanation: '单节点配置面板，可查看与编辑节点核心参数。',
    usage: '用于精细化调参并验证单节点策略效果。',
  },
  capacity: {
    title: '容量',
    explanation: '节点在当前模型下可承载请求的能力上限。',
    usage: '用于模拟扩容、削峰与资源预算变化。',
  },
  'base-latency': {
    title: '基础延迟',
    explanation: '节点在无额外故障和拥塞时的基础处理时延。',
    usage: '用于构建不同中间件和服务的性能基线。',
  },
  zone: {
    title: '可用区',
    explanation: '用于表示节点部署所在的逻辑可用区位置。',
    usage: '用于多 AZ 和容灾演练中的部署隔离。',
  },
  'batch-edit': {
    title: '批量编辑',
    explanation: '对多个已选节点一次性应用相同参数修改。',
    usage: '用于大规模调参，提高演练效率。',
  },
  'fixed-qps': {
    title: '固定 QPS',
    explanation: '仿真输入流量基线，每 Tick 按曲线生成实际输入。',
    usage: '用于控制演练强度并复现压力等级。',
  },
  tick: { title: 'Tick', explanation: '仿真离散时间步。', usage: '用于按时间片推进事件与指标。' },
  'active-qps': { title: 'Active QPS', explanation: '当前 Tick 的有效输入吞吐。', usage: '用于观察流量曲线与事件叠加后的实时压力。' },
  qps: { title: 'QPS', explanation: '每秒请求数，衡量吞吐能力。', usage: '用于评估容量规划与扩缩容效果。' },
  p95: { title: 'P95', explanation: '95 分位延迟，体现主要用户体验。', usage: '用于判断大多数请求时延是否达标。' },
  p99: { title: 'P99', explanation: '99 分位延迟，反映尾延迟风险。', usage: '用于识别高抖动和极端慢请求问题。' },
  'error-rate': { title: '错误率', explanation: '请求失败占比。', usage: '用于评估稳定性与故障影响范围。' },
  availability: { title: '可用性', explanation: '服务可用能力的综合指标。', usage: '用于检验 SLA 是否满足目标。' },
  cost: { title: '成本', explanation: '资源使用带来的估算成本。', usage: '用于平衡性能、稳定性与预算。' },
  'score-model': { title: '评分模型', explanation: '按多维权重计算总分和星级。', usage: '用于通关判断和方案优劣对比。' },
  'score-performance': { title: '性能', explanation: '吞吐与时延表现。', usage: '用于判断系统响应能力。' },
  'score-stability': { title: '稳定性', explanation: '错误率、可用性和波动程度。', usage: '用于判断系统是否稳态运行。' },
  'score-recoverability': { title: '可恢复性', explanation: '故障期间的降级与恢复能力。', usage: '用于评估应急韧性。' },
  'score-security': { title: '安全性', explanation: '鉴权、限流与防护策略效果。', usage: '用于评估安全事件下的抗风险能力。' },
  'resource-heatmap': { title: '资源热力图', explanation: '按资源维度可视化热点节点。', usage: '用于快速定位高压节点。' },
  'trace-view': { title: '调用链路视图', explanation: '展示关键链路节点间时延与评分。', usage: '用于分析瓶颈传播路径。' },
  'perf-profile': { title: '性能剖析', explanation: '统计 Tick 计算耗时、吞吐和帧率。', usage: '用于评估大场景下仿真性能。' },
  'debug-snapshot': { title: '内部状态快照', explanation: '保存某一时刻的内部运行状态。', usage: '用于复盘、回放和问题定位。' },
  'fault-injection': { title: '故障注入', explanation: '主动注入事件扰动以模拟异常。', usage: '用于验证系统在异常下的韧性。' },
  orchestration: { title: '事件编排', explanation: '将多个事件按规则自动注入。', usage: '用于连续演练复杂事故链。' },
  'fault-seed': { title: '故障种子', explanation: '驱动可重复随机序列的输入值。', usage: '用于复现实验结果与教学对齐。' },
  'orchestration-mode': { title: '编排模式', explanation: '串行按顺序注入，并行同 Tick 注入多个事件。', usage: '用于控制事故传播节奏。' },
  'orchestration-probability': { title: '触发概率', explanation: '每 Tick 判断该编排是否触发的概率。', usage: '用于模拟不确定故障发生。' },
  timeline: { title: '事件时间线', explanation: '按时间记录注入与恢复日志。', usage: '用于还原事故过程。' },
  'event-replay': { title: '事件回放', explanation: '按步或自动播放历史事件日志。', usage: '用于复盘讲解和课堂演示。' },
  'scenario-progress': { title: '场景进度', explanation: '记录解锁状态、最高得分与星级。', usage: '用于训练过程跟踪与考核。' },
  'architecture-snapshot': { title: '架构快照', explanation: '保存拓扑、参数和结果的一次留档。', usage: '用于版本回溯与分享。' },
  compare: { title: '方案对比', explanation: '比较两份快照的指标与成本差异。', usage: '用于架构评审与方案决策。' },
  'scenario-goal': { title: '场景目标', explanation: '当前场景要求达到的指标阈值集合。', usage: '用于判断通关与否。' },
  postmortem: { title: '自动复盘报告', explanation: '自动生成根因、改进和架构建议。', usage: '用于演练总结和行动项输出。' },
  'root-cause': { title: '根因', explanation: '导致指标恶化的核心原因。', usage: '用于定位问题起点。' },
  improvement: { title: '改进项', explanation: '可执行的优化建议列表。', usage: '用于下一轮架构迭代。' },
  'architecture-adjustment': { title: '推荐架构调整', explanation: '面向拓扑和策略的结构化优化建议。', usage: '用于形成方案改造计划。' },
  'component.cdn': { title: 'CDN', explanation: '内容分发网络，负责边缘缓存和就近访问。', usage: '用于静态资源加速与源站减压。' },
  'component.load-balancer': { title: 'Load Balancer', explanation: '将流量分配到后端实例。', usage: '用于高可用入口与流量分流。' },
  'component.api-gateway': { title: 'API Gateway', explanation: '统一 API 入口，提供路由与鉴权。', usage: '用于多服务统一接入。' },
  'component.waf': { title: 'WAF', explanation: 'Web 应用防火墙，拦截恶意请求。', usage: '用于安全防护与攻击面收敛。' },
  'component.rate-limiter': { title: 'Rate Limiter', explanation: '限流组件，控制通过流量。', usage: '用于保护核心链路避免过载。' },
  'component.circuit-breaker': { title: 'Circuit Breaker', explanation: '熔断器，故障时快速失败和降级。', usage: '用于避免故障级联扩散。' },
  'component.service-mesh': { title: 'Service Mesh', explanation: '服务网格，治理服务间通信。', usage: '用于可观测、安全与流量治理。' },
  'component.web': { title: 'Web Service', explanation: '面向用户的 Web 层服务。', usage: '用于承接业务入口请求。' },
  'component.service': { title: 'Microservice', explanation: '业务微服务节点。', usage: '用于承载核心业务逻辑。' },
  'component.redis': { title: 'Redis', explanation: '高性能缓存与数据结构服务。', usage: '用于降压数据库与加速读取。' },
  'component.mq': { title: 'Kafka MQ', explanation: '消息队列，用于异步解耦。', usage: '用于削峰填谷和异步处理。' },
  'component.database': { title: 'Database', explanation: '持久化数据存储。', usage: '用于事务与核心数据落盘。' },
  'component.search': { title: 'Elasticsearch', explanation: '搜索与分析引擎。', usage: '用于检索、推荐召回和分析。' },
  'component.object-storage': { title: 'Object Storage', explanation: '对象存储服务。', usage: '用于文件与静态资源存储。' },
  'component.observability': { title: 'Observability', explanation: '可观测系统节点。', usage: '用于汇聚指标、日志、追踪。' },
  'component.tracing': { title: 'Tracing', explanation: '链路追踪节点。', usage: '用于分布式链路诊断。' },
  'component.iam': { title: 'IAM', explanation: '身份与访问管理。', usage: '用于权限控制与审计合规。' },
  'event.traffic-spike': { title: '流量突刺', explanation: '短时流量快速冲高。', usage: '用于模拟热点活动/秒杀流量。' },
  'event.hot-key': { title: '热点 Key', explanation: '少量键被高频访问导致局部过载。', usage: '用于验证缓存与数据库抗压能力。' },
  'event.cdn-origin-fail': { title: 'CDN 回源异常', explanation: '边缘回源链路不稳定。', usage: '用于模拟源站压力回灌。' },
  'event.redis-eviction-storm': { title: 'Redis 淘汰风暴', explanation: '淘汰激增导致命中率下降。', usage: '用于验证缓存雪崩防护。' },
  'event.deploy-regression': { title: '发布性能回退', explanation: '发布后处理性能下降。', usage: '用于演练发布治理与回滚。' },
  'event.cert-expired': { title: '证书过期', explanation: '证书失效导致访问失败上升。', usage: '用于演练安全应急流程。' },
  'event.manual-scale-delay': { title: '人工扩容延迟', explanation: '扩容动作滞后于流量增长。', usage: '用于验证自动扩缩容策略价值。' },
  'event.region-a-partition': { title: '主地域网络分区', explanation: '主地域网络隔离导致服务退化。', usage: '用于容灾切流演练。' },
  'event.canary-regression': { title: '金丝雀回退触发', explanation: '灰度版本异常触发回退。', usage: '用于发布治理演练。' },
  'event.kms-rotation-failure': { title: '密钥轮换失败', explanation: '密钥更新异常影响鉴权链路。', usage: '用于合规与安全场景演练。' },
}

