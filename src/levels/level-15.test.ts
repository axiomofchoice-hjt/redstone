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

/** 把 D 直接接到 Y 上：E 开着时看着对，E 一关就不记得了 */
const follower = build([
  [0, 0, { type: 'input', id: 'D' }],
  [5, 5, { type: 'input', id: 'E' }],
  ...wires([
    [1, 0],
    [2, 0],
  ]),
  [3, 0, { type: 'output', id: 'Y' }],
])

describe('第十五关 D 锁存器', () => {
  it('10×10，端口玩家自己放', () => {
    expect(level15.cols).toBe(10)
    expect(level15.rows).toBe(10)
    expect(level15.inputs).toEqual(['D', 'E'])
    expect(level15.outputs).toEqual(['Y'])
    expect(level15.cells.filter(Boolean)).toHaveLength(0)
    expect(level15.tests.map((t) => t.name)).toEqual([
      'E 开着，Y 跟着 D 变',
      'E 关着，D 怎么变都保持 1',
      'E 关着，D 怎么变都保持 0',
      '锁住以后再开 E，跟上当下的 D',
    ])
  })

  it('空地图通不过', () => {
    expect(runLevel(level15).passed).toBe(false)
  })

  it('只会跟着 D 走的电路通不过（记不住）', () => {
    const run = runLevel({ ...level15, cells: follower })
    expect(run.passed).toBe(false)
    expect(run.outcomes[0].passed).toBe(true)
    expect(run.outcomes[1].passed).toBe(false)
  })
})
