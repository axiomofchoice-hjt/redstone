import { describe, expect, it } from 'vitest'
import { runLevel } from '../game/sim'
import { level06 } from './level-06'

describe('第六关', () => {
  it('15×20 地图，没有预置任何元件，端口由玩家放', () => {
    expect(level06.cols).toBe(15)
    expect(level06.rows).toBe(20)
    expect(level06.cells.every((cell) => cell === null)).toBe(true)
    expect(level06.inputs).toEqual(['A', 'B'])
    expect(level06.outputs).toEqual(['S', 'C'])
    expect(level06.tools).toBeUndefined()
  })

  it('空地图时 S、C 都是 0，三个要 1 的组不通过', () => {
    const result = runLevel(level06)
    expect(result.passed).toBe(false)
    const failed = result.outcomes.filter((outcome) => !outcome.passed).map((outcome) => outcome.name)
    expect(failed).toEqual(['A=1 B=0 → S=1 C=0', 'A=0 B=1 → S=1 C=0', 'A=1 B=1 → S=0 C=1'])
  })

  it('四组测试覆盖半加器真值表', () => {
    expect(level06.tests.map((test) => test.name)).toEqual([
      'A=0 B=0 → S=0 C=0',
      'A=1 B=0 → S=1 C=0',
      'A=0 B=1 → S=1 C=0',
      'A=1 B=1 → S=0 C=1',
    ])
  })
})
