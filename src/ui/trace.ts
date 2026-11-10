import { Simulation } from '../game/sim'
import type { Level, TestCase } from '../game/types'
import { solutionCells } from './solution'

/** 测试里的一段检查：区间 [from, to] 内这些输出应该一直是给定取值 */
export interface TraceCheck {
  from: number
  to: number
  outputs: Record<string, 0 | 1>
}

/**
 * 成对检查：同一条输出在两个时刻的取值必须落在 allow 里。
 * 时钟、T 触发器这类只看「翻转 / 保持」的测试用的都是它，没有固定的期望电平。
 */
export interface TracePair {
  output: string
  from: number
  to: number
  allow: (0 | 1)[][]
}

/** 回放面板要显示的东西：这组测试叫什么、检查区间和对比的时刻在哪 */
export interface TraceInfo {
  name: string
  checks: TraceCheck[]
  pairs: TracePair[]
  /** 这组测试跑到第几个 tick */
  lastTick: number
}

/** 检查区间统一带上 `to`，没写的就当只查一个 tick */
export const checksOf = (test: TestCase): TraceCheck[] =>
  (test.checks ?? []).map((c) => ({ from: c.from, to: c.to ?? c.from, outputs: c.outputs }))

/** 成对检查按两个时刻排好，回放波形上画成一段对比区间 */
export const pairsOf = (test: TestCase): TracePair[] =>
  (test.pairs ?? []).map((p) => ({
    output: p.output,
    from: Math.min(p.ticks[0], p.ticks[1]),
    to: Math.max(p.ticks[0], p.ticks[1]),
    allow: p.allow,
  }))

/** 把参考解的元件铺到关卡上，用来并排跑同一组测试；没有参考解就返回 null */
export function refLevelOf(level: Level): Level | null {
  const cells = solutionCells(level)
  return cells ? { ...level, cells } : null
}

/**
 * 参考解并排跑测试用的仿真：除了铺元件，还要恢复保存的电路状态。
 * 导出的 tick 只是保存那一刻，回放和玩家一样从 tick 0 开始，所以 tick 和输入归零；
 * 延迟元件的通电位必须留下，否则 T / JK 触发器这类参考解会从错误的相位起跑。
 */
export function refSimOf(level: Level, refLevel = refLevelOf(level)): Simulation | null {
  if (!refLevel || !level.solution) return null
  const sim = new Simulation(refLevel)
  sim.restore({ ...level.solution.state, tick: 0, inputs: {} })
  return sim
}

/**
 * 第 tick 个 tick 要拨的输入（测试事件设置后会一直保持）：
 * 回放时每个 tick 开头把这一份盖到仿真上，玩家点的开关就不参与回放了。
 */
export function eventsAt(test: TestCase, tick: number): Record<string, 0 | 1> | null {
  const values: Record<string, 0 | 1> = {}
  let found = false
  for (const event of test.events ?? []) {
    if (event.tick !== tick) continue
    Object.assign(values, event.values)
    found = true
  }
  return found ? values : null
}

/**
 * 回放推进一刻：先把这一 tick 的测试事件拨上（拨一次就保持），再让玩家电路和参考解一起走一步。
 * 两边共用同一份输入，波形才对得上。
 */
export function replayStep(test: TestCase, mine: Simulation, ref?: Simulation | null): void {
  const values = eventsAt(test, mine.tick)
  if (values) {
    mine.setInputs(values)
    ref?.setInputs(values)
  }
  mine.step()
  ref?.step()
}
