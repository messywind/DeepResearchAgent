# Q004｜用户问题如何变成研究简报和报告初稿

> 创建日期：2026-09-03  
> 状态：learning  
> 关联专题：[`learning/02-runtime-pipeline.md`](../learning/02-runtime-pipeline.md)

## 学习目标

理解顶层图进入 Supervisor 之前，前两个节点分别做什么，以及为什么要先生成初稿。

## 代码证据

- `write_research_brief` 读取 `messages`，通过 `ResearchQuestion` 结构化输出，更新 `research_brief`。
- `write_draft_report` 读取 `research_brief`，通过 `DraftReport` 结构化输出，更新 `draft_report` 和 `supervisor_messages`。
- 两个节点都在 `deep_research/agents/draft_agent.py`。

## 核心结论

研究简报是“把问题说具体”，报告初稿是“先建立一个可被研究和修订的基线”。初稿不是最终报告，而是 Supervisor 判断研究缺口、后续精修和质量评估的参照物。

## 后续复盘

下一步需要理解 Supervisor 如何读取初稿并决定调用哪个工具。
