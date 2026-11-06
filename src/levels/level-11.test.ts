import { describe, expect, it } from 'vitest'
import { runLevel } from '../game/sim'
import type { Cell } from '../game/types'
import { level11 } from './level-11'

const build = (entries: [number, number, Cell][]) => {
  const cells: (Cell | null)[] = new Array(100).fill(null)
  for (const [x, y, cell] of entries) cells[y * 10 + x] = cell
  return cells
}

const wires = (pts: [number, number][]): [number, number, Cell][] =>
  pts.map(([x, y]) => [x, y, { type: 'wire' }])

/** 已知解法：Y = A(t) ∨ A(t-1) ∨ A(t-2)，三次复制都用充能器隔开 */
const solution = build([
  [0, 0, { type: 'input', id: 'A' }],
  ...wires([
    [1, 0],
    [3, 0],
    [3, 2],
    [3, 4],
    [4, 4],
    [5, 0],
    [5, 1],
    [5, 2],
    [5, 3],
    [5, 4],
  ]),
  [2, 0, { type: 'charger', dir: 1 }],
  [4, 0, { type: 'charger', dir: 1 }],
  [3, 1, { type: 'repeater', dir: 2 }],
  [3, 3, { type: 'repeater', dir: 2 }],
  [4, 2, { type: 'charger', dir: 1 }],
  [6, 2, { type: 'output', id: 'Y' }],
])

/** 只延迟不延长：宽度不变，过不了 */
const wrong = build([
  [0, 0, { type: 'input', id: 'A' }],
  [1, 0, { type: 'wire' }],
  [2, 0, { type: 'repeater', dir: 1 }],
  [3, 0, { type: 'output', id: 'Y' }],
])

describe('第十一关 脉冲延长器', () => {
  it('10×10，端口玩家自己放', () => {
    expect(level11.cols).toBe(10)
    expect(level11.rows).toBe(10)
    expect(level11.inputs).toEqual(['A'])
    expect(level11.outputs).toEqual(['Y'])
    expect(level11.cells.filter(Boolean)).toHaveLength(0)
    expect(level11.tests.map((t) => t.name)).toEqual([
      '1 tick 脉冲变 3 tick',
      '3 tick 脉冲变 5 tick',
      '两个脉冲不会粘成一个',
    ])
  })

  it('空地图通不过', () => {
    expect(runLevel(level11).passed).toBe(false)
  })

  it('参考解法能通过全部测试', () => {
    expect(runLevel({ ...level11, cells: solution }).passed).toBe(true)
  })

  it('只延迟不延长通不过', () => {
    const run = runLevel({ ...level11, cells: wrong })
    expect(run.passed).toBe(false)
    expect(run.outcomes[0].failures.some((f) => f.tick === 17)).toBe(true)
  })
})
