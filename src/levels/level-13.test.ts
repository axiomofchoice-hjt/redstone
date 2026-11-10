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

/** 只有上升沿感应（第十一关那套），用来确认下降沿确实被检查 */
const risingOnly = build([
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

describe('第十三关 双边沿感应器', () => {
  it('10×10，端口玩家自己放', () => {
    expect(level13.cols).toBe(10)
    expect(level13.rows).toBe(10)
    expect(level13.inputs).toEqual(['A'])
    expect(level13.outputs).toEqual(['Y'])
    expect(level13.cells.filter(Boolean)).toHaveLength(0)
    expect(level13.tests.map((t) => t.name)).toEqual([
      '上升沿出脉冲',
      '下降沿也出脉冲',
      '连续翻转各出一次',
      '一直高电平只出一次',
    ])
  })

  it('空地图通不过', () => {
    expect(runLevel(level13).passed).toBe(false)
  })

  it('参考解能过', () => {
    const run = runLevel({ ...level13, cells: level13.solution!.cells })
    expect(run.outcomes.map((o) => [o.name, o.passed])).toEqual(
      level13.tests.map((t) => [t.name, true]),
    )
    expect(run.passed).toBe(true)
  })

  it('只认上升沿的电路通不过（漏掉下降沿）', () => {
    const run = runLevel({ ...level13, cells: risingOnly })
    expect(run.passed).toBe(false)
    expect(run.outcomes[0].passed).toBe(true)
    expect(run.outcomes[1].passed).toBe(false)
  })
})
