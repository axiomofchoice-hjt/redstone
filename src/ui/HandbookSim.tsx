import { useEffect, useRef } from 'react'
import { Simulation } from '../game/sim'
import type { Cell, Dir, Level } from '../game/types'
import { drawComponent, edgeReach, lineWidth, linkedDirs, OFF, ON } from './glyph'

/**
 * 教程里的状态图：状态和颜色都来自真实的 Simulation，元件用和地图同一套
 * drawComponent 画。第二页的交叉处换成横线最后画、从竖线上面跨过去，
 * 让「两条通道没有接上」一眼能看出来。
 */
const CELL = 88
const COLS = 4
const ROWS = 3
const BG = '#ffffff'
const GRID = '#dfe6f2'

interface Spec {
  label: string
  cross: boolean
  inputs: Record<string, 0 | 1>
}

const SPECS: Spec[] = [
  { label: 'A = 0', cross: false, inputs: { A: 0 } },
  { label: 'A = 1', cross: false, inputs: { A: 1 } },
  { label: 'A = 1，B = 0', cross: true, inputs: { A: 1, B: 0 } },
  { label: 'A = 0，B = 1', cross: true, inputs: { A: 0, B: 1 } },
]

/** 四格宽、三格高的小电路：A 在左边；交叉导线那两张里 B 从上面接进来，下面再留一格导线 */
function makeLevel(cross: boolean): Level {
  const cells = new Array<Cell | null>(COLS * ROWS).fill(null)
  cells[COLS] = { type: 'input', id: 'A' }
  cells[COLS + 1] = { type: 'wire' }
  cells[COLS + 2] = cross ? { type: 'cross' } : { type: 'wire' }
  cells[COLS + 3] = { type: 'wire' }
  if (cross) {
    cells[2] = { type: 'input', id: 'B' }
    cells[COLS * 2 + 2] = { type: 'wire' }
  }
  return { id: 'handbook-wire-cross', name: '', cols: COLS, rows: ROWS, cells, tests: [] }
}

function drawCross(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  cell: number,
  power: number,
): void {
  const width = lineWidth(cell)
  const reach = edgeReach(cell, width)
  const r = cell * 0.24
  ctx.lineWidth = width
  ctx.lineCap = 'round'

  // 竖线先画；横线最后画、从上面跨过去。教程里要一眼看出两条线没有接上，
  // 和地图上「竖线压在横线上面」的画法只差这一笔。
  ctx.strokeStyle = (power & 1) !== 0 ? ON : OFF
  ctx.beginPath()
  ctx.moveTo(cx, cy - reach)
  ctx.lineTo(cx, cy + reach)
  ctx.stroke()

  ctx.strokeStyle = (power & 2) !== 0 ? ON : OFF
  ctx.beginPath()
  ctx.moveTo(cx - reach, cy)
  ctx.lineTo(cx - r, cy)
  ctx.arc(cx, cy, r, Math.PI, 0, true)
  ctx.lineTo(cx + reach, cy)
  ctx.stroke()
}

/** 一张小地图的底：白底，网格线按格子铺，和地图上的一格一格对齐 */
function sheet(
  canvas: HTMLCanvasElement,
  cols: number,
  rows: number,
  cell: number,
): CanvasRenderingContext2D | null {
  const dpr = window.devicePixelRatio || 1
  const w = cols * cell
  const h = rows * cell
  canvas.width = Math.round(w * dpr)
  canvas.height = Math.round(h * dpr)
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  ctx.fillStyle = BG
  ctx.fillRect(0, 0, w, h)

  ctx.strokeStyle = GRID
  ctx.lineWidth = 1
  ctx.beginPath()
  for (let x = 0; x <= cols; x++) {
    ctx.moveTo(x * cell + 0.5, 0)
    ctx.lineTo(x * cell + 0.5, h)
  }
  for (let y = 0; y <= rows; y++) {
    ctx.moveTo(0, y * cell + 0.5)
    ctx.lineTo(w, y * cell + 0.5)
  }
  ctx.stroke()
  return ctx
}

/**
 * 把一张小地图画到画布上：网格底纹，元件用和地图同一套 drawComponent，颜色和状态都来自真实仿真。
 * `steps` 是拨完输入后再走几个 tick，用来画中继器「晚 1 tick」前后的两张图。
 */
