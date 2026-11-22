import { useEffect, useRef, type RefObject } from 'react'

/** 能按 Tab 停在里面的元素；隐藏和禁用的元素会被后面的检查滤掉 */
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(',')

/** 弹层里当前能聚焦的元素，按出现在页面上的先后排 */
export function focusableElements(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) =>
      !element.closest('[hidden]') &&
      element.getAttribute('aria-hidden') !== 'true' &&
      element.getAttribute('tabindex') !== '-1',
  )
}

/**
 * 焦点在弹层里循环：到了最后一个再 Tab 回第一个，Shift+Tab 反过来。
 * `index` 是当前焦点在可聚焦元素里的位置；不在弹层里（-1）时从头或尾进来。
 */
export function wrapFocusIndex(index: number, count: number, backwards: boolean): number {
  if (count <= 0) return -1
  if (index < 0) return backwards ? count - 1 : 0
  return backwards ? (index - 1 + count) % count : (index + 1) % count
}

/**
 * 吃掉 Tab / Shift+Tab，把焦点挪到弹层里的下一个元素。
 * 在 window 的捕获阶段调用，浏览器就不会再把焦点送到背后的按钮上。
 */
export function trapTab(event: KeyboardEvent, root: HTMLElement | null): void {
  if (event.key !== 'Tab' || event.metaKey || event.ctrlKey || event.altKey) return
  event.preventDefault()
  event.stopPropagation()
  if (!root) return

  const items = focusableElements(root)
  const active = document.activeElement
  const index = active instanceof HTMLElement ? items.indexOf(active) : -1
  const next = items[wrapFocusIndex(index, items.length, event.shiftKey)]
  if (next) {
    next.focus()
    return
  }
  // 弹层里没有能聚焦的东西时，至少把焦点留在弹层本身
  root.focus()
}

/**
 * 打开时把焦点放进弹层，关闭时还给打开它的那个按钮。
 * 弹层自己负责吃掉 Tab（见 `trapTab`），这样焦点不会跑到背后的地图和元件栏。
 */
export function useFocusTrap(rootRef: RefObject<HTMLElement | null>): void {
  const previous = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    // 记住打开前的焦点；StrictMode 把 effect 跑两遍时别把它覆盖成弹层自己
    const active = document.activeElement
    if (active instanceof HTMLElement && active !== document.body && active !== root) {
      previous.current = active
    }
    // 先落在弹层本身，读屏会先读到 aria-label 和正文，Tab 再进到第一个按钮
    root.focus()

    return () => {
      const target = previous.current
      previous.current = null
      // 打开它的按钮可能已经随着菜单收起被卸掉了，那就别硬还回去
      if (target?.isConnected) target.focus()
    }
  }, [rootRef])
}
