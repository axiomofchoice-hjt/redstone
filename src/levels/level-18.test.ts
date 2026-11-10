import { describe, expect, it } from 'vitest'
import { runLevel } from '../game/sim'
import { level18 } from './level-18'

const last = level18.rows - 1
const cols = level18.cols

describe('第十八关', () => {
  it('是 20×10 地图，四个角预置端口并锁定', () => {
    expect(level18.cols).toBe(20)
    expect(level18.rows).toBe(10)
    expect(level18.cells[0]).toEqual({ type: 'input', id: 'A', locked: true })
    expect(level18.cells[last * cols]).toEqual({ type: 'input', id: 'B', locked: true })
    expect(level18.cells[cols - 1]).toEqual({ type: 'output', id: 'C', locked: true })
    expect(level18.cells[last * cols + cols - 1]).toEqual({ type: 'output', id: 'D', locked: true })
    expect(level18.cells.filter(Boolean)).toHaveLength(4)
  })

  it('只放开导线、充能器、中继器、非门，没有交叉', () => {
    expect(level18.tools).toEqual(['wire', 'charger', 'repeater', 'not'])
    expect(level18.tools).not.toContain('cross')
  })

  it('测试要求 C = B、D = A', () => {
    expect(level18.tests.map((test) => test.name)).toEqual(['0 0 → 0 0', '1 0 → 0 1', '0 1 → 1 0', '1 1 → 1 1'])
  })

  it('空地图时 C、D 一直是 0，三组不通过', () => {
    const result = runLevel(level18)
    expect(result.passed).toBe(false)
    const failed = result.outcomes.filter((outcome) => !outcome.passed).map((outcome) => outcome.name)
    expect(failed).toEqual(['1 0 → 0 1', '0 1 → 1 0', '1 1 → 1 1'])
  })

  it('异或交换的参考解能通过全部测试', () => {
    const result = runLevel({ ...level18, cells: level18.solution!.cells })
    expect(result.passed).toBe(true)
  })
})
