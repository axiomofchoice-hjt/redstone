import { describe, expect, it } from 'vitest'
import { level13 } from '../levels/level-13'
import { checksOf, eventsAt, lastTickOf, refLevelOf, replayStep } from './trace'

describe('测试回放', () => {
  const test = level13.tests[2]

  it('算出一组测试跑到第几个 tick', () => {
    expect(lastTickOf(test)).toBe(33)
  })

  it('检查区间带着期望值，没写 to 就当只查一个 tick', () => {
    expect(checksOf(test)).toEqual([
      { from: 10, to: 19, outputs: { Y: 0 } },
      { from: 20, to: 22, outputs: { Y: 1 } },
      { from: 23, to: 33, outputs: { Y: 0 } },
    ])
    expect(checksOf({ checks: [{ from: 5, outputs: { Y: 1 } }] })).toEqual([
      { from: 5, to: 5, outputs: { Y: 1 } },
    ])
  })

  it('只返回这一 tick 要拨的输入，其他 tick 是 null', () => {
    expect(eventsAt(test, 0)).toEqual({ A: 0 })
    expect(eventsAt(test, 15)).toEqual({ A: 1 })
    expect(eventsAt(test, 18)).toEqual({ A: 0 })
    expect(eventsAt(test, 9)).toBeNull()
  })

  it('参考解的元件铺到关卡上，端口不变', () => {
    const ref = refLevelOf(level13)!
    expect(ref.cells.some((cell) => cell?.type === 'repeater')).toBe(true)
    expect(ref.outputs).toEqual(['Y'])
    expect(level13.cells.every((cell) => cell === null)).toBe(true)
  })
})

describe('回放推进', () => {
  it('按测试事件驱动输入，参考解走完正好对上每个检查区间', async () => {
    const { Simulation } = await import('../game/sim')
    const { waveSample } = await import('./waveform')
    const test = level13.tests[2]
    const refLevel = refLevelOf(level13)!
    const mine = new Simulation(level13)
    const ref = new Simulation(refLevel)
    const samples = []
    for (let t = 0; t <= lastTickOf(test); t++) {
      replayStep(test, [mine, ref])
      samples.push({ mine: mine.output('Y'), ref: ref.output('Y'), tick: mine.tick })
    }
    // 一开始输入全 0，15 tick 才拨成 1、18 tick 拨回 0
    expect(mine.inputValues()).toEqual({ A: 0 })
    expect(samples[15].tick).toBe(16)
    // 空电路一直没有输出；参考解冷启动前几 tick 有个抖动，之后在 20–23 出脉冲
    expect(samples.every((s) => !s.mine)).toBe(true)
    expect(samples.filter((s) => s.ref).map((s) => s.tick)).toEqual([1, 2, 3, 4, 21, 22, 23])
    expect(waveSample(level13, ref).outputs.Y).toBe(0)
  })
})
