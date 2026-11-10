import type { Simulation } from '../game/sim'
import type { Level, TestCase } from '../game/types'
import { solutionCells } from './solution'

/** 测试里的一段检查：区间 [from, to] 内这些输出应该一直是给定取值 */
export interface TraceCheck {
  from: number
  to: number
  outputs: Record<string, 0 | 1>
}

/** 回放面板要显示的东西：这组测试叫什么、检查区间在哪 */
export interface TraceInfo {
  name: string
  checks: TraceCheck[]
}

/** 这组测试跑到第几个 tick（和 runTest 里的算法一致） */
export function lastTickOf(test: TestCase): number {
  let maxTick = 0
  for (const e of test.events ?? []) maxTick = Math.max(maxTick, e.tick)
  for (const c of test.checks ?? []) maxTick = Math.max(maxTick, c.to ?? c.from)
  for (const p of test.pairs ?? []) maxTick = Math.max(maxTick, p.ticks[0], p.ticks[1])
  return maxTick
}

export const checksOf = (test: TestCase): TraceCheck[] =>
  (test.checks ?? []).map((c) => ({ from: c.from, to: c.to ?? c.from, outputs: c.outputs }))

/** 把参考解的元件铺到关卡上，用来并排跑同一组测试；没有参考解就返回 null */
export function refLevelOf(level: Level): Level | null {
  const cells = solutionCells(level)
  return cells ? { ...level, cells } : null
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
 * 回放推进一刻：先把这一 tick 的测试事件拨上（拨一次就保持），再让所有仿真一起走一步。
 * 玩家电路和参考解共用同一份输入，所以波形才对得上。
 */
export function replayStep(test: TestCase, sims: Simulation[]): void {
  const values = eventsAt(test, sims[0].tick)
  if (values) for (const sim of sims) sim.setInputs(values)
  for (const sim of sims) sim.step()
}
