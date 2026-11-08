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

export function PauseIcon({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
      <rect x="3.5" y="2.5" width="3" height="11" rx="1" fill="currentColor" />
      <rect x="9.5" y="2.5" width="3" height="11" rx="1" fill="currentColor" />
    </svg>
  )
}

export function PlayIcon({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
      <path d="M4.5 2.6 13 8l-8.5 5.4z" fill="currentColor" />
    </svg>
  )
}

export function StepIcon({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
      <path d="M3 3.2 10.5 8 3 12.8z" fill="currentColor" />
      <rect x="11.5" y="3" width="2" height="10" rx="0.8" fill="currentColor" />
    </svg>
  )
}

/** 菜单箭头：左边三个点、右边三条横线，和手机端顶栏的菜单键一致 */
export function MenuIcon({ size = 16 }: IconProps) {
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
