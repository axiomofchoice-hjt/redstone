import { describe, expect, it } from 'vitest'
import type { Cell } from '../game/types'
import { advanceFade, FADE_MS, retarget, tweenValue, type Fade } from './fade'

const wire = (): Cell => ({ type: 'wire' })

describe('tweenValue', () => {
  it('两端正好停在目标值，中间缓出', () => {
    const tween = { from: 0, to: 1, start: 100 }
    expect(tweenValue(tween, 100)).toBe(0)
    expect(tweenValue(tween, 100 + FADE_MS / 2)).toBeCloseTo(0.75)
    expect(tweenValue(tween, 100 + FADE_MS)).toBe(1)
    expect(tweenValue(tween, 100 + FADE_MS * 3)).toBe(1)
  })

  it('目标变了从当前值接着走，不硬跳回起点', () => {
    const first = { from: 0, to: 1, start: 100 }
    const mid = tweenValue(first, 160)
    const next = retarget(first, 0, 160)
    expect(tweenValue(next, 160)).toBe(mid)
    expect(tweenValue(next, 160 + FADE_MS)).toBe(0)
  })
})

describe('advanceFade', () => {
  it('第一次见到的格子直接落在目标色上', () => {
    const fades = new Map<number, Fade>()
    expect(advanceFade(fades, [wire()], () => 1, 0)).toBe(false)
    expect(tweenValue(fades.get(0)!.v, 0)).toBe(1)
  })

  it('断电后走完很短的一段渐变', () => {
    const fades = new Map<number, Fade>()
    const cells = [wire()]
    let power = 1
    advanceFade(fades, cells, () => power, 0)
    power = 0
    expect(advanceFade(fades, cells, () => power, 10)).toBe(true)
    const mid = tweenValue(fades.get(0)!.v, 10 + FADE_MS / 2)
    expect(mid).toBeGreaterThan(0)
    expect(mid).toBeLessThan(1)
    expect(advanceFade(fades, cells, () => power, 10 + FADE_MS)).toBe(false)
    expect(tweenValue(fades.get(0)!.v, 10 + FADE_MS)).toBe(0)
  })

  it('cross 的横竖两条线各走各的', () => {
    const fades = new Map<number, Fade>()
    const cells = [{ type: 'cross' } as Cell]
    advanceFade(fades, cells, () => 0, 0)
    // 只给竖线通电
    expect(advanceFade(fades, cells, () => 1, 10)).toBe(true)
    const fade = fades.get(0)!
    expect(tweenValue(fade.v, 10 + FADE_MS)).toBe(1)
    expect(tweenValue(fade.h, 10 + FADE_MS)).toBe(0)
  })

  it('删掉的格子不会留在渐变表里', () => {
    const fades = new Map<number, Fade>()
    advanceFade(fades, [wire()], () => 0, 0)
    expect(fades.size).toBe(1)
    advanceFade(fades, [null], () => 0, 10)
    expect(fades.size).toBe(0)
  })
})
