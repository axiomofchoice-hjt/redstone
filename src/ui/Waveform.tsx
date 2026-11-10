import type { TraceCheck } from './trace'
import { waveRuns, WAVE_TICKS, type WaveRun, type WaveSample } from './waveform'

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
}

/** svg 的纵坐标：高电平在上、低电平在下，上下各留一点给描边 */
const HIGH = 3
const LOW = 7
const yOf = (value: 0 | 1) => (value ? HIGH : LOW)

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
 * 检查器里的信号波形：横轴是最近 WAVE_TICKS 个 tick，右端是现在，高电平画在上沿。
 * 输入点左边的字母就能切换 0 / 1，每行右边写当前取值。
 * 回放时额外画参考解的输出（虚线框字母）和测试的检查区间，输入行不能点。
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
}: Props) {
  // 检查区间按 tick 落到窗口里，超出窗口的部分裁掉
  const start = tick - WAVE_TICKS + 1
  const bandsFor = (id: string) =>
    (checks ?? [])
      .filter((check) => id in check.outputs)
      .map((check) => ({
        key: `${check.from}-${check.to}`,
        from: Math.max(0, check.from - start),
        to: Math.min(WAVE_TICKS, check.to - start + 1),
        expected: check.outputs[id] === 1,
      }))
      .filter((band) => band.to > band.from)

  const renderRow = (samples: WaveSample[], id: string, input: boolean, ref: boolean) => {
    const last = samples[samples.length - 1]
    const value: 0 | 1 = ref
      ? last
        ? (last.outputs[id] ?? 0)
        : 0
      : input
        ? (inputs[id] ?? 0)
        : outputAt(id)
          ? 1
          : 0
    // 当前这一格的采样由 App 在改元件 / 拨输入时覆盖，画出来和右边的数字是同一份数据
    const runs = waveRuns(samples, input ? 'inputs' : 'outputs', id, tick)
    const bands = input ? [] : bandsFor(id)

    return (
      <div key={`${ref ? 'ref' : 'mine'}-${input ? 'in' : 'out'}-${id}`} className="wave-row">
        {input && interactive ? (
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
            className={`wave-tag${ref ? ' ref' : ''}${value ? ' on' : ''}`}
            title={`${ref ? '参考解输出' : input ? '输入' : '输出'} ${id} = ${value}`}
          >
            {id}
          </span>
        )}

        <svg
          className="wave-lane"
          viewBox={`0 0 ${WAVE_TICKS} 10`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            className="wave-grid"
            d="M8 0v10M16 0v10M24 0v10"
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

        <span className={`wave-now${value ? ' on' : ''}`}>{value}</span>
      </div>
    )
  }

  return (
    <div className="wave" role="group" aria-label="输入输出波形">
      {inputIds.map((id) => renderRow(history, id, true, false))}
      {outputIds.map((id) => renderRow(history, id, false, false))}

      {refHistory && refHistory.length > 0 ? (
        <>
          <p className="wave-head">参考解</p>
          {outputIds.map((id) => renderRow(refHistory, id, false, true))}
        </>
      ) : null}

      <div className="wave-axis" aria-hidden="true" title={`最近 ${WAVE_TICKS} 个 tick`}>
        {AXIS.map((label, index) => (
          <span key={label} style={{ left: `${(index / (AXIS.length - 1)) * 100}%` }}>
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}
