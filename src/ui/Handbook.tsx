import { useEffect, useState, type ReactNode } from 'react'
import type { CellType } from '../game/types'
import { ToolIcon } from './ToolIcon'
import { ChevronLeft, ChevronRight, CrossIcon } from './icons'
import { SourceSim, InverterSim, PortsSim, BreakerLatchSim, WireCrossSim } from './HandbookSim'

interface Props {
  onClose: () => void
}

/** 元件卡上的内容：图标用哪一种元件、写什么名字 */
interface RosterPart {
  type: CellType
  id?: string
  name: string
}

/** 第一页的全家福：5 种基本元件 + 输入 / 输出 */
const ROSTER: RosterPart[] = [
  { type: 'wire', name: '导线' },
  { type: 'cross', name: '交叉导线' },
  { type: 'charger', name: '充能器' },
  { type: 'repeater', name: '中继器' },
  { type: 'not', name: '反相器' },
  { type: 'input', id: 'P', name: '输入' },
  { type: 'output', id: 'Y', name: '输出' },
]

/** 第二页只讲导线和交叉导线：就是第一页全家福里的前两种 */
const WIRE_PARTS = ROSTER.slice(0, 2)

/** 第三页的两张元件卡：只留图标和名字，说明都写在正文列表里 */
const SOURCE_PARTS: RosterPart[] = [
  { type: 'charger', name: '充能器' },
  { type: 'repeater', name: '中继器' },
]

/** 第四页标题下的一张元件卡 */
const NOT_PARTS: RosterPart[] = [{ type: 'not', name: '反相器' }]

/** 第五页的两张元件卡：输入和输出，字母和第一页全家福一致 */
const PORT_PARTS: RosterPart[] = [
  { type: 'input', id: 'P', name: '输入' },
  { type: 'output', id: 'Y', name: '输出' },
]

/** 元件图：图标加名字的小卡片，第一页的全家福和前几页的元件卡都用它 */
function PartCards({ parts, pair = false }: { parts: RosterPart[]; pair?: boolean }) {
  const layout = parts.length === 1 ? 'single' : pair ? 'pair' : ''
  return (
    <div className={['handbook-roster', layout].filter(Boolean).join(' ')}>
      {parts.map((part) => (
        <div className="handbook-roster-item" key={`${part.type}-${part.id ?? ''}`}>
          <span className="handbook-glyph">
            <ToolIcon type={part.type} id={part.id} dir={0} size={30} />
          </span>
          <span className="handbook-roster-name">{part.name}</span>
        </div>
      ))}
    </div>
  )
}

interface Page {
  title: string
  /** 左栏示意图；没有就整页单栏排（例如简介和元件卡片那页） */
  art?: ReactNode
  /** 正文 */
  body: ReactNode
  /** 正文底部那句重点 */
  note?: string
  /** 整页单栏，示意图和正文不并排 */
  wide?: boolean
  /** 图放正文右边（窄屏放到正文下面）；默认图在左 */
  artRight?: boolean
}

const PAGES: Page[] = [
  {
    title: '简介',
    wide: true,
    body: (
      <>
        <p className="handbook-lead">
          这是一款简化的 Minecraft 红石电路模拟器，仅由 5 种基本元件和输入、输出两种关卡元件构成。电路整体按 tick
          同步运行：每个 tick 所有元件一起更新，彼此传递 0 / 1 信号，从而搭出能计算、能存储、能处理脉冲的电路。
        </p>
        <PartCards parts={ROSTER} />
      </>
    ),
  },
  {
    title: '导线与交叉导线',
    art: <WireCrossSim />,
    artRight: true,
    body: (
      <>
        <PartCards parts={WIRE_PARTS} pair />
        <ul className="handbook-list">
          <li>导线将相邻元件连在一起并传递信号，无延迟、无距离限制、无信号衰减。</li>
          <li>交叉导线提供横竖两条信号通道，互不干扰。</li>
        </ul>
      </>
    ),
    note: '参考 Minecraft 物品：红石粉。',
  },
  {
    title: '充能器与中继器',
    art: <SourceSim />,
    artRight: true,
    body: (
      <>
        <PartCards parts={SOURCE_PARTS} pair />
        <ul className="handbook-list">
          <li>充能器和中继器只把信号从后面传到前面，不能反向。</li>
          <li>充能器没有延迟，中继器有 1 tick 延迟。</li>
          <li>它们输出 1 时还能抑制前面的反相器（见下一页）。</li>
        </ul>
        <p className="handbook-note">参考 Minecraft 物品：红石中继器。</p>
      </>
    ),
  },
  {
    title: '反相器',
    art: <InverterSim />,
    artRight: true,
    body: (
      <>
        <PartCards parts={NOT_PARTS} />
        <ul className="handbook-list">
          <li>
            反相器把 0 / 1 信号反转：充能器或中继器向它输出 1 时，它被抑制，不输出信号；否则向相邻元件输出 1。
          </li>
          <li>反相器有 1 tick 延迟。</li>
        </ul>
      </>
    ),
    note: '参考 Minecraft 物品：红石火把。',
  },
  {
    title: '输入与输出',
    art: <PortsSim />,
    artRight: true,
    body: (
      <>
        <PartCards parts={PORT_PARTS} pair />
        <ul className="handbook-list">
          <li>输入和输出是关卡特有的元件。</li>
          <li>游戏会给出随时间变化的输入信号，再检查输出信号是否符合预期，由此判断测试是否通过。</li>
        </ul>
      </>
    ),
  },
  {
    title: '断路器与 D 锁存器',
    art: <BreakerLatchSim />,
    artRight: true,
    body: (
      <ul className="handbook-list">
        <li>
          断路器是由充能器和中继器组成的复合结构，充能器对着中继器的侧面摆放。充能器输出 1 时，中继器被抑制、不输出信号；否则中继器照常输出背后的信号。
        </li>
        <li>
          D 锁存器是由两个中继器组成的复合结构，中继器 X 对着中继器 D
          的侧面摆放。X 输出 1 时，D 保持输出不变；否则 D 照常输出背后的信号。
        </li>
        <li>两种复合结构都有 1 tick 延迟。</li>
      </ul>
    ),
    note: '断路器参考 Minecraft 红石比较器，D 锁存器参考 Minecraft 红石中继器的锁存功能。',
  },
]

