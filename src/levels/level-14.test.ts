import { describe, expect, it } from 'vitest'
import { runLevel } from '../game/sim'
import type { Cell } from '../game/types'
import { level14 } from './level-14'

const build = (entries: [number, number, Cell][]) => {
  const cells: (Cell | null)[] = new Array(100).fill(null)
  for (const [x, y, cell] of entries) cells[y * 10 + x] = cell
  return cells
}

const wires = (pts: [number, number][]): [number, number, Cell][] =>
  pts.map(([x, y]) => [x, y, { type: 'wire' }])

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

describe('第十四关 RS 锁存器', () => {
  it('10×10，端口玩家自己放', () => {
    expect(level14.cols).toBe(10)
    expect(level14.rows).toBe(10)
    expect(level14.inputs).toEqual(['S', 'R'])
    expect(level14.outputs).toEqual(['Y'])
    expect(level14.cells.filter(Boolean)).toHaveLength(0)
    expect(level14.tests.map((t) => t.name)).toEqual([
      'R 复位后保持 0',
      'S 置位后保持 1',
      'R 再清 0 后保持',
      '来回翻，各认一次',
    ])
  })

  it('空地图通不过', () => {
    expect(runLevel(level14).passed).toBe(false)
  })

  it('参考解能过', () => {
    const run = runLevel({ ...level14, cells: level14.solution!.cells })
    expect(run.outcomes.map((o) => [o.name, o.passed])).toEqual(
      level14.tests.map((t) => [t.name, true]),
    )
  })

  it('没有记忆的电路通不过', () => {
    const run = runLevel({ ...level14, cells: follower })
    expect(run.passed).toBe(false)
  })
})
