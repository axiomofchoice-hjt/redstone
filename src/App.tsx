import { useEffect, useState } from 'react'
import { hasDirection, runLevel, Simulation, type LevelRun } from './game/sim'
import type { Dir, Level } from './game/types'
import { level01 } from './levels/level-01'
import { Board } from './ui/Board'
import { Palette, type Tool } from './ui/Palette'
import './App.css'

const INITIAL_DIR: Dir = 1

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
  const [tool, setTool] = useState<Tool>('wire')
  const [dir, setDir] = useState<Dir>(INITIAL_DIR)
  const [run, setRun] = useState<LevelRun | null>(null)

  // 编辑时也在跑；重建连线时已有非门保留状态
  useEffect(() => {
    const timer = setInterval(() => {
      sim.step()
      setEditing((prev) => ({ ...prev }))
    }, 500)
    return () => clearInterval(timer)
  }, [sim])

  const powers = sim.snapshot().powers

  const handleCell = (index: number) => {
    setEditing((prev) => {
      const cells = prev.level.cells.slice()
      if (cells[index]?.locked) return prev
      if (tool === 'erase') {
        cells[index] = null
      } else {
        cells[index] = { type: tool, dir: hasDirection(tool) ? dir : undefined }
      }
      const level = { ...prev.level, cells }
      return { level, sim: new Simulation(level, prev.sim) }
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

      <Palette tool={tool} dir={dir} onTool={setTool} onDir={setDir} />
    </div>
  )
}
