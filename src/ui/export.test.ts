import { describe, expect, it } from 'vitest'
import { Simulation } from '../game/sim'
import { level01 } from '../levels/level-01'
import { level08 } from '../levels/level-08'
import { mapFileName, mapJson } from './export'

describe('导出地图', () => {
  it('文件名用关卡 id', () => {
    expect(mapFileName(level08)).toBe('level-08-map.json')
  })

  it('带上 tick、端口取值和每格通电状态', () => {
    const { cols, rows } = level01
    const cells = level01.cells.slice()
    // 第 3 行补一段导线，把 A 接到 B
    for (let x = 2; x <= 4; x++) cells[3 * cols + x] = { type: 'wire' }
    const level = { ...level01, cells }

    const sim = new Simulation(level)
    sim.setInputs({ A: 1 })
    sim.step()

    const parsed = JSON.parse(mapJson(level, sim))
    expect(parsed).toMatchObject({ id: 'level-01', cols, rows })
    const expected: Record<string, unknown> = {}
    cells.forEach((cell, i) => {
      if (cell) expected[i] = cell
    })
    expect(parsed.cells).toEqual(expected)
    expect(parsed.cells[3 * cols + 1]).toEqual({ type: 'input', id: 'A', locked: true })
    expect(parsed.cells[3 * cols + 2]).toEqual({ type: 'wire' })
    expect(parsed.cells[3 * cols + 5]).toEqual({ type: 'output', id: 'B', locked: true })
    expect(parsed.cells[0]).toBeUndefined()
    expect(parsed.state.tick).toBe(1)
    expect(parsed.state.inputs).toEqual({ A: 1 })
    expect(parsed.state.outputs).toEqual({ B: 1 })
    expect(parsed.state.powers[3 * cols + 1]).toBe(1)
    expect(parsed.state.powers[3 * cols + 2]).toBe(3)
    expect(parsed.state.powers[3 * cols + 5]).toBe(1)
    // 通电状态和 cells 一样稀疏，只记录有电的格子
    expect(Object.keys(parsed.state.powers).map(Number).sort((a, b) => a - b)).toEqual([
      3 * cols + 1,
      3 * cols + 2,
      3 * cols + 3,
      3 * cols + 4,
      3 * cols + 5,
    ])
    expect(parsed.state.powers[0]).toBeUndefined()
  })

  it('玩家放的元件也会带上', () => {
    const cells = level08.cells.slice()
    cells[5 * level08.cols + 3] = { type: 'not', dir: 2 }
    const level = { ...level08, cells }
    const parsed = JSON.parse(mapJson(level, new Simulation(level)))
    expect(parsed.cells[5 * level08.cols + 3]).toEqual({ type: 'not', dir: 2 })
    expect(parsed.state.inputs).toEqual({ A: 0, B: 0 })
  })
})
