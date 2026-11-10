# 开发

技术栈、目录结构和工程约定。

## 技术栈

React 19 + TypeScript + Vite，画布用原生 Canvas 2D 绘制（自己处理 devicePixelRatio 和手势），测试用 vitest，静态检查用 oxlint。

TypeScript 打开 `strict`，`tsconfig.app.json` / `tsconfig.node.json` 都开了。

## 目录结构

```
src/
  game/
    types.ts      元件、关卡、测试用例的类型定义
    sim.ts        仿真内核（连通网络、tick 推进、跑测试）
    sim.test.ts   仿真单元测试
  ui/
    Board.tsx       画布：绘制、平移、缩放、电脑端拖动连续放置、鼠标悬停预览
    board-layout.ts 100% 时的格子大小：电脑端固定 54px、手机端按屏幕自适应
    board-hit.ts    画布坐标到格子下标的换算
    camera.ts       相机夹取和以视口中心为锚点的缩放（画布和滑轨共用）
    fade.ts         通电变色的短渐变：每个格子的两个通道各推一个补间
    glyph.ts        各个元件的绘制函数（画布和按钮共用）
    Palette.tsx     手机端底部元件栏
    ports.ts        元件栏里还有哪些输入 / 输出按钮
    tools.ts        可用元件、元件栏顺序和换关时的默认元件
    edit-mode.ts    电脑端放置 / 覆盖模式下点一格该做什么
    keyboard.ts     数字键选元件、方向键 / WASD 换朝向
    Inspector.tsx   电脑端左侧面板：元件、朝向、放置 / 覆盖模式、删除、缩放滑轨、信号
    Waveform.tsx    输入 / 输出波形图（电脑端检查器和回放、手机端交互和回放共用）
    waveform.ts     波形采样：每 tick 取一帧、滚动窗口、切成电平段
    trace.ts        回放要显示的检查区间 / 成对检查，以及带参考解电路状态并排跑同一组测试
    export.ts       导出地图：稀疏化 cells / powers 并下载 JSON
    solution.ts     把参考解的布局和电路状态复制出来盖到地图上
    GameDesktop.tsx 电脑端两栏布局与顶栏（菜单、返回选关）
    GameMobile.tsx  手机端单列布局
    LevelSelect.tsx 选关页（按章节分组的卡片）
    StartScreen.tsx 首页
    levels-meta.ts  关卡章节分组
    useMediaQuery.ts 响应式断点
    ToolIcon.tsx    元件栏按钮上的小图标
    icons.tsx       品牌、方向、测试等小图标
  levels/
    index.ts        关卡列表（按顺序导出）
    free.ts         自由模式：20×20 空白沙盒（选关页顶栏「自由模式」按钮进入）
    solution-helpers.ts 从稀疏数据展开参考解的 cells 和 state
    level-01.ts     第一关：导线
    level-02.ts     第二关：或门
    level-03.ts     第三关：非门
    level-04.ts     第四关：与门
    level-05.ts     第五关：异或门
    level-06.ts     第六关：半加器
    level-07.ts     第七关：三人投票器
    level-08.ts     第八关：时钟
    level-09.ts     第九关：脉冲延迟器
    level-10.ts     第十关：脉冲延长器
    level-11.ts     第十一关：上升沿感应器
    level-12.ts     第十二关：脉冲过滤器
    level-13.ts     第十三关：双边沿感应器
    level-14.ts     第十四关：RS 锁存器
    level-15.ts     第十五关：D 锁存器
    level-16.ts     第十六关：T 触发器
    level-17.ts     第十七关：JK 触发器
    level-18.ts     第十八关：交叉
    level-19.ts     第十九关：脉冲长度感应器
  App.tsx           关卡状态、工具选择、tick 循环、响应式切换
```

## 约定

- 关卡是纯数据，新增关卡在 `src/levels/index.ts` 的列表里按顺序加，章节分组写在 `levels-meta.ts`。
- 改动判定规则要同时更新 `docs/rules.md` / `docs/simulation.md` 和 `CHANGELOG.md`。
