import { describe, expect, it } from 'vitest'
import {
  emptyProgress,
  isGoalSeen,
  isLevelCleared,
  loadProgress,
  markGoalSeen,
  markLevelCleared,
  parseProgress,
  PROGRESS_KEY,
  saveProgress,
} from './progress'

class MemoryStorage implements Storage {
  private values = new Map<string, string>()

  get length(): number {
    return this.values.size
  }

  clear(): void {
    this.values.clear()
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null
  }

  removeItem(key: string): void {
    this.values.delete(key)
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value)
  }
}

/** 隐私模式、配额满了之类的存储：读写都抛错 */
const brokenStorage = {
  getItem(): string | null {
    throw new Error('storage disabled')
  },
  setItem(): void {
    throw new Error('quota exceeded')
  },
} as unknown as Storage

describe('关卡进度存储', () => {
  it('没有存储时返回空进度', () => {
    expect(loadProgress(null)).toEqual(emptyProgress())
  })

  it('存下来的进度能原样读回来', () => {
    const storage = new MemoryStorage()
    const progress = { cleared: ['level-01', 'level-03'], goalsSeen: ['level-01'] }
    saveProgress(progress, storage)
    expect(storage.getItem(PROGRESS_KEY)).toBe(JSON.stringify(progress))
    expect(loadProgress(storage)).toEqual(progress)
  })

  it('存档坏掉、字段类型不对时当作空进度', () => {
    const storage = new MemoryStorage()
    storage.setItem(PROGRESS_KEY, '{not json')
    expect(loadProgress(storage)).toEqual(emptyProgress())

    storage.setItem(PROGRESS_KEY, '[]')
    expect(loadProgress(storage)).toEqual(emptyProgress())

    storage.setItem(PROGRESS_KEY, '{"cleared":"level-01","goalsSeen":null}')
    expect(loadProgress(storage)).toEqual(emptyProgress())
  })

  it('读存档时去掉重复、空白和非字符串的 id', () => {
    expect(
      parseProgress('{"cleared":["level-01","level-01"," ",3,"level-02"],"goalsSeen":["level-03"]}'),
    ).toEqual({ cleared: ['level-01', 'level-02'], goalsSeen: ['level-03'] })
  })

  it('存储读写抛错时不影响游戏', () => {
    expect(loadProgress(brokenStorage)).toEqual(emptyProgress())
    expect(() => saveProgress(emptyProgress(), brokenStorage)).not.toThrow()
  })

  it('标记通关和目标已看过，重复标记不会重复记录', () => {
    const cleared = markLevelCleared(emptyProgress(), 'level-01')
    expect(cleared).toEqual({ cleared: ['level-01'], goalsSeen: [] })
    expect(isLevelCleared(cleared, 'level-01')).toBe(true)
    expect(isLevelCleared(cleared, 'level-02')).toBe(false)

    const again = markLevelCleared(cleared, 'level-01')
    expect(again).toBe(cleared)
    expect(again.cleared).toEqual(['level-01'])

    const seen = markGoalSeen(cleared, 'level-02')
    expect(seen).toEqual({ cleared: ['level-01'], goalsSeen: ['level-02'] })
    expect(isGoalSeen(seen, 'level-02')).toBe(true)
    expect(markGoalSeen(seen, 'level-02')).toBe(seen)
  })
})
