import { useCallback, useEffect, useReducer, useState } from 'react'
import { hasDirection, runLevel, Simulation, type LevelRun } from './game/sim'
import type { Dir, Level } from './game/types'
import { level01 } from './levels/level-01'
import { Board } from './ui/Board'
import { Palette, type Tool } from './ui/Palette'
import './App.css'

const INITIAL_DIR: Dir = 1

/** 编辑器里仿真每 tick 的间隔：4 tick/s */
const TICK_MS = 250

interface Editing {
  level: Level
  sim: Simulation
}

const initial = (): Editing => {
  const level = { ...level01, cells: level01.cells.slice() }
  return { level, sim: new Simulation(level) }
}

export default function App() {
  const [{ level, sim }, setEditing] = useState<Editing>(initial)
  const [tool, setTool] = useState<Tool>({ type: 'wire' })
  const [dir, setDir] = useState<Dir>(INITIAL_DIR)
  const [run, setRun] = useState<LevelRun | null>(null)
  // 编辑器里手动开关的输入
  const [inputs, setInputs] = useState<Record<string, 0 | 1>>({})
  const [menuOpen, setMenuOpen] = useState(false)
  // 仿真在后台推进，只在画面有变化时重绘
  const [version, repaint] = useReducer((n: number) => n + 1, 0)
  // 调试用：暂停自动 tick
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (paused) return
    const timer = setInterval(() => {
      // step() 直接返回画面有没有变化，不用前后各拍一次快照
      if (sim.step()) repaint()
    }, TICK_MS)
    return () => clearInterval(timer)
  }, [sim, paused])

  const nextTick = () => {
    if (!paused) return
    sim.step()
    repaint()
  }

  // 画布只按需取可见格子的状态，不再每帧生成整张 powers
  const powerAt = useCallback((index: number) => sim.powerAt(index), [sim])

  const handleCell = (index: number) => {
    // 交互：点输入元件开关它
    if (tool === 'interact') {
      const cell = level.cells[index]
      if (cell?.type !== 'input' || !cell.id) return
      const next: Record<string, 0 | 1> = { ...inputs, [cell.id]: inputs[cell.id] ? 0 : 1 }
      setInputs(next)
      sim.setInputs(next)
      setRun(null)
      repaint()
      return
    }

    setEditing((prev) => {
      const cells = prev.level.cells.slice()
      if (cells[index]?.locked) return prev
      if (tool === 'erase') {
        cells[index] = null
      } else {
        cells[index] = {
          type: tool.type,
          dir: hasDirection(tool.type) ? dir : undefined,
          id: tool.id,
        }
      }
      const level = { ...prev.level, cells }
      const sim = new Simulation(level, prev.sim)
      // 重建后把手动开关的输入接着用
      sim.setInputs(inputs)
      return { level, sim }
    })
    setRun(null)
  }

  const failures = run
    ? run.outcomes.flatMap((outcome) =>
        outcome.failures.map((failure) => ({ ...failure, test: outcome.name })),
      )
    : []

  return (
    <div className="app">
      <header className="top">
        <div className="head">
          <div className="menu-wrap">
            <button
              type="button"
              className="menu"
              aria-label="菜单"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              title="菜单"
              onClick={() => setMenuOpen((open) => !open)}
            >
              {/* 三行，每行左边一个点、右边一条横线 */}
              <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
                <g fill="currentColor">
                  <circle cx="3" cy="3.5" r="1.4" />
                  <circle cx="3" cy="8" r="1.4" />
                  <circle cx="3" cy="12.5" r="1.4" />
                </g>
                <g
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  fill="none"
                >
                  <line x1="7" y1="3.5" x2="13" y2="3.5" />
                  <line x1="7" y1="8" x2="13" y2="8" />
                  <line x1="7" y1="12.5" x2="13" y2="12.5" />
                </g>
              </svg>
            </button>
            {menuOpen && (
              <>
                {/* 点菜单外面关掉 */}
                <div className="menu-backdrop" onClick={() => setMenuOpen(false)} />
                <div className="menu-panel" role="menu">
                  <button
                    type="button"
                    className="menu-item"
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                  >
                    继续游戏
                  </button>
                </div>
              </>
            )}
          </div>
          <div>
            <h1>
              第 {level.no ?? 1} 关 · {level.name}
            </h1>
          </div>
        </div>
      </header>

      <Board
        level={level}
        cells={level.cells}
        powerAt={powerAt}
        revision={version}
        onCell={handleCell}
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
          {failures.slice(0, 2).map((failure, index) => (
            <span
              className="failure"
              key={`${failure.test}-${failure.tick}-${failure.output}-${index}`}
            >
              {failure.test} @ {failure.tick}t：{failure.output} 期望 {failure.expected ? 1 : 0}，实际{' '}
              {failure.actual ? 1 : 0}
            </span>
          ))}
        </div>
        <div className="actions">
          <button
            type="button"
            className="debug icon"
            aria-label={paused ? '继续' : '暂停'}
            title={paused ? '继续' : '暂停'}
            onClick={() => setPaused((value) => !value)}
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
          <button type="button" className="debug" onClick={nextTick}>
            下一 tick
          </button>
          <button type="button" className="run" onClick={() => setRun(runLevel(level))}>
            运行测试
          </button>
        </div>
      </div>

      <Palette level={level} tool={tool} dir={dir} onTool={setTool} onDir={setDir} />
    </div>
  )
}
