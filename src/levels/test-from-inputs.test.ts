import { describe, expect, it } from 'vitest'
import { runLevel, Simulation } from '../game/sim'
import type { Level, TestCase } from '../game/types'
import { LEVELS } from '.'

/** 这一组测试在第 0 tick 没设到的输入（会继承编辑器里玩家打开的输入） */
const inputsNotSetAtStart = (level: Level, test: TestCase): string[] => {
  const set = new Set<string>()
  for (const event of test.events ?? []) {
    if (event.tick !== 0) continue
    for (const id of Object.keys(event.values)) set.add(id)
  }
  return (level.inputs ?? []).filter((id) => !set.has(id))
}

/**
 * 每组测试都必须自己把输入设全：玩家可能先把某个输入打开再点「运行测试」，
 * 不能因为编辑器里留下的输入值让测试结果变掉。
 */
describe('每组测试都自己设输入', () => {
  for (const level of LEVELS) {
    it(`第 ${level.no} 关`, () => {
      for (const test of level.tests) {
        expect(inputsNotSetAtStart(level, test), `${level.id} · ${test.name}`).toEqual([])
      }
    })
  }
})

describe('从任意输入状态点「运行测试」', () => {
  for (const level of LEVELS) {
    if (!level.solution) continue
    it(`第 ${level.no} 关：输入全开跑一阵，测试照样全过`, () => {
      const cells = level.solution!.cells.map((cell) => (cell ? { ...cell } : null))
      const sim = new Simulation({ ...level, cells })

      const allOn: Record<string, 0 | 1> = {}
      for (const id of level.inputs ?? []) allOn[id] = 1
      sim.setInputs(allOn)
      for (let i = 0; i < 30; i++) sim.step()

      const run = runLevel({ ...level, cells }, sim)
      expect(run.passed).toBe(true)
    })
  }
})
