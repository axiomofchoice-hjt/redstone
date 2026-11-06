import { describe, expect, it } from 'vitest'
import { runLevel } from '../game/sim'
import type { Cell } from '../game/types'
import { level15 } from './level-15'

const build = (entries: [number, number, Cell][]) => {
  const cells: (Cell | null)[] = new Array(100).fill(null)
  for (const [x, y, cell] of entries) cells[y * 10 + x] = cell
  return cells
}

const wires = (pts: [number, number][]): [number, number, Cell][] =>
  pts.map(([x, y]) => [x, y, { type: 'wire' }])

/** 参考解：两个 NOR 交叉反馈，Q = ¬(R ∨ Q̄)、Q̄ = ¬(S ∨ Q) */
const solution = build([
  [9, 1, { type: 'input', id: 'R' }],
  [9, 3, { type: 'input', id: 'S' }],
  ...wires([
    [4, 1],
    [5, 1],
    [6, 1],
    [7, 1],
    [8, 1],
    [2, 2],
    [2, 4],
    [2, 5],
    [3, 5],
    [4, 5],
    [5, 5],
    [6, 5],
    [7, 5],
    [7, 4],
    [7, 3],
    [8, 3],
    [4, 3],
  ]),
  [3, 1, { type: 'charger', dir: 3 }],
  [2, 1, { type: 'not', dir: 1 }],
  [1, 2, { type: 'output', id: 'Y' }],
  [2, 3, { type: 'charger', dir: 2 }],
  [6, 3, { type: 'charger', dir: 3 }],
  [5, 3, { type: 'not', dir: 1 }],
  [4, 2, { type: 'charger', dir: 0 }],
])

/** 只会跟着 S / R 走、没有记忆的电路 */
const follower = build([
  [9, 1, { type: 'input', id: 'R' }],
  [9, 3, { type: 'input', id: 'S' }],
  ...wires([
    [8, 1],
    [7, 1],
    [6, 1],
    [5, 1],
    [8, 3],
    [7, 3],
    [7, 2],
  ]),
  [7, 4, { type: 'output', id: 'Y' }],
])

describe('第十五关 RS 锁存器', () => {
  it('10×10，端口玩家自己放', () => {
    expect(level15.cols).toBe(10)
    expect(level15.rows).toBe(10)
    expect(level15.inputs).toEqual(['S', 'R'])
    expect(level15.outputs).toEqual(['Y'])
    expect(level15.cells.filter(Boolean)).toHaveLength(0)
    expect(level15.tests.map((t) => t.name)).toEqual([
      'R 复位后保持 0',
      'S 置位后保持 1',
      'R 再清 0 后保持',
      '来回翻，各认一次',
    ])
  })

  it('空地图通不过', () => {
    expect(runLevel(level15).passed).toBe(false)
  })

  it('参考解能过', () => {
    const run = runLevel({ ...level15, cells: solution })
    expect(run.outcomes.map((o) => [o.name, o.passed])).toEqual(
      level15.tests.map((t) => [t.name, true]),
    )
  })

  it('没有记忆的电路通不过', () => {
    const run = runLevel({ ...level15, cells: follower })
    expect(run.passed).toBe(false)
  })
})
