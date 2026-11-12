import { useCallback, useEffect, useRef, useState } from 'react'
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react'
import type { Cell, Dir, Level } from '../game/types'
import { baseCell } from './board-layout'
import { cellIndexAt, gridLine } from './board-hit'
import {
  clampCamera,
  clampZoom,
  zoomAround,
  zoomFactorForKey,
  type Camera,
  type Viewport,
} from './camera'
import { drawComponent, linkedDirs } from './glyph'
import { advanceFade, tweenValue, type Fade } from './fade'
import { isTypingTarget } from './keyboard'
import { useMediaQuery } from './useMediaQuery'
import type { Tool } from './tools'

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
  /** 当前工具：鼠标悬停时画半透明的放置预览 / 删除提示 */
  preview?: Tool | null
  /** 有方向元件的预览朝向 */
  previewDir?: Dir
  /** 电脑端放置模式：输入元件可以拨，已有元件不会被覆盖，悬停时别画覆盖预览 */
  placeMode?: boolean
  /**
   * 电脑端工作台：相机由外面持有（右侧滑轨缩放），滚轮换朝向，
   * 左键按下就放、拖过去连续放；手机上不传，保留拖动平移 / 双指缩放。
   */
  workbench?: {
    camera: Camera
    onCamera: (camera: Camera) => void
    onRotate: (step: 1 | -1) => void
  }
  /** 每帧把视口写回来，右侧滑轨缩放时拿视口中心当锚点 */
  viewportRef?: { current: Viewport | null }
}

const BG = '#e8eef7'
const GRID = '#dfe6f2'
const MAP_BG = '#ffffff'
const CHECKER = '#f1f5fc'
/** 滚轮每像素的缩放速度（手机 / 平板接鼠标时用） */
const WHEEL_ZOOM = 0.0015
/** 电脑端滚轮要攒到这个量才转一格，触控板的小幅滚动不会一滑转好几圈 */
const WHEEL_STEP = 50
/** 手机 / 平板拖动地图前，指针要挪出这个距离才算拖动而不是点按 */
const DRAG_SLOP = 6
/** 系统开了「减少动态效果」就不做通电渐变，直接跳到目标色 */
const REDUCE_MOTION_QUERY = '(prefers-reduced-motion: reduce)'
/** 电脑端键盘平移：按住时每秒走这么多格，缩放时跟着格子大小一起变 */
const PAN_SPEED = 8

/**
 * 电脑端键盘平移：WASD 和方向键，键名统一转小写。
 * 键指的是「想看哪边」，所以相机跟键同向走、地图看上去朝反方向退：
 * 按 W 往上查看地图上方，地图整体往下走。和拖动地图（地图跟着指针走）不是一个朝向。
 * 按住不放就按 PAN_SPEED 一直走，不等系统那一下半秒的重复延迟。
 */
const PAN_KEYS: Record<string, readonly [number, number]> = {
  w: [0, 1],
  a: [1, 0],
  s: [0, -1],
  d: [-1, 0],
  arrowup: [0, 1],
  arrowleft: [1, 0],
  arrowdown: [0, -1],
  arrowright: [-1, 0],
}

interface Geom extends Viewport {
  cell: number
  ox: number
  oy: number
}

interface Drag {
  id: number
  x: number
  y: number
  camX: number
  camY: number
  moved: boolean
}

