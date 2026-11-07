import { useCallback, useEffect, useReducer, useState } from 'react'
import { hasDirection, runLevel, Simulation, type LevelRun } from './game/sim'
import type { Cell, Dir, Level } from './game/types'
import { LEVELS } from './levels'
import { defaultTool } from './ui/tools'
import { Board } from './ui/Board'
import { download, mapFileName, mapJson } from './ui/export'
import { solutionMap } from './ui/solution'
import { Palette, type Tool } from './ui/Palette'
import './App.css'

const INITIAL_DIR: Dir = 1

/** 编辑器里仿真每 tick 的间隔：4 tick/s */
const TICK_MS = 250

type Screen = 'start' | 'levels' | 'game'

interface Editing {
  level: Level
  sim: Simulation
}

const initial = (): Editing => {
  const level = { ...LEVELS[0], cells: LEVELS[0].cells.slice() }
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

  // 鼠标点完按钮别留下焦点：焦点在按钮上时再按键盘，浏览器会描一圈焦点框
  useEffect(() => {
    let pointerType = 'mouse'
    const onPointerDown = (event: PointerEvent) => {
      pointerType = event.pointerType
    }
    const onMouseDown = (event: MouseEvent) => {
      // 只有鼠标点击才处理，别影响触摸 / 触控笔
      if (pointerType !== 'mouse' || event.button !== 0) return
      // 不让按钮拿到焦点；已经拿到的也放掉，焦点框只留给 Tab 键
      if (event.target instanceof Element && event.target.closest('button')) event.preventDefault()
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('mousedown', onMouseDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('mousedown', onMouseDown)
    }
  }, [])

  const nextTick = () => {
    if (!paused) return
    sim.step()
    repaint()
  }

  // 画布只按需取可见格子的状态，不再每帧生成整张 powers
  const powerAt = useCallback((index: number) => sim.powerAt(index), [sim])
  const lockedAt = useCallback((index: number) => sim.isLocked(index), [sim])

  /** 改一格元件并重建仿真；锁住的格子不动 */
  const writeCell = (index: number, next: Cell | null) => {
    setEditing((prev) => {
      const cells = prev.level.cells.slice()
      if (cells[index]?.locked) return prev
      if (next === null && !cells[index]) return prev
      cells[index] = next
      const level = { ...prev.level, cells }
      const sim = new Simulation(level, prev.sim)
      // 重建后把手动开关的输入接着用
      sim.setInputs(inputs)
      return { level, sim }
    })
    setRun(null)
  }

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

    const cell: Cell | null =
      tool === 'erase'
        ? null
        : { type: tool.type, dir: hasDirection(tool.type) ? dir : undefined, id: tool.id }
    writeCell(index, cell)
  }

  /** 右键删除：只删格子，元件栏选中的元件不变 */
  const handleErase = (index: number) => writeCell(index, null)

  /** 参考答案：把布局和保存时的电路状态一起盖上去，玩家当前搭的会被冲掉 */
  const applySolution = () => {
    const solution = solutionMap(level)
    if (!solution) return
    const next = { ...level, cells: solution.cells }
    const sim = new Simulation(next)
    sim.restore(solution.state)
    setEditing({ level: next, sim })
    setInputs(solution.state.inputs)
    setRun(null)
    setMenuOpen(false)
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
              disabled={!level.solution}
              onClick={applySolution}
            >
              参考答案
            </button>
            <button
              type="button"
              className="start-btn"
              onClick={() => download(mapFileName(level), mapJson(level, sim))}
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
            lockedAt={lockedAt}
            revision={version}
            onCell={handleCell}
            onErase={handleErase}
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
              <button type="button" className="debug" onClick={nextTick} disabled={!paused}>
                下一刻
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
