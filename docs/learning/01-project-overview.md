# 01｜项目定位与目录地图

## 一句话定位

这是一个基于 LangGraph + LangChain 的多智能体深度研究系统：它把用户问题整理成研究简报和初稿，再由 Supervisor 拆分研究任务，驱动多个 Research Agent 搜索与压缩网页信息，最后经过草稿精修、质量评估、Red Team 反馈后生成最终调研报告。

## 它解决的问题

- 把复杂、开放式问题拆成多个可并行的研究子任务。
- 让 Research Agent 反复执行“搜索 → 反思 → 继续搜索/结束”。
- 将网页原文压缩成供 Supervisor 和 Writer 使用的研究笔记，控制上下文长度。
- 通过初稿、Evaluator 评分和 Red Team 反馈形成有限次数的自我修正。
- 用配置切换 LLM 角色参数和搜索后端，避免客户端初始化散落在业务代码中。

当前它不是完整 Web 服务：没有 FastAPI/Flask 路由、CLI、数据库模型或持久化存储实现，实际运行入口是 `run.ipynb`。

## 技术栈

- Python
- LangGraph：状态图、节点、子图、条件路由、`Command` 跳转、checkpointer
- LangChain / LangChain Core：消息、工具、结构化输出、模型绑定工具
- OpenAI-compatible Chat Model：由 `deep_research/llm.py` 按角色配置创建
- Tavily：默认网络搜索后端
- Pydantic / TypedDict：结构化输出和图状态定义
- PyYAML、Jupyter Notebook、`InMemorySaver`、Rich

## 目录职责

```text
.
├── run.ipynb                 # 可执行入口、绘图、调用和保存报告示例
├── config.yml                # LLM/search/role 配置
├── requirements.txt          # Python 依赖
├── env.example               # LangSmith 等环境变量示例
├── deep_research/
│   ├── agent_builder.py      # 顶层主图和最终报告节点
│   ├── llm.py                # 按 role/stage 解析配置并创建 Chat Model
│   ├── utils.py              # 日期、YAML 配置
│   ├── logging.py            # 集中式日志
│   ├── agents/               # draft、supervisor、researcher、evaluator、red team
│   ├── states/               # 图状态与结构化 schema
│   ├── tools/                # 搜索、思考、摘要、草稿精修
│   ├── providers/            # 可插拔搜索后端示例
│   └── prompts/              # Agent 提示词和报告模板
└── results/                  # 示例输出报告
```

## 最重要的文件

1. `deep_research/agent_builder.py`：理解主图和父子图边界。
2. `deep_research/agents/supervisor.py`：拆题、并行研究、精修、评估和结束判断。
3. `deep_research/agents/research_agent.py`：真正执行搜索循环。
4. `deep_research/tools/tool.py`：搜索去重、摘要、格式化和 Writer 精修。
5. `deep_research/states/*.py`：节点间的数据契约。
6. `deep_research/llm.py` + `config.yml`：模型角色、超时、token 和搜索后端配置。

## 暂时可以忽略

`logging.py`、`utils.py`、`results/`、`env.example` 可在主链路之后阅读；`providers/customsearch.py` 和未接入主图的 `prompts/clarify.py`、`context_pruner` 先当作扩展或待确认项。

## 相关问题

暂无。新问题请登记到 [`docs/PROJECT_LEARNING.md`](../PROJECT_LEARNING.md) 的索引。
