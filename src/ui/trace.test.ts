import { describe, expect, it } from 'vitest'
import { level09 } from '../levels/level-09'
import { level12 } from '../levels/level-12'
import { level16 } from '../levels/level-16'
import { level17 } from '../levels/level-17'
import { runLevel, testSpan } from '../game/sim'
import { waveSample } from './waveform'
import {
  checksOf,
  eventsAt,
  pairsOf,
  refLevelOf,
  refSimOf,
  replayPrepare,
  replayStep,
  replayTo,
} from './trace'

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
    const refLevel = refLevelOf(level12)!
    const { sim: mine, history, refHistory } = replayTo(
      level12,
      test,
      refLevel,
      testSpan(test),
    )
    // 一开始输入全 0，15 tick 才拨成 1、18 tick 拨回 0
    expect(mine.inputValues()).toEqual({ A: 0 })
    expect(history[15].tick).toBe(15)
    expect(history[15].inputs.A).toBe(1)
    // 空电路一直没有输出；参考解从保存的通电状态起跑，检查区间 20–22 出脉冲
    expect(history.every((sample) => sample.outputs.Y === 0)).toBe(true)
    expect(refHistory.filter((sample) => sample.outputs.Y === 1).map((sample) => sample.tick)).toEqual(
      [20, 21, 22],
    )
  })

  it('检查条件对应格的采样值等于期望值', () => {
    // 第 9 关的脉冲晚 5 tick：第 20 tick 必须是 1，之前之后都是 0
    const test = level09.tests[0]
    const refLevel = refLevelOf(level09)!
    const { refHistory } = replayTo(level09, test, refLevel, testSpan(test))
    for (const check of checksOf(test)) {
      for (let tick = check.from; tick <= check.to; tick++) {
        const sample = refHistory.find((item) => item.tick === tick)
        expect(sample, `缺少第 ${tick} tick 的采样`).toBeDefined()
        for (const [id, expected] of Object.entries(check.outputs)) {
          expect(sample!.outputs[id], `第 ${tick} tick 的 ${id}`).toBe(expected)
        }
      }
    }
    // 回归：这一格原来画在下一格，检查区间和波形正好错开一拍
    expect(refHistory.find((item) => item.tick === 19)?.outputs.Y).toBe(0)
    expect(refHistory.find((item) => item.tick === 20)?.outputs.Y).toBe(1)
    expect(refHistory.find((item) => item.tick === 21)?.outputs.Y).toBe(0)
  })

  it('回放推进用与测试相同的时机采样，不靠 step() 之后多走一格', () => {
    const test = level12.tests[2]
    const ref = refSimOf(level12)!
    replayPrepare(test, ref)
    expect(ref.tick).toBe(0)
    // 每次推进后，当前 tick 的 output 已按检查时机刷新
    for (let tick = 0; tick < testSpan(test); tick++) {
      if (tick === 20) expect(ref.output('Y')).toBe(true)
      if (tick === 21) expect(ref.output('Y')).toBe(true)
      replayStep(test, ref)
      expect(ref.tick).toBe(tick + 1)
    }
    expect(waveSample(level12, ref).outputs.Y).toBe(0)
  })
})
