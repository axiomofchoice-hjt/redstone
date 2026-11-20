import type { ReactNode } from 'react'
import type { Dir } from '../game/types'

/**
 * 教程页里的示意图：用和地图同一套元件画法（尺寸、线宽、配色都按格子缩放），
 * 每格 44，网底纹也按 44 铺，放大缩小都跟正文一起走。
 */
const CELL = 44
const ON = 'var(--redstone)'
const OFF = '#39445c'
const INK = '#ffffff'

/** 第 i 列 / 行的格子中心 */
const c = (i: number) => i * CELL + CELL / 2

/** 和格子对齐的网格底纹 */
function Grid({ id, width, height }: { id: string; width: number; height: number }) {
  return (
    <>
      <defs>
        <pattern id={id} width={CELL} height={CELL} patternUnits="userSpaceOnUse">
          <path
            d={`M ${CELL} 0 H 0 V ${CELL}`}
            fill="none"
            stroke="var(--line-soft)"
            strokeWidth={1}
          />
        </pattern>
      </defs>
      <rect width={width} height={height} fill={`url(#${id})`} />
    </>
  )
}

function Wire({
  x1,
  y1,
  x2,
  y2,
  on = true,
}: {
  x1: number
  y1: number
  x2: number
  y2: number
  on?: boolean
}) {
  return (
    <line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      stroke={on ? ON : OFF}
      strokeWidth={2.6}
      strokeLinecap="round"
    />
  )
}

/** 输入：朝四面发信号的实心方块 */
function In({ x, y, id, on = true }: { x: number; y: number; id: string; on?: boolean }) {
  return (
    <g>
      <rect x={x - 11.5} y={y - 11.5} width={23} height={23} rx={5.3} fill={on ? ON : OFF} />
      <text
        x={x}
        y={y + 0.5}
        fill={INK}
        fontSize={12.5}
        fontWeight={600}
        textAnchor="middle"
        dominantBaseline="central"
      >
        {id}
      </text>
    </g>
  )
}

/** 输出：空心方块 + 字母 */
function Out({ x, y, id, on = true }: { x: number; y: number; id: string; on?: boolean }) {
  const color = on ? ON : OFF
  return (
    <g>
      <rect
        x={x - 11.5}
        y={y - 11.5}
        width={23}
        height={23}
        rx={5.3}
        fill="none"
        stroke={color}
        strokeWidth={2.4}
      />
      <text
        x={x}
        y={y + 0.5}
        fill={color}
        fontSize={12.5}
        fontWeight={600}
        textAnchor="middle"
        dominantBaseline="central"
      >
        {id}
      </text>
    </g>
  )
}

/** 中继器：尖朝前的三角形；锁住时填实 */
function Repeater({
  x,
  y,
  dir = 1,
  on = true,
  locked = false,
}: {
  x: number
  y: number
  dir?: Dir
  on?: boolean
  locked?: boolean
}) {
  const color = on ? ON : OFF
  return (
    <g transform={`translate(${x} ${y}) rotate(${(dir - 1) * 90})`}>
      <polygon
        points="15.9,0 -11.5,-15.9 -11.5,15.9"
        fill={locked ? color : 'none'}
        stroke={color}
        strokeWidth={2.6}
        strokeLinejoin="round"
      />
    </g>
  )
}

