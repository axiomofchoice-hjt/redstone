import { describe, expect, it } from 'vitest'
import { runLevel } from '../game/sim'
import type { Cell } from '../game/types'
import { level11 } from './level-11'

const cols = 10

const build = (entries: [number, number, Cell][]) => {
  const cells: (Cell | null)[] = new Array(cols * 10).fill(null)
  for (const [x, y, cell] of entries) cells[y * cols + x] = cell
  return cells
}

const wires = (points: [number, number][]) =>
  points.map(([x, y]): [number, number, Cell] => [x, y, { type: 'wire' }])

/**
 * 已知解法：Y = A ∧ ¬A(t-1)，与门用德摩根式 ¬(¬A ∨ ¬A1) 搭。
 * 后面再接 3 个中继器，把脉冲推到上升沿后第 5 tick。
 */
const solution = build([
  [0, 0, { type: 'input', id: 'A' }],
  ...wires([
    [1, 0],
    [1, 1],
    [1, 2],
    [4, 1],
    [4, 2],
  ]),
  [2, 1, { type: 'charger', dir: 1 }],
  [3, 1, { type: 'not', dir: 1 }],
  [2, 2, { type: 'repeater', dir: 1 }],
  [3, 2, { type: 'repeater', dir: 1 }],
  [5, 2, { type: 'charger', dir: 1 }],
  [6, 2, { type: 'not', dir: 2 }],
  [6, 3, { type: 'repeater', dir: 2 }],
  [6, 4, { type: 'repeater', dir: 2 }],
  [6, 5, { type: 'repeater', dir: 2 }],
  [6, 6, { type: 'output', id: 'Y' }],
])

/** 同样的电路但少了 3 个延迟中继器，脉冲落在边沿后第 2 tick */
const tooEarly = build([
  [0, 0, { type: 'input', id: 'A' }],
  ...wires([
    [1, 0],
    [1, 1],
    [1, 2],
    [4, 1],
    [4, 2],
    [7, 2],
  ]),
  [2, 1, { type: 'charger', dir: 1 }],
  [3, 1, { type: 'not', dir: 1 }],
  [2, 2, { type: 'repeater', dir: 1 }],
  [3, 2, { type: 'repeater', dir: 1 }],
  [5, 2, { type: 'charger', dir: 1 }],
  [6, 2, { type: 'not', dir: 1 }],
  [8, 2, { type: 'output', id: 'Y' }],
])

describe('第十一关 上升沿感应器', () => {
  it('10×10，输入 A、输出 Y 都由玩家放', () => {
    expect(level11.cols).toBe(10)
    expect(level11.rows).toBe(10)
    expect(level11.inputs).toEqual(['A'])
    expect(level11.outputs).toEqual(['Y'])
    expect(level11.tools).toBeUndefined()
    expect(level11.cells.filter(Boolean)).toHaveLength(0)
    expect(level11.tests.map((t) => t.name)).toEqual([
      '上升沿 → 1 tick 脉冲',
      '下降沿不出脉冲',
      '两个上升沿各出一个脉冲',
    ])
  })

  it('空地图通不过', () => {
    const run = runLevel(level11)
    expect(run.passed).toBe(false)
    expect(run.outcomes[0].passed).toBe(false)
  })

  it('脉冲在第 5 tick 的解法能通过全部测试', () => {
    expect(runLevel({ ...level11, cells: solution }).passed).toBe(true)
  })

  it('脉冲来得太早通不过', () => {
    const run = runLevel({ ...level11, cells: tooEarly })
    expect(run.passed).toBe(false)
    expect(run.outcomes[0].failures.some((f) => f.tick === 14)).toBe(true)
  })
})
