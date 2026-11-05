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
/** 双指缩放的范围（相对自适应大小） */
const MIN_ZOOM = 1
const MAX_ZOOM = 3

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

interface Pinch {
  /** 起始双指间距与中点 */
  dist: number
  midX: number
  midY: number
  zoom: number
  camX: number
  camY: number
}

const distance = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y)

const clampZoom = (zoom: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom))

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
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const pinch = useRef<Pinch | null>(null)
  const [cam, setCam] = useState({ x: 0, y: 0, zoom: 1 })

  useEffect(() => {
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    if (!wrap || !canvas) return

    const draw = () => {
      const rect = wrap.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      // 只用内容区（去掉 .board 的内边距），画布不会溢出到左右/下方
      const style = getComputedStyle(wrap)
      const padX = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight)
      const padY = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom)
      const w = Math.max(1, Math.floor(rect.width - padX))
      const h = Math.max(1, Math.floor(rect.height - padY))
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
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })

    // 两根手指：进入缩放，单指拖动让位
    if (pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()]
      pinch.current = {
        dist: distance(a, b),
        midX: (a.x + b.x) / 2,
        midY: (a.y + b.y) / 2,
        zoom: cam.zoom,
        camX: geom.current.camX,
        camY: geom.current.camY,
      }
      drag.current = null
      return
    }

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
    const known = pointers.current.get(event.pointerId)
    if (!known) return
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })

    const pinchNow = pinch.current
    if (pinchNow && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()]
      const dist = distance(a, b)
      const midX = (a.x + b.x) / 2
      const midY = (a.y + b.y) / 2
      if (pinchNow.dist <= 0 || dist <= 0) return
      const zoom = clampZoom(pinchNow.zoom * (dist / pinchNow.dist))
      const ratio = zoom / pinchNow.zoom
      // 双指中点下面的地图位置保持不动
      const g = geom.current
      const next = clampCamera(
        midX - (pinchNow.midX - pinchNow.camX) * ratio,
        midY - (pinchNow.midY - pinchNow.camY) * ratio,
        g.w,
        g.h,
        g.mapW * ratio,
        g.mapH * ratio,
      )
      setCam({ x: next.x, y: next.y, zoom })
      return
    }

    const current = drag.current
    if (!current || current.id !== event.pointerId) return
    const dx = event.clientX - current.x
    const dy = event.clientY - current.y
    if (!current.moved && Math.hypot(dx, dy) > 6) current.moved = true
    if (!current.moved) return
    const g = geom.current
    const next = clampCamera(current.camX + dx, current.camY + dy, g.w, g.h, g.mapW, g.mapH)
    setCam((prev) => ({ ...prev, x: next.x, y: next.y }))
  }

  const handlePointerUp = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    pointers.current.delete(event.pointerId)
    if (pointers.current.size < 2) pinch.current = null

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
        onPointerCancel={(event) => {
          pointers.current.delete(event.pointerId)
          if (pointers.current.size < 2) pinch.current = null
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
  cam: { x: number; y: number; zoom: number },
  geom: Geom,
) {
  ctx.clearRect(0, 0, w, h)
  ctx.fillStyle = BG
  ctx.fillRect(0, 0, w, h)

  const fit = Math.min((w - 24) / level.cols, (h - 24) / level.rows)
  // 格子大小和地图原点都取整，元件图标才能和网格线对齐
  const cell = Math.max(MIN_CELL, Math.round(Math.min(MAX_CELL, Math.max(MIN_CELL, fit)) * cam.zoom))
  const mapW = cell * level.cols
  const mapH = cell * level.rows
  const clamped = clampCamera(cam.x, cam.y, w, h, mapW, mapH)
  const ox = Math.round(clamped.x)
  const oy = Math.round(clamped.y)

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
    ctx.moveTo(ox + x * cell + 0.5, oy)
    ctx.lineTo(ox + x * cell + 0.5, oy + mapH)
  }
  for (let y = firstY; y <= lastY + 1; y++) {
    ctx.moveTo(ox, oy + y * cell + 0.5)
    ctx.lineTo(ox + mapW, oy + y * cell + 0.5)
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
