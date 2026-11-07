import type { FlyPartType } from './types'

export const FLY_TOOLS: { type: FlyPartType; label: string }[] = [
  { type: 'block', label: '石块' },
  { type: 'slime', label: '粘液块' },
  { type: 'piston', label: '活塞' },
  { type: 'stickyPiston', label: '粘性活塞' },
  { type: 'redstone', label: '红石块' },
  { type: 'clock', label: '脉冲器' },
  { type: 'observer', label: '观察者' },
]

/** 只有这些零件带朝向 */
export const hasFlyDir = (type: FlyPartType) =>
  type === 'piston' || type === 'stickyPiston' || type === 'observer'
