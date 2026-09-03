# 05｜Researcher 搜索循环

## 子图流程

```text
llm_call
  ├─ 有工具调用 → tool_node → llm_call
  └─ 无工具调用 → compress_research → END
```

默认工具包括：

- `tavily_search`：网络搜索。
- `think_tool`：记录研究反思和下一步策略。

## 一轮研究发生什么

1. Researcher LLM 根据局部任务和已有消息决定是否调用工具。
2. 工具节点执行搜索或反思，并把结果写回研究状态。
3. LLM 根据新结果继续搜索，或认为证据足够后结束工具调用。
4. `compress_research` 将多轮消息压缩为 Findings，供 Supervisor 使用。

## 为什么要压缩

网页原文和多轮工具消息会快速膨胀上下文。压缩节点把“过程消息”转换成“可复用研究结论”，减少 Supervisor 和 Writer 的 token 成本，同时保留来源、摘要和关键证据。

## 需要验证的限流点

`ResearcherState.tool_call_iterations` 已定义，但当前 `research_agent.py` 没有用它直接限制循环；实际约束主要来自 Supervisor 的 `max_researcher_iterations`。这意味着局部循环的安全边界需要结合图配置和异常处理一起验证。

## 面试表达

这是一个受控的 ReAct 循环：模型负责选择动作，工具负责获取外部事实，压缩节点负责把高噪声轨迹变成低噪声证据包。

## 相关问题

暂无。
