import { useEffect, useRef } from 'react'
import type { Level } from '../game/types'
import { CHAPTERS, chapterLevels, padNo } from './levels-meta'

interface Props {
  levels: Level[]
  current: Level
  onSelect: (level: Level) => void
  onSolution: () => void
  onExport: () => void
}

/** 电脑端左侧的关卡列表，当前关卡高亮，换关时自动滚进可视区 */
export function LevelRail({ levels, current, onSelect, onSolution, onExport }: Props) {
  const scrollRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const active = scrollRef.current?.querySelector<HTMLElement>('.rail-item.active')
    active?.scrollIntoView({ block: 'nearest' })
  }, [current.id])

  return (
    <aside className="rail" aria-label="关卡列表">
      <nav className="rail-scroll" ref={scrollRef}>
        {CHAPTERS.map((chapter) => {
          const items = chapterLevels(levels, chapter)
          if (items.length === 0) return null
          return (
            <div className="rail-group" key={chapter.title}>
              <div className="rail-group-title">{chapter.title}</div>
              {items.map((level) => {
                const active = level.id === current.id
                return (
                  <button
                    key={level.id}
                    type="button"
                    className={active ? 'rail-item active' : 'rail-item'}
                    aria-current={active ? 'true' : undefined}
                    onClick={() => onSelect(level)}
                  >
                    <span className="rail-no">{padNo(level.no ?? 1)}</span>
                    <span className="rail-name">{level.name}</span>
                  </button>
                )
              })}
            </div>
          )
        })}
      </nav>

      <div className="rail-foot">
        <button
          type="button"
          className="rail-action"
          disabled={!current.solution}
          title="载入参考答案，会覆盖当前电路"
          onClick={onSolution}
        >
          参考答案
        </button>
        <button type="button" className="rail-action" title="导出当前地图 JSON" onClick={onExport}>
          导出
        </button>
      </div>
    </aside>
  )
}
