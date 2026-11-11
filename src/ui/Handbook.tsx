import { useEffect } from 'react'
import type { CellType } from '../game/types'
import { ToolIcon } from './ToolIcon'

interface Props {
  onClose: () => void
}

/** 五种元件的速查条目，和元件栏用同一套图标 */
const PARTS: { type: CellType; name: string; desc: string }[] = [
  { type: 'wire', name: '导线', desc: '连成一片的导体，同一个网络一起带电。' },
  {
    type: 'cross',
    name: '交叉导线',
    desc: '上下、左右两条独立通道，各走各的，互不导通。',
  },
  { type: 'charger', name: '充能器', desc: '朝正面一个方向给相邻元件供能。' },
  {
    type: 'repeater',
    name: '中继器',
    desc: '读后方，延迟 1 tick 输出到正面；侧面被顶住会锁存或断路。',
  },
  { type: 'not', name: '非门', desc: '读后方，延迟 1 tick 输出反相。' },
]

/** 查看教程：盖在游戏上面的规则速查页，电脑端和手机端共用 */
export function Handbook({ onClose }: Props) {
  // 按 Esc 收起，和菜单、关卡信息一个习惯
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="handbook-screen"
      role="dialog"
      aria-modal="true"
      aria-label="查看教程"
      // 点卡片外面那层遮罩收起；点卡片里的内容（冒泡上来）不算
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="handbook-card">
        <header className="handbook-head">
          <h2>查看教程</h2>
          <button type="button" className="btn menu-btn handbook-close" onClick={onClose}>
            收起
          </button>
        </header>

        <div className="handbook-body">
          <section className="handbook-section">
            <h3>基本规则</h3>
            <ul className="handbook-list">
              <li>导线传输无延迟、无衰减、无距离限制；贴边就相连。</li>
              <li>中继器和非门延迟 1 tick 生效，其余元件在同一个 tick 内稳定。</li>
            </ul>
          </section>

          <section className="handbook-section">
            <h3>五种元件</h3>
            <div className="handbook-parts">
              {PARTS.map((part) => (
                <div className="handbook-part" key={part.type}>
                  <span className="handbook-glyph">
                    <ToolIcon type={part.type} dir={0} size={26} />
                  </span>
                  <p>
                    <b>{part.name}</b>
                    {part.desc}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="handbook-section">
            <h3>输入 / 输出</h3>
            <ul className="handbook-list">
              <li>输入按拨的 0 / 1 朝四个方向同时发信号；点地图上的输入（交互模式）或波形行首的字母都能切换。</li>
              <li>输出收集四周朝它发出的信号，任意一个为 1 就是 1；自己不发信号。</li>
            </ul>
          </section>

          <section className="handbook-section">
            <h3>中继器侧面锁存</h3>
            <p className="handbook-text">
              中继器被侧面相邻、正面顶过来并且正在输出 1 的中继器顶住时，不再采样后方，输出原地保持，三角形变成实心；侧面信号回到 0 才重新采样（照样延迟 1 tick）。
              所以「后方接 D、侧面接一个由 E 驱动的中继器」就是一个 D 锁存器。
            </p>
          </section>

          <section className="handbook-section">
            <h3>充能器侧面断路</h3>
            <p className="handbook-text">
              充能器正面顶住中继器的侧面并且输出 1 时，中继器的输出被掐断，相当于 Y = D ∧ ¬E。断路那一拍按 0 采样，所以断开和恢复都跟着中继器晚 1 tick。
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
