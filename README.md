# 红石电路

一个移动端优先的 2D 电路解谜游戏：在网格上摆放元件，搭出满足关卡测试的电路。

- 关卡制，判定依据是**按 tick 的时间轴**检查输出，而不只是最终状态。
- 导线传输无延迟、无衰减、无距离限制；中继器 / 非门延迟 1 tick。
- 画布支持拖动平移、双指缩放，界面按手机竖屏优先设计。

规则细节见 [docs/GDD.md](docs/GDD.md)（仍在迭代，标注【待确认】的部分尚未定稿）。

## 快速开始

需要 Node.js 20.19+ 和 pnpm。

```bash
pnpm install
pnpm dev          # http://localhost:5173
```

其他命令：

| 命令 | 说明 |
| --- | --- |
| `pnpm build` | 类型检查并打包到 `dist/` |
| `pnpm preview` | 预览打包结果 |
| `pnpm typecheck` | 只做 TypeScript 类型检查 |
| `pnpm lint` | oxlint 静态检查 |
| `pnpm test` | 运行 vitest 单元测试 |

## 玩法

底部是元件栏，选中后点击地图放置，可以连续放置；删除需要先切到「删除」。

- **元件**：导线、交叉导线（上下 / 左右两条独立通道）、充能器、中继器、非门。
- **方向**：用方向键盘选择朝向，按钮上的图标会跟着转。
- **输入 / 输出**：由玩家自己放到地图上，每个字母对应一个输入 / 输出。
- **交互**：点「交互」后再点输入元件，可以切换它的 0 / 1。
- **调试**：顶栏可以暂停 / 继续，暂停后能手动推进一个 tick。

地图比屏幕大时直接拖动；双指可以缩放（1x–3x）。

## 时间模型

逻辑以 tick 为单位推进，编辑时每秒 4 tick。无延迟元件（导线、交叉导线、充能器）在同一 tick 内传播到稳定，中继器和非门延迟 1 tick 生效。测试读取的是每个 tick 的输出采样值。

## 目录结构

```
src/
  game/
    types.ts      元件、关卡、测试用例的类型定义
    sim.ts        仿真内核（连通网络、tick 推进、跑测试）
    sim.test.ts   仿真单元测试
  ui/
    Board.tsx     画布：绘制、平移、缩放、点击放置
    Palette.tsx   底部元件栏
    ToolIcon.tsx  元件栏按钮上的小图标
    glyph.ts      各个元件的绘制函数（画布和按钮共用）
  levels/
    level-01.ts   关卡数据
  App.tsx         关卡状态、工具选择、tick 循环
docs/
  GDD.md          设计文档
```

## 关卡格式

关卡是纯数据，放在 `src/levels/` 下：

```ts
export const level01: Level = {
  id: 'demo-01',
  no: 1,
  name: '示例关',
  cols: 20,
  rows: 14,
  inputs: ['A', 'B'],   // 输入元件的字母
  outputs: ['C'],       // 输出元件的字母
  cells,                // (Cell | null)[]，按行优先
  tests: [{
    events: [{ tick: 0, values: { A: 1 } }],
    checks: [{ tick: 2, outputs: { C: 1 } }],
  }],
}
```

`cells` 里每个元件是 `{ type, dir?, id?, locked? }`，`dir` 为 `0..3`（上 / 右 / 下 / 左）。

## 技术栈

React 19 + TypeScript + Vite，画布用原生 Canvas 2D 绘制（自己处理 devicePixelRatio 和手势），测试用 vitest。

## 协议

[MIT](LICENSE) © 2026 axiomofchoice
