import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { dirOf, DX, DY, isSource } from '../game/sim'
import type { Cell, Level } from '../game/types'

interface Props {
  level: Level
  cells: (Cell | null)[]
  powers: number[]
  onCell: (index: number) => void
}

const BG = '#0e1018'
const GRID = '#1b2130'
const MAP_BG = '#101319'
const CHECKER = '#12151f'
const ON = '#ff2b2b'
const OFF = '#ffffff'

const DIRS: [number, number][] = DX.map((dx, d) => [dx, DY[d]])
const lineWidth = (cell: number) => Math.max(1.5, cell * 0.085)

const EDGE = 12
const MIN_CELL = 36
const MAX_CELL = 64

interface Geom {
  cell: number
  ox: number
  oy: number
  camX: number
  camY: number
  w: number
  h: number
  mapW: number
  mapH: number
}

interface Drag {
  id: number
  x: number
  y: number
  camX: number
  camY: number
  moved: boolean
}

function clampCamera(x: number, y: number, w: number, h: number, mapW: number, mapH: number) {
  return {
    x: mapW <= w ? (w - mapW) / 2 : Math.min(EDGE, Math.max(w - mapW - EDGE, x)),
    y: mapH <= h ? (h - mapH) / 2 : Math.min(EDGE, Math.max(h - mapH - EDGE, y)),
  }
}

export function Board({ level, cells, powers, onCell }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const geom = useRef<Geom>({
    cell: 0,
    ox: 0,
    oy: 0,
    camX: 0,
    camY: 0,
    w: 0,
    h: 0,
    mapW: 0,
    mapH: 0,
  })
  const drag = useRef<Drag | null>(null)
  const [cam, setCam] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    if (!wrap || !canvas) return

    const draw = () => {
      const rect = wrap.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      const w = Math.max(1, Math.floor(rect.width))
      const h = Math.max(1, Math.floor(rect.height))
      const bw = Math.floor(w * dpr)
      const bh = Math.floor(h * dpr)
      if (canvas.width !== bw || canvas.height !== bh) {
        canvas.width = bw
        canvas.height = bh
      }
      if (canvas.style.width !== `${w}px`) canvas.style.width = `${w}px`
      if (canvas.style.height !== `${h}px`) canvas.style.height = `${h}px`
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      render(ctx, w, h, level, cells, powers, cam, geom.current)
    }

    draw()
    const observer = new ResizeObserver(draw)
    observer.observe(wrap)
    return () => observer.disconnect()
  }, [level, cells, powers, cam])

  const handlePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      camX: geom.current.camX,
      camY: geom.current.camY,
      moved: false,
    }
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const current = drag.current
    if (!current || current.id !== event.pointerId) return
    const dx = event.clientX - current.x
    const dy = event.clientY - current.y
    if (!current.moved && Math.hypot(dx, dy) > 6) current.moved = true
    if (!current.moved) return
    const g = geom.current
    setCam(clampCamera(current.camX + dx, current.camY + dy, g.w, g.h, g.mapW, g.mapH))
  }

  const handlePointerUp = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const current = drag.current
    if (!current || current.id !== event.pointerId) return
    drag.current = null
    if (current.moved) return

    const g = geom.current
    if (g.cell <= 0) return
    const rect = event.currentTarget.getBoundingClientRect()
    const x = Math.floor((event.clientX - rect.left - g.ox) / g.cell)
    const y = Math.floor((event.clientY - rect.top - g.oy) / g.cell)
    if (x < 0 || y < 0 || x >= level.cols || y >= level.rows) return
    onCell(y * level.cols + x)
  }

  return (
    <div className="board" ref={wrapRef}>
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => {
          drag.current = null
        }}
      />
    </div>
  )
}

