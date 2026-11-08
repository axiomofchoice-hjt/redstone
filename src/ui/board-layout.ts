/** 手机 / 平板上格子按屏幕自适应，给可读性留上下限 */
export const MIN_CELL = 36
export const MAX_CELL = 120

/** 电脑端 100% 时一格固定多大：所有关卡一样，地图大小只影响能看见多少 */
export const DESKTOP_CELL = 54

/**
 * 100% 缩放时的格子边长（之后还要乘相机缩放）。
 * 电脑端固定成 DESKTOP_CELL，7×7 和 20×20 的格子一样大；
 * 手机端按视口和地图自适应，夹在可读范围里。
 */
export function baseCell(
  fixed: boolean,
  w: number,
  h: number,
  cols: number,
  rows: number,
): number {
  if (fixed) return DESKTOP_CELL
  const fit = Math.min((w - 24) / cols, (h - 24) / rows)
  return Math.round(Math.min(MAX_CELL, Math.max(MIN_CELL, fit)))
}
