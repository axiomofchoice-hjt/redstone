import { describe, expect, it } from 'vitest'
import { level08 } from '../levels/level-08'
import { cellsFileName, cellsJson } from './export'

describe('导出地图', () => {
  it('文件名用关卡 id', () => {
    expect(cellsFileName(level08)).toBe('level-08-cells.json')
  })

  it('内容就是铺平的元件数组', () => {
    const parsed = JSON.parse(cellsJson(level08))
    expect(Array.isArray(parsed)).toBe(true)
    expect(parsed).toEqual(level08.cells)
    expect(parsed).toHaveLength(level08.cols * level08.rows)
    expect(parsed[0]).toEqual({ type: 'input', id: 'A', locked: true })
    expect(parsed[1]).toBeNull()
  })

  it('玩家放的元件也会带上', () => {
    const cells = level08.cells.slice()
    cells[5 * level08.cols + 3] = { type: 'not', dir: 2 }
    const parsed = JSON.parse(cellsJson({ ...level08, cells }))
    expect(parsed[5 * level08.cols + 3]).toEqual({ type: 'not', dir: 2 })
  })
})