function render(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  level: Level,
  cells: (Cell | null)[],
  powers: number[],
  cam: { x: number; y: number },
  geom: Geom,
) {
  ctx.clearRect(0, 0, w, h)
  ctx.fillStyle = BG
  ctx.fillRect(0, 0, w, h)

  const fit = Math.min((w - 24) / level.cols, (h - 24) / level.rows)
  const cell = Math.min(MAX_CELL, Math.max(MIN_CELL, fit))
  const mapW = cell * level.cols
  const mapH = cell * level.rows
  const clamped = clampCamera(cam.x, cam.y, w, h, mapW, mapH)
  const ox = clamped.x
  const oy = clamped.y

  geom.cell = cell
  geom.ox = ox
  geom.oy = oy
  geom.camX = clamped.x
  geom.camY = clamped.y
  geom.w = w
  geom.h = h
  geom.mapW = mapW
  geom.mapH = mapH

  ctx.fillStyle = MAP_BG
  ctx.fillRect(ox, oy, mapW, mapH)

  const firstX = Math.max(0, Math.floor(-ox / cell))
  const lastX = Math.min(level.cols - 1, Math.floor((w - ox) / cell))
  const firstY = Math.max(0, Math.floor(-oy / cell))
  const lastY = Math.min(level.rows - 1, Math.floor((h - oy) / cell))

  for (let y = firstY; y <= lastY; y++) {
    for (let x = firstX; x <= lastX; x++) {
      if ((x + y) % 2 === 0) {
        ctx.fillStyle = CHECKER
        ctx.fillRect(ox + x * cell, oy + y * cell, cell, cell)
      }
    }
  }

  ctx.strokeStyle = GRID
  ctx.lineWidth = 1
  ctx.beginPath()
  for (let x = firstX; x <= lastX + 1; x++) {
    ctx.moveTo(Math.round(ox + x * cell) + 0.5, oy)
    ctx.lineTo(Math.round(ox + x * cell) + 0.5, oy + mapH)
  }
  for (let y = firstY; y <= lastY + 1; y++) {
    ctx.moveTo(ox, Math.round(oy + y * cell) + 0.5)
    ctx.lineTo(ox + mapW, Math.round(oy + y * cell) + 0.5)
  }
  ctx.stroke()

  for (let y = firstY; y <= lastY; y++) {
    for (let x = firstX; x <= lastX; x++) {
      const i = y * level.cols + x
      const component = cells[i]
      if (!component) continue
      drawComponent(
        ctx,
        component,
        ox + (x + 0.5) * cell,
        oy + (y + 0.5) * cell,
        cell,
        powers[i] ?? 0,
        cells,
        level,
        x,
        y,
      )
    }
  }
}

function drawDirected(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  cell: number,
  component: Cell,
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

function drawComponent(
  ctx: CanvasRenderingContext2D,
  component: Cell,
  cx: number,
  cy: number,
  cell: number,
  power: number,
  cells: (Cell | null)[],
  level: Level,
  x: number,
  y: number,
) {
  const on = power !== 0
  const color = on ? ON : OFF

  switch (component.type) {
    case 'wire': {
      drawConnections(ctx, cx, cy, cell, x, y, cells, level, color, lineWidth(cell))
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
      ctx.strokeStyle = horizontal ? ON : OFF
      ctx.beginPath()
      ctx.moveTo(cx - reach, cy)
      ctx.lineTo(cx - r, cy)
      ctx.arc(cx, cy, r, Math.PI, 0, true)
      ctx.lineTo(cx + reach, cy)
      ctx.stroke()

      // 竖线是一条直线
      ctx.strokeStyle = vertical ? ON : OFF
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
      ctx.strokeStyle = color
      ctx.lineWidth = cell * 0.09
      ctx.beginPath()
      ctx.arc(cx, cy, cell * 0.26, 0, Math.PI * 2)
      ctx.stroke()
      if (on) {
        ctx.fillStyle = ON
        ctx.beginPath()
        ctx.arc(cx, cy, cell * 0.16, 0, Math.PI * 2)
        ctx.fill()
      }
      drawLabel(ctx, component.id ?? '', cx, cy + cell * 0.36, cell * 0.7, on ? BG : OFF)
      break
    }
  }
}

function drawConnections(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  cell: number,
  x: number,
  y: number,
  cells: (Cell | null)[],
  level: Level,
  color: string,
  width: number,
) {
  const linked = DIRS.filter(([dx, dy], d) => {
    const nx = x + dx
    const ny = y + dy
    if (nx < 0 || ny < 0 || nx >= level.cols || ny >= level.rows) return false
    const neighbor = cells[ny * level.cols + nx]
    if (!neighbor) return false
    // 充能器/中继器只有前后能连，侧边不算
    if (isSource(neighbor)) return d % 2 === dirOf(neighbor) % 2
    return true
  })

  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.lineCap = 'round'

  // 没有连接时画一个十字，四面都算连上；只有一侧连接时对端也画出来（贯通整格）
  const strokes: [number, number][] =
    linked.length === 0
      ? DIRS
      : linked.length === 1
        ? [linked[0], [-linked[0][0], -linked[0][1]]]
        : linked
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
