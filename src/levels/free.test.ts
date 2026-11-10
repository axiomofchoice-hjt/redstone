import { describe, expect, it } from 'vitest'
import { freeLevel, isFreeLevel } from './free'
import { LEVELS } from './index'
import { runLevel } from '../game/sim'

describe('自由模式', () => {
  it('是不会出现在选关列表里的空地图', () => {
    expect(LEVELS.some((level) => level.id === freeLevel.id)).toBe(false)
    expect(freeLevel.cols).toBe(20)
    expect(freeLevel.rows).toBe(20)
    expect(freeLevel.cells).toHaveLength(400)
    expect(freeLevel.cells.every((cell) => cell === null)).toBe(true)
    expect(freeLevel.inputs ?? []).toEqual([])
    expect(freeLevel.outputs ?? []).toEqual([])
    expect(freeLevel.tests).toEqual([])
  })

  it('没有测试：跑测试是空跑，靠 isFreeLevel 把这些入口收起来', () => {
    expect(runLevel(freeLevel).outcomes).toEqual([])
    expect(isFreeLevel(freeLevel)).toBe(true)
    expect(isFreeLevel(LEVELS[0])).toBe(false)
  })
})
