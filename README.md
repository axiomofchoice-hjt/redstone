# 红石电路

一个 2D 红石电路解谜游戏。电脑端是左侧检查器 + 右侧画布，手机端单列、地图占中间。

关卡制，判定依据是**按 tick 的时间轴**检查输出，而不只是最终状态。

线上版本：<https://axiomofchoice-hjt.github.io/redstone/>（`main` 推送后自动发布）。

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
| `pnpm build:only` | 跳过类型检查直接打包 |
| `pnpm preview` | 预览打包结果 |
| `pnpm typecheck` | 只做 TypeScript 类型检查 |
| `pnpm lint` | oxlint 静态检查 |
| `pnpm test` | 运行 vitest 单元测试 |

## 文档

**操作**

- [界面与操作](docs/controls.md)：两套布局、放置与删除、平移缩放、快捷键、菜单、首页与自由模式
- [放置 / 交互模式与波形图](docs/waveform.md)：拨输入、波形怎么画、采样规则
- [测试与回放](docs/testing.md)：测试按钮、结果状态、回放与「上一刻」

**规则**

- [元件与信号规则](docs/rules.md)：五种元件、中继器锁存、充能器断路
- [时间模型与仿真](docs/simulation.md)：tick 推进、延迟、增量更新

**关卡**

- [关卡数据格式](docs/levels.md)：`Level` 字段、`pairs` 与测试写法、导出地图
- [各关设计说明](docs/level-notes.md)：第十八关的设计、参考解取的状态

**开发**

- [开发](docs/development.md)：技术栈、目录结构、文档对应表、约定

## 更新日志

见 [CHANGELOG.md](CHANGELOG.md)。

## 协议

[MIT](LICENSE) © 2026 axiomofchoice