/** 电脑端拖动连续编辑：左键放置、右键删除，记住上一次落在哪一格，好把中间跳过的补齐 */
interface Stroke {
  id: number
  last: number
  erase: boolean
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

export function Board({
  level,
  cells,
  powerAt,
  lockedAt,
  revision,
  onCell,
  onErase,
  preview = null,
  previewDir,
  placeMode = false,
  workbench,
  viewportRef,
}: Props) {
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
  const stroke = useRef<Stroke | null>(null)
  /** 最近一次按下是不是手指，用来区分右键和触屏长按 */
  const touched = useRef(false)
  /** 电脑端滚轮累积量，攒够 WHEEL_STEP 才转一格 */
  const wheelAcc = useRef(0)
  /** 手机 / 平板自己管相机；电脑端由外面上面的工作台持有，右侧滑轨缩放 */
  const [ownCam, setOwnCam] = useState<Camera>({ x: 0, y: 0, zoom: 1 })
  const cam = workbench ? workbench.camera : ownCam
  const camRef = useRef(cam)
  // wheel / keydown 是原生监听，只挂一次，相机和模式都从这里取最新值
  const workbenchRef = useRef(workbench)
  const [hover, setHover] = useState(-1)
  // 每格的通电渐变进度。rAF 只推进这张表、重画画布，不触发 React 重渲染
  const fades = useRef(new Map<number, Fade>())
  const reduceMotion = useMediaQuery(REDUCE_MOTION_QUERY)

  useEffect(() => {
    camRef.current = cam
  }, [cam])

  useEffect(() => {
    workbenchRef.current = workbench
  }, [workbench])

  const updateCamera = useCallback((next: Camera) => {
    camRef.current = next
    const current = workbenchRef.current
    if (current) current.onCamera(next)
    else setOwnCam(next)
  }, [])

  // 绘制函数放进 ref，ResizeObserver 只建一次，不随相机变化反复重建
  const drawRef = useRef<() => void>(() => {})

  useEffect(() => {
    if (!wrapRef.current || !canvasRef.current) return

    let frame = 0

    function schedule() {
      if (frame || reduceMotion) return
      frame = requestAnimationFrame((time) => {
        frame = 0
        draw(time)
      })
    }

    function draw(now = performance.now()) {
      // 每帧重新取，函数声明会被提升，外面那次判空收窄传不进来
      const wrap = wrapRef.current
      const canvas = canvasRef.current
      if (!wrap || !canvas) return
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
      // 先把通电渐变推到这一帧，再按进度取色；没走完就再排一帧
      const moving = advanceFade(fades.current, cells, powerAt, now, reduceMotion)
      // 右键拖动删除时，悬停预览也画成红叉，别显示成要放置的元件
      const hoverPreview = stroke.current?.erase ? 'erase' : preview
      render(
        ctx,
        w,
        h,
        level,
        cells,
        powerAt,
        lockedAt,
        cam,
        geom.current,
        hover,
        hoverPreview,
        previewDir,
        placeMode,
        workbench != null,
        (index, horizontal) => {
          const fade = fades.current.get(index)
          return fade ? tweenValue(horizontal ? fade.h : fade.v, now) : 0
        },
      )
      if (viewportRef) viewportRef.current = geom.current
      if (moving) schedule()
    }

    drawRef.current = draw
    draw()

    return () => {
      if (frame) cancelAnimationFrame(frame)
    }
  }, [
    level,
    cells,
    powerAt,
    lockedAt,
    cam,
    revision,
    hover,
    preview,
    previewDir,
    placeMode,
    workbench,
    viewportRef,
    reduceMotion,
  ])

  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return
    const observer = new ResizeObserver(() => drawRef.current())
    observer.observe(wrap)
    return () => observer.disconnect()
  }, [])

  // 滚轮换朝向（电脑端）/ 缩放（手机和平板）：React 的 wheel 监听是 passive 的，
  // preventDefault 不生效，所以直接挂原生事件
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

      const desktop = workbenchRef.current
      if (desktop) {
        // 电脑端：滚轮转 90°，缩放交给右侧滑轨
        event.preventDefault()
        // 行模式是离散的（Firefox 的鼠标滚轮），一次事件就是一格，不用攒
        if (event.deltaMode === 1) {
          desktop.onRotate(event.deltaY > 0 ? 1 : -1)
          return
        }
        const acc = wheelAcc.current + delta
        if (Math.abs(acc) < WHEEL_STEP) {
          wheelAcc.current = acc
          return
        }
        wheelAcc.current = 0
        desktop.onRotate(delta > 0 ? 1 : -1)
        return
      }

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
      updateCamera({ x: next.x, y: next.y, zoom })
    }

    canvas.addEventListener('wheel', onWheel, { passive: false })
    return () => canvas.removeEventListener('wheel', onWheel)
  }, [updateCamera])

  // + / - 缩放地图：电脑端和手机端都认，以视口中心为锚点。
  // Ctrl / Cmd + + / - 还是留给浏览器，输入框里也不抢。
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return
      if (isTypingTarget(event.target)) return
      const factor = zoomFactorForKey(event.key)
      if (factor === null) return
      const g = geom.current
      if (g.cell <= 0) return
      event.preventDefault()
      const current = camRef.current
      const next = zoomAround(current, g, current.zoom * factor)
      if (next !== current) updateCamera(next)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [updateCamera])

  // 电脑端 WASD / 方向键平移地图：按住就一直走，不等系统的按键重复延迟；
  // 手机端的 WASD 仍然是换朝向（在元件栏里处理）
  useEffect(() => {
    /** 正按着的平移键；多个键一起按就走对角线 */
    const held = new Set<string>()
    let frame = 0
    /** 上一帧的时间，第一帧当 60fps 算，按下就立刻动一下 */
    let last = 0

    const stop = () => {
      held.clear()
      last = 0
      if (frame) {
        cancelAnimationFrame(frame)
        frame = 0
      }
    }

    const tick = (now: number) => {
      frame = 0
      const desktop = workbenchRef.current
      const g = geom.current
      if (!desktop || g.cell <= 0 || held.size === 0) {
        last = 0
        return
      }
      // 切后台再回来时间差会很大，夹一下免得太跳
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 1 / 60
      last = now

      let dx = 0
      let dy = 0
      for (const key of held) {
        const step = PAN_KEYS[key]
        if (!step) continue
        dx += step[0]
        dy += step[1]
      }
      const len = Math.hypot(dx, dy)
      if (len > 0) {
        const dist = g.cell * PAN_SPEED * dt
        const current = camRef.current
        const next = clampCamera(
          current.x + (dx / len) * dist,
          current.y + (dy / len) * dist,
          g.w,
          g.h,
          g.mapW,
          g.mapH,
        )
        // 到底了就别每帧都推一次新相机，免得白重渲染
        if (next.x !== current.x || next.y !== current.y) {
          updateCamera({ x: next.x, y: next.y, zoom: current.zoom })
        }
      }
      frame = requestAnimationFrame(tick)
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (!workbenchRef.current) return
      if (event.ctrlKey || event.metaKey || event.altKey) return
      if (isTypingTarget(event.target)) return

      const key = event.key.toLowerCase()
      if (!PAN_KEYS[key]) return
      // 方向键会滚动页面，按住不放也一直拦着
      event.preventDefault()
      // 系统发来的重复事件不用管，按住这段时间由 rAF 一帧一帧推进
      if (event.repeat) return
      held.add(key)
      if (!frame) frame = requestAnimationFrame(tick)
    }

    const onKeyUp = (event: KeyboardEvent) => {
      if (!held.delete(event.key.toLowerCase())) return
      if (held.size === 0) stop()
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    // 焦点跑了就收不到 keyup，松手会变成一直走
    window.addEventListener('blur', stop)
    return () => {
      stop()
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', stop)
    }
  }, [updateCamera])

  /** 指针位置落在哪个格子上；不在图上返回 -1 */
  const cellIndexAtPointer = (
    event: { clientX: number; clientY: number },
    element: HTMLElement,
  ): number => {
    const rect = element.getBoundingClientRect()
    return cellIndexAt(
      geom.current,
      level.cols,
      level.rows,
      event.clientX - rect.left,
      event.clientY - rect.top,
    )
  }

  const handlePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    // 触屏长按会先来一次 pointerdown，再触发 contextmenu，记下来别当右键
    touched.current = event.pointerType === 'touch'
    // 鼠标悬停的预览跟着指针走
    if (event.pointerType === 'mouse') {
      setHover(cellIndexAtPointer(event, event.currentTarget))
    }
    // 电脑端：左键按下就放一格、右键删一格，按住拖过去都连续执行
    if (workbench && event.pointerType === 'mouse' && (event.button === 0 || event.button === 2)) {
      const index = cellIndexAtPointer(event, event.currentTarget)
      if (index < 0) return
      const erase = event.button === 2
      // 右键要挡一下浏览器菜单
      if (erase) event.preventDefault()
      event.currentTarget.setPointerCapture(event.pointerId)
      if (erase) onErase(index)
      else onCell(index)
      // 交互是开关，拖过去会反复切，不跟着拖动走
      const toggle = !erase && preview === 'interact'
      stroke.current = toggle ? null : { id: event.pointerId, last: index, erase }
      return
    }

    // 右键留给上面的删除和 contextmenu，不参与拖动、放置
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
    // 鼠标即使没按下也要更新悬停格，预览是跟着光标走的
    if (event.pointerType === 'mouse') {
      setHover(cellIndexAtPointer(event, event.currentTarget))
    }

    // 电脑端拖动连续编辑：两次事件之间跳过的格子按直线补齐
    const active = stroke.current
    if (active && active.id === event.pointerId) {
      const index = cellIndexAtPointer(event, event.currentTarget)
      if (index >= 0 && index !== active.last) {
        const cols = level.cols
        const fromX = active.last % cols
        const fromY = (active.last - fromX) / cols
        const toX = index % cols
        const toY = (index - toX) / cols
        const line = gridLine(fromX, fromY, toX, toY)
        // 起点上一次已经处理过了，从第二格开始补
        for (let i = 1; i < line.length; i++) {
          const cell = line[i][1] * cols + line[i][0]
          if (active.erase) onErase(cell)
          // 放置模式拖过输入元件不能一路反复拨，只有按下那一下算点击
          else if (!(placeMode && cells[cell]?.type === 'input')) onCell(cell)
        }
        active.last = index
      }
      return
    }

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
      updateCamera({ x: next.x, y: next.y, zoom })
      return
    }

    const current = drag.current
    if (!current || current.id !== event.pointerId) return
    const dx = event.clientX - current.x
    const dy = event.clientY - current.y
    if (!current.moved && Math.hypot(dx, dy) > DRAG_SLOP) current.moved = true
    if (!current.moved) return
    const g = geom.current
    const next = clampCamera(current.camX + dx, current.camY + dy, g.w, g.h, g.mapW, g.mapH)
    updateCamera({ ...camRef.current, x: next.x, y: next.y })
  }

  /** 右键删除：电脑端在按下 / 拖动时已经删了，这里只挡掉浏览器菜单 */
  const handleContextMenu = (event: ReactMouseEvent<HTMLCanvasElement>) => {
    event.preventDefault()
    // 电脑端鼠标右键已经由 pointerdown 处理，拖动删除也还在这条路上，别在这里再删一次
    if (workbench && !touched.current) return
    // 触屏长按也会走到这里；那不是右键，别删，顺手掐掉拖动免得松手又放一格
    const touch = touched.current
    drag.current = null
    stroke.current = null
    if (touch) return
    const index = cellIndexAtPointer(event, event.currentTarget)
    if (index < 0) return
    onErase(index)
  }

  /** 一根手指离开：松开的手指收掉，双指剩一根就不再缩放 */
  const releasePointer = (id: number) => {
    pointers.current.delete(id)
    if (pointers.current.size < 2) pinch.current = null
  }

  const handlePointerUp = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    releasePointer(event.pointerId)

    // 电脑端按下时已经放 / 删过了，松手不用再来一次
    if (stroke.current?.id === event.pointerId) {
      stroke.current = null
      return
    }

    const current = drag.current
    if (!current || current.id !== event.pointerId) return
    drag.current = null
    if (current.moved) return

    const index = cellIndexAtPointer(event, event.currentTarget)
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
        onPointerLeave={() => setHover(-1)}
        onContextMenu={handleContextMenu}
        onPointerCancel={(event) => {
          releasePointer(event.pointerId)
          drag.current = null
          stroke.current = null
          setHover(-1)
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
  hover: number,
  preview: Tool | null,
  previewDir: Dir | undefined,
  placeMode: boolean,
  fixedCell: boolean,
  /** 每格通电渐变的进度，参数是格子下标和「是不是横线」 */
  mixAt: (index: number, horizontal: boolean) => number,
) {
  ctx.clearRect(0, 0, w, h)
  ctx.fillStyle = BG
  ctx.fillRect(0, 0, w, h)

  // 格子大小取整，元件图标才能和网格线对齐。
  // 电脑端 100% 时一格固定 36px、所有关卡一样大；手机端按屏幕自适应
  const base = baseCell(fixedCell, w, h, level.cols, level.rows)
  const cell = Math.max(12, Math.round(base * cam.zoom))
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
        mixAt(i, false),
        mixAt(i, true),
      )
    }
  }

  // 鼠标悬停：锁住的格子画红虚线，删除模式画红色叉，其它工具画半透明预览
  if (hover >= 0 && hover < cells.length) {
    const hx = hover % level.cols
    const hy = (hover - hx) / level.cols
    const left = ox + hx * cell
    const top = oy + hy * cell
    if (left + cell > 0 && top + cell > 0 && left < w && top < h) {
      const cellData = cells[hover]
      const locked = cellData?.locked === true
      // 放置模式下已有元件不会被覆盖（输入元件除外，它是拿来拨的）
      const activatable = cellData?.type === 'input' && Boolean(cellData.id)
      const blocked =
        placeMode && preview !== 'erase' && cellData !== null && !activatable
      const cx = left + cell / 2 + 0.5
      const cy = top + cell / 2 + 0.5
      ctx.save()

      if (locked) {
        ctx.strokeStyle = 'rgba(255, 104, 96, 0.9)'
        ctx.lineWidth = 1.5
        ctx.setLineDash([4, 3])
        ctx.strokeRect(left + 2.5, top + 2.5, cell - 5, cell - 5)
      } else if (preview === 'erase') {
        ctx.fillStyle = 'rgba(255, 78, 78, 0.1)'
        ctx.fillRect(left, top, cell, cell)
        const pad = cell * 0.34
        ctx.strokeStyle = 'rgba(255, 96, 88, 0.75)'
        ctx.lineWidth = Math.max(1.5, cell * 0.045)
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.moveTo(left + pad, top + pad)
        ctx.lineTo(left + cell - pad, top + cell - pad)
        ctx.moveTo(left + cell - pad, top + pad)
        ctx.lineTo(left + pad, top + cell - pad)
        ctx.stroke()
      } else if (preview === 'interact') {
        if (cellData?.type === 'input') {
          ctx.strokeStyle = 'rgba(240, 86, 46, 0.95)'
          ctx.lineWidth = 2
          ctx.strokeRect(left + 2, top + 2, cell - 4, cell - 4)
        }
      } else if (placeMode && cellData) {
        // 输入元件拨 0 / 1；其它已有元件点了不会动，也就不画放置预览
        if (activatable) {
          ctx.strokeStyle = 'rgba(240, 86, 46, 0.95)'
          ctx.lineWidth = 2
          ctx.strokeRect(left + 2, top + 2, cell - 4, cell - 4)
        }
      } else if (preview) {
        ctx.globalAlpha = cellData ? 0.32 : 0.5
        drawComponent(
          ctx,
          { ...preview, dir: previewDir },
          cx,
          cy,
          cell,
          0,
          preview.type === 'wire' ? linkedDirs(cells, level, hx, hy) : null,
        )
        ctx.globalAlpha = 1
      }

      if (!locked) {
        // 不能覆盖的格子用灰框，别给成「可以放」的橙色
        ctx.strokeStyle = blocked ? 'rgba(150, 160, 180, 0.55)' : 'rgba(240, 86, 46, 0.85)'
        ctx.lineWidth = 1.5
        ctx.setLineDash([])
        ctx.strokeRect(left + 1.5, top + 1.5, cell - 3, cell - 3)
      }
      ctx.restore()
    }
  }
}
