/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// 配色 token 的对比度契约：改品牌色时这些断言会先拦住回归。
const tokensCss = readFileSync(new URL('../index.css', import.meta.url), 'utf8')
const appCss = readFileSync(new URL('../App.css', import.meta.url), 'utf8')

function token(name: string): string {
  const match = new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`).exec(tokensCss)
  if (!match) throw new Error(`index.css 里找不到 --${name}`)
  return match[1].toLowerCase()
}

function luminance(hex: string): number {
  const channels = [0, 2, 4].map((i) => parseInt(hex.slice(i + 1, i + 3), 16) / 255)
  const [r, g, b] = channels.map((c) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  )
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

// 和 App.css 里的 rgba(240, 86, 46, 0.10) 保持一致：把强调色按 10% 叠到白底上
function tint(hex: string, alpha: number, base = '#ffffff'): string {
  const parse = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
  const fg = parse(hex)
  const bg = parse(base)
  return `#${fg
    .map((v, i) => Math.round(v * alpha + bg[i] * (1 - alpha)).toString(16).padStart(2, '0'))
    .join('')}`
}

const AA_TEXT = 4.5
const AA_NON_TEXT = 3
const panel = token('panel')

const textPairs: Array<[string, string, string]> = [
  ['主按钮黑字', token('accent-ink'), token('accent-fill')],
  ['主按钮悬停黑字', token('accent-ink'), token('accent-fill-hover')],
  ['浅底强调色文字', token('accent-strong'), panel],
  ['模式按钮文字（10% 橙底）', token('accent-strong'), tint(token('accent'), 0.1, panel)],
  ['成功状态文字', token('ok-fill'), panel],
  ['已通关卡上的关卡号', token('ok-fill'), '#f1faf5'],
  ['失败状态文字', token('danger-ink'), panel],
  ['次要文字', token('muted'), panel],
  ['正文', token('text'), token('bg')],
]

describe('配色对比度', () => {
  it.each(textPairs)('%s 不低于 AA 的 4.5:1', (_label, fg, bg) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(AA_TEXT)
  })

  it('强调色作为非文本装饰时不低于 3:1', () => {
    expect(contrast(token('accent'), panel)).toBeGreaterThanOrEqual(AA_NON_TEXT)
  })

  it('填充上的文字都落在 --accent-fill 上', () => {
    const blocks = [...appCss.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    for (const [, selector, body] of blocks) {
      if (!body.includes('var(--accent-ink)')) continue
      expect(body, selector.trim()).toMatch(/background:\s*var\(--accent-fill(-hover)?\)/)
    }
  })
})
