import { describe, expect, it } from 'vitest'
import { runLevel } from '../game/sim'
import type { Cell } from '../game/types'
import { level19 } from './level-19'

const size = 20

const build = (entries: [number, number, Cell][]): (Cell | null)[] => {
  const cells: (Cell | null)[] = new Array(size * size).fill(null)
  for (const [x, y, cell] of entries) cells[y * size + x] = cell
  return cells
}

/** P 四面直接贴着四个输出：P 高就四个全亮、落沿就全灭，分不出脉冲长短 */
const follower = build([
  [1, 1, { type: 'input', id: 'P' }],
  [0, 1, { type: 'output', id: '1' }],
  [2, 1, { type: 'output', id: '2' }],
  [1, 0, { type: 'output', id: '3' }],
  [1, 2, { type: 'output', id: '4' }],
])

describe('第十九关 脉冲长度感应器', () => {
  it('20×20，端口玩家自己放', () => {
    expect(level19.cols).toBe(20)
    expect(level19.rows).toBe(20)
    expect(level19.inputs).toEqual(['P'])
    expect(level19.outputs).toEqual(['1', '2', '3', '4'])
    expect(level19.cells.filter(Boolean)).toHaveLength(0)
    expect(level19.tests.map((t) => t.name)).toEqual([
      'P 高 1 tick → 只有输出 1',
      'P 高 2 tick → 只有输出 2',
      'P 高 3 tick → 只有输出 3',
      'P 高 4 tick → 只有输出 4',
      '依次来 4、1、4、2 tick 的脉冲，高电平期间保持上一个结果',
    ])
  })

  it('空地图通不过', () => {
    expect(runLevel(level19).passed).toBe(false)
  })

  it('把 P 直接接到四个输出上通不过（分不出长短）', () => {
    const run = runLevel({ ...level19, cells: follower })
    expect(run.passed).toBe(false)
    // 落沿之后应该还有一路亮着，这里四个都灭了
    expect(run.outcomes[0].passed).toBe(false)
  })
})
