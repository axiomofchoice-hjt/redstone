import { hasDirection } from '../game/sim'
import type { CellType, Dir, Level } from '../game/types'
import type { Port } from './ports'

/** 一个元件：类型，输入 / 输出再带个字母 */
export interface ToolSpec {
  type: CellType
  id?: string
}

/** 元件栏当前选中的东西：某个元件，或者删除 / 交互这些模式 */
export type Tool = ToolSpec | 'erase' | 'interact'

/** 元件栏里的一项：元件本身 + 按钮上的字 + 这关能不能用 */
export interface ToolItem extends ToolSpec {
  label: string
  disabled: boolean
}

/** 这关能不能用某种元件；关卡没写 tools 就是全都可用 */
export function toolEnabled(level: Level, type: CellType): boolean {
  return !level.tools || level.tools.includes(type)
}

/** 元件栏里的顺序，也是选默认元件时的优先级 */
export const TOOLS: { type: CellType; label: string }[] = [
  { type: 'wire', label: '导线' },
  { type: 'cross', label: '交叉' },
  { type: 'charger', label: '充能' },
  { type: 'repeater', label: '中继' },
  { type: 'not', label: '非门' },
]

/** 换关时默认选这关能用的第一个元件 */
export function defaultTool(level: Level): CellType {
  return TOOLS.find((item) => toolEnabled(level, item.type))?.type ?? 'wire'
}

/**
 * 元件栏的全部按钮：基础元件在前、输入 / 输出在后。
 * 元件栏、电脑端面板和数字键都按这一个顺序排，不会各排各的。
 */
export const toolItems = (level: Level, ports: Port[]): ToolItem[] => [
  ...TOOLS.map(({ type, label }) => ({ type, label, disabled: !toolEnabled(level, type) })),
  ...ports.map(({ type, id }) => ({
    type,
    id,
    label: `${type === 'input' ? '输入' : '输出'} ${id}`,
    disabled: false,
  })),
]

/** 元件栏里这一项是不是当前选中的 */
export const isToolActive = (tool: Tool, item: ToolSpec): boolean =>
  typeof tool === 'object' && tool.type === item.type && tool.id === item.id

/** 去掉按钮上的字和禁用状态，只留下要传给 `onTool` 的元件 */
export const toolSpec = (item: ToolSpec): ToolSpec =>
  item.id ? { type: item.type, id: item.id } : { type: item.type }

/** 有方向元件的预览朝向；删除 / 交互不画放置预览 */
export const previewDirOf = (tool: Tool, dir: Dir): Dir | undefined =>
  tool !== 'erase' && tool !== 'interact' && hasDirection(tool.type) ? dir : undefined
