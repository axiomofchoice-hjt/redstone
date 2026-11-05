import { useEffect, useReducer, useState } from 'react'
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
  // 仿真在后台推进，只在画面有变化时重绘
  const [, repaint] = useReducer((n: number) => n + 1, 0)

  useEffect(() => {
    const timer = setInterval(() => {
      const before = sim.snapshot().powers
      sim.step()
      const after = sim.snapshot().powers
      if (after.some((value, index) => value !== before[index])) repaint()
    }, TICK_MS)
    return () => clearInterval(timer)
  }, [sim])

  const powers = sim.snapshot().powers

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
        <div>
          <h1>{level.name}</h1>
          <p className="sub">
            {level.cols} × {level.rows}
          </p>
        </div>
        <button type="button" className="run" onClick={() => setRun(runLevel(level))}>
          运行测试
        </button>
      </header>

      <Board level={level} cells={level.cells} powers={powers} onCell={handleCell} />

      <div className={run?.passed ? 'result ok' : 'result'}>
        <span>
          {run === null
            ? '未运行'
            : run.passed
              ? '全部测试通过'
              : `${run.outcomes.filter((outcome) => !outcome.passed).length} / ${run.outcomes.length} 个测试未通过`}
        </span>
        {failures.slice(0, 2).map((failure, index) => (
          <span className="failure" key={`${failure.test}-${failure.tick}-${failure.output}-${index}`}>
            {failure.test} @ {failure.tick}t：{failure.output} 期望 {failure.expected ? 1 : 0}，实际{' '}
            {failure.actual ? 1 : 0}
          </span>
        ))}
      </div>

      <Palette level={level} tool={tool} dir={dir} onTool={setTool} onDir={setDir} />
    </div>
  )
}
