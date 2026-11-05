import type { CellType, Dir } from '../game/types'

export type Tool = CellType | 'erase'

const DIR_BUTTONS: { dir: Dir; label: string; area: string }[] = [
  { dir: 0, label: 'W', area: 'up' },
  { dir: 3, label: 'A', area: 'left' },
  { dir: 2, label: 'S', area: 'down' },
  { dir: 1, label: 'D', area: 'right' },
]

interface Props {
  tool: Tool
  dir: Dir
  /** false：导线 + 充能器；true：交叉导线 + 中继器 */
  alt: boolean
  onTool: (tool: Tool) => void
  onDir: (dir: Dir) => void
  onAlt: () => void
}

export function Palette({ tool, dir, alt, onTool, onDir, onAlt }: Props) {
  const conductor = alt ? 'cross' : 'wire'
  const source = alt ? 'repeater' : 'charger'
  const tools: { type: CellType; label: string }[] = [
    { type: conductor, label: alt ? '交叉' : '导线' },
    { type: source, label: alt ? '中继' : '充能' },
    { type: 'not', label: '非门' },
    { type: 'input', label: '输入' },
    { type: 'output', label: '输出' },
  ]

  return (
    <div className="palette">
      <button type="button" className="toggle" aria-label="切换导线与充能器类型" onClick={onAlt}>
        ⇄
      </button>

      <div className="tools">
        {tools.map((item) => (
          <button
            key={item.type}
            type="button"
            className={tool === item.type ? 'tool active' : 'tool'}
            onClick={() => onTool(item.type)}
          >
            {item.label}
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
