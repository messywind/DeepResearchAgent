# 06｜工具、搜索 Provider 与 LLM 配置

## 工具层

`deep_research/tools/tool.py` 主要负责：

1. 调用搜索 Provider。
2. 按 URL 去重搜索结果。
3. 对网页原文做摘要。
4. 格式化为带标题、URL 和摘要的文本。
5. 调用 Writer 模型修订报告草稿。

工具层把外部副作用集中起来，让 Agent 只关心“何时调用什么能力”。

## 搜索 Provider 抽象

`deep_research/tools/search_factory.py` 将搜索客户端抽象为 Provider，默认注册 Tavily，并支持自定义后端注册、动态导入和客户端缓存。这样可以替换搜索服务而不改 Supervisor/Researcher 的决策逻辑。

## LLM 配置

`deep_research/llm.py` 根据 `config.yml` 中的 role/stage 配置创建 Chat Model，集中处理模型名称、base URL、API key、超时和 token 等参数。面试时可将其归类为“策略配置与依赖注入”。

## 运行注意事项

- `config.yml` 中可能存在示例/占位 API 配置，真实密钥应通过本地配置、环境变量或密钥管理服务提供。
- `providers/customsearch.py` 当前从 `deep_research.search_factory` 导入，但工厂实际位于 `deep_research/tools/search_factory.py`；启用自定义后端前需核对动态导入路径。
- 外部搜索和 LLM 调用意味着网络、限流、超时和供应商错误都是正常的生产故障类型。

## 面试表达

Provider 抽象解决可替换性，工厂/缓存解决初始化成本，配置驱动解决多角色模型策略；三者组合后，业务图不需要感知具体供应商。

## 相关问题

暂无。
