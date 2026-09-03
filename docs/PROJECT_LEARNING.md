# DeepResearchAgent 持续学习导航

> 目标：把这个项目理解到互联网大厂面试所要求的程度。每次学习、提问、纠错和排错，都沉淀为可独立复盘的文档。

## 怎么使用这套文档

先看“基础地图”，再按当前问题进入对应专题。遇到新问题时，不要把答案继续堆在本页，而是按 [`questions/QUESTION_TEMPLATE.md`](questions/QUESTION_TEMPLATE.md) 新建一篇问题记录，并在下方的问题索引中登记。

## 学习教练模式

你不需要提前准备问题。我会按照“项目定位 → 主链路 → 状态契约 → Supervisor → Researcher → 工具与配置 → 质量闭环 → 生产化权衡”的顺序先讲解，再用小问题确认理解。

- 每轮只推进一个核心问题，避免一次塞入过多概念。
- 先让你用自己的话回答，再给出代码证据、纠正和面试版本。
- 如果回答暴露出基础缺口，我会暂时偏离主路径，补一个更小的问题。
- 每轮结束后更新对应的 `Qxxx` 文档和专题文档链接。

### 推荐阅读路径

1. [学习路线与第一课](learning/00-learning-plan.md)
2. [项目定位与目录地图](learning/01-project-overview.md)
3. [运行时主链路](learning/02-runtime-pipeline.md)
4. [状态契约与数据流](learning/03-state-contracts.md)
5. [Supervisor 协调机制](learning/04-supervisor.md)
6. [Researcher 搜索循环](learning/05-researcher.md)
7. [工具、搜索 Provider 与 LLM 配置](learning/06-tools-and-config.md)
8. [草稿精修、评估与 Red Team](learning/07-quality-loop.md)
9. [风险、限制与待验证项](learning/08-risks-and-open-questions.md)
10. [面试自测题](learning/09-interview-checklist.md)

### 每次提问的沉淀规则

- 一个能独立复盘的问题对应一个独立 Markdown 文件，编号使用 `Q001`、`Q002`……，文件名使用 `Q001-简短主题.md`。
- 记录“问题 → 初始理解 → 证据 → 纠正后的结论 → 面试表达 → 后续行动”，不要只记录最终答案。
- 需要改代码的问题仍先记录在问题文档中；代码修复、测试结果和 commit（如有）作为证据链接回去。
- 同一问题后续有新发现时，更新原文档的“追加复盘”，不要重复创建近似文档。
- 每次学习结束后更新下面的索引和专题文档的“相关问题”链接。

## 学习地图

| 文档 | 解决的问题 | 面试关键词 |
|---|---|---|
| [01 项目定位与目录地图](learning/01-project-overview.md) | 这个项目是什么、为什么存在、先读哪些文件 | system design、trade-off |
| [02 运行时主链路](learning/02-runtime-pipeline.md) | 一次请求如何从 Notebook 走到最终报告 | orchestration、workflow |
| [03 状态契约与数据流](learning/03-state-contracts.md) | 节点之间通过什么共享数据 | state、schema、reducer |
| [04 Supervisor 协调机制](learning/04-supervisor.md) | 如何拆题、并行委派、判断结束 | coordination、routing、parallelism |
| [05 Researcher 搜索循环](learning/05-researcher.md) | 搜索、反思、工具调用如何循环 | ReAct、agent loop、context |
| [06 工具、搜索 Provider 与 LLM 配置](learning/06-tools-and-config.md) | 外部能力和模型角色如何接入 | abstraction、provider、configuration |
| [07 质量闭环](learning/07-quality-loop.md) | 草稿如何被评估、批评和修正 | evaluation、red team、self-correction |
| [08 风险与待验证项](learning/08-risks-and-open-questions.md) | 当前实现有哪些隐患和证据缺口 | reliability、observability、production readiness |
| [09 面试自测题](learning/09-interview-checklist.md) | 如何检查自己是否真的理解 | explainability、debugging |

## 问题记录索引

| 编号 | 主题 | 状态 | 记录 |
|---|---|---|---|
| Q001 | 项目一句话定位与核心价值 | deferred | [问题记录](questions/Q001-project-positioning.md) |
| Q002 | `agent_builder` 的顶层编排职责 | verified | [问题记录](questions/Q002-agent-builder-orchestration.md) |
| Q003 | `AgentState` 的共享状态与合并规则 | learning | [问题记录](questions/Q003-agent-state.md) |
| Q004 | 用户问题如何变成研究简报和报告初稿 | learning | [问题记录](questions/Q004-brief-to-draft.md) |

## 当前阶段结论

1. 这是“固定外层流程 + 动态 Supervisor 子图 + 搜索型 Researcher 子图”的嵌套 LangGraph。
2. 报告质量来自三层加工：研究简报/初稿、外部研究与草稿精修、最终 Writer 汇总。
3. 节点之间真正的连接点不是普通函数返回值，而是 `AgentState`、`SupervisorState`、`ResearcherState` 中的共享字段和消息列表。

## 文档维护约定

- 本导航页只放地图、索引和跨专题结论；详细解释放到专题文档。
- 代码行为变化时，优先更新受影响的专题文档，再更新这里的链接或结论。
- “发现但未验证”的内容放入 [风险与待验证项](learning/08-risks-and-open-questions.md)，验证后再移动到对应专题的确定性结论。
