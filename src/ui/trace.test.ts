import { describe, expect, it } from 'vitest'
import { level12 } from '../levels/level-12'
import { level16 } from '../levels/level-16'
import { level17 } from '../levels/level-17'
import { Simulation, runLevel, testSpan } from '../game/sim'
import { waveSample } from './waveform'
import { checksOf, eventsAt, pairsOf, refLevelOf, refSimOf, replayStep } from './trace'

describe('测试回放', () => {
  const test = level12.tests[2]

  it('算出一组测试跑到第几个 tick', () => {
    expect(testSpan(test)).toBe(33)
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

  it('成对检查按两个时刻排好，T 触发器的翻转 / 保持都在里面', () => {
    const pairs = pairsOf(level16.tests[0])
    expect(pairs).toHaveLength(6)
    expect(pairs[0]).toEqual({
      output: 'Y',
      from: 10,
      to: 30,
      allow: [
        [0, 1],
        [1, 0],
      ],
    })
    // 两个时刻写反了也按先后排
    expect(pairsOf({ pairs: [{ output: 'Y', ticks: [30, 10], allow: [[0, 0]] }] })).toEqual([
      { output: 'Y', from: 10, to: 30, allow: [[0, 0]] },
    ])
  })

  it('只返回这一 tick 要拨的输入，其他 tick 是 null', () => {
    expect(eventsAt(test, 0)).toEqual({ A: 0 })
    expect(eventsAt(test, 15)).toEqual({ A: 1 })
    expect(eventsAt(test, 18)).toEqual({ A: 0 })
    expect(eventsAt(test, 9)).toBeNull()
  })

  it('参考解的元件铺到关卡上，端口不变', () => {
    const ref = refLevelOf(level12)!
    expect(ref.cells.some((cell) => cell?.type === 'repeater')).toBe(true)
    expect(ref.outputs).toEqual(['Y'])
    expect(level12.cells.every((cell) => cell === null)).toBe(true)
  })

  it('参考解仿真带上保存的通电状态，触发器不从冷启动的错误相位起跑', () => {
    for (const level of [level16, level17]) {
      const refLevel = refLevelOf(level)!
      // 只铺元件会从全 0 起跑，中继器的相位不对，参考解自己也过不了
      expect(runLevel(refLevel).passed).toBe(false)
      const seeded = refSimOf(level, refLevel)!
      expect(runLevel(refLevel, seeded).passed).toBe(true)
    }
  })
})

describe('回放推进', () => {
  it('按测试事件驱动输入，参考解走完正好对上每个检查区间', () => {
    const test = level12.tests[2]
    const mine = new Simulation(level12)
    const ref = refSimOf(level12)!
    const samples: { tick: number; mine: boolean; ref: boolean }[] = []
    for (let i = 0; i <= testSpan(test); i++) {
      replayStep(test, mine, ref)
      samples.push({ mine: mine.output('Y'), ref: ref.output('Y'), tick: mine.tick })
    }
    // 一开始输入全 0，15 tick 才拨成 1、18 tick 拨回 0
    expect(mine.inputValues()).toEqual({ A: 0 })
    expect(samples[15].tick).toBe(16)
    // 空电路一直没有输出；参考解从保存的通电状态起跑，20–23 出脉冲
    expect(samples.every((s) => !s.mine)).toBe(true)
    expect(samples.filter((s) => s.ref).map((s) => s.tick)).toEqual([21, 22, 23])
    expect(waveSample(level12, ref).outputs.Y).toBe(0)
  })
})
