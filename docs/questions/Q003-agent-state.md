# Q003｜`AgentState` 的共享状态与合并规则

> 创建日期：2026-09-03  
> 状态：learning  
> 关联专题：[`learning/03-state-contracts.md`](../learning/03-state-contracts.md)

## 学习中的理解

用户理解为：`AgentState` 像一个公共对象，存放各个 Agent 需要的字段；每个 Agent 进入时读取它，完成后对字段做 upsert 或合并，再传给下一个 Agent。

## 补充后的结论

这个理解基本正确，但要区分三件事：

1. 它不是普通全局变量，而是 LangGraph 在每个节点之间传递和管理的状态快照。
2. 节点通常只返回“本次更新的字段”，框架根据字段声明的 reducer 把更新合并回状态。
3. 合并规则按字段定义：消息使用 `add_messages`，列表笔记使用 `operator.add`，普通字符串通常是覆盖。

## 代码证据

见 [`deep_research/states/draft.py`](../../deep_research/states/draft.py)：

- `AgentState(MessagesState)` 继承了消息状态，并增加研究字段。
- `supervisor_messages: Annotated[..., add_messages]` 会按消息规则合并。
- `raw_notes`、`notes` 使用 `Annotated[..., operator.add]` 累积列表。
- `research_brief`、`draft_report`、`final_report` 没有 reducer，通常由最新更新覆盖。

## 面试表达

`AgentState` 是工作流的共享数据契约。节点读取当前快照并返回局部更新，LangGraph 根据字段级 reducer 合并更新；这样节点可以解耦，但 reducer、默认值和并行写入策略必须设计清楚。

## 后续复盘

下一步需要用一个具体请求走一遍：用户消息如何变成 `research_brief`，再变成 `draft_report`，从而理解“节点只返回局部更新”是什么意思。
