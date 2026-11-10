import { ArrowRight } from './icons'
import { useMediaQuery } from './useMediaQuery'

interface Props {
  /** 进入游戏：直接打开选关界面 */
  onStart: () => void
}

/** 首页里那块装饰用的电路图 */
function HeroCircuit() {
  return (
    <svg viewBox="0 0 560 460" className="hero-art" fill="none" aria-hidden="true">
      <defs>
        <pattern id="hero-grid" width="28" height="28" patternUnits="userSpaceOnUse">
          <path d="M28 0H0v28" stroke="#e6ebf4" strokeWidth="1" />
        </pattern>
        <radialGradient id="hero-glow" cx="52%" cy="42%" r="62%">
          <stop offset="0" stopColor="#ff6b4a" stopOpacity="0.14" />
          <stop offset="1" stopColor="#ff6b4a" stopOpacity="0" />
        </radialGradient>
        <filter id="hero-blur" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
        <clipPath id="hero-clip">
          <rect x="1" y="1" width="558" height="458" rx="26" />
        </clipPath>
      </defs>

      <g clipPath="url(#hero-clip)">
        <rect x="1" y="1" width="558" height="458" fill="#ffffff" />
        <rect x="1" y="1" width="558" height="458" fill="url(#hero-grid)" opacity="0.65" />
        <rect x="1" y="1" width="558" height="458" fill="url(#hero-glow)" />

        {/* 没通电的支路 */}
        <g stroke="#c9d2e1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M196 240v68h66" />
          <path d="M306 308h148v52" />
          <path d="M420 140V84h80v84" />
        </g>

        {/* 主信号线：A → 中继器 → B */}
        <g
          stroke="#ff5a3c"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.5"
          filter="url(#hero-blur)"
        >
          <path d="M84 240h112v-100h104" />
          <path d="M340 140h80v100h56" />
        </g>
        <g stroke="#ff6b4a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M84 240h112v-100h104" />
          <path d="M340 140h80v100h56" />
        </g>

        {/* 一段流动的高亮，示意信号在导线上跑 */}
        <path
          d="M84 240h112v-100h104"
          stroke="#ff9c7a"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray="10 214"
          className="hero-flow"
        />

        {/* 连接点 */}
        <g fill="#ff6b4a">
          <circle cx="196" cy="240" r="4" />
          <circle cx="196" cy="140" r="4" />
          <circle cx="420" cy="240" r="4" />
        </g>

        {/* 输入 A */}
        <rect x="64" y="220" width="40" height="40" rx="9" fill="#ff6b4a" />
        <text
          x="84"
          y="246"
          textAnchor="middle"
          fill="#1a0d08"
          fontSize="17"
          fontWeight="700"
          fontFamily="ui-monospace, monospace"
        >
          A
        </text>

        {/* 中继器 */}
        <path d="M304 122v36l36-18z" stroke="#ff6b4a" strokeWidth="2.5" strokeLinejoin="round" />
        <circle cx="311" cy="140" r="2.4" fill="#ff6b4a" />
        {/* 输出 B */}
        <rect
          x="456"
          y="220"
          width="40"
          height="40"
          rx="9"
          stroke="#ff6b4a"
          strokeWidth="2.5"
        />
        <text
          x="476"
          y="246"
          textAnchor="middle"
          fill="#d4441c"
          fontSize="17"
          fontWeight="700"
          fontFamily="ui-monospace, monospace"
        >
          B
        </text>

        {/* 非门 */}
        <g stroke="#c9d2e1" strokeWidth="2.5" strokeLinejoin="round">
          <path d="M266 290v36l30-18z" fill="#ffffff" />
          <circle cx="303" cy="308" r="5" />
        </g>

        {/* 未通电的指示灯 */}
        <circle cx="454" cy="360" r="8" fill="#f1f4f9" stroke="#c9d2e1" strokeWidth="2.5" />

        {/* 通电的指示灯 */}
        <circle cx="500" cy="196" r="9" fill="#ff2b2b" className="hero-lamp" />
        <circle
          cx="500"
          cy="196"
          r="18"
          fill="#ff2b2b"
          opacity="0.18"
          filter="url(#hero-blur)"
        />

      </g>

      <rect x="1" y="1" width="558" height="458" rx="26" stroke="#dce1ea" />
    </svg>
  )
}

/** 装饰图在窄屏挪到标题下面，这个断点要和 App.css 里 max-width: 960px 保持一致 */
const NARROW_QUERY = '(max-width: 960px)'

/** 首页。桌面端是左右分栏；窄屏单列，装饰图夹在说明和按钮之间 */
export function StartScreen({ onStart }: Props) {
  const narrow = useMediaQuery(NARROW_QUERY)

  return (
    <div className="landing">
      <div className="landing-main">
        <div className="landing-content">
          <div className="landing-copy">
            <h1>红石电路</h1>
            <p>在网格上摆放导线、中继器和逻辑门，让信号按你的逻辑走。</p>

            {narrow ? (
              <div className="landing-art">
                <HeroCircuit />
              </div>
            ) : null}

            <div className="landing-actions">
              <button type="button" className="btn primary large" onClick={onStart}>
                进入游戏
                <ArrowRight />
              </button>
            </div>
          </div>

          {narrow ? null : (
            <div className="landing-art">
              <HeroCircuit />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
