import { useEffect, useState, type ReactNode } from 'react'
import type { CellType } from '../game/types'
import { ToolIcon } from './ToolIcon'
import { ChevronLeft, ChevronRight, CrossIcon } from './icons'
import { BreakArt, LatchArt, PortsArt } from './HandbookArt'
import { WireCrossSim } from './HandbookSim'

interface Props {
  onClose: () => void
}

/** 剩下三种元件的速查条目，和元件栏用同一套图标 */
const ACTIVE_PARTS: { type: CellType; name: string; desc: string }[] = [
  { type: 'charger', name: '充能器', desc: '朝正面一个方向给相邻元件供能。' },
  {
    type: 'repeater',
    name: '中继器',
    desc: '读后方，延迟 1 tick 输出到正面；侧面被顶住会锁存或断路。',
  },
  { type: 'not', name: '反相器', desc: '读后方，延迟 1 tick 输出反相。' },
]

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

/** 元件图：图标加名字的小卡片，第一页的全家福和第二页的两张都用它 */
function PartCards({ parts, pair = false }: { parts: RosterPart[]; pair?: boolean }) {
  return (
    <div className={pair ? 'handbook-roster pair' : 'handbook-roster'}>
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
  /** 示意图下面的小字 */
  figureNote?: string
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
          这是一款简化的 Minecraft 红石电路模拟器，仅由 5 种基本元件和输入 / 输出端口构成。电路整体按 tick
          同步运行：每个 tick 所有元件一起更新，彼此传递 0 / 1 信号，从而可以搭建具备计算、存储和脉冲处理能力的电路。
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
          <li>导线将相邻元件连在一起并传递信号，无延迟，无距离限制，无信号衰减。</li>
          <li>交叉导线提供横竖两条信号通道，互不干扰。</li>
        </ul>
      </>
    ),
    note: '参考 Minecraft 物品：红石粉。',
  },
  {
    title: '充能器、中继器、反相器',
    wide: true,
    body: (
      <>
        <p className="handbook-lead">三种元件都只朝正面输出；中继器和反相器还要晚 1 tick 才生效。</p>
        <div className="handbook-parts compact">
          {ACTIVE_PARTS.map((part) => (
            <div className="handbook-part" key={part.type}>
              <span className="handbook-glyph">
                <ToolIcon type={part.type} dir={0} size={30} />
              </span>
              <p>
                <b>{part.name}</b>
                {part.desc}
              </p>
            </div>
          ))}
        </div>
      </>
    ),
  },
  {
    title: '输入与输出',
    art: <PortsArt />,
    figureNote: '左边：输入朝四个方向发信号；右边：输出把四周的信号收进来。',
    body: (
      <ul className="handbook-list">
        <li>
          输入按拨的 0 / 1 朝四个方向同时发信号；点地图上的输入（交互模式）或波形行首的字母都能切换。
        </li>
        <li>输出收集四周朝它发出的信号，任意一个为 1 就是 1；自己不发信号。</li>
      </ul>
    ),
    note: '输入是实心方块，输出是空心方块，字母写在中间。',
  },
  {
    title: '中继器侧面锁存',
    art: <LatchArt />,
    figureNote: '三角形填实 = 输出被侧面顶住，原地保持。',
    body: (
      <ul className="handbook-list">
        <li>
          中继器被侧面相邻、正面顶过来并且正在输出 1 的中继器顶住时，不再采样后方，输出原地保持。
        </li>
        <li>侧面信号回到 0 才重新采样，照样延迟 1 tick。</li>
        <li>所以「后方接 D、侧面接一个由 E 驱动的中继器」就是一个 D 锁存器。</li>
      </ul>
    ),
    note: '空心 = 照常采样；填实 = 锁住不动。',
  },
  {
    title: '充能器侧面断路',
    art: <BreakArt />,
    figureNote: '侧面被充能器顶住时，输出的那一段被掐断。',
    body: (
      <ul className="handbook-list">
        <li>充能器正面顶住中继器的侧面并且输出 1 时，中继器的输出被掐断，相当于 Y = D ∧ ¬E。</li>
        <li>断路那个 tick 按 0 采样，所以断开和恢复都跟着中继器晚 1 tick。</li>
      </ul>
    ),
    note: '断路期间按 0 采样，不是保持。',
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

  const figure = current.art ? (
    <figure className="handbook-art">
      {current.art}
      {current.figureNote ? <figcaption>{current.figureNote}</figcaption> : null}
    </figure>
  ) : null

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
