import { useCallback, useEffect, useReducer, useState } from 'react'
import { hasDirection, runLevel, Simulation, type LevelRun } from './game/sim'
import type { Dir, Level } from './game/types'
import { level01 } from './levels/level-01'
import { level02 } from './levels/level-02'
import { level03 } from './levels/level-03'
import { level04 } from './levels/level-04'
import { level05 } from './levels/level-05'
import { level06 } from './levels/level-06'
import { level07 } from './levels/level-07'
import { level08 } from './levels/level-08'
import { level09 } from './levels/level-09'
import { level10 } from './levels/level-10'
import { level11 } from './levels/level-11'
import { level12 } from './levels/level-12'
import { level13 } from './levels/level-13'
import { level14 } from './levels/level-14'
import { level15 } from './levels/level-15'
import { level16 } from './levels/level-16'
import { defaultTool } from './ui/tools'
import { Board } from './ui/Board'
import { cellsFileName, cellsJson, download } from './ui/export'
import { Palette, type Tool } from './ui/Palette'
import './App.css'

const INITIAL_DIR: Dir = 1

/** 编辑器里仿真每 tick 的间隔：4 tick/s */
const TICK_MS = 250

/** 目前这十六关 */
const LEVELS: Level[] = [
  level01,
  level02,
  level03,
  level04,
  level05,
  level06,
  level07,
  level08,
  level09,
  level10,
  level11,
  level12,
  level13,
  level14,
  level15,
  level16,
]

type Screen = 'start' | 'levels' | 'game'

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
  const [screen, setScreen] = useState<Screen>('start')
  // 仿真在后台推进，只在画面有变化时重绘
  const [version, repaint] = useReducer((n: number) => n + 1, 0)
  // 调试用：暂停自动 tick
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (paused || menuOpen || screen !== 'game') return
    const timer = setInterval(() => {
      // step() 直接返回画面有没有变化，不用前后各拍一次快照
      if (sim.step()) repaint()
    }, TICK_MS)
    return () => clearInterval(timer)
  }, [sim, paused, menuOpen, screen])

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

  const startLevel = (next: Level) => {
    const level = { ...next, cells: next.cells.slice() }
    setEditing({ level, sim: new Simulation(level) })
    // 换关后元件选择也回到这关的默认元件，别把上一关照到哪都带着
    setTool({ type: defaultTool(level) })
    setDir(INITIAL_DIR)
    setInputs({})
    setRun(null)
    setPaused(false)
    setScreen('game')
  }

  if (screen === 'start') {
    return (
      <div className="app">
        <div className="screen start">
          <h1 className="title">红石电路</h1>
          <div className="start-actions">
            <button
              type="button"
              className="start-btn primary"
              onClick={() => setScreen('levels')}
            >
              选关
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (screen === 'levels') {
    return (
      <div className="app">
        <header className="top">
          <div className="head">
            <button type="button" className="text-btn" onClick={() => setScreen('start')}>
              返回
            </button>
            <h1>选关</h1>
          </div>
        </header>
        <div className="level-list">
          {LEVELS.map((item) => (
            <button
              key={item.id}
              type="button"
              className="level-item"
              onClick={() => startLevel(item)}
            >
              <span className="level-no">第 {item.no ?? 1} 关</span>
              <span className="level-name">{item.name}</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

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
          <div>
            <h1>
              第 {level.no ?? 1} 关 · {level.name}
            </h1>
          </div>
        </div>
      </header>

      {menuOpen ? (
        // 菜单打开时把地图和底部栏都让出来，按钮放在中间
        <div className="screen start">
          <div className="start-actions">
            <button type="button" className="start-btn primary" onClick={() => setMenuOpen(false)}>
              继续游戏
            </button>
            <button
              type="button"
              className="start-btn"
              onClick={() => download(cellsFileName(level), cellsJson(level))}
            >
              导出地图
            </button>
            <button
              type="button"
              className="start-btn"
              onClick={() => {
                setMenuOpen(false)
                setScreen('start')
              }}
            >
              返回开始界面
            </button>
          </div>
        </div>
      ) : (
        <>
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
              <button type="button" className="run" onClick={() => setRun(runLevel(level, sim))}>
                运行测试
              </button>
            </div>
          </div>

          <Palette level={level} tool={tool} dir={dir} onTool={setTool} onDir={setDir} />
        </>
      )}
    </div>
  )
}
