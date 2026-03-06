import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState, type ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Connection, Edge, Node } from '@xyflow/react'
import App from './App'

vi.mock('@xyflow/react', () => {
  function ReactFlow(props: { children?: ReactNode }) {
    return <div data-testid="mock-reactflow">{props.children}</div>
  }
  function Background() {
    return null
  }
  function MiniMap() {
    return null
  }
  function Controls() {
    return null
  }
  function useNodesState<T extends Node>(initialNodes: T[]) {
    const [nodes, setNodes] = useState<T[]>(initialNodes)
    return [nodes, setNodes, vi.fn()] as const
  }
  function useEdgesState<T extends Edge>(initialEdges: T[]) {
    const [edges, setEdges] = useState<T[]>(initialEdges)
    return [edges, setEdges, vi.fn()] as const
  }
  function addEdge(connection: Connection, edges: Edge[]) {
    return [
      ...edges,
      {
        id: `mock-${connection.source}-${connection.target}`,
        source: connection.source ?? '',
        target: connection.target ?? '',
      },
    ]
  }
  return {
    ReactFlow,
    Background,
    MiniMap,
    Controls,
    useNodesState,
    useEdgesState,
    addEdge,
  }
})

describe('App end-to-end flow', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('完成单步仿真与双快照对比流程', async () => {
    const user = userEvent.setup()
    render(<App />)

    expect(screen.getByText('Deployment Playground')).toBeTruthy()

    await user.click(screen.getByRole('button', { name: '单步仿真' }))
    await user.click(screen.getByRole('button', { name: '复盘' }))

    const snapshotInput = screen.getByPlaceholderText('快照名称（可选）')
    await user.clear(snapshotInput)
    await user.type(snapshotInput, 'e2e-快照-A')
    await user.click(screen.getByRole('button', { name: '保存当前' }))
    await waitFor(() => {
      expect(screen.getAllByText('e2e-快照-A').length).toBeGreaterThan(0)
    })

    await user.click(screen.getByRole('button', { name: '单步仿真' }))
    await user.clear(snapshotInput)
    await user.type(snapshotInput, 'e2e-快照-B')
    await user.click(screen.getByRole('button', { name: '保存当前' }))
    await waitFor(() => {
      expect(screen.getAllByText('e2e-快照-B').length).toBeGreaterThan(0)
    })

    expect(screen.queryByText('至少保存 2 个快照后可进行对比。')).toBeNull()
    expect(screen.getByText('QPS')).toBeTruthy()
    expect(screen.getByText(/已保存快照：e2e-快照-B/)).toBeTruthy()
  })
})
