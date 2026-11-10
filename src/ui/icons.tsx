interface IconProps {
  size?: number
}

/** 品牌图标：一条折线电路，两头各一个节点 */
export function Logo({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 7h5.5v5H16v5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="5" cy="7" r="2.2" fill="currentColor" />
      <circle cx="10.5" cy="12" r="1.6" fill="currentColor" opacity="0.55" />
      <circle cx="16" cy="17" r="2.2" fill="currentColor" />
    </svg>
  )
}

export function ArrowRight({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M3 8h10M9 4l4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function ExitIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M10 2.5H4.5a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1H10"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M12 5.5 14.5 8 12 10.5M8 8h6.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function ArrowUp({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M8 13V3M4 7l4-4 4 4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function PauseIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
      <rect x="3.5" y="2.5" width="3" height="11" rx="1" fill="currentColor" />
      <rect x="9.5" y="2.5" width="3" height="11" rx="1" fill="currentColor" />
    </svg>
  )
}

export function PlayIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
      <path d="M4.5 2.6 13 8l-8.5 5.4z" fill="currentColor" />
    </svg>
  )
}

export function StepIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
      <path d="M3 3.2 10.5 8 3 12.8z" fill="currentColor" />
      <rect x="11.5" y="3" width="2" height="10" rx="0.8" fill="currentColor" />
    </svg>
  )
}

/** 上一刻：单步图标的镜像，一条竖线加一个朝左的三角形 */
export function PrevIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
      <rect x="2.5" y="3" width="2" height="10" rx="0.8" fill="currentColor" />
      <path d="M13 3.2 5.5 8 13 12.8z" fill="currentColor" />
    </svg>
  )
}

/** 信息：圆圈里一个 i，和手机端顶栏的 ⓘ 键一致 */
export function InfoIcon({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6.1" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="8" cy="4.9" r="0.95" fill="currentColor" />
      <path d="M8 7.2v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

/** 垃圾桶：手机端元件栏的「删除」键 */
export function TrashIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M2.9 4.5h10.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path
        d="M6.3 4.3V3.2c0-.5.4-.9.9-.9h1.6c.5 0 .9.4.9.9v1.1"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M4.5 4.7h7l-.7 8c-.05.6-.6 1.1-1.2 1.1H6.4c-.6 0-1.15-.5-1.2-1.1z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M6.9 6.9v4.5M9.1 6.9v4.5"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  )
}

/** 勾：测试全部通过 */
export function CheckIcon({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M3.2 8.4 6.5 11.7 12.8 5.2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** 叉：测试未通过 */
export function CrossIcon({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M4 4l8 8M12 4l-8 8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

/** 省略号：测试还没运行 */
export function DotsIcon({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
      <g fill="currentColor">
        <circle cx="3.2" cy="10.6" r="1.15" />
        <circle cx="8" cy="10.6" r="1.15" />
        <circle cx="12.8" cy="10.6" r="1.15" />
      </g>
    </svg>
  )
}

/** 菜单箭头：左边三个点、右边三条横线，和手机端顶栏的菜单键一致 */
export function MenuIcon({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
      <g fill="currentColor">
        <circle cx="3" cy="3.5" r="1.4" />
        <circle cx="3" cy="8" r="1.4" />
        <circle cx="3" cy="12.5" r="1.4" />
      </g>
      <g stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none">
        <line x1="7" y1="3.5" x2="13" y2="3.5" />
        <line x1="7" y1="8" x2="13" y2="8" />
        <line x1="7" y1="12.5" x2="13" y2="12.5" />
      </g>
    </svg>
  )
}
