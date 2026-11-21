import type { Level } from '../game/types'
import { CheckIcon } from './icons'
import { CHAPTERS, chapterLevels, padNo } from './levels-meta'

interface Props {
  levels: Level[]
  /** 已通关的关卡 id，卡片上用绿色「已通关」标出来 */
  cleared: readonly string[]
  onSelect: (level: Level) => void
  /** 自由模式：空白沙盒，从顶栏按钮进入 */
  onFree: () => void
  onHome: () => void
}

/** 选关页：按章节分组的紧凑卡片，窄屏自动收成两列 / 一列 */
export function LevelSelect({ levels, cleared, onSelect, onFree, onHome }: Props) {
  const clearedIds = new Set(cleared)

  return (
    <div className="level-page">
      <header className="level-head">
        <h1>选择关卡</h1>
        <div className="level-head-actions">
          <button type="button" className="btn" onClick={onHome}>
            首页
          </button>
          <button
            type="button"
            className="btn primary"
            onClick={onFree}
            title="20×20 空白沙盒，没有输入输出和测试"
          >
            自由模式
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
                {items.map((level) => {
                  const done = clearedIds.has(level.id)
                  return (
                    <button
                      key={level.id}
                      type="button"
                      className={done ? 'level-card cleared' : 'level-card'}
                      onClick={() => onSelect(level)}
                    >
                      <span className="level-no">{padNo(level.no ?? 1)}</span>
                      <span className="level-name">{level.name}</span>
                      {done ? (
                        <span className="level-clear">
                          <CheckIcon size={12} />
                          已通关
                        </span>
                      ) : null}
                    </button>
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
