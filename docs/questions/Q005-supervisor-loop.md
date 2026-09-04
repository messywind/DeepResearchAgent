# Q005｜Supervisor 的决策—执行循环

> 创建日期：2026-09-04  
> 状态：learning  
> 关联专题：[`learning/04-supervisor.md`](../learning/04-supervisor.md)

## 学习目标

理解 Supervisor 为什么拆成 `supervisor` 和 `supervisor_tools` 两个节点，以及它们如何通过工具调用形成循环。

## 核心心智模型

```text
supervisor：模型提出下一步计划（tool calls）
        ↓
supervisor_tools：程序真正执行工具调用
        ↓
产生 ToolMessage 和状态更新
        ↓
回到 supervisor，继续决策
```

## 四类决定

- `think_tool`：记录研究策略和反思。
- `ConductResearch`：委派一个或多个 Researcher 子图。
- `refine_draft_report`：结合发现修订草稿并触发 Evaluator。
- `ResearchComplete`：声明研究结束。

## 结束条件

达到最大迭代次数、模型没有返回工具调用，或模型调用 `ResearchComplete` 时，Supervisor 子图结束，并把 ToolMessage 中的研究结果整理为 `notes`。

## 质量闭环

如果执行了草稿修订，Supervisor 会计算综合/准确性/一致性平均分；然后进入 Red Team。Red Team 可以产生 `active_critiques`，再由下一轮 Supervisor 读取并处理。

## 面试表达

Supervisor 是一个“LLM 负责规划、代码负责执行”的有状态调度循环。把决策和副作用分开，既能让模型选择工具，也能让程序统一控制并行、限流、状态合并和终止条件。
