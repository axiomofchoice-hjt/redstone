import { describe, expect, it } from 'vitest'
import type { Level, TestCase } from '../game/types'
import { LEVELS } from '.'

/** 这一组测试在第 0 tick 没设到的输入 */
const inputsNotSetAtStart = (level: Level, test: TestCase): string[] => {
  const set = new Set<string>()
  for (const event of test.events ?? []) {
    if (event.tick !== 0) continue
    for (const id of Object.keys(event.values)) set.add(id)
  }
  return (level.inputs ?? []).filter((id) => !set.has(id))
}

/**
 * 点「测试」是冷启动跑的：输入从 0 开始，没写到的输入就一直是 0。
 * 每组测试还是把用到的输入在第 0 tick 写全，别隐式依赖这个初始值。
 */
describe('每组测试都自己把输入设全', () => {
  for (const level of LEVELS) {
    it(`第 ${level.no} 关`, () => {
      for (const test of level.tests) {
        expect(inputsNotSetAtStart(level, test), `${level.id} · ${test.name}`).toEqual([])
      }
    })
  }
})
