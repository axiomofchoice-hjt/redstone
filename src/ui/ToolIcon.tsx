import { useEffect, useRef } from 'react'
import type { CellType, Dir } from '../game/types'
import { drawComponent } from './glyph'

interface Props {
  type: CellType
  /** 输入/输出的字母 */
  id?: string
  dir: Dir
  active: boolean
}

/** 按钮上的元件图标：把元件按缩小尺寸画一遍 */
export function ToolIcon({ type, id, dir, active }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)
  // 按钮 32px 含 1px 边框，内容区 30px，图标正好铺满、四边都碰到边框
  const size = 30

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = Math.floor(size * dpr)
    canvas.height = Math.floor(size * dpr)
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, size, size)
    // 选中时按钮底色是橙色，图标反过来用深色；输入/输出里的字母要保持深色，所以不换
    const dark = active && type !== 'input' && type !== 'output'
    drawComponent(
      ctx,
      { type, dir, id },
      size / 2,
      size / 2,
      size,
      0,
      type === 'wire' ? [] : null,
      dark ? '#160b07' : undefined,
    )
  }, [type, id, dir, active])

  return <canvas ref={ref} style={{ width: size, height: size, display: 'block' }} />
}
