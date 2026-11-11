import { useEffect } from 'react'
import type { Dir, Level } from '../game/types'
import type { Port } from './ports'
import { toolItems, toolSpec, type ToolSpec } from './tools'

/** 方向按钮的排列：上和下、左和右分居两侧，电脑端和手机端共用 */
export const DIRECTIONS: { dir: Dir; key: string; label: string; area: string }[] = [
  { dir: 0, key: 'W', label: '上', area: 'up' },
  { dir: 3, key: 'A', label: '左', area: 'left' },
  { dir: 2, key: 'S', label: '下', area: 'down' },
  { dir: 1, key: 'D', label: '右', area: 'right' },
]

const KEY_DIRS: Record<string, Dir> = Object.fromEntries(
  DIRECTIONS.map(({ key, dir }) => [key.toLowerCase(), dir]),
)

/** WASD 对应的方向；不认识的键返回 null */
export const dirForKey = (key: string): Dir | null => KEY_DIRS[key.toLowerCase()] ?? null

/** 方向按顺时针排：上 0、右 1、下 2、左 3；鼠标滚轮一格转 90° */
export const rotateDir = (dir: Dir, step: number): Dir =>
  ((((dir + step) % 4) + 4) % 4) as Dir

/** 1～9 对应的元件栏位置；其他键返回 null */
const toolIndexForKey = (key: string): number | null =>
  /^[1-9]$/.test(key) ? Number(key) - 1 : null

/**
 * 数字键对应的元件：1～5 是基础元件，6 起依次是元件栏里剩下的输入 / 输出。
 * 这关不让用的元件返回 null。
 */
export const toolForKey = (key: string, level: Level, ports: Port[]): ToolSpec | null => {
  const index = toolIndexForKey(key)
  if (index === null) return null
  const item = toolItems(level, ports)[index]
  return item && !item.disabled ? toolSpec(item) : null
}

export const isTypingTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false
  return (
    target.isContentEditable ||
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT'
  )
}

/**
 * 游戏页挂载时用数字键操作元件栏。
 * 手机端传 onDir，额外用 WASD 换朝向；电脑端传 null，WASD 和方向键留给地图平移。
 * 回放时传 disabled，元件栏和方向键都变灰，键盘也别偷偷改选。
 */
export function usePaletteKeys(
  level: Level,
  ports: Port[],
  onDir: ((dir: Dir) => void) | null,
  onTool: (tool: ToolSpec) => void,
  disabled = false,
): void {
  useEffect(() => {
    if (disabled) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return
      if (isTypingTarget(event.target)) return

      const dir = onDir ? dirForKey(event.key) : null
      if (onDir && dir !== null) {
        event.preventDefault()
        onDir(dir)
        return
      }

      const tool = toolForKey(event.key, level, ports)
      if (!tool) return
      event.preventDefault()
      onTool(tool)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [level, ports, onDir, onTool, disabled])
}
