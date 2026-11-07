import type { Level } from '../game/types'
import { CHAPTERS, chapterLevels, padNo } from './levels-meta'
import { Logo } from './icons'

interface Props {
  levels: Level[]
  onSelect: (level: Level) => void
  onResume: () => void
  onHome: () => void
}

/** 选关页：按章节分组的紧凑卡片，窄屏自动收成两列 / 一列 */
export function LevelSelect({ levels, onSelect, onResume, onHome }: Props) {
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
        {CHAPTERS.map((chapter) => {
          const items = chapterLevels(levels, chapter)
          if (items.length === 0) return null
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
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
