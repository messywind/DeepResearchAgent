# 08｜风险、限制与待验证项

> 本页记录“已经观察到但还没有完全验证”的内容。验证后应迁移到对应专题的确定性结论，并在问题记录中留下证据。

## 当前风险清单

- `config.yml` 可能包含示例/占位 API 配置，真实部署需要环境变量或密钥管理。
- README、Notebook 和代码之间可能存在文档漂移；Notebook 目前仍是事实上的运行说明。
- `providers/customsearch.py` 的导入路径与搜索工厂实际位置不一致，自定义 Provider 动态加载可能失败。
- `ResearcherState.tool_call_iterations` 未直接限制 Researcher 循环，需验证极端情况下的终止边界。
- Supervisor 异常分支可能直接结束子图，造成不完整报告被静默返回。
- `active_critiques`、`quality_history`、`needs_quality_repair` 默认值不完全统一，需验证首次运行和分支稳定性。
- `supervisor_messages` 声明为 `BaseMessage` 序列但部分节点写入字符串，存在框架隐式转换耦合。
- 缺少测试目录、锁定依赖文件和正式打包入口，复现成本较高。
- `InMemorySaver` 只适合示例/开发测试，重启进程后线程状态不会保留。
- 当前没有正式 HTTP API 或 CLI，生产化还需要入口、持久化、监控、重试和鉴权。
- `raw_notes` 目前是「只写不读」字段：researcher 的 `compress_research` 生成、supervisor_tools 用 `operator.add` 聚合累积，但全项目没有任何下游节点读取它（最终报告和草稿都走 `notes`/`compressed_research` 链路）。同时四处 `.compile()` 均未配置 checkpointer，状态只存在于单次运行的进程内存中，不落盘、不入库，中断即丢失。因此「留档/可追溯」的设计意图尚未兑现。待决策：(a) 接上持久化与消费点让其真正可回溯；(b) 若无消费需求则精简掉，以节省内存和上下文。

## 排错优先级

遇到“报告明显不完整”时，优先检查：

1. `deep_research/agents/supervisor.py`：是否提前结束或异常路由。
2. `deep_research/agents/research_agent.py`：是否没有完成搜索循环或压缩结果为空。
3. `deep_research/tools/tool.py`：搜索结果是否为空、去重/摘要是否丢失内容。

## 相关问题

暂无。
