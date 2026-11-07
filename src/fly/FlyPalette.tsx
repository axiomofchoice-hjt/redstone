import { useEffect, useRef } from 'react'
import { drawFlyPart } from './glyph'
import type { FlyDir, FlyPartType } from './types'
import { FLY_TOOLS, hasFlyDir } from './tools'

const DIR_BUTTONS: { dir: FlyDir; label: string; area: string }[] = [
  { dir: 0, label: 'W', area: 'up' },
  { dir: 3, label: 'A', area: 'left' },
  { dir: 2, label: 'S', area: 'down' },
  { dir: 1, label: 'D', area: 'right' },
]

export function PartIcon({
  type,
  dir,
  size = 22,
}: {
  type: FlyPartType
  dir?: FlyDir
  size?: number
}) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = size * dpr
    canvas.height = size * dpr
    canvas.style.width = `${size}px`
    canvas.style.height = `${size}px`
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, size, size)
    drawFlyPart(ctx, { type, dir }, size / 2, size / 2, size)
  }, [type, dir, size])
  return <canvas ref={ref} aria-hidden="true" />
}

interface Props {
  tool: FlyPartType | 'erase'
  dir: FlyDir
  onTool: (tool: FlyPartType | 'erase') => void
  onDir: (dir: FlyDir) => void
}

export function FlyPalette({ tool, dir, onTool, onDir }: Props) {
  return (
    <div className="palette">
      <div className="tools">
        {FLY_TOOLS.map((item) => (
          <button
            key={item.type}
            type="button"
            className={tool === item.type ? 'tool active' : 'tool'}
            aria-label={item.label}
            title={item.label}
            onClick={() => onTool(item.type)}
          >
            <PartIcon type={item.type} dir={hasFlyDir(item.type) ? dir : undefined} />
          </button>
        ))}
      </div>
      <div className="side">
        <div className="dpad">
          {DIR_BUTTONS.map((item) => (
            <button
              key={item.label}
              type="button"
              className={`dir ${item.area}${dir === item.dir ? ' active' : ''}`}
              onClick={() => onDir(item.dir)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="stack">
          <button
            type="button"
            className={tool === 'erase' ? 'erase active' : 'erase'}
            title="右键地图也可以直接删除"
            onClick={() => onTool('erase')}
          >
            删除
          </button>
        </div>
      </div>
    </div>
  )
}
