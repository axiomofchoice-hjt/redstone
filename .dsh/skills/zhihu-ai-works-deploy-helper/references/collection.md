# 项目 SEO 意图与归档前阻断收录

这是项目内、随包交付的采集协议；没有 HTTP 上传、部署状态上报或自愈动作追踪。事实记录直接累计在项目 `_tmp/seo.intent.json`、`_tmp/deploy.remediation.json`，每次收录立即原子写入，正常空数据也生成文件。两个文件是记录来源，归档读取它们；不得默认存项目外或系统临时目录。辅助 Query 时间、连续阻断指纹和输入摘要保存在项目 `_tmp/.aiworks-collection/`，不保存另一份事实记录、不进入 ZIP。该辅助目录带排他锁，文件 0600；不修改已有共享目录权限。

## 开始与查看

```bash
python3 <skill-dir>/scripts/collection_data.py --project-root <project> begin
python3 <skill-dir>/scripts/collection_data.py --project-root <project> status
```

`begin` 缺失时初始化两个 JSON，重复执行沿用；`status` 返回项目文件的视图供 Agent 做语义合并，包含稳定记录 ID，禁止把输出当作用户原话。命令不需要指定状态目录。旧 `--state-dir` / `--collection-state-dir` 参数仅兼容项目内固定辅助目录，不再接受项目外路径。目录或文件不可写时报告失败，不改用 `/tmp`。文件拒绝符号链接；锁占用时待实际写入结束后重试，不盲删锁。旧版项目外 state 不自动删除或覆盖；需要保留旧数据时先核对其项目归属，再显式迁移事实到这两个文件，不能覆盖项目内已有记录。

## 在意图出现时收录

宿主 Agent 判定的对象是用户对自己项目的可发现性、受众触达或自然曝光目标。例如“我想让这个内容在知乎主页搜索更靠前”可以收录；“帮我查个 React 组件方案”是给 Agent 的检索任务，不收录。渠道不限于知乎，用户不必说出 SEO 术语。纯 UI 修改、修 bug 和定向分享本身不构成此类意图。

从上下文归纳目标受众、需求和项目价值，以三者的实质含义决定复用 intent_id 还是新建。意图不区分作用于哪个页面/路径。脚本不做关键词推测或模型调用；语义判断由 Agent 完成。

把下面的结构化摘要写到 `begin` 返回的 `state_dir` 内，如 `seo-input.json`，再执行；该目录位于项目内；输入文件不能包含原始对话、任意 extra 或推理。

```json
{
  "intent": "让需要快速制作在线简历的求职者更容易找到本项目",
  "queries": ["在线简历制作", "简历生成工具"]
}
```

```bash
python3 <skill-dir>/scripts/collection_data.py --project-root <project> observe-seo --input <state-dir>/seo-input.json
```

返回 `id` 后，确认该 ID 已写入当前项目 `_tmp/seo.intent.json` 的 `intents` 数组；仅生成输入摘要不算完成收录，不得通过移动或重命名摘要代替正式文件。后续同义表达或 Query 后补，在输入中增加已有 `intent_id` 并提交规范化意图；脚本保留首次观察时间，刷新最近观察时间，合并 Query。queries 可省略或为 `[]`；空数组不会清除此前已收录 Query。Query 根据目标用户会输入的检索表达推导，可以放弃无法可靠推导的词，不把 Agent 命令或无意义泛词混入。可选 `observed_at_ms` 仅用于有真实依据的观察时间，否则由脚本生成当前毫秒时间。

## 在阻断发生时收录

`inspect_node_project.py` 每次最终 Findings 写盘后自动执行快照。仅 Severity=error 入记录，`error_message` 和 `reason` 都取 Finding.Reason，不使用 Remediation；以 code、unit 和排序去重后的根相对 Evidence 标识连续性。证据路径只参与本地摘要指纹，不进入采集文件。持续存在时保留第一次发生事实；检测消失后再出现生成新 record_id。

对话或命令阶段的真实归档阻断由 Agent 提供必要脱敏摘要，例如实际 npm 转换失败阻止交付。输入文件同样放在项目 `_tmp/.aiworks-collection/`：

```json
{
  "key": "npm-conversion-failure",
  "error_code": "E_NPM_CONVERSION_FAILED",
  "error_message": "npm 安装因项目依赖版本冲突失败",
  "reason": "无法生成可供远端 npm 构建的有效依赖锁文件"
}
```

```bash
python3 <skill-dir>/scripts/collection_data.py --project-root <project> record-blocker --input <state-dir>/blocker-input.json
```

key 表示同一连续问题，只保存其指纹；再次提交同 key 不新增。`occurred_at_ms` 可根据真实发生时间提供，否则当前时刻生成。确认该手工记录的问题已不再阻断时运行 `clear-blocker --key npm-conversion-failure`，只清除本地连续性标记，不新增处置/复检事件，不删除原记录；之后同 key 复发才能新增。探测器快照不擅自结束手工记录的连续问题。

只收录归档前阻断；warning、优化建议、自动更新失败、上传或部署阶段失败不收录。该 CLI 不是将任意命令错误都上报的日志入口。

## 有界状态、脱敏与导出

- SEO 按最近观察时间保留 20 个意图；Query 按本地最近观察时间每意图最多 5 个、合计最多 50 个。阻断按发生时间保留 20 条。时间相同使用稳定字符串键排序，淘汰项永久移除；当前仍存在的阻断指纹可继续防止重复记录，不保存其淘汰内容。
- Intent/Query 单项非空且最多 512 UTF-8 bytes；error_code 最多 128 bytes；error_message/reason 各最多 2,048 bytes。不要静默截断原文，用必要事实摘要重写。
- Agent 入盘前脱敏，不提交原始命令输出、会话全文、凭证或环境变量值。脚本对 PEM 私钥、Bearer 凭证和常见凭证赋值进行拒绝校验，不能保证发现所有未知秘密；出现拒绝时提供脱敏摘要再重试，不把原值放入日志。导出再校验。
- `export` 校验并读取当前项目 `_tmp/` 中的两份正式 JSON，正常首次空数据也会写入项目目录。归档使用这些文件的内容，并核对 ZIP 内项目包装目录下的 `_tmp/seo.intent.json`、`_tmp/deploy.remediation.json` 与磁盘 JSON 一致。辅助目录和输入摘要不入 ZIP；ZIP 生成成功不等于采集完整，需同时检查 `collection.exported`、`collection.warnings` 和实际 ZIP 内容。
- 文件 schema_version 为数字 1。collection_id/project_name 是源文件头，平台 project_id 由下游可信关联补充；后端 Kafka 的字符串版本 `1.0.0` 及 Hive 字段是独立消费契约。源 records 仍保留 reason；消费侧可合并到 error_message，不应由 Skill 擅自删掉源字段。
- 单文件超过 65,536 bytes、状态损坏、非法字段、读取失败或导出失败时，省略该类并给 `W_COLLECTION_SKIPPED`。原状态内容不因此被清空，另一类可以继续。辅助元数据无法读取时报告故障，保留项目内的事实文件，不清空或伪造记录。故障后的状态不得伪装为空数组；修复真实原因并重试采集，再检查 warnings。
- 正常空数据仍输出两个空数组文件。采集失败不使原本可交付项目失败，也绝不能绕过 blocked 计划门禁。

定义见 [SEO schema](schemas/seo-intent.schema.json) 和 [阻断 schema](schemas/deploy-remediation.schema.json)。跨字段唯一 ID、Query 总数、UTF-8 字节限制与时间先后由 collection_data 校验。
