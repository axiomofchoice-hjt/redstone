import { ArrowRight, Logo } from './icons'
import { useMediaQuery } from './useMediaQuery'

interface Props {
  /** 进入游戏：直接打开选关界面 */
  onStart: () => void
  /** 打开教程速查页，和游戏内菜单里的「查看教程」是同一个页面 */
  onHandbook: () => void
}

/**
 * 首页那块装饰图：地图截出来的 5×5 电路标。
 * 和站点图标同一个形状，放在 public/ 里，走 BASE_PATH 时也能取到。
 */
const LOGO_SRC = `${import.meta.env.BASE_URL}logo.svg`

/** 装饰图在窄屏挪到标题下面，这个断点要和 App.css 里 max-width: 960px 保持一致 */
const NARROW_QUERY = '(max-width: 960px)'

/** 首页。桌面端是左右分栏；窄屏单列，装饰图夹在说明和按钮之间 */
export function StartScreen({ onStart, onHandbook }: Props) {
  const narrow = useMediaQuery(NARROW_QUERY)

  return (
    <div className="landing">
      <div className="landing-main">
        <div className="landing-content">
          <div className="landing-copy">
            <h1 className="landing-title">
              红石电路
              <span className="landing-mark">
                <Logo />
              </span>
            </h1>
            <p>简化红石电路模拟器 · 解谜游戏 · 教学工具</p>

            {narrow ? (
              <div className="landing-art">
                <img className="landing-logo" src={LOGO_SRC} alt="" />
              </div>
            ) : null}

            <div className="landing-actions">
              <button type="button" className="btn primary large" onClick={onStart}>
                进入游戏
                <ArrowRight />
              </button>
              <button type="button" className="btn large" onClick={onHandbook}>
                查看教程
              </button>
            </div>
          </div>

          {narrow ? null : (
            <div className="landing-art">
              <img className="landing-logo" src={LOGO_SRC} alt="" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
