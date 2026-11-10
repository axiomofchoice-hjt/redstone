import { describe, expect, it } from 'vitest'
import { runLevel } from '../game/sim'
import type { Cell } from '../game/types'
import { level13 } from './level-13'

const build = (entries: [number, number, Cell][]) => {
  const cells: (Cell | null)[] = new Array(100).fill(null)
  for (const [x, y, cell] of entries) cells[y * 10 + x] = cell
  return cells
}

const wires = (pts: [number, number][]): [number, number, Cell][] =>
  pts.map(([x, y]) => [x, y, { type: 'wire' }])

/**
 * 已知解法：P = A(t-2) ∧ A(t-3) ∧ A(t-4)，再用三次复制把被截掉的头补回 2 tick。
 */
const solution = build([
  [0, 0, { type: 'input', id: 'A' }],
  ...wires([
    [1, 0],
    [2, 0],
    [3, 0],
    [4, 0],
    [5, 0],
    [6, 0],
    [2, 2],
    [2, 4],
    [4, 3],
    [5, 3],
    [6, 3],
    [6, 2],
    [5, 4],
    [5, 5],
    [4, 5],
    [5, 8],
    [3, 8],
    [3, 9],
    [4, 9],
    [6, 9],
    [8, 9],
    [9, 9],
    [9, 8],
    [7, 8],
    [7, 6],
    [8, 6],
    [9, 6],
    [9, 7],
  ]),
  [2, 1, { type: 'repeater', dir: 2 }],
  [2, 3, { type: 'repeater', dir: 2 }],
  [5, 1, { type: 'charger', dir: 2 }],
  [3, 2, { type: 'charger', dir: 1 }],
  [3, 4, { type: 'charger', dir: 1 }],
  [5, 2, { type: 'not', dir: 2 }],
  [4, 2, { type: 'not', dir: 2 }],
  [4, 4, { type: 'not', dir: 2 }],
  [5, 6, { type: 'charger', dir: 2 }],
  [5, 7, { type: 'not', dir: 2 }],
  [4, 8, { type: 'charger', dir: 3 }],
  [6, 8, { type: 'repeater', dir: 1 }],
  [7, 7, { type: 'charger', dir: 0 }],
  [8, 8, { type: 'repeater', dir: 1 }],
  [7, 9, { type: 'cross' }],
  [5, 9, { type: 'cross' }],
  [8, 5, { type: 'repeater', dir: 0 }],
  [8, 4, { type: 'output', id: 'Y' }],
])

/** 直连：什么脉冲都放过去 */
const wrong = build([
  [0, 0, { type: 'input', id: 'A' }],
  [1, 0, { type: 'wire' }],
  [2, 0, { type: 'output', id: 'Y' }],
])

describe('第十三关 脉冲过滤器', () => {
  it('10×10，端口玩家自己放', () => {
    expect(level13.cols).toBe(10)
    expect(level13.rows).toBe(10)
    expect(level13.inputs).toEqual(['A'])
    expect(level13.outputs).toEqual(['Y'])
    expect(level13.cells.filter(Boolean)).toHaveLength(0)
    expect(level13.tests.map((t) => t.name)).toEqual([
      '1 tick 脉冲不输出',
      '2 tick 脉冲不输出',
      '3 tick 脉冲通过',
      '5 tick 脉冲宽度不变',
    ])
  })

  it('空地图通不过', () => {
    expect(runLevel(level13).passed).toBe(false)
  })

  it('参考解法能通过全部测试', () => {
    expect(runLevel({ ...level13, cells: solution }).passed).toBe(true)
  })

  it('直连通不过（窄脉冲漏过去了）', () => {
    const run = runLevel({ ...level13, cells: wrong })
    expect(run.passed).toBe(false)
    const [short1, short2] = run.outcomes
    expect(short1.passed).toBe(false)
    expect(short2.passed).toBe(false)
  })
})
