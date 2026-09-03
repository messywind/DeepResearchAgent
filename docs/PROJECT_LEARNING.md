# DeepResearchAgent 项目学习笔记

> 用途：记录项目心智模型、阅读路径、阶段问题和复盘结论。本文档只记录学习结果，不替代项目代码说明。

## 第一阶段：项目全貌（2026-09-03）

### 1. 一句话定位

这是一个基于 LangGraph + LangChain 的多智能体深度研究系统：它把用户问题先整理成研究简报和初稿，再由 Supervisor 拆分研究任务，驱动多个 Research Agent 搜索与压缩网页信息，最后经过草稿精修、质量评估、Red Team 反馈后生成最终调研报告。

### 2. 它解决的问题

- 将一个复杂、开放式问题拆成多个可并行的研究子任务。
- 让研究 Agent 能够反复执行“搜索 → 反思 → 继续搜索/结束”的循环。
- 将网页原文压缩成可供 Supervisor 和 Writer 使用的研究笔记，控制上下文长度。
- 通过初稿、Evaluator 评分和 Red Team 反馈形成有限次数的自我修正。
- 用配置文件切换 LLM 角色参数和搜索后端，而不是把客户端初始化散落在业务代码中。

它目前不是一个完整的 Web 服务：仓库中没有 FastAPI/Flask 路由、CLI、数据库模型或持久化存储实现。实际运行入口是 `run.ipynb`。

### 3. 技术栈

- Python
- LangGraph：状态图、节点、子图、条件路由、`Command` 跳转、checkpointer
- LangChain / LangChain Core：消息、工具、结构化输出、模型绑定工具
- OpenAI-compatible Chat Model：通过 `deep_research/llm.py` 按角色配置创建
- Tavily：默认网络搜索后端
- Pydantic / TypedDict：结构化模型输出和图状态定义
- PyYAML：读取 `config.yml`
- Jupyter Notebook + `InMemorySaver`：示例运行和短期线程状态保存
- Rich：Notebook/脚本中的 Markdown 报告展示

### 4. 总体架构

```text
用户问题（run.ipynb）
        ↓
主 LangGraph：deep_research/agent_builder.py
        ↓
write_research_brief
  draft_model + ResearchQuestion
        ↓
write_draft_report
  draft_model + DraftReport
        ↓
Supervisor 子图：deep_research/agents/supervisor.py
  ┌─────────────────────────────────────────────┐
  │ supervisor：LLM 决策                        │
  │      ↓                                      │
  │ supervisor_tools：执行工具                  │
  │   ├─ think_tool                              │
  │   ├─ ConductResearch                         │
  │   │    └─ 并行调用 Researcher 子图           │
  │   │         ├─ llm_call                      │
  │   │         ├─ tavily_search / think_tool     │
  │   │         └─ compress_research              │
  │   ├─ refine_draft_report                     │
  │   │    └─ evaluator 评分                     │
  │   └─ red_team：批评并回到 supervisor           │
  └─────────────────────────────────────────────┘
        ↓
final_report_generation
  writer_model + FINAL_REPORT_PROMPT
        ↓
最终 Markdown 报告
```

### 5. 目录职责

```text
.
├── run.ipynb                 # 当前可执行入口、绘图、调用和保存报告示例
├── config.yml                # LLM/search/role 配置
├── requirements.txt          # Python 依赖
├── env.example               # LangSmith 等环境变量示例
├── README.md                 # 当前只有项目标题，基本没有使用说明
├── deep_research/
│   ├── agent_builder.py      # 顶层主图和最终报告节点
│   ├── llm.py                # 按 role/stage 解析配置并创建 Chat Model
│   ├── utils.py              # 日期、YAML 配置读取
│   ├── logging.py            # 集中式日志配置
│   ├── agents/
│   │   ├── draft_agent.py    # 研究简报、初稿
│   │   ├── supervisor.py     # Supervisor 子图、并行委派、精修、路由
│   │   ├── research_agent.py # 搜索型 Researcher 子图
│   │   ├── evaluator_agent.py# 初稿质量评分
│   │   └── red_team_agent.py # 对抗性批评
│   ├── states/               # 所有图状态与结构化输出 schema
│   ├── tools/
│   │   ├── tool.py           # 搜索、思考、网页摘要、草稿精修工具
│   │   └── search_factory.py # 搜索 provider 注册、动态加载、缓存
│   ├── providers/
│   │   └── customsearch.py   # 自定义搜索后端示例（尚未实现真实搜索）
│   └── prompts/              # 各 Agent 的系统提示词和报告模板
└── results/                  # 两份示例输出报告
```

### 6. 最重要的文件/模块

优先级最高的是：

1. `deep_research/agent_builder.py`：先看这里，理解主图的 5 个阶段和父子图边界。
2. `deep_research/agents/supervisor.py`：系统的控制中心，负责拆题、并行研究、精修、评估、结束判断。
3. `deep_research/agents/research_agent.py`：真正执行搜索循环的子 Agent。
4. `deep_research/tools/tool.py`：搜索结果如何去重、摘要、格式化，以及 Writer 精修如何发生。
5. `deep_research/states/*.py`：理解状态字段后，才能看懂各节点之间传递的内容。
6. `deep_research/llm.py` + `config.yml`：理解模型角色、超时、token 和搜索后端如何配置。

