import { describe, expect, it } from 'vitest'
import { runLevel } from '../game/sim'
import { level05 } from './level-05'

describe('第五关', () => {
  it('15×20 地图，没有预置任何元件，端口由玩家放', () => {
    expect(level05.cols).toBe(15)
    expect(level05.rows).toBe(20)
    expect(level05.cells.every((cell) => cell === null)).toBe(true)
    expect(level05.inputs).toEqual(['A', 'B'])
    expect(level05.outputs).toEqual(['C'])
    expect(level05.tools).toBeUndefined()
  })

  it('空地图时 C 一直是 0，两个 1 的组不通过', () => {
    const result = runLevel(level05)
    expect(result.passed).toBe(false)
    const failed = result.outcomes.filter((outcome) => !outcome.passed).map((outcome) => outcome.name)
    expect(failed).toEqual(['A=1 B=0 → C=1', 'A=0 B=1 → C=1'])
  })

  it('四组测试覆盖异或门真值表', () => {
    expect(level05.tests.map((test) => test.name)).toEqual([
      'A=0 B=0 → C=0',
      'A=1 B=0 → C=1',
      'A=0 B=1 → C=1',
      'A=1 B=1 → C=0',
    ])
  })
})
