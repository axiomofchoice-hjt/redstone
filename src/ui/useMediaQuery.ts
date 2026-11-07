import { useEffect, useState } from 'react'

/**
 * 监听媒体查询。首帧就按当前窗口取，避免先按手机布局画一次再跳成桌面。
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)

  useEffect(() => {
    const list = window.matchMedia(query)
    const update = () => setMatches(list.matches)
    update()
    list.addEventListener('change', update)
    return () => list.removeEventListener('change', update)
  }, [query])

  return matches
}

/** 电脑端布局的断点：再窄就退回手机 / 平板那一套。 */
export const DESKTOP_QUERY = '(min-width: 1024px)'
