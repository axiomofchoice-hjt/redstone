import { describe, expect, it } from 'vitest'
import { runLevel } from '../game/sim'
import { level07 } from './level-07'

describe('第七关', () => {
  it('15×20 地图，没有预置任何元件，端口由玩家放', () => {
    expect(level07.cols).toBe(15)
    expect(level07.rows).toBe(20)
    expect(level07.cells.every((cell) => cell === null)).toBe(true)
    expect(level07.inputs).toEqual(['A', 'B', 'C'])
    expect(level07.outputs).toEqual(['Y'])
    expect(level07.tools).toBeUndefined()
  })

  it('空地图时 Y 一直是 0，四个多数为 1 的组不通过', () => {
    const result = runLevel(level07)
    expect(result.passed).toBe(false)
    const failed = result.outcomes.filter((outcome) => !outcome.passed).map((outcome) => outcome.name)
    expect(failed).toEqual(['0 1 1 → 1', '1 0 1 → 1', '1 1 0 → 1', '1 1 1 → 1'])
  })

  it('八组测试覆盖三人多数表决真值表', () => {
    expect(level07.tests.map((test) => test.name)).toEqual([
      '0 0 0 → 0',
      '0 0 1 → 0',
      '0 1 0 → 0',
      '0 1 1 → 1',
      '1 0 0 → 0',
      '1 0 1 → 1',
      '1 1 0 → 1',
      '1 1 1 → 1',
    ])
  })
})
