import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import type { Cell, Level } from '../game/types'
import { drawComponent, linkedDirs } from './glyph'

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
        component.type === 'wire' ? linkedDirs(cells, level, x, y) : null,
      )
    }
  }
}
