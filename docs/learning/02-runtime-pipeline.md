# 02｜运行时主链路

## 总体流程

```text
用户问题（run.ipynb）
        ↓
主 LangGraph：deep_research/agent_builder.py
        ↓
write_research_brief（draft_model + ResearchQuestion）
        ↓
write_draft_report（draft_model + DraftReport）
        ↓
Supervisor 子图
  supervisor → supervisor_tools
    ├─ think_tool
    ├─ ConductResearch → 并行 Researcher 子图
    ├─ refine_draft_report → evaluator 评分
    └─ red_team → 回到 supervisor
        ↓
final_report_generation（writer_model + FINAL_REPORT_PROMPT）
        ↓
最终 Markdown 报告
```

## 启动入口

当前没有 `main.py`、命令行入口或 HTTP Controller。推荐路径：

```text
run.ipynb cell 2
  → import deep_research.agent_builder
  → deep_researcher_builder.compile(checkpointer=InMemorySaver())
  → 得到 full_agent

run.ipynb cell 3
  → await full_agent.ainvoke({"messages": [HumanMessage(...)]}, config=thread)
```

`agent_builder.py` 底部还编译了无 checkpointer 的 `agent`，但 Notebook 中重新编译的 `full_agent` 才是示例执行对象。

## 五个阶段

| 阶段 | 输入 | 输出 | 关键模块 |
|---|---|---|---|
| 研究简报 | 用户问题 | `research_brief` | `draft_agent.py` |
| 报告初稿 | 简报 | `draft_report` | `draft_agent.py` |
| 外部研究 | 研究缺口 | `raw_notes` / `notes` | `supervisor.py`、`research_agent.py` |
| 草稿质量闭环 | 草稿、研究笔记 | 修订草稿、评分、批评 | evaluator、red team |
| 最终生成 | 全部已确认上下文 | `final_report` | `agent_builder.py` |

## 阶段一：从用户问题到初稿

### `write_research_brief`

这个节点从 `state["messages"]` 读取用户和系统的对话历史，用 `get_buffer_string` 转成文本，再填入 `RESEARCH_BRIEF_PROMPT`。模型不是直接返回普通字符串，而是通过 `with_structured_output(ResearchQuestion)` 约束输出结构，最后只更新：

```python
{"research_brief": response.research_brief}
```

它的作用是把“我要研究 X”变成更具体的研究任务，例如研究范围、关键维度和注意事项。

### `write_draft_report`

这个节点读取刚生成的 `research_brief`，填入 `DRAFT_REPORT_PROMPT`，再通过 `DraftReport` 结构化输出，返回：

```python
{
    "research_brief": research_brief,
    "draft_report": response.draft_report,
    "supervisor_messages": [...],
}
```

这里的初稿不是最终答案，而是一个“待研究、待修订的基线”。Supervisor 后续会拿它判断信息缺口，Researcher 的发现也会用于修订它。

### 为什么要先写初稿

如果没有初稿，Supervisor 只能凭研究简报猜测缺口；有了初稿，就可以比较“已经写了什么”和“还缺什么”，后续的研究和质量评估也有参照物。

## 面试表达

可以把它描述为：外层图保证确定性阶段顺序，Supervisor 子图负责动态规划和循环，Researcher 子图负责局部证据收集；三者通过状态 schema 连接，而不是靠隐式全局变量传递数据。

## 相关问题

暂无。
