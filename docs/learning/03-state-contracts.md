# 03｜状态契约与数据流

## 为什么状态是理解项目的关键

LangGraph 节点通常不是通过普通函数参数把所有上下文串起来，而是读取和返回状态更新。阅读节点前必须先确认字段的类型、默认值，以及它是“追加”还是“替换”。

## 核心状态字段

| 字段 | 作用 | 所在阶段 |
|---|---|---|
| `research_brief` | 用户问题生成的详细研究任务说明 | 简报、Supervisor |
| `draft_report` | 研究开始前的报告初稿，后续会被修订 | 初稿、精修、最终生成 |
| `supervisor_messages` | Supervisor 决策、工具调用和工具结果 | Supervisor 子图 |
| `raw_notes` | Researcher 收集的原始研究记录 | Researcher |
| `notes` | Supervisor 汇总后交给 Writer 的研究笔记 | 研究、最终生成 |
| `active_critiques` | Red Team 尚未解决的批评意见 | 质量闭环 |
| `quality_history` | 每轮草稿质量评分历史 | Evaluator |
| `final_report` | 最终输出的研究报告 | 终点 |

## 追加与覆盖

部分字段使用 `Annotated[..., operator.add]` 累积消息或列表，另一些字段直接覆盖。这个区别会影响并行合并、循环次数和最终上下文：

- 追加字段适合消息、笔记、评分历史等事件流。
- 覆盖字段适合当前草稿、当前路由结果等“最新值”。
- 并行节点返回同一字段时，必须确认 reducer 是否能安全合并。

## 需要特别留意的契约风险

- `supervisor_messages` 声明为 `BaseMessage` 序列，但部分节点写入普通字符串，依赖消息转换行为。
- `active_critiques`、`quality_history`、`needs_quality_repair` 的默认值未完全统一，需验证首次运行和异常分支。
- `ResearcherState.tool_call_iterations` 虽已定义，但当前研究循环没有直接用它限流。

## 面试表达

状态 schema 是多智能体系统的“数据契约”。它同时解决上下文共享、并行结果合并、节点解耦和可观测性问题；但 reducer、默认值和消息类型不严谨时，也会把 bug 隐藏在框架转换层。

## 相关问题

暂无。
