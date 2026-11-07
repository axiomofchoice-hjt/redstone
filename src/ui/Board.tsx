import { useEffect, useRef, useState } from 'react'
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react'
import type { Cell, Level } from '../game/types'
import { cellIndexAt } from './board-hit'
import { drawComponent, linkedDirs } from './glyph'

interface Props {
  level: Level
  cells: (Cell | null)[]
  /** 只在这里取看得见的格子的通电状态，不传整张图 */
  powerAt: (index: number) => number
  /** 中继器这一刻是不是被侧面锁着（输出保持） */
  lockedAt?: (index: number) => boolean
  /** 每次画面该刷新时递增 */
  revision: number
  onCell: (index: number) => void
  /** 右键直接删掉一格，不动元件栏当前选的东西 */
  onErase: (index: number) => void
}

const BG = '#0e1018'
const GRID = '#1b2130'
const MAP_BG = '#101319'
const CHECKER = '#12151f'
const EDGE = 12
const MIN_CELL = 36
const MAX_CELL = 64
/** 缩放范围（相对自适应大小）；20×20 这种大图要能缩到整张都在屏幕上 */
const MIN_ZOOM = 0.5
const MAX_ZOOM = 3
/** 滚轮每像素的缩放速度 */
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

export function Board({ level, cells, powerAt, lockedAt, revision, onCell, onErase }: Props) {
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
  /** 最近一次按下是不是手指，用来区分右键和触屏长按 */
  const touched = useRef(false)
  const [cam, setCam] = useState({ x: 0, y: 0, zoom: 1 })
  const camRef = useRef(cam)

  useEffect(() => {
    camRef.current = cam
  }, [cam])

  // 绘制函数放进 ref，ResizeObserver 只建一次，不随相机变化反复重建
  const drawRef = useRef<() => void>(() => {})

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
      render(ctx, w, h, level, cells, powerAt, lockedAt, cam, geom.current)
    }

    drawRef.current = draw
    draw()
  }, [level, cells, powerAt, lockedAt, cam, revision])

  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return
    const observer = new ResizeObserver(() => drawRef.current())
    observer.observe(wrap)
    return () => observer.disconnect()
  }, [])

  // 滚轮缩放：React 的 wheel 监听是 passive 的，preventDefault 不生效，所以直接挂原生事件
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const onWheel = (event: WheelEvent) => {
      // Ctrl / Cmd + 滚轮留给浏览器缩放
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
      // 鼠标下面的地图位置保持不动
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
    // 触屏长按会先来一次 pointerdown，再触发 contextmenu，记下来别当右键
    touched.current = event.pointerType === 'touch'
    // 右键留给删除，不参与拖动和放置
    if (event.button !== 0) return
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

  /** 右键删除：只删这一格，元件栏选中的元件不变 */
  const handleContextMenu = (event: ReactMouseEvent<HTMLCanvasElement>) => {
    event.preventDefault()
    // 触屏长按也会走到这里；那不是右键，别删，顺手掐掉拖动免得松手又放一格
    const touch = touched.current
    drag.current = null
    if (touch) return
    const rect = event.currentTarget.getBoundingClientRect()
    const index = cellIndexAt(
      geom.current,
      level.cols,
      level.rows,
      event.clientX - rect.left,
      event.clientY - rect.top,
    )
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

    const rect = event.currentTarget.getBoundingClientRect()
    const index = cellIndexAt(
      geom.current,
      level.cols,
      level.rows,
      event.clientX - rect.left,
      event.clientY - rect.top,
    )
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
  level: Level,
  cells: (Cell | null)[],
  powerAt: (index: number) => number,
  lockedAt: ((index: number) => boolean) | undefined,
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

  // 地图底色也只填画布看得见的那块
  const vx = Math.max(0, ox)
  const vy = Math.max(0, oy)
  const vw = Math.min(w, ox + mapW) - vx
  const vh = Math.min(h, oy + mapH) - vy
  if (vw > 0 && vh > 0) {
    ctx.fillStyle = MAP_BG
    ctx.fillRect(vx, vy, vw, vh)
  }

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
        // 网格线画在边界右侧/下方半个像素，元件也跟着挪半个像素，四边才是对称的
        ox + (x + 0.5) * cell + 0.5,
        oy + (y + 0.5) * cell + 0.5,
        cell,
        powerAt(i),
        component.type === 'wire' ? linkedDirs(cells, level, x, y) : null,
        undefined,
        lockedAt?.(i) === true,
      )
    }
  }
}
