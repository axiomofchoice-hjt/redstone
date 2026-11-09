import { describe, expect, it } from 'vitest'
import { mixColor, OFF, ON } from './glyph'

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
