import { describe, expect, it } from 'vitest'
import { baseCell, DESKTOP_CELL, MAX_CELL, MIN_CELL } from './board-layout'

describe('100% 时的格子大小', () => {
  it('电脑端所有关卡一样大，不受画布和地图尺寸影响', () => {
    for (const [cols, rows] of [
      [7, 7],
      [10, 10],
      [20, 20],
    ]) {
      expect(baseCell(true, 900, 820, cols, rows)).toBe(DESKTOP_CELL)
      expect(baseCell(true, 508, 600, cols, rows)).toBe(DESKTOP_CELL)
    }
  })

  it('手机端按视口自适应，大图缩到下限、小图不超过上限', () => {
    // (405 - 24) / 7 = 54.4
    expect(baseCell(false, 405, 600, 7, 7)).toBe(54)
    // 20×20 在手机上算出来不到 36，夹到下限
    expect(baseCell(false, 405, 600, 20, 20)).toBe(MIN_CELL)
    // 3×3 在大平板上算出来超过 120，夹到上限
    expect(baseCell(false, 3000, 3000, 3, 3)).toBe(MAX_CELL)
  })
})
