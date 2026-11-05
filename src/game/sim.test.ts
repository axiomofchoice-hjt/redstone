import { describe, expect, it } from 'vitest'
import { runLevel, Simulation } from './sim'
import type { Cell, Dir, Level, TestCase } from './types'

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

describe('中继器', () => {
  const level = makeLevel(
    3,
    1,
    [
      [0, 0, { type: 'input', id: 'A' }],
      [1, 0, { type: 'repeater', dir: 1 }],
      [2, 0, { type: 'output', id: 'L' }],
    ],
    [
      {
        name: '比充能器晚 1 tick',
        events: [{ tick: 0, values: { A: 1 } }, { tick: 3, values: { A: 0 } }],
        checks: [
          { tick: 0, outputs: { L: 0 } },
          { tick: 1, outputs: { L: 1 } },
          { tick: 3, outputs: { L: 1 } },
          { tick: 4, outputs: { L: 0 } },
        ],
      },
    ],
  )

  it('后面进，1 tick 后向前面输出', () => {
    expect(runLevel(level).passed).toBe(true)
  })

  it('前面接导线也能点亮', () => {
    const wired = makeLevel(
      4,
      1,
      [
        [0, 0, { type: 'input', id: 'A' }],
        [1, 0, { type: 'repeater', dir: 1 }],
        [2, 0, { type: 'wire' }],
        [3, 0, { type: 'output', id: 'L' }],
      ],
      [{ name: '带导线', events: onAt(0, { A: 1 }), checks: checkAt(1, { L: 1 }) }],
    )
    expect(runLevel(wired).passed).toBe(true)
  })

  it('能当作非门的输入', () => {
    const toNot = makeLevel(
      4,
      1,
      [
        [0, 0, { type: 'input', id: 'A' }],
        [1, 0, { type: 'repeater', dir: 1 }],
        [2, 0, { type: 'not' }],
        [3, 0, { type: 'output', id: 'L' }],
      ],
      [
        {
          name: '中继器后接非门',
          events: onAt(0, { A: 1 }),
          checks: [
            { tick: 0, outputs: { L: 1 } },
            { tick: 1, outputs: { L: 1 } },
            { tick: 2, outputs: { L: 0 } },
          ],
        },
      ],
    )
    expect(runLevel(toNot).passed).toBe(true)
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

it('后接上的回馈线不会让两个非门震荡', () => {
  const cols = 6
  const rows = 5
  const cells: (Cell | null)[] = new Array(cols * rows).fill(null)
  const put = (list: (Cell | null)[], x: number, y: number, c: Cell) => {
    list[y * cols + x] = c
  }
  put(cells, 1, 1, { type: 'not' })
  put(cells, 2, 1, { type: 'charger', dir: 1 })
  put(cells, 3, 1, { type: 'not' })

  const base: Level = { id: 'latch', name: 'latch', cols, rows, cells, tests: [] }
  const first = new Simulation(base)
  first.step()
  first.step()
  expect(first.snapshot().powers[1 * cols + 1]).toBe(1)
  expect(first.snapshot().powers[1 * cols + 3]).toBe(0)

  const next = cells.slice()
  put(next, 3, 2, { type: 'wire' })
  put(next, 3, 3, { type: 'wire' })
  put(next, 2, 3, { type: 'wire' })
  put(next, 1, 3, { type: 'wire' })
  put(next, 1, 2, { type: 'charger', dir: 0 })

  const second = new Simulation({ ...base, cells: next }, first)
  for (let t = 0; t < 6; t++) {
    const powers = second.snapshot().powers
    expect(powers[1 * cols + 1]).toBe(1)
    expect(powers[1 * cols + 3]).toBe(0)
    second.step()
  }
})

it('新放的非门若当下被充能，直接就是关，不先亮一个 tick', () => {
  const cols = 5
  const rows = 3
  const cells: (Cell | null)[] = new Array(cols * rows).fill(null)
  cells[1 * cols + 1] = { type: 'not' }
  cells[1 * cols + 2] = { type: 'charger', dir: 1 }

  const base: Level = { id: 'fresh', name: 'fresh', cols, rows, cells, tests: [] }
  const first = new Simulation(base)
  first.step()
  first.step()

  const next = cells.slice()
  next[1 * cols + 3] = { type: 'not' }
  const second = new Simulation({ ...base, cells: next }, first)
  expect(second.snapshot().powers[1 * cols + 3]).toBe(0)
})

describe('增量更新', () => {
  it('逐 tick 与全量算法的结果逐格一致', () => {
    let seed = 20261105
    const rnd = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648
      return seed / 2147483648
    }
    const types: Cell['type'][] = ['wire', 'cross', 'charger', 'repeater', 'not']

    for (let round = 0; round < 30; round++) {
      const cols = 7
      const rows = 5
      const cells: (Cell | null)[] = new Array(cols * rows).fill(null)
      for (let i = 0; i < cells.length; i++) {
        if (rnd() > 0.42) continue
        cells[i] = {
          type: types[Math.floor(rnd() * types.length)],
          dir: Math.floor(rnd() * 4) as Dir,
        }
      }
      cells[0] = { type: 'input', id: 'A' }
      cells[cells.length - 1] = { type: 'output', id: 'L' }

      const level: Level = { id: `r${round}`, name: 'random', cols, rows, cells, tests: [] }
      const sim = new Simulation(level)

      // 对照：同一时刻用原来的全量算法再算一遍
      const compare = () => {
        const full = sim.snapshotFull()
        if (!full.stable) return
        const now = sim.snapshot()
        expect(now.powers, `round ${round}`).toEqual(full.powers)
        expect(now.outputs, `round ${round}`).toEqual(full.outputs)
      }

      compare()
      for (let t = 0; t < 25; t++) {
        if (rnd() < 0.3) sim.setInputs({ A: rnd() < 0.5 ? 1 : 0 })
        sim.step()
        compare()
      }
    }
  })
})
