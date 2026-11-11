import { useLayoutEffect, useRef, useState } from 'react'
import type { TraceCheck, TracePair } from './trace'
import {
  playheadLeft,
  playheadWidth,
  waveRuns,
  waveRunsBetween,
  WAVE_TICKS,
  type WaveRun,
  type WaveSample,
} from './waveform'

interface Props {
  history: WaveSample[]
  tick: number
  /** 关卡声明的端口；没放到地图上的也占一行，输出按 0 画 */
  inputIds: string[]
  outputIds: string[]
  inputs: Record<string, 0 | 1>
  outputAt: (id: string) => boolean
  onToggleInput: (id: string) => void
  /** 回放时输入由测试驱动，行首字母不能点 */
  interactive?: boolean
  /** 参考解的输出采样，画在玩家输出下面；只画输出，输入两边是一样的 */
  refHistory?: WaveSample[] | null
  /** 回放的检查区间：画在输出行上，期望 1 是浅绿、期望 0 是浅灰 */
  checks?: TraceCheck[]
  /** 回放的成对检查：两个时刻只要求翻转或保持，画成一段淡蓝对比区间 */
  pairs?: TracePair[]
  /** 回放时铺整组测试：横轴从 0 到测试结束，整组波形和检查区间一次画满 */
  span?: number
}

/** svg 的纵坐标：高电平在上、低电平在下，上下各留一点给描边 */
const HIGH = 3
const LOW = 7
const yOf = (value: 0 | 1) => (value ? HIGH : LOW)

type RowKind = 'input' | 'output' | 'ref'

/** 阶梯线：每段横着走完，再在分段处竖着跳 */
function lanePath(runs: WaveRun[]): string {
  if (runs.length === 0) return ''
  let d = `M${runs[0].from} ${yOf(runs[0].value)}`
  for (let i = 0; i < runs.length; i++) {
    const run = runs[i]
    d += ` H${run.to}`
    const next = runs[i + 1]
    if (next) d += ` V${yOf(next.value)}`
  }
  return d
}

/** 时间轴上的刻度：从窗口左端到右端，四等分加一个「现在」 */
const AXIS = [
  `-${WAVE_TICKS}`,
  `-${(WAVE_TICKS * 3) / 4}`,
  `-${WAVE_TICKS / 2}`,
  `-${WAVE_TICKS / 4}`,
  '现在',
]

/**
 * 信号波形（电脑端检查器、手机端交互和回放共用）：横轴是最近 WAVE_TICKS 个 tick，
 * 右端是现在，高电平画在上沿。输入点左边的字母就能切换 0 / 1，每行右边写当前取值。
 * 回放时横轴换成整组测试：波形、参考解输出和检查区间一次全画出来，红线只当播放头，
 * 输入行不能点。
 */
