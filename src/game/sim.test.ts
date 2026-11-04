import { describe, expect, it } from 'vitest'
import { runLevel } from './sim'
import type { Cell, Level, TestCase } from './types'

function makeLevel(
  cols: number,
  rows: number,
  entries: [number, number, Cell][],
  tests: TestCase[],
): Level {
  const cells = new Array<Cell | null>(cols * rows).fill(null)
  for (const [x, y, cell] of entries) cells[y * cols + x] = cell
  return { id: 't', name: 't', cols, rows, cells, tests }
}

const onAt = (tick: number, values: Record<string, 0 | 1>): TestCase['events'] => [{ tick, values }]
const checkAt = (tick: number, outputs: Record<string, 0 | 1>): TestCase['checks'] => [{ tick, outputs }]

describe('导线', () => {
  const level = makeLevel(
    3,
    1,
    [
      [0, 0, { type: 'input', id: 'A' }],
      [1, 0, { type: 'wire' }],
      [2, 0, { type: 'output', id: 'L' }],
    ],
    [{ name: '直连', events: onAt(0, { A: 1 }), checks: checkAt(1, { L: 1 }) }],
  )

  it('同 tick 内传递，无延迟', () => {
    expect(runLevel(level).passed).toBe(true)
  })

  it('没有导线时输出为 0', () => {
    const broken = { ...level, cells: level.cells.map((c) => (c?.type === 'wire' ? null : c)) }
    expect(runLevel(broken).passed).toBe(false)
  })
})

describe('非门', () => {
  const level = makeLevel(
    4,
    1,
    [
      [0, 0, { type: 'input', id: 'A' }],
      [1, 0, { type: 'charger', dir: 1 }],
      [2, 0, { type: 'not', dir: 1 }],
      [3, 0, { type: 'output', id: 'L' }],
    ],
    [
      {
        name: '反相，延迟 1 tick',
        events: onAt(0, { A: 1 }),
        checks: [
          { tick: 0, outputs: { L: 1 } },
          { tick: 1, outputs: { L: 0 } },
        ],
      },
    ],
  )

  it('输入为 1 时，下一 tick 输出变 0', () => {
    expect(runLevel(level).passed).toBe(true)
  })

  it('没有充能器就没有输入，保持输出 1', () => {
    const noCharger = {
      ...level,
      cells: level.cells.map((c) => (c?.type === 'charger' ? null : c)),
    }
    const result = runLevel({
      ...noCharger,
      tests: [{ name: '无充能', events: onAt(0, { A: 1 }), checks: checkAt(3, { L: 1 }) }],
    })
    expect(result.passed).toBe(true)
  })
})

describe('交叉导线', () => {
  const level = makeLevel(
    3,
    3,
    [
      [0, 1, { type: 'input', id: 'A' }],
      [1, 0, { type: 'input', id: 'B' }],
      [1, 1, { type: 'cross' }],
      [2, 1, { type: 'output', id: 'L1' }],
      [1, 2, { type: 'output', id: 'L2' }],
    ],
    [
      { name: '只有横向', events: onAt(0, { A: 1, B: 0 }), checks: checkAt(1, { L1: 1, L2: 0 }) },
      { name: '只有纵向', events: onAt(0, { A: 0, B: 1 }), checks: checkAt(1, { L1: 0, L2: 1 }) },
    ],
  )

  it('上下与左右互不影响', () => {
    expect(runLevel(level).passed).toBe(true)
  })
})

describe('充能器', () => {
  it('只向前面输出，不向后面输出', () => {
    const level = makeLevel(
      3,
      1,
      [
        [0, 0, { type: 'input', id: 'A' }],
        [1, 0, { type: 'charger', dir: 1 }],
        [2, 0, { type: 'output', id: 'L' }],
      ],
      [{ name: '方向', events: onAt(0, { A: 1 }), checks: checkAt(1, { L: 1 }) }],
    )
    expect(runLevel(level).passed).toBe(true)
  })
})
