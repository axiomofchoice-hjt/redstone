/** 飞行器模块的类型。这一套和电路关卡的元件完全没有关系，只有格子用法一样。 */

/** 0 上、1 右、2 下、3 左 */
export type FlyDir = 0 | 1 | 2 | 3

export const DELTA: readonly (readonly [number, number])[] = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
]

export const DIRS: readonly FlyDir[] = [0, 1, 2, 3]

export type FlyPartType =
  | 'block'
  | 'slime'
  | 'piston'
  | 'stickyPiston'
  | 'redstone'
  | 'observer'
  /** 沙盒里的时钟电源：自己按节奏开关，不用外部信号 */
  | 'clock'

export interface FlyPart {
  type: FlyPartType
  /** 只有活塞 / 观察者有朝向 */
  dir?: FlyDir
  /** 关卡预置，玩家删不掉 */
  locked?: boolean
}

export interface FlyLevel {
  id: string
  no: number
  name: string
  cols: number
  rows: number
  /** 静态地形：true = 墙，推不动、过不去 */
  walls: boolean[]
  /** 初始机器，按行优先铺平 */
  cells: (FlyPart | null)[]
  /** 终点：机器所有零件都落在这些格子里算过关 */
  goal: number[]
  /** 这关能用的零件，不写表示全部 */
  tools?: FlyPartType[]
  /** 关卡说明 */
  hint?: string
  /** 参考解 */
  solution?: (FlyPart | null)[]
}