export function Waveform({
  history,
  tick,
  inputIds,
  outputIds,
  inputs,
  outputAt,
  onToggleInput,
  interactive = true,
  refHistory,
  checks,
  pairs,
  span,
}: Props) {
  // 回放铺整组测试，横轴 0–span；平时仍只画最近 WAVE_TICKS 个 tick，右端是现在
  const full = span !== undefined && span > 0
  const domain = full ? span : WAVE_TICKS
  const start = full ? 0 : tick - WAVE_TICKS + 1

  // 红线按设备像素取整，宽度固定 2px：不然落在半个像素上时会被抗锯齿摊成 3px，
  // 看起来一会儿粗一会儿细
  const rootRef = useRef<HTMLDivElement | null>(null)
  const [laneWidth, setLaneWidth] = useState(0)
  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return
    const measure = () => {
      const lane = root.querySelector<HTMLElement>('.wave-lane')
      setLaneWidth(lane ? lane.clientWidth : 0)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(root)
    return () => observer.disconnect()
  }, [])
  // 播放头是 2px 竖线，宽度和位置都对齐设备像素：不然落在半个像素上会被抗锯齿摊成 3px，
  // 看起来一会儿粗一会儿细。它以当前这一格的右边界为中线，波形在那儿跳变时整条竖线都被盖住
  const dpr = window.devicePixelRatio || 1
  const headWidth = playheadWidth(dpr)
  const headLeft = laneWidth > 0 ? playheadLeft(domain, tick, laneWidth, dpr) : null
  const bandsFor = (id: string) =>
    (checks ?? [])
      .filter((check) => id in check.outputs)
      .map((check) => ({
        key: `${check.from}-${check.to}`,
        from: Math.max(0, check.from - start),
        to: Math.min(domain, check.to - start + 1),
        expected: check.outputs[id] === 1,
      }))
      .filter((band) => band.to > band.from)

  // 成对检查只看两个时刻：把窗口里的对比区间并成一段淡蓝底，端点画深色竖条。
  // 并起来是为了不让相邻的检查反复叠色（时钟那种一检查就是一片）
  const pairBandsFor = (id: string) => {
    const visible = (pairs ?? [])
      .filter((pair) => pair.output === id)
      .map((pair) => ({ from: pair.from - start, to: pair.to - start }))
      .filter((pair) => pair.from >= 0 && pair.to < domain)
      .sort((a, b) => a.from - b.from)
    const runs: { from: number; to: number }[] = []
    for (const pair of visible) {
      const last = runs[runs.length - 1]
      const end = pair.to + 1
      if (last && pair.from <= last.to) last.to = Math.max(last.to, end)
      else runs.push({ from: pair.from, to: end })
    }
    const marks = [...new Set(visible.flatMap((pair) => [pair.from, pair.to]))].sort(
      (a, b) => a - b,
    )
    return { runs, marks }
  }

  /** 行尾的当前取值：输入看玩家设的值，输出问仿真，参考解取当前 tick 的采样 */
  const currentValue = (samples: WaveSample[], id: string, kind: RowKind): 0 | 1 => {
    if (kind !== 'ref') return kind === 'input' ? (inputs[id] ?? 0) : outputAt(id) ? 1 : 0
    // 参考解那一行没有活的仿真，取当前 tick 的那一帧；整组波形里不能拿最后一帧
    // （那是测试跑完时的值，回放到一半就会显示成最终结果）
    const current = full ? samples.find((item) => item.tick === tick) : samples[samples.length - 1]
    return current?.outputs[id] ?? 0
  }

  const renderRow = (samples: WaveSample[], id: string, kind: RowKind) => {
    const value = currentValue(samples, id, kind)
    // 当前这一格的采样由 App 在改元件 / 拨输入时覆盖，画出来和右边的数字是同一份数据
    const field = kind === 'input' ? 'inputs' : 'outputs'
    // 回放把整组测试一次画满（横轴就是 0 到测试结束），不用等播放到才长出来
    const runs = full
      ? waveRunsBetween(samples, field, id, 0, domain - 1)
      : waveRuns(samples, field, id, tick)
    const bands = kind === 'input' ? [] : bandsFor(id)
    const pairMarks = kind === 'input' ? { runs: [], marks: [] } : pairBandsFor(id)

    return (
      <div key={`${kind}-${id}`} className="wave-row">
        {kind === 'input' && interactive ? (
          <button
            type="button"
            className={`wave-tag${value ? ' on' : ''}`}
            aria-pressed={value === 1}
            aria-label={`输入 ${id}：${value}，点击切换`}
            title={`切换输入 ${id}`}
            onClick={() => onToggleInput(id)}
          >
            {id}
          </button>
        ) : (
          <span
            className={`wave-tag${kind === 'ref' ? ' ref' : ''}${value ? ' on' : ''}`}
            title={`${kind === 'ref' ? '参考解输出' : kind === 'input' ? '输入' : '输出'} ${id} = ${value}`}
          >
            {id}
          </span>
        )}

        <div className="wave-lane">
          <svg
            className="wave-svg"
            viewBox={`0 0 ${domain} 10`}
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              className="wave-grid"
              d={[0.25, 0.5, 0.75].map((f) => `M${domain * f} 0v10`).join('')}
              vectorEffect="non-scaling-stroke"
            />
            {bands.map((band) => (
              <rect
                key={`band-${band.key}`}
                className={`trace-band${band.expected ? '' : ' low'}`}
                x={band.from}
                y={0}
                width={band.to - band.from}
                height={10}
              />
            ))}
            {pairMarks.runs.map((run) => (
              <rect
                key={`pair-run-${run.from}`}
                className="trace-band pair"
                x={run.from}
                y={0}
                width={run.to - run.from}
                height={10}
              >
                <title>
                  {`成对检查：第 ${run.from + start}–${run.to + start - 1} tick 要翻转或保持`}
                </title>
              </rect>
            ))}
            {pairMarks.marks.map((mark) => (
              <path
                key={`pair-mark-${mark}`}
                className="trace-pair-tick"
                d={`M${mark} 0v10`}
                vectorEffect="non-scaling-stroke"
              />
            ))}
            {runs
              .filter((run) => run.value === 1)
              .map((run) => (
                <rect
                  key={`hi-${run.from}`}
                  className="wave-fill"
                  x={run.from}
                  y={HIGH}
                  width={run.to - run.from}
                  height={LOW - HIGH}
                />
              ))}
            <path className="wave-line" d={lanePath(runs)} vectorEffect="non-scaling-stroke" />
          </svg>
          {full && headLeft !== null ? (
            <span
              className="wave-playhead"
              // 以当前这一格的右边界为中线（采样格是 [tick, tick + 1)），线身两边各留一半，
              // 用 HTML 覆盖层画：既盖住波形的跳变竖线，又不会被 SVG 视口裁掉
              style={{ left: headLeft, width: headWidth }}
              aria-hidden="true"
            />
          ) : null}
        </div>

        <span className={`wave-now${value ? ' on' : ''}`}>{value}</span>
      </div>
    )
  }

  return (
    <div ref={rootRef} className="wave" role="group" aria-label="输入输出波形">
      {inputIds.map((id) => renderRow(history, id, 'input'))}
      {outputIds.map((id) => renderRow(history, id, 'output'))}

      {refHistory && refHistory.length > 0 ? (
        <>
          <p className="wave-head">参考解</p>
          {outputIds.map((id) => renderRow(refHistory, id, 'ref'))}
        </>
      ) : null}

      <div
        className="wave-axis"
        aria-hidden="true"
        title={full ? `整组测试：0–${domain} tick，竖线是现在` : `最近 ${WAVE_TICKS} 个 tick`}
      >
        {(full
          ? [0, 1, 2, 3, 4].map((i) => String(Math.round((domain * i) / 4)))
          : AXIS
        ).map((label, index) => (
          <span key={index} style={{ left: `${(index / 4) * 100}%` }}>
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}
