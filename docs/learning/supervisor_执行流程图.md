# Supervisor 完整执行流程图

> 覆盖：主图流水线 → supervisor 子图（supervisor / supervisor_tools / red_team）→ 并行 research 子 agent → evaluator 评估 → 终稿生成。
> 关键常量：`max_researcher_iterations=15`、`max_concurrent_researchers=3`、`min_need_repair_score=6.0`、`MAX_CRITIC=3`。

---

## 图 1：总时序图（含子 agent 并行）

从用户 query 到终稿的完整时间线，重点展示 supervisor 与 supervisor_tools 的迭代环、子 agent 的并行派发，以及"修稿 → 评估 → 红队对抗 → 回到 supervisor"的自我进化闭环。

```mermaid
sequenceDiagram
    autonumber
    actor U as 用户
    participant M as 主图 agent_builder
    participant S as supervisor 节点
    participant ST as supervisor_tools 节点
    participant R as researcher_agent 子图 可并行×N
    participant E as evaluator LLM-as-Judge
    participant RT as red_team 节点
    participant F as final_report_generation

    U->>M: query
    M->>M: write_research_brief → research_brief
    M->>M: write_draft_report → draft_report
    M->>S: 进入 supervisor 子图 START→supervisor

    loop 研究迭代 最多 15 次
        Note over S: 组装 system prompt + supervisor_messages
        Note over S: 注入未处理 critique 与 质量修复提醒
        S->>S: LLM 决策产出 tool_calls
        S->>ST: Command goto=supervisor_tools

        alt 退出条件 迭代到顶 或 无 tool_call 或 ResearchComplete
            ST-->>M: Command goto=END 回填 notes 与 research_brief
        else 执行工具
            ST->>ST: think_tool 同步 先反思
            opt 命中 ConductResearch
                par 并行派发子任务 最多 3 个
                    ST->>R: ainvoke research_topic 独立 state
                    R->>R: ReAct 循环 llm_call ↔ tool_node
                    R->>R: compress_research 压缩
                    R-->>ST: compressed_research 与 raw_notes
                end
                Note over ST: 仅 compressed_research 包成 ToolMessage 回填
            end
            opt 命中 refine_draft_report
                ST->>ST: refine_draft_report → new_draft
                ST->>E: evaluate_draft_quality new_draft
                E-->>ST: 三维分数 综合 准确 一致 与 reason
                Note over ST: avg 小于 6.0 置 needs_quality_repair=True
                ST->>RT: Command goto=red_team
                alt draft 合格 或 PASS 或 达 MAX_CRITIC=3
                    RT-->>S: 返回空 无批评
                else 发现缺陷
                    RT-->>S: active_critiques 追加 并注入 SystemMessage
                end
            end
            ST-->>S: Command goto=supervisor 无 refine 时直接回环
        end
    end

    M->>F: supervisor 子图结束 输出 notes
    F->>F: 汇总 notes 生成终稿
    F-->>U: final_report
```

---

## 图 2：状态流转图（LangGraph 图结构）

实线 = 图内真实边 / `Command(goto=...)` 跳转；虚线 = 在 `supervisor_tools` 节点函数里**命令式调用**的外部子图/模型（它们不是 supervisor 子图的节点）。

```mermaid
flowchart TB
    START([START]) --> WB[write_research_brief]
    WB --> WD[write_draft_report]
    WD --> SUP

    subgraph SG [supervisor 子图 supervisor_agent]
      direction TB
      SUP[supervisor 决策大脑] -->|Command goto| STOOL[supervisor_tools 执行手脚]
      STOOL -->|无 refine 直接回环| SUP
      STOOL -->|refine 后 goto red_team| RT[red_team 对抗]
      RT --> SUP
      STOOL -->|退出条件 goto END| SEND([子图 END])
    end

    STOOL -.并行 ainvoke 最多3.-> RA[[researcher_agent 子图]]
    RA -.compressed_research.-> STOOL
    STOOL -.refine 后调用.-> EV[evaluator LLM-as-Judge]
    EV -.三维分数.-> STOOL

    SEND --> FR[final_report_generation]
    FR --> ENDN([END])
```

要点：`researcher_agent` 和 `evaluator` **不是** supervisor 子图里的节点，而是在 `supervisor_tools` 函数体内被 `ainvoke` / 调用的。真正在子图里循环的只有 `supervisor ↔ supervisor_tools ↔ red_team` 三个节点。

---

## 图 3：research 子 agent 内部 ReAct 循环

每个被并行派出去的子 agent 自己也是一张子图，持有独立的 `researcher_messages` 通道，跑标准 ReAct，最后压缩再返回。

```mermaid
flowchart LR
    rstart([START]) --> lc[llm_call 决策]
    lc -->|should_continue 有 tool_calls| tn[tool_node 执行 tavily_search 或 think]
    tn --> lc
    lc -->|无 tool_calls 结束搜索| cr[compress_research 压缩]
    cr --> rend([END 输出 compressed_research 与 raw_notes])
```

要点：`tavily_search` 内部还会对**单个网页先摘要 + 截断 250K**（第一级压缩），`compress_research` 再对整轮结果压一次（第二级压缩）；`compressed_research` 回给 supervisor 决策，`raw_notes` 走旁路保存供终稿兜底。

---

## 三张图怎么连起来读

图 2 是"骨架"（有哪些节点、怎么跳），图 1 是"血肉"（一次迭代里到底按什么顺序发生了什么、谁调谁），图 3 是图 1 里 `researcher_agent` 那一个参与者的内部展开。面试时先用图 2 讲清架构分层，再用图 1 讲清迭代闭环与并行，最后用图 3 收口到"上下文隔离 + 两级压缩"。