/**
 * 查看教程：占满全屏的图文教程，一页讲一件事。
 * 底部左右按钮、键盘 ← / → 翻页，右上角 × 或 Esc 关闭；电脑端和手机端共用。
 */
export function Handbook({ onClose }: Props) {
  const [page, setPage] = useState(0)
  const total = PAGES.length
  const current = PAGES[page]

  // 按 Esc 关闭，← / → 翻页；和菜单、关卡信息一个习惯。
  // 教程盖在最上面时，底下的地图 / 元件栏不该再收到键盘：在捕获阶段拦住，
  // 不让 ← / → 同时把地图平移走，Esc 也只会关教程。
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      event.stopPropagation()
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault()
        setPage((value) => Math.max(0, value - 1))
      } else if (event.key === 'ArrowRight') {
        event.preventDefault()
        setPage((value) => Math.min(total - 1, value + 1))
      }
    }
    window.addEventListener('keydown', onKey, { capture: true })
    return () => window.removeEventListener('keydown', onKey, { capture: true })
  }, [onClose, total])

  // 教程占满全屏时，别让底下的首页 / 地图跟着滚
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [])

  const go = (step: number) => setPage((value) => Math.min(total - 1, Math.max(0, value + step)))

  const figure = current.art ? <figure className="handbook-art">{current.art}</figure> : null

  return (
    <div className="handbook-screen" role="dialog" aria-modal="true" aria-label="查看教程">
      <header className="handbook-top">
        <div className="handbook-heading">
          <h2>查看教程</h2>
          <span className="handbook-count" aria-hidden="true">
            {page + 1} / {total}
          </span>
        </div>
        <button
          type="button"
          className="handbook-close"
          onClick={onClose}
          aria-label="关闭教程"
          title="关闭"
        >
          <CrossIcon size={16} />
        </button>
      </header>

      <div className="handbook-stage">
        <section
          key={page}
          className={[
            'handbook-page',
            current.wide ? 'wide' : '',
            !current.wide && !current.art ? 'solo' : '',
            current.artRight ? 'art-right' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          aria-label={`第 ${page + 1} 页：${current.title}`}
        >
          {current.artRight ? null : figure}

          <div className="handbook-copy">
            <h3>{current.title}</h3>
            {current.body}
            {current.note ? <p className="handbook-note">{current.note}</p> : null}
          </div>

          {current.artRight ? figure : null}
        </section>
      </div>

      <footer className="handbook-foot">
        <button
          type="button"
          className="btn handbook-nav"
          onClick={() => go(-1)}
          disabled={page === 0}
          aria-label="上一页"
        >
          <ChevronLeft />
          <span>上一页</span>
        </button>

        <div className="handbook-dots" role="tablist" aria-label="教程页">
          {PAGES.map((item, index) => (
            <button
              key={item.title}
              type="button"
              role="tab"
              aria-selected={index === page}
              aria-label={`第 ${index + 1} 页：${item.title}`}
              className={index === page ? 'handbook-dot active' : 'handbook-dot'}
              onClick={() => setPage(index)}
            />
          ))}
        </div>

        <button
          type="button"
          className="btn handbook-nav"
          onClick={() => go(1)}
          disabled={page === total - 1}
          aria-label="下一页"
        >
          <span>下一页</span>
          <ChevronRight />
        </button>
      </footer>
    </div>
  )
}
