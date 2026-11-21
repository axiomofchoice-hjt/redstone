/**
 * 关卡进度：存在浏览器的 localStorage 里，刷新页面、关掉再打开都还在。
 * 只记两件事：哪些关通过了、哪些关的目标说明已经自动弹过。
 */
export interface Progress {
  /** 已通关的关卡 id */
  cleared: string[]
  /** 第一次进入时已经自动弹过本关目标的关卡 id */
  goalsSeen: string[]
}

/** 进度在 localStorage 里的键；换格式时改版本号，旧数据会因为读不出来而当作空进度 */
export const PROGRESS_KEY = 'redstone:progress:v1'

export const emptyProgress = (): Progress => ({ cleared: [], goalsSeen: [] })

const idsOf = (value: unknown): string[] => {
  if (!Array.isArray(value)) return []
  const ids = value
    .filter((id): id is string => typeof id === 'string')
    .map((id) => id.trim())
    .filter((id) => id !== '')
  return [...new Set(ids)]
}

/** 解析存下来的 JSON；格式不对、被改坏或没有数据都当作空进度，不让存档问题挡住游戏 */
export function parseProgress(raw: string | null): Progress {
  if (!raw) return emptyProgress()
  let value: unknown
  try {
    value = JSON.parse(raw)
  } catch {
    return emptyProgress()
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return emptyProgress()
  }
  const record = value as Record<string, unknown>
  return { cleared: idsOf(record.cleared), goalsSeen: idsOf(record.goalsSeen) }
}

/** 浏览器里的 localStorage；隐私模式或禁用存储时取不到，返回 null */
const browserStorage = (): Storage | null => {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}

/** 读进度；没有 localStorage、读失败都是空进度 */
export function loadProgress(storage: Storage | null = browserStorage()): Progress {
  if (!storage) return emptyProgress()
  try {
    return parseProgress(storage.getItem(PROGRESS_KEY))
  } catch {
    return emptyProgress()
  }
}

/** 写进度；存不下（配额、隐私模式）就只当这一局有效，别让游戏崩掉 */
export function saveProgress(progress: Progress, storage: Storage | null = browserStorage()): void {
  if (!storage) return
  try {
    storage.setItem(PROGRESS_KEY, JSON.stringify(progress))
  } catch {
    // 忽略写入失败，进度在内存里照常生效
  }
}

const withId = (ids: string[], id: string): string[] => (ids.includes(id) ? ids : [...ids, id])

/** 标记这一关已通关；重复标记不会在列表里攒出第二份 id */
export function markLevelCleared(progress: Progress, id: string): Progress {
  const cleared = withId(progress.cleared, id)
  return cleared === progress.cleared ? progress : { ...progress, cleared }
}

/** 标记这一关的目标已经自动弹过 */
export function markGoalSeen(progress: Progress, id: string): Progress {
  const goalsSeen = withId(progress.goalsSeen, id)
  return goalsSeen === progress.goalsSeen ? progress : { ...progress, goalsSeen }
}

/** 这一关是否已经通关 */
export const isLevelCleared = (progress: Progress, id: string): boolean =>
  progress.cleared.includes(id)

/** 这一关的目标是否已经自动弹过 */
export const isGoalSeen = (progress: Progress, id: string): boolean =>
  progress.goalsSeen.includes(id)
