import { useEffect, useRef } from 'react'
import { Simulation } from '../game/sim'
import type { Cell, Level } from '../game/types'
import { drawComponent, edgeReach, lineWidth, linkedDirs, OFF, ON } from './glyph'

/**
 * 教程第二页的四张状态图：状态和颜色都来自真实的 Simulation，元件用和地图
 * 同一套 drawComponent 画。只有交叉处换成横线最后画、从竖线上面跨过去，
 * 让「两条通道没有接上」一眼能看出来。
 */
const CELL = 88
const COLS = 4
const ROWS = 3
const W = COLS * CELL
const H = ROWS * CELL
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

function drawPanel(canvas: HTMLCanvasElement, spec: Spec): void {
  const dpr = window.devicePixelRatio || 1
  canvas.width = Math.round(W * dpr)
  canvas.height = Math.round(H * dpr)
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  const level = makeLevel(spec.cross)
  const sim = new Simulation(level)
  sim.setInputs(spec.inputs)
  const { cells } = level

  ctx.fillStyle = BG
  ctx.fillRect(0, 0, W, H)

  ctx.strokeStyle = GRID
  ctx.lineWidth = 1
  ctx.beginPath()
  for (let x = 0; x <= COLS; x++) {
    ctx.moveTo(x * CELL + 0.5, 0)
    ctx.lineTo(x * CELL + 0.5, H)
  }
  for (let y = 0; y <= ROWS; y++) {
    ctx.moveTo(0, y * CELL + 0.5)
    ctx.lineTo(W, y * CELL + 0.5)
  }
  ctx.stroke()

  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const i = y * COLS + x
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
