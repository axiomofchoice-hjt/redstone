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
  conductor: 'wire' | 'cross'
  onTool: (tool: Tool) => void
  onDir: (dir: Dir) => void
  onConductor: (conductor: 'wire' | 'cross') => void
}

export function Palette({ tool, dir, conductor, onTool, onDir, onConductor }: Props) {
  const tools: { type: CellType; label: string }[] = [
    { type: conductor, label: conductor === 'wire' ? '导线' : '交叉' },
    { type: 'charger', label: '充能' },
    { type: 'not', label: '非门' },
    { type: 'input', label: '输入' },
    { type: 'output', label: '输出' },
  ]

  return (
    <div className="palette">
      <button
        type="button"
        className="toggle"
        aria-label="切换导线类型"
        onClick={() => onConductor(conductor === 'wire' ? 'cross' : 'wire')}
      >
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
              style={{ gridArea: item.area }}
              onClick={() => onDir(item.dir)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          className={tool === 'erase' ? 'erase active' : 'erase'}
          onClick={() => onTool('erase')}
        >
          删除
        </button>
      </div>
    </div>
  )
}
