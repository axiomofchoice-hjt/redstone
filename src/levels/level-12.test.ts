import { describe, expect, it } from 'vitest'
import { cloneLevel, runLevel, Simulation } from '../game/sim'
import type { Cell } from '../game/types'
import { level12 } from './level-12'
import { cellsFrom } from './solution-helpers'

const build = (entries: [number, number, Cell][]) => {
  const cells: (Cell | null)[] = new Array(100).fill(null)
  for (const [x, y, cell] of entries) cells[y * 10 + x] = cell
  return cells
}

/** 直连：什么脉冲都放过去 */
const wrong = build([
  [0, 0, { type: 'input', id: 'A' }],
  [1, 0, { type: 'wire' }],
  [2, 0, { type: 'output', id: 'Y' }],
])

/**
 * 只看首尾两拍：M = A(t-3) ∧ A(t-5)，再展宽 2 tick。
 * 孤立的 1 / 2 / 3 / 5 tick 脉冲都判对，但 1 0 1 这种中间断开的窄脉冲会被放过去。
 */
const endpointsOnly = cellsFrom(100, {
  0: { type: 'input', id: 'A' },
  1: { type: 'charger', dir: 1 },
  2: { type: 'not', dir: 1 },
  3: { type: 'wire' },
  4: { type: 'repeater', dir: 1 },
  5: { type: 'not', dir: 1 },
  6: { type: 'wire' },
  7: { type: 'wire' },
  8: { type: 'wire' },
  9: { type: 'output', id: 'Y' },
  10: { type: 'wire' },
  11: { type: 'repeater', dir: 1 },
  12: { type: 'repeater', dir: 1 },
  13: { type: 'not', dir: 1 },
  15: { type: 'wire' },
  16: { type: 'repeater', dir: 1 },
  17: { type: 'charger', dir: 1 },
  18: { type: 'wire' },
  25: { type: 'wire' },
  26: { type: 'repeater', dir: 1 },
  27: { type: 'repeater', dir: 1 },
  28: { type: 'wire' },
})

/** 前 15 tick 保持 A=0，再按位给出 A；返回第 20 tick 起 span 个 tick 的 Y（参考解应晚 5 tick） */
const filtered = (cells: (Cell | null)[], bits: string, span = 12): string => {
  const sim = new Simulation(cloneLevel({ ...level12, cells }))
  const a = '0'.repeat(15) + bits.padEnd(span + 5, '0')
  let y = ''
  for (let t = 0; t < 20 + span; t++) {
    // 和 runTest 一样：先设输入、再 step、再读输出
    sim.setInputs({ A: a[t] === '1' ? 1 : 0 })
    sim.step()
    if (t >= 20) y += sim.output('Y') ? '1' : '0'
  }
  return y
}

/** 题意：连续 3 tick 及以上的 1 原样保留，更窄的清成 0 */
const expected = (bits: string, span = 12): string =>
  bits
    .padEnd(span, '0')
    .replace(/1+/g, (run) => (run.length >= 3 ? run : '0'.repeat(run.length)))

describe('第十二关 脉冲过滤器', () => {
  it('10×10，端口玩家自己放', () => {
    expect(level12.cols).toBe(10)
    expect(level12.rows).toBe(10)
    expect(level12.inputs).toEqual(['A'])
    expect(level12.outputs).toEqual(['Y'])
    expect(level12.cells.filter(Boolean)).toHaveLength(0)
    expect(level12.tests.map((t) => t.name)).toEqual([
      '1 tick 脉冲不输出',
      '2 tick 脉冲不输出',
      '3 tick 脉冲通过',
      '5 tick 脉冲宽度不变',
      '两个 1 tick 脉冲隔 1 tick 不输出',
      '两个 2 tick 脉冲隔 1 tick 不输出',
      '宽脉冲后紧跟窄脉冲，只放行宽的',
    ])
  })

  it('空地图通不过', () => {
    expect(runLevel(level12).passed).toBe(false)
  })

  it('参考解法能通过全部测试', () => {
    expect(runLevel({ ...level12, cells: level12.solution!.cells }).passed).toBe(true)
  })

  it('参考解法对 8 tick 以内的任意波形都符合题意', () => {
    for (let len = 1; len <= 8; len++) {
      for (let mask = 0; mask < 1 << len; mask++) {
        const bits = mask.toString(2).padStart(len, '0')
        expect(filtered(level12.solution!.cells, bits), bits).toBe(expected(bits))
      }
    }
  })

  it('直连通不过（窄脉冲漏过去了）', () => {
    const run = runLevel({ ...level12, cells: wrong })
    expect(run.passed).toBe(false)
    const [short1, short2] = run.outcomes
    expect(short1.passed).toBe(false)
    expect(short2.passed).toBe(false)
  })

  it('只看首尾两拍通不过（孤立脉冲都对，相邻窄脉冲被放过去）', () => {
    expect(filtered(endpointsOnly, '101')).toBe('111000000000')
    const run = runLevel({ ...level12, cells: endpointsOnly })
    expect(run.passed).toBe(false)
    expect(run.outcomes.map((o) => o.passed)).toEqual([true, true, true, true, false, false, false])
  })
})
