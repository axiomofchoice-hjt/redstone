import { describe, expect, it } from 'vitest'
import { runLevel } from '../game/sim'
import type { Cell } from '../game/types'
import { level17 } from './level-17'

const build = (entries: [number, number, Cell][]) => {
  const cells: (Cell | null)[] = new Array(100).fill(null)
  for (const [x, y, cell] of entries) cells[y * 10 + x] = cell
  return cells
}

const wires = (pts: [number, number][]): [number, number, Cell][] =>
  pts.map(([x, y]) => [x, y, { type: 'wire' }])

/** 把 J 直接接到 Y 上：J 一松就跟着掉，不会记住，也不认时钟 */
const follower = build([
  [0, 0, { type: 'input', id: 'J' }],
  ...wires([
    [1, 0],
    [2, 0],
  ]),
  [3, 0, { type: 'output', id: 'Y' }],
  [0, 5, { type: 'input', id: 'K' }],
  [5, 5, { type: 'input', id: 'C' }],
])

describe('第十七关 JK 触发器', () => {
  it('10×10，端口玩家自己放', () => {
    expect(level17.cols).toBe(10)
    expect(level17.rows).toBe(10)
    expect(level17.inputs).toEqual(['J', 'K', 'C'])
    expect(level17.outputs).toEqual(['Y'])
    expect(level17.cells.filter(Boolean)).toHaveLength(0)
    expect(level17.tests.map((t) => t.name)).toEqual([
      '上升沿置位、复位，之后保持',
      'C 高电平期间改 J、K 都不跟，下降沿也不动',
      'J=K=1 时每个上升沿翻一次，C 一直高着也只翻一次',
      'J、K 先改好，等下一个上升沿才生效',
    ])
  })

  it('空地图通不过', () => {
    expect(runLevel(level17).passed).toBe(false)
  })

  it('只跟着 J 走的电路通不过（不认时钟、也记不住）', () => {
    const run = runLevel({ ...level17, cells: follower })
    expect(run.passed).toBe(false)
    expect(run.outcomes[0].passed).toBe(false)
  })
})
