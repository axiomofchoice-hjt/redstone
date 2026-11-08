import { describe, expect, it } from 'vitest'
import { cellIndexAt, gridLine } from './board-hit'

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

describe('拖动时补齐中间的格子', () => {
  it('水平 / 垂直都从起点走到终点', () => {
    expect(gridLine(1, 2, 4, 2)).toEqual([
      [1, 2],
      [2, 2],
      [3, 2],
      [4, 2],
    ])
    expect(gridLine(3, 0, 3, 2)).toEqual([
      [3, 0],
      [3, 1],
      [3, 2],
    ])
  })

  it('斜着拖也是连续的，每步只挪一格', () => {
    const line = gridLine(0, 0, 2, 2)
    expect(line[0]).toEqual([0, 0])
    expect(line.at(-1)).toEqual([2, 2])
    expect(line).toHaveLength(3)
  })

  it('原地不动只返回一格', () => {
    expect(gridLine(5, 5, 5, 5)).toEqual([[5, 5]])
  })
})
