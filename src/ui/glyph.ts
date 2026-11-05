import { dirOf, DX, DY, isSource } from '../game/sim'
import type { Cell, CellType, Level } from '../game/types'

export const ON = '#ff2b2b'
export const OFF = '#ffffff'

const DIRS: [number, number][] = DX.map((dx, d) => [dx, DY[d]])

export const lineWidth = (cell: number) => Math.max(1.5, cell * 0.085)

export interface Glyph {
  type: CellType
  dir?: Cell['dir']
  id?: string
}

/** 导线四面是否连接（充能器/中继器只有前后能连，侧边不算） */
export function linkedDirs(
  cells: (Cell | null)[],
  level: Level,
  x: number,
  y: number,
): boolean[] {
  return DIRS.map(([dx, dy], d) => {
    const nx = x + dx
    const ny = y + dy
    if (nx < 0 || ny < 0 || nx >= level.cols || ny >= level.rows) return false
    const neighbor = cells[ny * level.cols + nx]
    if (!neighbor) return false
    if (isSource(neighbor)) return d % 2 === dirOf(neighbor) % 2
    return true
  })
}

export function drawComponent(
  ctx: CanvasRenderingContext2D,
  component: Glyph,
  cx: number,
  cy: number,
  cell: number,
  power: number,
  links: boolean[] | null,
  /** 指定颜色（按钮图标用），否则按通电状态取红/白 */
  override?: string,
) {
  const on = power !== 0
  const color = override ?? (on ? ON : OFF)

  switch (component.type) {
    case 'wire': {
      drawConnections(ctx, cx, cy, cell, links ?? [], color, lineWidth(cell))
      break
    }
    case 'cross': {
      const vertical = (power & 1) !== 0
      const horizontal = (power & 2) !== 0
      const r = cell * 0.18
      const lw = lineWidth(cell)
      // 圆头会多伸出半个线宽，端点往里收，正好停在格子边框上
      const reach = cell * 0.5 - lw / 2
      ctx.lineWidth = lw
      ctx.lineCap = 'round'

      // 横线在中间向下绕半个圆，从竖线下穿过去
      ctx.strokeStyle = override ?? (horizontal ? ON : OFF)
      ctx.beginPath()
      ctx.moveTo(cx - reach, cy)
      ctx.lineTo(cx - r, cy)
      ctx.arc(cx, cy, r, Math.PI, 0, true)
      ctx.lineTo(cx + reach, cy)
      ctx.stroke()

      // 竖线是一条直线
      ctx.strokeStyle = override ?? (vertical ? ON : OFF)
      ctx.beginPath()
      ctx.moveTo(cx, cy - reach)
      ctx.lineTo(cx, cy + reach)
      ctx.stroke()
      break
    }
    case 'charger':
      // 箭头：一条主干 + 两条箭羽
      drawDirected(ctx, cx, cy, cell, component, color, (k) => {
        ctx.beginPath()
        ctx.moveTo(-k * 0.46, 0)
        ctx.lineTo(k * 0.46, 0)
        ctx.moveTo(k * 0.46, 0)
        ctx.lineTo(k * 0.28, -k * 0.18)
        ctx.moveTo(k * 0.46, 0)
        ctx.lineTo(k * 0.28, k * 0.18)
        ctx.stroke()
      })
      break
    case 'repeater':
      // 空心正三角形，尖朝前
      drawDirected(ctx, cx, cy, cell, component, color, (k) => {
        const side = k * 0.72
        const height = side * (Math.sqrt(3) / 2)
        // 比居中稍微往前一点，提示朝向
        const shift = k * 0.05
        const apex = shift + height / 2
        const base = shift - height / 2
        ctx.beginPath()
        ctx.moveTo(apex, 0)
        ctx.lineTo(base, -side / 2)
        ctx.lineTo(base, side / 2)
        ctx.closePath()
        ctx.stroke()
      })
      break
    case 'not': {
      // 灯泡符号：圆圈 + 叉
      const r = cell * 0.33
      if (on) {
        const glow = ctx.createRadialGradient(cx, cy, r * 0.5, cx, cy, r * 1.9)
        glow.addColorStop(0, 'rgba(255, 43, 43, 0.45)')
        glow.addColorStop(1, 'rgba(255, 43, 43, 0)')
        ctx.fillStyle = glow
        ctx.beginPath()
        ctx.arc(cx, cy, r * 1.9, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.strokeStyle = color
      ctx.lineWidth = Math.max(1.5, cell * 0.075)
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.stroke()
      const d = r * Math.SQRT1_2
      ctx.beginPath()
      ctx.moveTo(cx - d, cy - d)
      ctx.lineTo(cx + d, cy + d)
      ctx.moveTo(cx + d, cy - d)
      ctx.lineTo(cx - d, cy + d)
      ctx.stroke()
      break
    }
    case 'input': {
      ctx.fillStyle = color
      roundRect(ctx, cx - cell * 0.26, cy - cell * 0.26, cell * 0.52, cell * 0.52, cell * 0.12)
      ctx.fill()
      drawLabel(ctx, component.id ?? '', cx, cy, cell, '#0e1018')
      break
    }
    case 'output': {
      // 空心方块 + 字母，和输入的实心方块区分
      ctx.strokeStyle = override ?? color
      ctx.lineWidth = cell * 0.075
      roundRect(ctx, cx - cell * 0.26, cy - cell * 0.26, cell * 0.52, cell * 0.52, cell * 0.12)
      ctx.stroke()
      drawLabel(ctx, component.id ?? '', cx, cy, cell, override ?? color)
      break
    }
  }
}

function drawDirected(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  cell: number,
  component: Glyph,
  color: string,
  draw: (k: number) => void,
) {
  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(((dirOf(component) - 1) * Math.PI) / 2)
  ctx.strokeStyle = color
  ctx.lineWidth = lineWidth(cell)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  draw(cell)
  ctx.restore()
}

function drawConnections(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  cell: number,
  linked: boolean[],
  color: string,
  width: number,
) {
  const dirs = DIRS.filter((_, d) => linked[d])
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.lineCap = 'round'

  // 没有连接时画一个十字，四面都算连上；只有一侧连接时对端也画出来（贯通整格）
  const strokes: [number, number][] =
    dirs.length === 0
      ? DIRS
      : dirs.length === 1
        ? [dirs[0], [-dirs[0][0], -dirs[0][1]]]
        : dirs
  // 端点收半个线宽，圆头正好停在格子边框上
  const reach = cell * 0.5 - width / 2

  for (const [dx, dy] of strokes) {
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.lineTo(cx + dx * reach, cy + dy * reach)
    ctx.stroke()
  }
}

function drawLabel(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  cy: number,
  cell: number,
  color: string,
) {
  if (!text) return
  ctx.fillStyle = color
  ctx.font = `600 ${Math.floor(cell * 0.3)}px system-ui, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, cx, cy)
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}