/** 充能器：一条主干 + 两条箭羽 */
function Charger({
  x,
  y,
  dir = 1,
  on = true,
}: {
  x: number
  y: number
  dir?: Dir
  on?: boolean
}) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${(dir - 1) * 90})`}>
      <path
        d="M -19.7 0 H 19.7 M 19.7 0 L 11.8 -7.9 M 19.7 0 L 11.8 7.9"
        fill="none"
        stroke={on ? ON : OFF}
        strokeWidth={2.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  )
}

function Art({
  label,
  viewBox,
  children,
}: {
  label: string
  viewBox: string
  children: ReactNode
}) {
  return (
    <svg className="handbook-svg" viewBox={viewBox} role="img" aria-label={label}>
      {children}
    </svg>
  )
}

/** 第 4 页：左边输入朝四个方向发信号，右边输出把四周的信号收进来 */
export function PortsArt() {
  return (
    <Art label="输入 P 朝上下左右发信号，输出 Y 收集四周的信号" viewBox="0 0 440 220">
      <defs>
        <marker
          id="hb-arrow"
          markerUnits="userSpaceOnUse"
          markerWidth={14}
          markerHeight={14}
          refX={11}
          refY={7}
          orient="auto"
        >
          <path d="M 0 0 L 14 7 L 0 14 Z" fill={ON} />
        </marker>
      </defs>
      <Grid id="hb-grid-ports" width={440} height={220} />

      {/* 输入：四条线从方块中心朝外，方块盖住线头 */}
      <g markerEnd="url(#hb-arrow)">
        <Wire x1={c(2)} y1={c(2)} x2={c(2)} y2={c(1)} />
        <Wire x1={c(2)} y1={c(2)} x2={c(3)} y2={c(2)} />
        <Wire x1={c(2)} y1={c(2)} x2={c(2)} y2={c(3)} />
        <Wire x1={c(2)} y1={c(2)} x2={c(1)} y2={c(2)} />
      </g>
      <In x={c(2)} y={c(2)} id="P" />

      {/* 输出：四条线从四周指向方块，箭头停在方块边上 */}
      <g markerEnd="url(#hb-arrow)">
        <Wire x1={c(7)} y1={c(1)} x2={c(7)} y2={c(2) - 13} />
        <Wire x1={c(8)} y1={c(2)} x2={c(7) + 13} y2={c(2)} />
        <Wire x1={c(7)} y1={c(3)} x2={c(7)} y2={c(2) + 13} />
        <Wire x1={c(6)} y1={c(2)} x2={c(7) - 13} y2={c(2)} />
      </g>
      <Out x={c(7)} y={c(2)} id="Y" />
    </Art>
  )
}

/** 第 5 页：D 接到中继器前方，E 从下面顶住它的侧面，三角形填实表示输出被按住 */
export function LatchArt() {
  return (
    <Art label="D 经过中继器送到输出 Y，E 驱动另一个中继器顶住它的侧面，输出被锁住" viewBox="0 0 220 132">
      <Grid id="hb-grid-latch" width={220} height={132} />
      <Wire x1={c(0)} y1={c(0)} x2={c(2) - 23} y2={c(0)} />
      <Wire x1={c(2) + 23} y1={c(0)} x2={c(4) - 13} y2={c(0)} />
      <Wire x1={c(2)} y1={c(2) - 11.5} x2={c(2)} y2={c(1) + 22} />
      <In x={c(0)} y={c(0)} id="D" />
      <Repeater x={c(2)} y={c(0)} dir={1} locked />
      <Out x={c(4)} y={c(0)} id="Y" />
      <Repeater x={c(2)} y={c(1)} dir={0} />
      <In x={c(2)} y={c(2)} id="E" />
    </Art>
  )
}

/** 第 6 页：E 的充能器顶住中继器侧面时，输出的那一段是断的，Y 收不到 1 */
export function BreakArt() {
  return (
    <Art label="D 经过中继器送到输出 Y，E 的充能器顶住中继器侧面，输出被掐断、Y 为 0" viewBox="0 0 220 132">
      <Grid id="hb-grid-break" width={220} height={132} />
      <Wire x1={c(0)} y1={c(0)} x2={c(2) - 23} y2={c(0)} />
      <Wire x1={c(2) + 23} y1={c(0)} x2={c(4) - 13} y2={c(0)} on={false} />
      <Wire x1={c(2)} y1={c(2) - 11.5} x2={c(2)} y2={c(1) + 22} />
      <In x={c(0)} y={c(0)} id="D" />
      <Repeater x={c(2)} y={c(0)} dir={1} on={false} />
      <Out x={c(4)} y={c(0)} id="Y" on={false} />
      <Charger x={c(2)} y={c(1)} dir={0} />
      <In x={c(2)} y={c(2)} id="E" />
      {/* 侧面被顶住的接线处：打断记号 */}
      <g stroke="var(--accent)" strokeWidth={2.4} strokeLinecap="round">
        <path d={`M ${c(2) - 5} ${CELL - 5} L ${c(2) + 5} ${CELL + 5}`} />
        <path d={`M ${c(2) + 5} ${CELL - 5} L ${c(2) - 5} ${CELL + 5}`} />
      </g>
    </Art>
  )
}
