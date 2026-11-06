import { describe, expect, it } from 'vitest'
import { runLevel } from '../game/sim'
import { level01 } from './level-01'

const wired = () => {
  const cells = level01.cells.slice()
  for (const x of [2, 3, 4]) cells[3 * 7 + x] = { type: 'wire' }
  return { ...level01, cells }
}

describe('第一关', () => {
  it('是 7×7 地图，A、B 在第 3 行第 1、5 列且锁定', () => {
    expect(level01.cols).toBe(7)
    expect(level01.rows).toBe(7)
    expect(level01.cells[3 * 7 + 1]).toEqual({ type: 'input', id: 'A', locked: true })
    expect(level01.cells[3 * 7 + 5]).toEqual({ type: 'output', id: 'B', locked: true })
  })

  it('不接线时测试不通过', () => {
    expect(runLevel(level01).passed).toBe(false)
  })

  it('用导线把 A 连到 B 后通过', () => {
    expect(runLevel(wired()).passed).toBe(true)
  })

  it('把 A 和 B 之间留断口就不通过', () => {
    const broken = wired()
    broken.cells[3 * 7 + 3] = null
    expect(runLevel(broken).passed).toBe(false)
  })
})
