import { describe, expect, it } from 'vitest'
import { labelBaseline, mixColor, OFF, ON } from './glyph'

describe('mixColor', () => {
  it('0 / 1 正好是未通电和通电的颜色', () => {
    expect(mixColor(0)).toBe('rgb(57, 68, 92)')
    expect(mixColor(1)).toBe('rgb(255, 43, 43)')
    expect(OFF).toBe('#39445c')
    expect(ON).toBe('#ff2b2b')
  })

  it('越过两端也夹在同一对颜色里', () => {
    expect(mixColor(-2)).toBe(mixColor(0))
    expect(mixColor(3)).toBe(mixColor(1))
  })

  it('中间值落在灰和红之间', () => {
    expect(mixColor(0.5)).toBe('rgb(156, 56, 68)')
  })
})

describe('labelBaseline', () => {
  const centerOf = (y: number, up: number, down: number) => (y - up + (y + down)) / 2

  it('大写字母没有下伸部，基线要往上抬的那份也算进去', () => {
    // 墨迹只有上沿（down = 0），基线得往下挪半个墨迹高，字母才不会顶在方块上沿
    const y = labelBaseline(27, 8, 0)
    expect(y).toBe(31)
    expect(centerOf(y, 8, 0)).toBe(27)
  })

  it('有下伸部时按上下沿的差算，墨迹正中还在 cy 上', () => {
    const y = labelBaseline(27, 9, 2)
    expect(centerOf(y, 9, 2)).toBe(27)
  })

  it('上下沿一样高就正好落在 cy 上', () => {
    expect(labelBaseline(18.5, 4, 4)).toBe(18.5)
  })
})
