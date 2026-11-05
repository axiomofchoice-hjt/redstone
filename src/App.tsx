import { useEffect, useMemo, useState } from 'react'
import { hasDirection, runLevel, Simulation, type LevelRun } from './game/sim'
import type { Cell, Dir } from './game/types'
import { level01 } from './levels/level-01'
import { Board } from './ui/Board'
import { Palette, type Tool } from './ui/Palette'
import './App.css'

const INITIAL_DIR: Dir = 1

export default function App() {
  const [cells, setCells] = useState<(Cell | null)[]>(() => level01.cells.slice())
  const [tool, setTool] = useState<Tool>('wire')
  const [dir, setDir] = useState<Dir>(INITIAL_DIR)
  const [run, setRun] = useState<LevelRun | null>(null)
  const [beat, setBeat] = useState(0)

  const level = useMemo(() => ({ ...level01, cells }), [cells])
  // 编辑时也在跑：每次改动重建模拟，元件放下就按当前信号亮起
  const sim = useMemo(() => new Simulation(level), [level])
  void beat
  const powers = sim.snapshot().powers

  // 输入元件恒为 0，非门 1 tick 的延迟靠这个节拍体现
  useEffect(() => {
    const timer = setInterval(() => {
      sim.step()
      setBeat((value) => value + 1)
    }, 500)
    return () => clearInterval(timer)
  }, [sim])

  const handleCell = (index: number) => {
    setCells((prev) => {
      if (prev[index]?.locked) return prev
      const next = prev.slice()
      if (tool === 'erase') {
        next[index] = null
      } else {
        next[index] = { type: tool, dir: hasDirection(tool) ? dir : undefined }
      }
      return next
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

      <Board level={level} cells={cells} powers={powers} onCell={handleCell} />

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
