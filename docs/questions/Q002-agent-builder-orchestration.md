# Q002｜`agent_builder` 的顶层编排职责

> 创建日期：2026-09-03  
> 状态：learning  
> 关联专题：[`learning/02-runtime-pipeline.md`](../learning/02-runtime-pipeline.md)

## 学习中的理解

用户的理解是：`agent_builder` 大概就是用 LangGraph 建一个图。

## 补充后的结论

这个理解是正确的第一层，但还需要补充四点：

1. `StateGraph(AgentState, input_schema=AgentInputState)` 定义图使用的状态契约和输入形状。
2. `add_node` 把 Python 函数或已经编译的子图注册为节点。
3. `add_edge` 定义节点之间的执行顺序；这里的顶层流程是固定串行的。
4. `compile()` 把声明式图编译成可以调用的 Agent；Notebook 还会使用 checkpointer 编译出带线程状态的版本。

## 代码证据

见 [`deep_research/agent_builder.py`](../../deep_research/agent_builder.py)：

- `write_research_brief`：生成研究简报。
- `write_draft_report`：生成报告初稿。
- `supervisor_subgraph`：调用已经编译好的 Supervisor 子图。
- `final_report_generation`：生成最终报告。

## 面试表达

`agent_builder` 是顶层 orchestration layer：它不负责具体搜索，而是声明状态图的节点、边和输入/输出契约，并把 Supervisor 子图嵌入固定的端到端流程中。

## 后续复盘

下一步需要理解：节点函数返回的不是“直接传给下一个函数的普通参数”，而是对共享状态的更新。
