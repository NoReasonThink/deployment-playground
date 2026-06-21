import { describe, expect, it } from 'vitest'
import { buildNodeData } from '../data/catalog'
import type { PlaygroundNode } from '../types'
import { applyHeatmapStyle } from './heatmap'

describe('applyHeatmapStyle', () => {
  it('does not preserve stale React Flow wrapper styles from saved drafts', () => {
    const nodes: PlaygroundNode[] = [
      {
        id: 'cdn-1',
        type: 'default',
        position: { x: 0, y: 0 },
        style: {
          background: '#dcfce7',
          border: '2px solid #22c55e',
          borderRadius: 12,
          padding: 8,
          minWidth: 170,
        },
        data: buildNodeData('cdn'),
      },
    ]

    const [node] = applyHeatmapStyle(nodes, 'cpu')

    expect(node.style).toEqual({
      borderColor: expect.any(String),
    })
  })
})
