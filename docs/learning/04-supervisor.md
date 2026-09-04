# 04｜Supervisor 协调机制

## 核心职责

`deep_research/agents/supervisor.py` 是控制中心，负责：

- 根据研究简报和当前草稿判断信息缺口。
- 通过 `ConductResearch` 委派一个或多个研究任务。
- 并行运行多个 Researcher 子图。
- 触发 `refine_draft_report` 修订草稿并调用 Evaluator。
- 进入 Red Team 节点，注入尚未解决的批评意见。
- 通过 `ResearchComplete` 或最大迭代次数判断是否结束。

## 控制流心智模型

```text
supervisor（LLM 决策）
        ↓ tool call
supervisor_tools（执行决定）
        ├─ think_tool：记录推理和下一步策略
        ├─ ConductResearch：并行委派 Researcher
        ├─ refine_draft_report：更新草稿并评分
        └─ ResearchComplete：结束研究
        ↓
red_team（发现漏洞） → supervisor（继续修复或结束）
```

## 两个节点的分工

### `supervisor`：只做决策

它把系统提示、历史 `supervisor_messages`、未解决的 Red Team 批评和质量修复标志组合起来，交给绑定了四类工具的 Supervisor 模型。模型返回的主要不是最终文本，而是结构化的 `tool_calls`，例如：

```text
ConductResearch(research_topic="比较两代 GPU 的显存和功耗")
```

这个节点会把模型响应写入消息历史、增加 `research_iterations`，然后跳到 `supervisor_tools`。

### `supervisor_tools`：负责执行

它读取最近一条模型消息中的工具调用，并由 Python 程序真正执行：

1. 先执行 `think_tool`，得到研究策略记录。
2. 对多个 `ConductResearch` 调用使用 `asyncio.gather` 并行运行 Researcher 子图。
3. 如果模型要求 `refine_draft_report`，用研究发现修订草稿，再由 Evaluator 打分。
4. 把执行结果包装成 `ToolMessage`，写回 `supervisor_messages`，再决定回到 Supervisor、进入 Red Team 或结束。

这里的关键区别是：模型只提出“调用什么工具以及参数是什么”，真正的网络搜索、并行调度和状态更新由程序完成。

## 一次循环的状态变化

```text
已有 research_brief + draft_report
  → supervisor 生成 tool_calls
  → supervisor_tools 执行并生成 ToolMessage
  → notes/raw_notes/draft_report/quality_history 更新
  → 回到 supervisor 读取新上下文
```

Supervisor 的价值不是“再调用一次模型”，而是把开放式研究变成有边界的任务规划、并行调度和终止判断。

## 关键边界

- Supervisor 决定“研究什么”和“是否继续”。
- Researcher 决定“如何搜索”和“如何压缩局部证据”。
- Writer 决定“如何把已确认材料组织成最终报告”。

## 风险提示

异常分支可能直接结束子图，导致不完整报告被静默产出；排错时需要同时检查日志、`notes` 是否为空，以及结束路由是否由异常触发。

## 面试表达

Supervisor 类似一个带状态的调度器：LLM 负责高层决策，工具节点负责执行，状态 reducer 负责合并结果，最大迭代次数负责把非确定性循环约束在可控范围内。

## 相关问题

暂无。
