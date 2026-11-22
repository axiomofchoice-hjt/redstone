import { afterEach, describe, expect, it, vi } from 'vitest'
import { trapTab, wrapFocusIndex } from './focus-trap'

class FakeElement {
  focus = vi.fn()
  closest(): Element | null {
    return null
  }
  getAttribute(): string | null {
    return null
  }
}

class FakeRoot extends FakeElement {
  items: FakeElement[]

  constructor(items: FakeElement[]) {
    super()
    this.items = items
  }

  querySelectorAll(): NodeListOf<Element> {
    return this.items as unknown as NodeListOf<Element>
  }
}

const tab = (shiftKey = false) =>
  ({
    key: 'Tab',
    shiftKey,
    metaKey: false,
    ctrlKey: false,
    altKey: false,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
  }) as unknown as KeyboardEvent

/** 造一个弹层：count 个可聚焦元素，焦点先放在第 activeIndex 个（-1 表示在弹层外） */
const setup = (count: number, activeIndex: number) => {
  const items = Array.from({ length: count }, () => new FakeElement())
  const root = new FakeRoot(items)
  const active = activeIndex >= 0 ? items[activeIndex] : new FakeElement()
  vi.stubGlobal('HTMLElement', FakeElement)
  vi.stubGlobal('document', { activeElement: active })
  return { root: root as unknown as HTMLElement, items, active }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('弹层里的 Tab 循环', () => {
  it('正着走：最后一个回到第一个', () => {
    expect(wrapFocusIndex(0, 3, false)).toBe(1)
    expect(wrapFocusIndex(1, 3, false)).toBe(2)
    expect(wrapFocusIndex(2, 3, false)).toBe(0)
  })

  it('Shift+Tab 反着走：第一个回到最后一个', () => {
    expect(wrapFocusIndex(2, 3, true)).toBe(1)
    expect(wrapFocusIndex(1, 3, true)).toBe(0)
    expect(wrapFocusIndex(0, 3, true)).toBe(2)
  })

  it('焦点不在弹层里时，从头或从尾进来', () => {
    expect(wrapFocusIndex(-1, 3, false)).toBe(0)
    expect(wrapFocusIndex(-1, 3, true)).toBe(2)
  })

  it('弹层里没有可聚焦元素时返回 -1', () => {
    expect(wrapFocusIndex(-1, 0, false)).toBe(-1)
    expect(wrapFocusIndex(0, 0, true)).toBe(-1)
  })
})

describe('吃掉 Tab 键', () => {
  it('Tab 挪到下一个按钮，不让浏览器把焦点送出去', () => {
    const { root, items } = setup(3, 0)
    const event = tab()
    trapTab(event, root)

    expect(event.preventDefault).toHaveBeenCalled()
    expect(event.stopPropagation).toHaveBeenCalled()
    expect(items[1].focus).toHaveBeenCalled()
  })

  it('Shift+Tab 挪到上一个按钮，在第一个上会绕回最后一个', () => {
    const { root, items } = setup(3, 0)
    trapTab(tab(true), root)

    expect(items[2].focus).toHaveBeenCalled()
  })

  it('焦点在弹层外时拉回第一个按钮', () => {
    const { root, items } = setup(3, -1)
    trapTab(tab(), root)

    expect(items[0].focus).toHaveBeenCalled()
  })

  it('弹层里没有按钮时，焦点留在弹层本身', () => {
    const { root } = setup(0, -1)
    trapTab(tab(), root)

    expect(root.focus).toHaveBeenCalled()
  })

  it('其他键不拦，留给弹层自己的 Esc / 方向键处理', () => {
    const { root } = setup(3, 0)
    const event = { ...tab(), key: 'Escape' } as unknown as KeyboardEvent
    trapTab(event, root)

    expect(event.preventDefault).not.toHaveBeenCalled()
    expect(event.stopPropagation).not.toHaveBeenCalled()
  })
})
