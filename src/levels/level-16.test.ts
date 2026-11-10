import { describe, expect, it } from 'vitest'
import { runLevel } from '../game/sim'
import type { Cell } from '../game/types'
import { level16 } from './level-16'

const build = (entries: [number, number, Cell][]) => {
  const cells: (Cell | null)[] = new Array(100).fill(null)
  for (const [x, y, cell] of entries) cells[y * 10 + x] = cell
  return cells
}

const wires = (pts: [number, number][]): [number, number, Cell][] =>
  pts.map(([x, y]) => [x, y, { type: 'wire' }])

/** 把 T 直接接到 Y 上：T 是 1 时就一直 1，不记状态也不翻转 */
const follower = build([
  [0, 0, { type: 'input', id: 'T' }],
  ...wires([
    [1, 0],
    [2, 0],
  ]),
  [3, 0, { type: 'output', id: 'Y' }],
])

describe('第十六关 T 触发器', () => {
  it('10×10，端口玩家自己放', () => {
    expect(level16.cols).toBe(10)
    expect(level16.rows).toBe(10)
    expect(level16.inputs).toEqual(['T'])
    expect(level16.outputs).toEqual(['Y'])
    expect(level16.cells.filter(Boolean)).toHaveLength(0)
    expect(level16.tests.map((t) => t.name)).toEqual([
      '每个上升沿翻一次，T 一直高着也只翻一次',
      'T 一直是 0 就一直保持',
      '窄脉冲也只翻一次，下降沿不动',
      'T 一直高着，隔多久也只翻一次',
    ])
  })

  it('空地图通不过', () => {
    expect(runLevel(level16).passed).toBe(false)
  })

  it('只跟着 T 走的电路通不过（不记状态、也不翻转）', () => {
    const run = runLevel({ ...level16, cells: follower })
    expect(run.passed).toBe(false)
    // T 还是 1 的时候 Y 不该掉下来
    expect(run.outcomes[2].passed).toBe(false)
  })
})
