import type { Level } from '../game/types'

/** 选关页和关卡侧栏里的分组，按关卡号划分 */
export interface Chapter {
  title: string
  from: number
  to: number
}

export const CHAPTERS: Chapter[] = [
  { title: '逻辑电路', from: 1, to: 7 },
  { title: '脉冲电路', from: 8, to: 13 },
  { title: '记忆电路', from: 14, to: 17 },
  { title: '进阶', from: 18, to: 19 },
]

export function chapterOf(level: Level): Chapter {
  const no = level.no ?? 1
  return CHAPTERS.find((chapter) => no >= chapter.from && no <= chapter.to) ?? CHAPTERS[0]
}

export function chapterLevels(levels: Level[], chapter: Chapter): Level[] {
  return levels.filter((level) => {
    const no = level.no ?? 1
    return no >= chapter.from && no <= chapter.to
  })
}

/** 关卡号补成两位，列表里对齐好看 */
export const padNo = (no: number): string => String(no).padStart(2, '0')
