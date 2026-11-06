import { describe, expect, it } from 'vitest'
import { runLevel, Simulation } from '../game/sim'
import { LEVELS } from '../levels'
import { level14 } from '../levels/level-14'
import { level16 } from '../levels/level-16'
import { solutionCells, solutionMap } from './solution'

/** 有参考解的关卡，以后新加的关也自动带上 */
const withSolutions = LEVELS.filter((level) => level.solution)

describe('菜单里的参考答案', () => {
  it('没有参考解的关卡给 null（按钮灰掉）', () => {
    expect(solutionCells(level16)).toBeNull()
  })

  it('有参考解的关卡，格数和地图一样', () => {
    for (const level of withSolutions) {
      expect(solutionCells(level)).toHaveLength(level.cols * level.rows)
    }
  })

  it('每次给的是一份副本，盖完再改不会动到关卡数据', () => {
    const map = solutionMap(level14)!
    const first = map.cells.findIndex(Boolean)
    expect(map.cells[first]).not.toBe(level14.solution!.cells[first])
    map.cells[first] = null
    expect(level14.solution!.cells[first]).not.toBeNull()

    expect(map.state.inputs).not.toBe(level14.solution!.state.inputs)
    map.state.inputs.A = 0
    expect(level14.solution!.state.inputs.A).toBe(1)
  })

  it('恢复参考解保存时的电路状态', () => {
    for (const level of withSolutions) {
      const map = solutionMap(level)!
      const sim = new Simulation({ ...level, cells: map.cells })
      sim.restore(map.state)
      expect(sim.circuitState()).toEqual(map.state)
    }
  })

  it('盖上去的参考解能过关', () => {
    for (const level of withSolutions) {
      const run = runLevel({ ...level, cells: solutionCells(level)! })
      expect(run.passed).toBe(true)
    }
  })

  it('盖上去直接点「运行测试」也能过', () => {
    for (const level of withSolutions) {
      const map = solutionMap(level)!
      const sim = new Simulation({ ...level, cells: map.cells })
      sim.restore(map.state)
      expect(runLevel({ ...level, cells: map.cells }, sim).passed, level.id).toBe(true)
    }
  })
})
