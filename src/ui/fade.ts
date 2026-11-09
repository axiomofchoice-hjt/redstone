import type { Cell } from '../game/types'

/** 通电变色的渐变时长：很短，250ms 的 tick 间隙里几乎是一闪 */
export const FADE_MS = 120

export interface Tween {
  from: number
  to: number
  start: number
}

/** 一格的两个通道：导线 / 元件用 v，cross 的横线用 h */
export interface Fade {
  v: Tween
  h: Tween
}

const still = (value: number, now: number): Tween => ({ from: value, to: value, start: now })

/** 渐变进度按缓出算，到点直接给目标值，不会因为浮点误差一直差一点 */
export function tweenValue(tween: Tween, now: number): number {
  if (tween.from === tween.to) return tween.to
  const elapsed = now - tween.start
  if (elapsed >= FADE_MS) return tween.to
  if (elapsed <= 0) return tween.from
  const t = elapsed / FADE_MS
  const eased = 1 - (1 - t) * (1 - t)
  return tween.from + (tween.to - tween.from) * eased
}

/** 目标变了就从当前颜色接着走，不硬跳回起点 */
export function retarget(tween: Tween, target: number, now: number): Tween {
  if (tween.to === target) return tween
  return { from: tweenValue(tween, now), to: target, start: now }
}

export function isMoving(tween: Tween, now: number): boolean {
  return tween.from !== tween.to && now - tween.start < FADE_MS
}

/** cross 的竖线看 bit0、横线看 bit1，其它元件整体通 / 断 */
function targets(cell: Cell, power: number): [number, number] {
  if (cell.type === 'cross') return [(power & 1) !== 0 ? 1 : 0, (power & 2) !== 0 ? 1 : 0]
  const value = power !== 0 ? 1 : 0
  return [value, value]
}

/**
 * 推进一帧的通电渐变，返回还有没有格子在过渡。
 * 第一次见到的格子直接落在目标色上，摆元件时不会先灰一下再亮；
 * instant 给「减少动态效果」用，直接跳到目标色。
 */
export function advanceFade(
  fades: Map<number, Fade>,
  cells: (Cell | null)[],
  powerAt: (index: number) => number,
  now: number,
  instant = false,
): boolean {
  let moving = false

  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i]
    if (!cell) continue
    const [targetV, targetH] = targets(cell, powerAt(i))
    const current = fades.get(i)
    if (!current) {
      fades.set(i, { v: still(targetV, now), h: still(targetH, now) })
      continue
    }
    const v = instant ? still(targetV, now) : retarget(current.v, targetV, now)
    const h = instant ? still(targetH, now) : retarget(current.h, targetH, now)
    if (v !== current.v || h !== current.h) fades.set(i, { v, h })
    if (isMoving(v, now) || isMoving(h, now)) moving = true
  }

  // 删掉的格子、换关后不再存在的下标别一直留在表里
  for (const index of fades.keys()) {
    if (index >= cells.length || !cells[index]) fades.delete(index)
  }

  return moving
}
