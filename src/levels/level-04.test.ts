import { describe, expect, it } from 'vitest'
import { runLevel } from '../game/sim'
import { level04 } from './level-04'

describe('第四关', () => {
  it('10×10 地图，没有预置任何元件，端口由玩家放', () => {
    expect(level04.cols).toBe(10)
    expect(level04.rows).toBe(10)
    expect(level04.cells.every((cell) => cell === null)).toBe(true)
    expect(level04.inputs).toEqual(['A', 'B'])
    expect(level04.outputs).toEqual(['C'])
    expect(level04.tools).toBeUndefined()
  })

  it('空地图时 C 一直是 0，只有 1+1 那组不通过', () => {
    const result = runLevel(level04)
    expect(result.passed).toBe(false)
    const failed = result.outcomes.filter((outcome) => !outcome.passed).map((outcome) => outcome.name)
    expect(failed).toEqual(['A=1 B=1 → C=1'])
  })

  it('四组测试覆盖与门真值表', () => {
    expect(level04.tests.map((test) => test.name)).toEqual([
      'A=0 B=0 → C=0',
      'A=1 B=0 → C=0',
      'A=0 B=1 → C=0',
      'A=1 B=1 → C=1',
    ])
  })
})
