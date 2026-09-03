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
