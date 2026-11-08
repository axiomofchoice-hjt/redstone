import { useEffect, useRef } from 'react'
import type { CellType, Dir } from '../game/types'
import { drawComponent } from './glyph'

interface Props {
  type: CellType
  /** 输入/输出的字母 */
  id?: string
  dir: Dir
  /** 按钮用橙色实心高亮时把图标反过来画成深色（只有手机元件栏这样） */
  invert?: boolean
  /** 图标边长；手机元件栏是 30，电脑端面板可以给大一点 */
  size?: number
}

/** 按钮上的元件图标：把元件按缩小尺寸画一遍 */
export function ToolIcon({ type, id, dir, invert = false, size = 30 }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)

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
    // 橙色实心底上图标反过来用深色；输入/输出里的字母要保持深色，所以不换
    const dark = invert && type !== 'input' && type !== 'output'
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
  }, [type, id, dir, invert, size])

  return <canvas ref={ref} style={{ width: size, height: size, display: 'block' }} />
}
