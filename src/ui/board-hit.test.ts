import { describe, expect, it } from 'vitest'
import { cellIndexAt } from './board-hit'

const geom = { cell: 20, ox: 10, oy: 30 }

describe('画布坐标找格子', () => {
  it('按行优先算下标', () => {
    // 第 0 行第 0 列
    expect(cellIndexAt(geom, 5, 4, 10, 30)).toBe(0)
    // 第 1 行第 2 列
    expect(cellIndexAt(geom, 5, 4, 10 + 2 * 20 + 19, 30 + 20 + 1)).toBe(7)
    // 格子右下角仍算这一格
    expect(cellIndexAt(geom, 5, 4, 10 + 20 - 0.01, 30 + 20 - 0.01)).toBe(0)
  })

  it('点在地图外返回 -1', () => {
    expect(cellIndexAt(geom, 5, 4, 9, 30)).toBe(-1)
    expect(cellIndexAt(geom, 5, 4, 10, 29)).toBe(-1)
    expect(cellIndexAt(geom, 5, 4, 10 + 5 * 20, 30)).toBe(-1)
    expect(cellIndexAt(geom, 5, 4, 10, 30 + 4 * 20)).toBe(-1)
  })

  it('还没画过时返回 -1', () => {
    expect(cellIndexAt({ cell: 0, ox: 10, oy: 30 }, 5, 4, 10, 30)).toBe(-1)
  })

  it('宽高等参数不同也按传入的列数算', () => {
    // 4 列地图，第 1 行第 3 列
    expect(cellIndexAt(geom, 4, 3, 10 + 3 * 20, 30 + 20)).toBe(7)
  })
})
