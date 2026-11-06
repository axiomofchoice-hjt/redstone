import { describe, expect, it } from 'vitest'
import { runLevel, Simulation } from '../game/sim'
import type { Cell } from '../game/types'
import { level09 } from './level-09'

const cols = 10

const build = (entries: [number, number, Cell][]) => {
  const cells: (Cell | null)[] = new Array(cols * 10).fill(null)
  for (const [x, y, cell] of entries) cells[y * cols + x] = cell
  return cells
}

const wires = (points: [number, number][]) =>
  points.map(([x, y]): [number, number, Cell] => [x, y, { type: 'wire' }])

/**
 * 已知的 2 tick 高、2 tick 低解法：非门 + 中继器（各 1 tick 延迟）绕成一圈，
 * 输出接到这条环上。环延迟 2 tick，信号周期就是 4。
 */
const solution = build([
  [1, 1, { type: 'repeater', dir: 1 }],
  [2, 1, { type: 'not', dir: 2 }],
  ...wires([
    [2, 2],
    [2, 3],
    [1, 3],
    [0, 3],
    [0, 2],
    [0, 1],
    [0, 4],
    [0, 5],
    [0, 6],
    [0, 7],
    [0, 8],
  ]),
  [0, 9, { type: 'output', id: 'Y' }],
])

/** 只有非门 1 tick 延迟的环，周期 2：1 tick 高、1 tick 低 */
const quick = build([
  [1, 1, { type: 'charger', dir: 1 }],
  [2, 1, { type: 'not', dir: 2 }],
  ...wires([
    [2, 2],
    [2, 3],
    [1, 3],
    [0, 3],
    [0, 2],
    [0, 1],
  ]),
  [0, 4, { type: 'output', id: 'Y' }],
])

const sequence = (cells: (Cell | null)[]) => {
  const sim = new Simulation({ ...level09, cells })
  let out = ''
  for (let t = 0; t < 26; t++) {
    sim.step()
    out += sim.output('Y') ? '1' : '0'
  }
  return out
}

describe('第九关 时钟', () => {
  it('10×10，一个输出 Y，地图是空的', () => {
    expect(level09.cols).toBe(10)
    expect(level09.rows).toBe(10)
    expect(level09.outputs).toEqual(['Y'])
    expect(level09.cells.filter(Boolean)).toHaveLength(0)
    expect(level09.tests).toHaveLength(1)
  })

  it('检查的是间隔 2 相反、间隔 4 相同', () => {
    const pairs = level09.tests[0].pairs ?? []
    expect(pairs).toHaveLength(16)
    for (const pair of pairs) {
      const gap = pair.ticks[1] - pair.ticks[0]
      expect([2, 4]).toContain(gap)
      expect(pair.allow).toEqual(
        gap === 2
          ? [
              [0, 1],
              [1, 0],
            ]
          : [
              [0, 0],
              [1, 1],
            ],
      )
    }
  })

  it('空地图通不过', () => {
    expect(runLevel(level09).passed).toBe(false)
  })

  it('2 tick 高、2 tick 低能通过', () => {
    expect(sequence(solution)).toBe('11001100110011001100110011')
    expect(runLevel({ ...level09, cells: solution }).passed).toBe(true)
  })

  it('1 tick 高、1 tick 低通不过', () => {
    const run = runLevel({ ...level09, cells: quick })
    expect(run.passed).toBe(false)
    const pair = run.outcomes[0].failures[0].pair
    expect(pair && pair.ticks[1] - pair.ticks[0]).toBe(2)
  })
})
