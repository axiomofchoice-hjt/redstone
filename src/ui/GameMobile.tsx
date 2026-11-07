import { hasDirection } from '../game/sim'
import type { LevelRun } from '../game/sim'
import type { Dir, Level } from '../game/types'
import { Board } from './Board'
import { Palette } from './Palette'
import type { Tool } from './Palette'

interface Props {
  level: Level
  tool: Tool
  dir: Dir
  run: LevelRun | null
  paused: boolean
  revision: number
  menuOpen: boolean
  powerAt: (index: number) => number
  lockedAt: (index: number) => boolean
  onTool: (tool: Tool) => void
  onDir: (dir: Dir) => void
  onCell: (index: number) => void
  onErase: (index: number) => void
  onRun: () => void
  onPause: () => void
  onNextTick: () => void
  onMenuToggle: () => void
  onContinue: () => void
  onSolution: () => void
  onExport: () => void
  onLevels: () => void
}

/** 手机端游戏界面：原来的单列布局，地图占满中间，元件栏在底部 */
export function GameMobile({
  level,
  tool,
  dir,
  run,
  paused,
  revision,
  menuOpen,
  powerAt,
  lockedAt,
  onTool,
  onDir,
  onCell,
  onErase,
  onRun,
  onPause,
  onNextTick,
  onMenuToggle,
  onContinue,
  onSolution,
  onExport,
  onLevels,
}: Props) {
  return (
    <div className="app">
      <header className="top">
        <div className="head">
          <button
            type="button"
            className="menu"
            aria-label="菜单"
            aria-expanded={menuOpen}
            title="菜单"
            onClick={onMenuToggle}
          >
            {/* 三行，每行左边一个点、右边一条横线 */}
            <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
              <g fill="currentColor">
                <circle cx="3" cy="3.5" r="1.4" />
                <circle cx="3" cy="8" r="1.4" />
                <circle cx="3" cy="12.5" r="1.4" />
              </g>
              <g stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none">
                <line x1="7" y1="3.5" x2="13" y2="3.5" />
                <line x1="7" y1="8" x2="13" y2="8" />
                <line x1="7" y1="12.5" x2="13" y2="12.5" />
              </g>
            </svg>
          </button>
          <div>
            <h1>
              第 {level.no ?? 1} 关 · {level.name}
            </h1>
          </div>
        </div>
      </header>

      {menuOpen ? (
        // 菜单打开时把地图和底部栏都让出来，按钮放在中间
        <div className="menu-screen">
          <div className="menu-actions">
            <button type="button" className="btn primary menu-btn" onClick={onContinue}>
              继续游戏
            </button>
            <button
              type="button"
              className="btn menu-btn"
              disabled={!level.solution}
              onClick={onSolution}
            >
              参考答案
            </button>
            <button type="button" className="btn menu-btn" onClick={onExport}>
              导出地图
            </button>
            <button type="button" className="btn menu-btn" onClick={onLevels}>
              返回选关界面
            </button>
          </div>
        </div>
      ) : (
        <>
          <Board
            level={level}
            cells={level.cells}
            powerAt={powerAt}
            lockedAt={lockedAt}
            revision={revision}
            onCell={onCell}
            onErase={onErase}
            preview={tool}
            previewDir={
              tool !== 'erase' && tool !== 'interact' && hasDirection(tool.type) ? dir : undefined
            }
          />

          <div className="toolbar">
            <div className={run?.passed ? 'result ok' : 'result'}>
              <span>
                {run === null
                  ? '未运行'
                  : run.passed
                    ? '全部测试通过'
                    : `${run.outcomes.filter((outcome) => !outcome.passed).length} / ${run.outcomes.length} 个测试未通过`}
              </span>
            </div>
            <div className="actions">
              <button
                type="button"
                className="debug icon"
                aria-label={paused ? '继续' : '暂停'}
                title={paused ? '继续' : '暂停'}
                onClick={onPause}
              >
                {paused ? (
                  // 继续：朝右三角形
                  <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
                    <path d="M4 2 L13 8 L4 14 Z" fill="currentColor" />
                  </svg>
                ) : (
                  // 暂停：两条竖线
                  <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
                    <rect x="3" y="2" width="3.5" height="12" fill="currentColor" />
                    <rect x="9.5" y="2" width="3.5" height="12" fill="currentColor" />
                  </svg>
                )}
              </button>
              <button type="button" className="debug" onClick={onNextTick} disabled={!paused}>
                下一刻
              </button>
              <button type="button" className="run" onClick={onRun}>
                运行测试
              </button>
            </div>
          </div>

          <Palette level={level} tool={tool} dir={dir} onTool={onTool} onDir={onDir} />
        </>
      )}
    </div>
  )
}
