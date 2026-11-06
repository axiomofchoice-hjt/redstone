import { describe, expect, it } from 'vitest'
import { runLevel } from '../game/sim'
import { level14 } from '../levels/level-14'
import { level15 } from '../levels/level-15'
import { level16 } from '../levels/level-16'
import { solutionCells } from './solution'

describe('菜单里的参考答案', () => {
  it('没有参考解的关卡给 null（按钮灰掉）', () => {
    expect(solutionCells(level16)).toBeNull()
  })

  it('第十四、十五关有参考解，格数和地图一样', () => {
    expect(solutionCells(level14)).toHaveLength(100)
    expect(solutionCells(level15)).toHaveLength(100)
  })

  it('每次给的是一份副本，盖完再改不会动到关卡数据', () => {
    const cells = solutionCells(level14)!
    const first = cells.findIndex(Boolean)
    expect(cells[first]).not.toBe(level14.solution![first])
    cells[first] = null
    expect(level14.solution![first]).not.toBeNull()
  })

  it('盖上去的参考解能过关', () => {
    for (const level of [level14, level15]) {
      const run = runLevel({ ...level, cells: solutionCells(level)! })
      expect(run.passed).toBe(true)
    }
  })
})
