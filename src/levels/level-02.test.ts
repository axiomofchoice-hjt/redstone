import { describe, expect, it } from 'vitest'
import { runLevel } from '../game/sim'
import { level02 } from './level-02'

const wired = () => {
  const cells = level02.cells.slice()
  for (const [x, y] of [
    [2, 2],
    [2, 3],
    [2, 4],
    [3, 3],
    [4, 3],
  ]) {
    cells[y * 7 + x] = { type: 'wire' }
  }
  return { ...level02, cells }
}

describe('第二关', () => {
  it('是 7×7 地图，A、B 在第 2、4 行第 1 列，C 在第 3 行第 5 列，全部锁定', () => {
    expect(level02.cols).toBe(7)
    expect(level02.rows).toBe(7)
    expect(level02.cells[2 * 7 + 1]).toEqual({ type: 'input', id: 'A', locked: true })
    expect(level02.cells[4 * 7 + 1]).toEqual({ type: 'input', id: 'B', locked: true })
    expect(level02.cells[3 * 7 + 5]).toEqual({ type: 'output', id: 'C', locked: true })
    expect(level02.tools).toEqual(['wire'])
  })

  it('只有 A、B 时 C 一直是 0，1 的三组都不通过', () => {
    const result = runLevel(level02)
    expect(result.passed).toBe(false)
    const failed = result.outcomes.filter((outcome) => !outcome.passed).map((outcome) => outcome.name)
    expect(failed).toEqual(['A=1 B=0 → C=1', 'A=0 B=1 → C=1', 'A=1 B=1 → C=1'])
  })

  it('用导线把 A、B 都接到 C 后通过', () => {
    expect(runLevel(wired()).passed).toBe(true)
  })

  it('断开 A 的连线后，A=1 的两组不通过', () => {
    const broken = wired()
    broken.cells[2 * 7 + 2] = null
    const result = runLevel(broken)
    expect(result.passed).toBe(false)
    expect(result.outcomes.find((outcome) => outcome.name === 'A=1 B=0 → C=1')?.passed).toBe(false)
    expect(result.outcomes.find((outcome) => outcome.name === 'A=0 B=1 → C=1')?.passed).toBe(true)
  })
})
