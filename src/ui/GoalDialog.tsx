import { useEffect } from 'react'

interface Props {
  label: string
  text: string
  onClose: () => void
}

/**
 * 本关目标：屏幕正中的一张卡片，其余地方压暗。
 * 点卡片外面、点「好的」或按 Esc 都能关掉；打开期间拦住键盘，别让底下的地图跟着动。
 */
export function GoalDialog({ label, text, onClose }: Props) {
  // 卡片盖住地图时，方向键、数字键和 + / - 都不该再传到元件栏和地图上；
  // 在捕获阶段拦住，Esc 关卡片，Tab 留给焦点切换。
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (event.key === 'Tab') return
      event.stopPropagation()
      if (event.key !== 'Escape') return
      event.preventDefault()
      onClose()
    }
    window.addEventListener('keydown', onKey, { capture: true })
    return () => window.removeEventListener('keydown', onKey, { capture: true })
  }, [onClose])

  return (
    <div
      className="goal-scrim"
      onClick={(event) => {
        // 只认点在背板本身上的：从卡片里拖出来松手不算点外面
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="goal-card" id="level-info" role="dialog" aria-modal="true" aria-label={label}>
        <p className="goal-label">{label}</p>
        <p className="goal-text">{text}</p>
        <button type="button" className="btn primary goal-ok" onClick={onClose}>
          好的
        </button>
      </div>
    </div>
  )
}