第二优先级：`draft_agent.py`、`evaluator_agent.py`、`red_team_agent.py`、`prompts/`。

当前可以暂时忽略：

- `deep_research/logging.py`：先把它当作日志基础设施。
- `deep_research/utils.py`：目前主要是 YAML 加载和日期格式化。
- `deep_research/providers/customsearch.py`：只是可插拔 provider 的示例，而且当前没有实现搜索。
- `results/`：用于观察输出形态，不是运行逻辑。
- `env.example`：只在需要 LangSmith 追踪时阅读。
- `prompts/clarify.py` 和 `context_pruner` 配置：扫描发现目前没有接入主图，先不用当作真实执行链路的一部分。

### 7. 启动入口

当前仓库没有 `main.py`、命令行入口或 HTTP Controller。推荐启动路径是：

```text
run.ipynb cell 2
  → import deep_research.agent_builder
  → deep_researcher_builder.compile(checkpointer=InMemorySaver())
  → 得到 full_agent

run.ipynb cell 3
  → await full_agent.ainvoke({"messages": [HumanMessage(...)]}, config=thread)
```

`deep_research/agent_builder.py` 文件底部也编译了一个名为 `agent` 的无 checkpointer 版本，但没有独立的脚本调用它；Notebook 中重新编译的 `full_agent` 才是示例执行对象。

### 8. 核心 5 模块

| 模块 | 核心职责 | 记忆关键词 |
|---|---|---|
| 顶层主图 | 固定串联简报、初稿、研究、终稿 | orchestration |
| Supervisor | 动态决定研究什么、何时结束、何时修稿 | coordination |
| Researcher | 具体搜索、反思、压缩 | evidence gathering |
| Tools/Search | 对接外部搜索并清洗网页信息 | external capability |
| States/Schema | 定义节点之间共享的数据契约 | state contract |

### 9. 目前发现的设计风险/待确认问题

这些不是本阶段要修的代码，而是后续理解和排错时要记住的观察点：

- `config.yml` 中存在看起来像示例/占位的 API 配置，且配置文件被直接提交；真实部署应改为环境变量或密钥管理。
- `README.md` 几乎没有安装、配置、运行、架构说明，因此 Notebook 是事实上的使用文档。
- `providers/customsearch.py` 从 `deep_research.search_factory` 导入，但实际工厂文件位于 `deep_research/tools/search_factory.py`；自定义 provider 动态加载时可能因此失败。
- `ResearcherState.tool_call_iterations` 已定义，但当前 `research_agent.py` 没有使用它来限制循环；实际限制主要在 Supervisor 的 `max_researcher_iterations`。
- `Supervisor` 的异常分支直接把子图结束，可能静默地产出不完整报告；后续排错需特别关注日志和 `notes` 是否为空。
- `active_critiques`、`quality_history`、`needs_quality_repair` 的状态字段没有统一默认值；首次运行或某些分支是否稳定，值得在主链路阶段验证。
- 一些状态字段使用 `Annotated[..., operator.add]` 累积消息/列表，另一些字段直接覆盖；阅读任何节点时必须先确认该字段是“追加”还是“替换”。
- `supervisor_messages` 的类型声明是 `BaseMessage` 序列，但部分节点写入普通字符串；这依赖 LangGraph/LangChain 的消息转换行为，可能是隐性耦合。
- 仓库没有测试目录、锁定依赖文件或正式打包入口；复现运行环境的成本较高。

### 10. 建议阅读顺序

```text
agent_builder.py
  → states/draft.py + states/supervisor.py + states/research.py
  → agents/draft_agent.py
  → agents/supervisor.py
  → agents/research_agent.py
  → tools/tool.py
  → llm.py + config.yml
  → evaluator_agent.py + red_team_agent.py
  → prompts/（最后用于解释模型行为）
```

### 11. 你现在应该记住的只有 3 件事

1. 这是“固定外层流程 + 动态 Supervisor 子图 + 搜索型 Researcher 子图”的嵌套 LangGraph。
2. 报告质量来自三层加工：先有研究简报/初稿，再做外部研究和草稿精修，最后由 Writer 生成最终报告。
3. 各节点之间真正的连接点不是普通函数返回值，而是 `AgentState` / `SupervisorState` / `ResearcherState` 中的共享字段和消息列表。

### 12. 如果你只能阅读 3 个文件

- `deep_research/agent_builder.py`
- `deep_research/agents/supervisor.py`
- `deep_research/agents/research_agent.py`

### 13. 第一阶段自测题

1. 这个项目为什么需要 Supervisor，而不是让一个 Agent 直接搜索并写报告？
2. 从 `run.ipynb` 发起请求后，顶层主图依次经过哪些节点？哪个节点真正负责网络搜索？
3. `research_brief`、`draft_report`、`notes`、`final_report` 分别处在流程的什么位置？
4. 如果搜索后报告内容明显不完整，你会优先检查哪三个文件，为什么？
5. 目前这个仓库能否直接作为一个 HTTP API 服务启动？请指出证据。

## 后续记录区

### 用户问题

（在后续学习阶段追加问题和回答。）

### 用户回答纠正

（记录理解偏差、纠正后的心智模型。）

### 新发现的设计问题

（记录主链路和模块拆解阶段发现的可复现问题。）
