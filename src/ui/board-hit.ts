/** 画布绘制出来的地图位置与格子大小 */
export interface HitGeom {
  cell: number
  ox: number
  oy: number
}

/**
 * 画布内坐标（相对画布左上角）对应的格子下标，行优先。
 * 还没画过、或者点在格子外时返回 -1。
 */
export function cellIndexAt(
  geom: HitGeom,
  cols: number,
  rows: number,
  x: number,
  y: number,
): number {
  if (geom.cell <= 0) return -1
  const col = Math.floor((x - geom.ox) / geom.cell)
  const row = Math.floor((y - geom.oy) / geom.cell)
  if (col < 0 || row < 0 || col >= cols || row >= rows) return -1
  return row * cols + col
}
