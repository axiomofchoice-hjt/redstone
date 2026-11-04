import { useEffect, useRef } from 'react'
import { dirOf } from '../game/sim'
import type { Cell, Level } from '../game/types'

interface Props {
  level: Level
  cells: (Cell | null)[]
  powers: number[]
  onCell: (index: number) => void
}

const BG = '#0e1018'
const GRID = '#1b2130'
const ON = '#ff6b4a'
const OFF = '#4a5266'
const SOURCE = '#ffd166'

interface Geom {
  cell: number
  ox: number
  oy: number
}

export function Board({ level, cells, powers, onCell }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const geom = useRef<Geom>({ cell: 0, ox: 0, oy: 0 })

  useEffect(() => {
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    if (!wrap || !canvas) return

    const draw = () => {
      const rect = wrap.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      const w = Math.max(1, Math.floor(rect.width))
      const h = Math.max(1, Math.floor(rect.height))
      canvas.width = Math.floor(w * dpr)
      canvas.height = Math.floor(h * dpr)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      render(ctx, w, h, level, cells, powers, geom.current)
    }

    draw()
    const observer = new ResizeObserver(draw)
    observer.observe(wrap)
    return () => observer.disconnect()
  }, [level, cells, powers])

  const handlePointer = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const { cell, ox, oy } = geom.current
    if (cell <= 0) return
    const x = Math.floor((event.clientX - rect.left - ox) / cell)
    const y = Math.floor((event.clientY - rect.top - oy) / cell)
    if (x < 0 || y < 0 || x >= level.cols || y >= level.rows) return
    onCell(y * level.cols + x)
  }

  return (
    <div className="board" ref={wrapRef}>
      <canvas ref={canvasRef} onPointerDown={handlePointer} />
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
  geom: Geom,
) {
  ctx.clearRect(0, 0, w, h)
  ctx.fillStyle = BG
  ctx.fillRect(0, 0, w, h)

  const cell = Math.min((w - 24) / level.cols, (h - 24) / level.rows)
  const ox = (w - cell * level.cols) / 2
  const oy = (h - cell * level.rows) / 2
  geom.cell = cell
  geom.ox = ox
  geom.oy = oy

  for (let y = 0; y < level.rows; y++) {
    for (let x = 0; x < level.cols; x++) {
      if ((x + y) % 2 === 0) {
        ctx.fillStyle = '#12151f'
        ctx.fillRect(ox + x * cell, oy + y * cell, cell, cell)
      }
    }
  }

  ctx.strokeStyle = GRID
  ctx.lineWidth = 1
  ctx.beginPath()
  for (let x = 0; x <= level.cols; x++) {
    ctx.moveTo(Math.round(ox + x * cell) + 0.5, oy)
    ctx.lineTo(Math.round(ox + x * cell) + 0.5, oy + level.rows * cell)
  }
  for (let y = 0; y <= level.rows; y++) {
    ctx.moveTo(ox, Math.round(oy + y * cell) + 0.5)
    ctx.lineTo(ox + level.cols * cell, Math.round(oy + y * cell) + 0.5)
  }
  ctx.stroke()

  for (let i = 0; i < cells.length; i++) {
    const component = cells[i]
    if (!component) continue
    const x = i % level.cols
    const y = (i - x) / level.cols
    drawComponent(ctx, component, ox + (x + 0.5) * cell, oy + (y + 0.5) * cell, cell, powers[i] ?? 0, cells, level, x, y)
  }
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
      drawConnections(ctx, cx, cy, cell, x, y, cells, level, on ? ON : OFF, cell * 0.1)
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(cx, cy, cell * 0.14, 0, Math.PI * 2)
      ctx.fill()
      break
    }
    case 'cross': {
      const vertical = (power & 1) !== 0
      const horizontal = (power & 2) !== 0
      ctx.lineCap = 'round'
      ctx.lineWidth = cell * 0.1
      ctx.strokeStyle = vertical ? ON : OFF
      ctx.beginPath()
      ctx.moveTo(cx, cy - cell * 0.42)
      ctx.lineTo(cx, cy + cell * 0.42)
      ctx.stroke()
      ctx.strokeStyle = horizontal ? ON : OFF
      ctx.beginPath()
      ctx.moveTo(cx - cell * 0.42, cy)
      ctx.lineTo(cx + cell * 0.42, cy)
      ctx.stroke()
      break
    }
    case 'charger': {
      const angle = (dirOf(component) - 1) * (Math.PI / 2)
      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(angle)
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.moveTo(cell * 0.3, 0)
      ctx.lineTo(-cell * 0.16, -cell * 0.24)
      ctx.lineTo(-cell * 0.16, cell * 0.24)
      ctx.closePath()
      ctx.fill()
      ctx.restore()
      break
    }
    case 'not': {
      const angle = (dirOf(component) - 1) * (Math.PI / 2)
      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(angle)
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(0, 0, cell * 0.2, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = color
      ctx.lineWidth = cell * 0.09
      ctx.beginPath()
      ctx.moveTo(-cell * 0.28, 0)
      ctx.lineTo(-cell * 0.34, 0)
      ctx.stroke()
      ctx.restore()
      break
    }
    case 'input': {
      ctx.fillStyle = on ? SOURCE : '#3a4152'
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
      drawLabel(ctx, component.id ?? '', cx, cy + cell * 0.36, cell * 0.7, offLabel(on))
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
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.lineCap = 'round'
  const dirs = [
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0],
  ]
  for (const [dx, dy] of dirs) {
    const nx = x + dx
    const ny = y + dy
    if (nx < 0 || ny < 0 || nx >= level.cols || ny >= level.rows) continue
    if (!cells[ny * level.cols + nx]) continue
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.lineTo(cx + dx * cell * 0.5, cy + dy * cell * 0.5)
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

function offLabel(on: boolean) {
  return on ? '#0e1018' : '#8b93a7'
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
