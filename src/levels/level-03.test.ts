import { describe, expect, it } from 'vitest'
import { runLevel } from '../game/sim'
import { level03 } from './level-03'

const solved = () => {
  const cells = level03.cells.slice()
  cells[3 * 7 + 2] = { type: 'charger', dir: 1 }
  cells[3 * 7 + 3] = { type: 'not', dir: 1 }
  cells[3 * 7 + 4] = { type: 'wire' }
  return { ...level03, cells }
}

describe('第三关', () => {
  it('是 7×7 地图，A、B 同第一关的位置，只放开三种元件', () => {
    expect(level03.cols).toBe(7)
    expect(level03.rows).toBe(7)
    expect(level03.cells[3 * 7 + 1]).toEqual({ type: 'input', id: 'A', locked: true })
    expect(level03.cells[3 * 7 + 5]).toEqual({ type: 'output', id: 'B', locked: true })
    expect(level03.tools).toEqual(['wire', 'charger', 'not'])
  })

  it('什么都不放时 A=0 那组不通过', () => {
    const result = runLevel(level03)
    expect(result.passed).toBe(false)
    expect(result.outcomes[0].passed).toBe(false)
  })

  it('充能器 + 非门 + 导线接通后通过', () => {
    expect(runLevel(solved()).passed).toBe(true)
  })

  it('只用导线直连不是非门，两组都不通过', () => {
    const cells = level03.cells.slice()
    for (const x of [2, 3, 4]) cells[3 * 7 + x] = { type: 'wire' }
    const result = runLevel({ ...level03, cells })
    expect(result.passed).toBe(false)
    expect(result.outcomes.every((outcome) => !outcome.passed)).toBe(true)
  })
})
