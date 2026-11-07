import { useEffect, useRef, useState } from 'react'
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react'
import type { FlyDir, FlyPart } from './types'
import { drawFlyPart, drawPistonHead } from './glyph'

interface Props {
  cols: number
  rows: number
  cells: (FlyPart | null)[]
  /** 被伸出的活塞头占住的格子 -> 头的主人和朝向 */
  heads?: Map<number, { dir: FlyDir; sticky: boolean }>
  /** 已经伸出去的活塞机身所在格子，要画活塞臂 */
  bodies?: Set<number>
  /** 运行时只给看，不响应点按 */
  readOnly?: boolean
  onCell: (index: number) => void
  onErase: (index: number) => void
}

const BG = '#0e1018'
const GRID = '#1b2130'
const MAP_BG = '#101319'
const CHECKER = '#12151f'
const EDGE = 12
const MIN_CELL = 28
const MAX_CELL = 56
const MIN_ZOOM = 1
const MAX_ZOOM = 3
const WHEEL_ZOOM = 0.0015

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

function cellAt(g: Geom, cols: number, rows: number, px: number, py: number): number {
  if (g.cell <= 0) return -1
  const x = Math.floor((px - g.ox) / g.cell)
  const y = Math.floor((py - g.oy) / g.cell)
  if (x < 0 || y < 0 || x >= cols || y >= rows) return -1
  return y * cols + x
}

export function FlyBoard({ cols, rows, cells, heads, bodies, readOnly, onCell, onErase }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const geom = useRef<Geom>({ cell: 0, ox: 0, oy: 0, camX: 0, camY: 0, w: 0, h: 0, mapW: 0, mapH: 0 })
  const drag = useRef<Drag | null>(null)
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const pinch = useRef<Pinch | null>(null)
  const touched = useRef(false)
  const [cam, setCam] = useState({ x: 0, y: 0, zoom: 1 })
  const camRef = useRef(cam)

  useEffect(() => {
    camRef.current = cam
  }, [cam])

  const drawRef = useRef<() => void>(() => {})

  useEffect(() => {
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    if (!wrap || !canvas) return

    const draw = () => {
      const rect = wrap.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
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
      render(ctx, w, h, cols, rows, cells, heads, bodies, cam, geom.current)
    }

    drawRef.current = draw
    draw()
  }, [cols, rows, cells, heads, bodies, cam])

  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return
    const observer = new ResizeObserver(() => drawRef.current())
    observer.observe(wrap)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey) return
      const g = geom.current
      if (g.cell <= 0) return
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? g.h : 1
      const delta = event.deltaY * unit
      if (delta === 0) return
      event.preventDefault()
      const current = camRef.current
      const zoom = clampZoom(current.zoom * Math.exp(-delta * WHEEL_ZOOM))
      if (zoom === current.zoom) return
      const ratio = zoom / current.zoom
      const rect = canvas.getBoundingClientRect()
      const px = event.clientX - rect.left
      const py = event.clientY - rect.top
      const next = clampCamera(
        px - (px - g.camX) * ratio,
        py - (py - g.camY) * ratio,
        g.w,
        g.h,
        g.mapW * ratio,
        g.mapH * ratio,
      )
      const nextCam = { x: next.x, y: next.y, zoom }
      camRef.current = nextCam
      setCam(nextCam)
    }
    canvas.addEventListener('wheel', onWheel, { passive: false })
    return () => canvas.removeEventListener('wheel', onWheel)
  }, [])

  const handlePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    touched.current = event.pointerType === 'touch'
    if (event.button !== 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })

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
    if (!pointers.current.has(event.pointerId)) return
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

  const handleContextMenu = (event: ReactMouseEvent<HTMLCanvasElement>) => {
    event.preventDefault()
    const touch = touched.current
    drag.current = null
    if (touch) return
    const rect = event.currentTarget.getBoundingClientRect()
    if (readOnly) return
    const index = cellAt(geom.current, cols, rows, event.clientX - rect.left, event.clientY - rect.top)
    if (index < 0) return
    onErase(index)
  }

  const handlePointerUp = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    pointers.current.delete(event.pointerId)
    if (pointers.current.size < 2) pinch.current = null
    const current = drag.current
    if (!current || current.id !== event.pointerId) return
    drag.current = null
    if (current.moved) return
    if (readOnly) return
    const rect = event.currentTarget.getBoundingClientRect()
    const index = cellAt(geom.current, cols, rows, event.clientX - rect.left, event.clientY - rect.top)
    if (index < 0) return
    onCell(index)
  }

  return (
    <div className="board" ref={wrapRef}>
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onContextMenu={handleContextMenu}
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
  cols: number,
  rows: number,
  cells: (FlyPart | null)[],
  heads: Map<number, { dir: FlyDir; sticky: boolean }> | undefined,
  bodies: Set<number> | undefined,
  cam: { x: number; y: number; zoom: number },
  geom: Geom,
) {
  ctx.clearRect(0, 0, w, h)
  ctx.fillStyle = BG
  ctx.fillRect(0, 0, w, h)

  const fit = Math.min((w - 24) / cols, (h - 24) / rows)
  const cell = Math.max(MIN_CELL, Math.round(Math.min(MAX_CELL, Math.max(MIN_CELL, fit)) * cam.zoom))
  const mapW = cell * cols
  const mapH = cell * rows
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

  const vx = Math.max(0, ox)
  const vy = Math.max(0, oy)
  const vw = Math.min(w, ox + mapW) - vx
  const vh = Math.min(h, oy + mapH) - vy
  if (vw > 0 && vh > 0) {
    ctx.fillStyle = MAP_BG
    ctx.fillRect(vx, vy, vw, vh)
  }

  const firstX = Math.max(0, Math.floor(-ox / cell))
  const lastX = Math.min(cols - 1, Math.floor((w - ox) / cell))
  const firstY = Math.max(0, Math.floor(-oy / cell))
  const lastY = Math.min(rows - 1, Math.floor((h - oy) / cell))

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
      const index = y * cols + x
      const part = cells[index]
      const cx = ox + (x + 0.5) * cell + 0.5
      const cy = oy + (y + 0.5) * cell + 0.5
      if (part) drawFlyPart(ctx, part, cx, cy, cell, bodies?.has(index) === true)
      // 伸出的活塞头画在格子上，压在本来那格的零件上面
      const head = heads?.get(index)
      if (head) drawPistonHead(ctx, cx, cy, cell, head.dir, head.sticky)
    }
  }
}