function paint(
  canvas: HTMLCanvasElement,
  level: Level,
  inputs: Record<string, 0 | 1>,
  steps = 0,
): void {
  const sim = new Simulation(level)
  sim.setInputs(inputs)
  for (let i = 0; i < steps; i++) sim.step()
  const { cells, cols, rows } = level
  const ctx = sheet(canvas, cols, rows, CELL)
  if (!ctx) return

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const i = y * cols + x
      const cell = cells[i]
      if (!cell) continue
      if (cell.type === 'cross') {
        drawCross(ctx, x * CELL + CELL / 2, y * CELL + CELL / 2, CELL, sim.powerAt(i))
        continue
      }
      drawComponent(
        ctx,
        cell,
        x * CELL + CELL / 2,
        y * CELL + CELL / 2,
        CELL,
        sim.powerAt(i),
        linkedDirs(cells, level, x, y),
      )
    }
  }
}

function drawPanel(canvas: HTMLCanvasElement, spec: Spec): void {
  paint(canvas, makeLevel(spec.cross), spec.inputs)
}

function Panel({ spec }: { spec: Spec }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (ref.current) drawPanel(ref.current, spec)
  }, [spec])

  return (
    <figure className="handbook-sim-panel">
      <canvas ref={ref} />
      <figcaption>{spec.label}</figcaption>
    </figure>
  )
}

function Row({ specs }: { specs: Spec[] }) {
  return (
    <div className="handbook-sim-row">
      {specs.map((spec) => (
        <Panel key={spec.label} spec={spec} />
      ))}
    </div>
  )
}

export function WireCrossSim() {
  return (
    <div className="handbook-sim">
      <section className="handbook-sim-section">
        <p className="handbook-sim-title">导线</p>
        <Row specs={SPECS.slice(0, 2)} />
      </section>
      <section className="handbook-sim-section">
        <p className="handbook-sim-title">交叉导线</p>
        <Row specs={SPECS.slice(2)} />
      </section>
    </div>
  )
}

/** 第三页的两组图：中间一行是「输入 A、导线、元件、导线」，元件分别是充能器和中继器 */
interface SourceSpec {
  type: 'charger' | 'repeater'
  dir: Dir
  steps: number
  label: string
}

const SOURCE_SECTIONS: { title: string; panels: SourceSpec[] }[] = [
  {
    title: '充能器',
    panels: [
      { type: 'charger', dir: 1, steps: 0, label: 'A = 1，向右' },
      { type: 'charger', dir: 3, steps: 0, label: 'A = 1，向左' },
    ],
  },
  {
    // 两张都是朝右：左边刚拨上 A，中继器还没采样，右边晚 1 tick 才跟上
    title: '中继器',
    panels: [
      { type: 'repeater', dir: 1, steps: 0, label: 'A = 1' },
      { type: 'repeater', dir: 1, steps: 1, label: 'A = 1，1 tick 后' },
    ],
  },
]

function makeSourceLevel(type: 'charger' | 'repeater', dir: Dir): Level {
  const cells = new Array<Cell | null>(COLS * ROWS).fill(null)
  cells[COLS] = { type: 'input', id: 'A' }
  cells[COLS + 1] = { type: 'wire' }
  cells[COLS + 2] = { type, dir }
  cells[COLS + 3] = { type: 'wire' }
  return { id: `handbook-${type}`, name: '', cols: COLS, rows: ROWS, cells, tests: [] }
}

function SourcePanel({ spec }: { spec: SourceSpec }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (ref.current) paint(ref.current, makeSourceLevel(spec.type, spec.dir), { A: 1 }, spec.steps)
  }, [spec])

  return (
    <figure className="handbook-sim-panel">
      <canvas ref={ref} />
      <figcaption>{spec.label}</figcaption>
    </figure>
  )
}

/** 卡片里两组图：充能器看方向，中继器看 1 tick 延迟 */
export function SourceSim() {
  return (
    <div className="handbook-art handbook-figures">
      <div className="handbook-sim">
        {SOURCE_SECTIONS.map((section) => (
          <section className="handbook-sim-section" key={section.title}>
            <p className="handbook-sim-title">{section.title}</p>
            <div className="handbook-sim-row">
              {section.panels.map((spec) => (
                <SourcePanel key={spec.label} spec={spec} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
