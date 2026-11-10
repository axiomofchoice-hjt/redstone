import type { Level } from '../game/types'
import { CHAPTERS, chapterLevels, padNo } from './levels-meta'
import { Logo } from './icons'

interface Props {
  levels: Level[]
  onSelect: (level: Level) => void
  /** 自由模式：空白沙盒，卡片排在最后一关下面 */
  onFree: () => void
  onResume: () => void
  onHome: () => void
}

/** 选关页：按章节分组的紧凑卡片，窄屏自动收成两列 / 一列 */
export function LevelSelect({ levels, onSelect, onFree, onResume, onHome }: Props) {
  return (
    <div className="level-page">
      <header className="level-head">
        <h1>选择关卡</h1>
        <div className="level-head-actions">
          <button type="button" className="btn" onClick={onHome}>
            <Logo size={15} />
            首页
          </button>
          <button type="button" className="btn primary" onClick={onResume}>
            返回游戏
          </button>
        </div>
      </header>

      <div className="chapters">
        {CHAPTERS.map((chapter, index) => {
          const items = chapterLevels(levels, chapter)
          if (items.length === 0) return null
          // 最后一章的格子最后再放一张自由模式的卡片，排在最后一关下面
          const last = index === CHAPTERS.length - 1
          return (
            <section className="chapter" key={chapter.title}>
              <div className="chapter-head">
                <h2>{chapter.title}</h2>
              </div>
              <div className="level-grid">
                {items.map((level) => (
                  <button
                    key={level.id}
                    type="button"
                    className="level-card"
                    onClick={() => onSelect(level)}
                  >
                    <span className="level-no">{padNo(level.no ?? 1)}</span>
                    <span className="level-name">{level.name}</span>
                  </button>
                ))}
                {last ? (
                  <button
                    type="button"
                    className="level-card level-card-free"
                    onClick={onFree}
                    title="20×20 空白沙盒：元件全开，没有输入输出和测试"
                  >
                    <span className="level-no">自由</span>
                    <span className="level-name">自由模式</span>
                  </button>
                ) : null}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
