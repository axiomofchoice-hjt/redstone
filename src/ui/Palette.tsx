import type { CellType, Dir, Level } from '../game/types'
import { ToolIcon } from './ToolIcon'

export type Tool = { type: CellType; id?: string } | 'erase'

const DIR_BUTTONS: { dir: Dir; label: string; area: string }[] = [
  { dir: 0, label: 'W', area: 'up' },
  { dir: 3, label: 'A', area: 'left' },
  { dir: 2, label: 'S', area: 'down' },
  { dir: 1, label: 'D', area: 'right' },
]

const TOOLS: { type: CellType; label: string }[] = [
  { type: 'wire', label: '导线' },
  { type: 'cross', label: '交叉' },
  { type: 'charger', label: '充能' },
  { type: 'repeater', label: '中继' },
  { type: 'not', label: '非门' },
]

interface Props {
  level: Level
  tool: Tool
  dir: Dir
  onTool: (tool: Tool) => void
  onDir: (dir: Dir) => void
}

export function Palette({ level, tool, dir, onTool, onDir }: Props) {
  // 输入在前、输出在后，字母由关卡数据给出
  const ports: { type: CellType; id: string; label: string }[] = [
    ...(level.inputs ?? []).map((id) => ({ type: 'input' as CellType, id, label: `输入 ${id}` })),
    ...(level.outputs ?? []).map((id) => ({ type: 'output' as CellType, id, label: `输出 ${id}` })),
  ]

  const active = (type: CellType, id?: string) =>
    tool !== 'erase' && tool.type === type && tool.id === id

  return (
    <div className="palette">
      <div className="tools">
        {TOOLS.map((item) => (
          <button
            key={item.type}
            type="button"
            className={active(item.type) ? 'tool active' : 'tool'}
            aria-label={item.label}
            title={item.label}
            onClick={() => onTool({ type: item.type })}
          >
            <ToolIcon type={item.type} dir={dir} active={active(item.type)} />
          </button>
        ))}
        {ports.map((item) => (
          <button
            key={item.id}
            type="button"
            className={active(item.type, item.id) ? 'tool active' : 'tool'}
            aria-label={item.label}
            title={item.label}
            onClick={() => onTool({ type: item.type, id: item.id })}
          >
            <ToolIcon type={item.type} id={item.id} dir={dir} active={active(item.type, item.id)} />
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
          {/* 占位：交互功能待定 */}
          <button type="button" className="swap">
            交互
          </button>
          <button
            type="button"
            className={tool === 'erase' ? 'erase active' : 'erase'}
            onClick={() => onTool('erase')}
          >
            删除
          </button>
        </div>
      </div>
    </div>
  )
}
