import { describe, expect, it } from 'vitest'
import { runLevel } from '../game/sim'
import type { Cell } from '../game/types'
import { level12 } from './level-12'

const build = (entries: [number, number, Cell][]) => {
  const cells: (Cell | null)[] = new Array(100).fill(null)
  for (const [x, y, cell] of entries) cells[y * 10 + x] = cell
  return cells
}

/** 已知解法：5 个中继器串起来 */
const solution = build([
  [0, 0, { type: 'input', id: 'A' }],
  [1, 0, { type: 'wire' }],
  [2, 0, { type: 'repeater', dir: 1 }],
  [3, 0, { type: 'repeater', dir: 1 }],
  [4, 0, { type: 'repeater', dir: 1 }],
  [5, 0, { type: 'repeater', dir: 1 }],
  [6, 0, { type: 'repeater', dir: 1 }],
  [7, 0, { type: 'output', id: 'Y' }],
])

/** 只延迟 3 tick，早了 */
const wrong = build([
  [0, 0, { type: 'input', id: 'A' }],
  [1, 0, { type: 'wire' }],
  [2, 0, { type: 'repeater', dir: 1 }],
  [3, 0, { type: 'repeater', dir: 1 }],
  [4, 0, { type: 'repeater', dir: 1 }],
  [5, 0, { type: 'output', id: 'Y' }],
])

describe('第十二关 脉冲延迟器', () => {
  it('10×10，端口玩家自己放', () => {
    expect(level12.cols).toBe(10)
    expect(level12.rows).toBe(10)
    expect(level12.inputs).toEqual(['A'])
    expect(level12.outputs).toEqual(['Y'])
    expect(level12.cells.filter(Boolean)).toHaveLength(0)
  })

  it('空地图通不过', () => {
    expect(runLevel(level12).passed).toBe(false)
  })

  it('参考解法能通过全部测试', () => {
    expect(runLevel({ ...level12, cells: solution }).passed).toBe(true)
  })

  it('延迟不够通不过', () => {
    const run = runLevel({ ...level12, cells: wrong })
    expect(run.passed).toBe(false)
    expect(run.outcomes[0].failures.some((f) => f.tick === 20)).toBe(true)
  })
})
