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

/**
 * 两次指针事件之间可能隔着好几格，拖动连续放置时按布雷森汉姆算法把中间的格子补齐。
 * 返回包含起点和终点的 [列, 行] 序列。
 */
export function gridLine(x0: number, y0: number, x1: number, y1: number): [number, number][] {
  const cells: [number, number][] = []
  const dx = Math.abs(x1 - x0)
  const dy = -Math.abs(y1 - y0)
  const sx = x0 < x1 ? 1 : -1
  const sy = y0 < y1 ? 1 : -1
  let err = dx + dy
  let x = x0
  let y = y0

  for (;;) {
    cells.push([x, y])
    if (x === x1 && y === y1) break
    const e2 = 2 * err
    if (e2 >= dy) {
      err += dy
      x += sx
    }
    if (e2 <= dx) {
      err += dx
      y += sy
    }
  }
  return cells
}
