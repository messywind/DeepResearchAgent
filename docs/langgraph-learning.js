'use strict';
// Lesson examples are projections of the synthetic trace in langgraph-explorer.html.
// Answers distinguish the checked-in implementation from proposed production work.
const chapters=[
 {name:'先讲清项目',goal:'能用一分钟说明：为什么要分阶段生成研究报告。',graph:'main'},
 {name:'理解 State',goal:'能解释：节点返回了什么，父子图如何交换数据。',graph:'main'},
 {name:'跑通 Researcher',goal:'能讲清：模型选工具、执行工具、压缩结果这个循环。',graph:'research'},
 {name:'吃透 Supervisor',goal:'能沿代码回答调度、并发、退出与质量反馈的追问。',graph:'sup'},
 {name:'社招深入追问',goal:'能区分已实现能力、工程缺口，以及如何证明改进有效。',graph:'sup'}
];
// chapter, node, title, takeaway, input excerpt, output excerpt, question,
// implementation answer, tradeoff / improvement, avoid claiming, recall, trace index
const lessons=[
 [0,'write_research_brief','先把用户问题变成研究任务','这个节点负责明确研究范围。还没有开始搜索，也没有生成结论。','用户：比较 Atlas X 和 Atlas Y，推荐怎么买。','research_brief：查显存、比较同条件吞吐、注明来源与限制。','为什么不直接把用户的问题交给搜索 Agent？','write_research_brief 把 messages 和日期放入提示词，通过 ResearchQuestion 得到 research_brief，供后续草稿和研究使用。','明确范围便于任务拆分和最终评估，但简报生成错误会传递到后续阶段。可以增加约束校验；需求确实不清楚时再做澄清交互。','当前生产图没有 clarify 节点；结构化输出也不保证理解正确。','用自己的话说：简报与最终报告有什么不同？',0],
 [0,'write_draft_report','先有一份待验证的草稿','初稿提供结构和研究方向；里面的内容仍需要证据验证。','research_brief：显存、吞吐、测试条件、采购限制。','draft_report：一份待补证的提纲式初稿。','先写草稿再研究，会不会让 Agent 只寻找支持自己的证据？','主流程确实先生成 draft_report，再把草稿和简报写入 supervisor_messages。此时草稿不是搜索验证后的结论。','这是效率与锚定偏差的权衡。改进可把草稿里的论断标成待验证项，并专门安排反证搜索；现有红队提供批评，但不等于完整事实核查。','不要把初稿描述为已查证的研究结果。','面试官说“这会有确认偏误”，你如何接住？',1],
 [0,'supervisor_subgraph','把研究交给一个可循环的团队','主图只把 Supervisor 当作一个阶段；拆任务、补研究、修草稿发生在阶段内部。','输入：简报 + 初稿。','输出：研究笔记 + 修订草稿，交给最终写作。','为什么用多 Agent，而不是一个很长的提示词？','Supervisor 分配主题，每个 Researcher 使用独立消息历史。主图固定阶段，子图允许多轮研究与修订。','独立上下文便于分工，独立主题可以并发；代价是更多调用、重复搜索和摘要信息损失。是否更好，要在同一题集上与单 Agent 比较质量、成本和耗时。','项目结构本身不能证明“准确率大幅提升”或“延迟下降”。','举出一个适合并行研究、一个必须顺序研究的任务。',20],
 [0,'final_report_generation','把证据与草稿整理成最终回答','最终写作读取 notes 和 draft_report；它不会在这个节点里再次搜索。','合成证据：X 120 tokens/s，Y 180 tokens/s，测试条件相同。','报告：此条件下 Y 快 50%；缺少报价，不能直接断言性价比。','报告写得很像真的，怎样保证结论有证据？','final_report_generation 把 notes 拼成 findings，与简报、草稿和日期一起调用 writer；当前节点没有逐条验证引用。','可增加论断到来源的映射、证据充分性检查和引用核对。先定义准确性标注标准，再统计有证据支持的结论比例。','不要把“有 URL”或“写作模型重新整理”说成事实正确性的保证。','120 到 180 为什么只能说明这个条件下吞吐提升 50%？',21],
 [1,'write_research_brief','State 是共享工作记录，更新是补丁','节点不需要返回整份 State。未更新的字段会被保留。','原状态：messages=[用户问题]。','返回：{ research_brief: "查显存与同条件吞吐" }。','一个节点只返回 research_brief，会把 messages 清空吗？','不会。LangGraph 按字段应用节点更新，未更新的字段保留。AgentInputState 只暴露 messages；内部 AgentState 还有简报、草稿和笔记等字段。','区分“图的输入 schema”“节点更新”“图最终输出”。TypedDict 描述类型，不自动构造运行时默认值，也不自动验证所有业务约束。','不要把节点返回的 dict 当成替换整个 State 的对象。','如果节点返回 {}，哪一个已有字段会消失？',0],
 [1,'supervisor_tools','同样是列表，合并规则也不一样','普通字段覆盖，笔记列表追加；消息列表还会根据消息 ID 处理更新。','notes=["显存规格"]；新增 notes=["吞吐测试"]。','合并：notes=["显存规格", "吞吐测试"]。','为什么要 reducer？重试后会不会产生重复笔记？','notes/raw_notes/quality_history 使用 operator.add；消息用 add_messages，同 ID 可替换，其他消息追加。这个项目把两路结果先在 supervisor_tools 内汇总，再统一写回。','append 本身不幂等。生产中可用稳定任务 ID、结果 ID 和按键合并来防重；并发写同一字段也需要明确 reducer，不能任意覆盖。','不能把 operator.add 说成自动去重，也不能说这里是 Send 节点并发写父状态。','同一份 notes 补丁被应用两次，结果有几份？',11],
 [1,'supervisor_subgraph','父子图有两种数据边界','Supervisor 共享主图的同名字段；Researcher 通过显式参数和返回值衔接。','ConductResearch：research_topic="核实显存"。','独立 ResearcherState → compressed_research → 父级 ToolMessage。','子 Agent 的消息历史会不会污染主 Agent？','researcher_agent.ainvoke 只收到 research_topic 和首条 researcher_messages。父级读取 compressed_research、raw_notes，并用原 tool_call_id 包装 ToolMessage；不把 researcher_messages 合进 supervisor_messages。','共享字段方便嵌入子图，显式适配更利于上下文隔离。Researcher 的输出 schema 包含消息，但父级当前没有使用这部分；Supervisor 私有评分字段也不属于主图 schema。','不要说所有 Agent 共用一个 messages，也不要说 researcher 输出只有两个字段。','子图研究摘要怎样对应回原来的 ConductResearch 调用？',20],
 [2,'llm_call','模型决定下一步，条件边决定去哪里','模型返回工具调用数据；它不会直接执行 Python 工具。','HumanMessage：核实 Atlas X / Y 显存。','AIMessage.tool_calls：tavily_search(query=...)。','ReAct 风格的循环在你的代码里具体是哪几步？','llm_call 生成 AIMessage；should_continue 检查 tool_calls。有调用就去 tool_node，没有就去 compress_research。tool_node 执行后固定返回 llm_call。','决策和执行分离，便于检查参数、记录过程、处理错误。should_continue 是条件边函数，不是独立注册节点。','think_tool 不是这里的循环路由器，也不是模型隐藏思考过程。','最新 AIMessage 没有 tool_calls 时，会直接结束还是先压缩？',3],
 [2,'tool_node','工具执行要与请求一一对应','tool_call_id 是一次工具请求与结果之间的关联标识。','AI 请求：id=search_A，name=tavily_search。','ToolMessage：tool_call_id=search_A，content=搜索结果。','一次模型返回两个工具调用，它们是并行执行的吗？','本项目 tool_node 用 for 循环逐个 tool.invoke，按相同 id 包装结果，所以单个 Researcher 内是串行执行。','有独立工具请求时可以并发，但要维持调用关联、限流与错误隔离；有数据依赖的工具必须顺序执行。跨 Researcher 的并发是另一个层级。','不要因为函数属于 LangGraph 就断言所有工具自动并行。','两路研究并发和一个 Researcher 内工具串行，矛盾吗？',4],
 [2,'search','搜索结果还要整理才能进入上下文','搜索工具会去重和摘要，但摘要也可能漏掉关键限制条件。','query：Atlas X Atlas Y memory specs。','合成摘要：X 48 GB，Y 80 GB，附来源。','网页很长、结果重复、甚至夹带指令，怎么处理？','tavily_search 内部检索、按 URL 去重、处理网页摘要，再格式化来源。有原文才做摘要；摘要出错时退回原文前 1000 字。','截断可能丢证据，摘要也可能失真。可保留证据片段与位置，把检索内容视作不可信资料，限制其影响工具权限，并构造提示注入测试集。','项目当前没有完整的检索内容信任隔离和注入防护闭环。','为什么保留 URL 还不足以追溯某个具体结论？',4],
 [2,'compress_research','研究结束后，交回一个有用的摘要','压缩是为了减少父级上下文，不是把所有研究日志都塞回去。','工具消息与 AI 消息：规格、吞吐、测试限制。','compressed_research：结论与来源；raw_notes：原始正文拼接。','压缩会不会丢失证据？你如何评估？','compress_research 用研究主题和历史调用压缩模型，同时保留 AI/Tool 消息正文为 raw_notes。父级用压缩摘要作为 ConductResearch 的工具结果。','可在有人工标注的题集上检查关键事实、引用、限制条件的保留率，并统计 token 节省。摘要更短不代表质量更高。','raw_notes 是消息正文串，不是完整的可回放调用日志。','“Y 快 50%”压缩后如果丢了测试条件，会有什么问题？',6],
 [3,'supervisor','先分清规划者和执行者','Supervisor 负责选动作；supervisor_tools 负责落实动作和更新状态。','已有草稿，还缺显存和同条件吞吐证据。','一条 AIMessage：两次 ConductResearch，分别研究规格与吞吐。','Supervisor 和 Researcher 的职责为什么不能混在一起？','supervisor 绑定 ConductResearch、ResearchComplete、think_tool、refine_draft_report，决定工作分配；Researcher 绑定搜索与反思工具，处理单个主题。','拆分便于控制上下文和观测瓶颈，但任务切分太细会增加协调成本。任务应有清晰范围、预期证据及完成条件，避免多个研究者重复查同一内容。','当前没有确定性的去重调度器，也没有任务依赖 DAG 自动求解。','如果“采购建议”依赖价格调研，它应和价格调研直接并行吗？',2],
 [3,'supervisor','Command 同时表达状态更新和跳转','这一轮“想好了什么”和“下一步去哪里”是两件事。','research_iterations=0，模型产生 tool_calls。','Command(update={迭代数:1, 新消息}, goto="supervisor_tools")。','Command、条件边、普通 add_edge 有什么区别？','这里 supervisor 返回 Command(goto, update)，同时更新状态和选择目的地；Researcher 用条件边读取状态来选路；固定阶段用 add_edge。源码中 supervisor → supervisor_tools 还注册了同向固定边。','设计时统一路由来源更清楚。Command 不会自动取消静态边；本例两者指向同一节点，不能据此推断多执行一轮，但若目的地不同就可能调度额外路径。','不要说 Command 会覆盖所有静态边；也别只看返回类型注解推断真实路由。','supervisor_tools 注解没列 red_team，为什么运行代码仍可能去它？',2],
 [3,'supervisor_tools','并发发生在 gather，限流却尚未落实','最多 3 路写在提示词里，当前代码没有硬性限制并发数量。','模型一次提出 5 个 ConductResearch。','当前代码：创建 5 个协程并交给 asyncio.gather。','你说最大并发是 3，模型返回 5 个怎么办？','max_concurrent_researchers=3 仅被格式化进 Supervisor 提示词。执行路径遍历全部调用并 gather，没有截断、信号量或队列。gather 的结果顺序与输入顺序一致，不是完成顺序。','可用 Semaphore/队列控制活跃任务，配合 RPM/TPM 与单任务超时。超额任务可排队，不能悄悄丢弃。同步 invoke 仍存在，应压测实际并发，不能只凭 ainvoke 名称判断吞吐。','不能把“有 asyncio.gather”说成全链路异步、线程并行或并发上限已经保证。','A 用时 2 秒、B 5 秒：理想并行为什么约 5 秒？哪些条件会让它更慢？',11],
 [3,'refine','同一批新研究，修稿看不到','本轮临时收集的工具结果，尚未写回进入节点时的 State。','同一个 tool_calls 同时包含 ConductResearch 和 refine。','研究结果在局部 tool_messages；findings 仍取旧 state 消息。','先研究后修稿，为什么修稿还拿不到刚查到的资料？','supervisor_tools 的执行顺序确实先研究后修稿，但 findings 从 state.supervisor_messages 提取。刚完成的结果仅在局部 tool_messages 中，直到返回 Command 才作为补丁提交。','可合并旧消息与本轮结果后构造 findings，或把研究与修稿拆成独立节点。涉及多次修稿还要使用最新草稿，并明确每一步的数据依赖。','不能把 Python 的执行先后等同于 LangGraph 状态已经提交。','为什么教程示例把研究与修稿分成两个 Supervisor 回合？',13],
 [3,'evaluate','评分是反馈信号，不是正确性证明','三个维度的均分控制修复提醒；下一轮决策仍由模型完成。','完整性 5、准确性 6、连贯性 4。','均分=5 < 6 → needs_quality_repair=true。','LLM 当裁判靠谱吗？低分之后真的保证继续修了吗？','evaluate_draft_quality 是普通函数，返回 EvaluationResult。supervisor_tools 算均分并写 quality_history；低于 6 设置提醒。supervisor 注入提醒后清零，但仍可以选择完成研究。','LLM 裁判可能有偏差，应以固定量表、人工标注样本和一致性评估校准。可为关键准确性设单独门槛，避免平均分掩盖事实错误；需要质量门禁时要写确定性路由。','不要把均分、红队 PASS 或一次提醒说成质量保证。源码阈值为 6，提醒文案写的是 7。','准确性只有 2，但其他两项是 10，平均分过线意味着可以上线吗？',13],
 [3,'red_team','批评能注入，但“已解决”闭环不完整','系统保留未解决批评，下一轮继续提示 Supervisor。','Critique：不能凭吞吐提升就断言性价比更高。','active_critiques 追加；critique_nums +1；addressed=false。','Red Team 和 Evaluator 有什么区别？批评什么时候清除？','Evaluator 按维度评分；red_team_node 查找论证缺陷并返回 Critique。Supervisor 把未 addressed 的批评注入模型上下文。当前没有把 addressed 改成 true 的逻辑。','可给批评稳定 ID，关联修复证据和复核结论，再更新处理状态。只凭修过一次稿就清除问题并不可靠；需要预算限制避免无效往返。','最多 3 次指的是产生批评的次数，不是必然只调用红队 3 次。PASS 子串或短响应也会返回空更新。','红队返回 {} 后，旧批评还会在下一轮注入吗？',14],
 [3,'supervisor_tools','停止条件要比“模型说完成”更可靠','退出检查先发生，质量分数没有直接阻止退出。','research_iterations=15；即使还有搜索调用。','直接 END，不执行本轮工具；notes 取历史 ToolMessage。','怎么防死循环？15 次限制到底数的是什么？','每次 supervisor 决策加 1；supervisor_tools 在 ≥15、无工具调用或含 ResearchComplete 时先结束。它数的是 Supervisor 回合，不是研究者数或搜索次数；第 15 回合已经不会执行工具。','还应增加总时长、token、费用和 Researcher 本地步数预算。tool_call_iterations 当前未使用；框架 recursion_limit 是额外保护，不能替代业务预算和明确结束原因。','不能说“最多 15 次搜索”，也不能说低分一定阻止结束。含 ResearchComplete 的同批其他工具也被跳过。','一条 AIMessage 同时有 ResearchComplete 和 ConductResearch，执行哪一个？',19],
 [4,'supervisor_tools','一个子任务失败，不该伪装成研究成功','先诚实说明当前失败路径，再谈如何做降级与恢复。','A 搜索成功；B 抛出异常。','gather 抛异常 → 外层 catch → END，返回旧消息里的 notes。','gather 中一个失败，其他任务会怎样？重试与恢复怎么做？','默认 gather 会向等待方传播异常，其他子任务不因此自动全部取消。这里外层捕获后结束子图，本批尚未合并的结果可能丢失；主图随后仍可能生成报告。图 compile() 未配置 checkpointer。','可逐任务封装成功/失败结果，保留成功证据，仅对可重试错误做带退避重试。设置任务截止时间和明确取消策略；引入持久化 checkpoint、稳定任务 ID 和幂等结果存储。外部副作用重试仍需防重。','不要声称已实现断点续跑、失败隔离或 exactly-once。return_exceptions=True 也需要调用方逐项处理。','A 成功结果为什么可能没进入最终 notes？',11],
 [4,'think','反思与更多调用，需要用收益证明','think_tool 只记录一段反思；多调用并不自动让系统更聪明。','reflection：显存已确认，还缺同条件吞吐数据。','Reflection recorded: 显存已确认，还缺同条件吞吐数据。','这个多 Agent 系统怎么衡量收益、成本和延迟？','think_tool 只是返回输入文本；项目有日志与质量记录，但本页没有生产效果数据。模型决策、搜索、摘要、压缩、写作和裁判都会引入成本。','用相同题集比较单 Agent 与当前流程，再做去掉红队/去掉反思的消融实验。观察人工事实正确率、引用支持率、完成率、每成功任务成本及 p50/p95 时延；按节点与任务 ID 记录 span。','不能把示例分数写成线上提升，也不要宣称并发数翻倍延迟就减半。','如果质量提高一点但费用翻倍，你如何决定是否保留红队？',2],
 [4,'supervisor_subgraph','把项目讲成可验证的工程实践','社招回答要能从设计下钻到源码、失败场景和验证方法。','问题：复杂研究需要多主题证据、统一结论和质量反馈。','设计：固定主流程 + Supervisor 循环 + 独立 Researcher。','用两分钟讲这个项目，以及你最想改的三个地方。','先讲问题与职责划分，再沿一次具体调用说明 State 和 ToolMessage 如何流动，最后指出 gather 限流、异常结束和批评状态没有闭环。只把自己实际完成并验证的部分描述为个人贡献。','优先级可按风险排序：硬预算与错误隔离 → 证据和批评闭环 → 基线评估与成本优化。每项说清触发场景、修改位置、验证用例和观察指标。','如果只是学习或二次开发，应明确身份；不要编造生产规模、个人主导经历或量化收益。','不看答案，口述“为什么这样设计—代码怎么做—哪里会失败—怎么验证改进”。',20]
].map((v,i)=>({id:i,chapter:v[0],node:v[1],title:v[2],takeaway:v[3],input:v[4],output:v[5],question:v[6],actual:v[7],improve:v[8],avoid:v[9],recall:v[10],trace:v[11]}));

// 这组内容来自用户导出的 LangSmith run，而不是教程里的合成 Atlas 示例。
// 把它单独放在课程数据旁边，讲解时可以明确区分“真实观测”和“为了好懂而缩小的例子”。
const langsmithRun={
  userQuestion:'我是个 AI 产品经理，想系统了解 Agent Memory 的短期/长期记忆、技术路线取舍，以及哪些方向值得投入。',
  supervisorMessages:31,
  researcherBatches:[
    '第一批 3 个并行主题：高级技术实现；工程落地与成熟度；未来演进与行业布局。',
    '第二批 1 个补充主题：向量 / 图谱 / 混合路线对比，记忆一致性与幻觉控制。',
    '第三批 1 个补充主题：面向产品经理的实施步骤与决策框架。'
  ],
  refinementScores:['8.67/10','8.0/10','8.67/10'],
  final:'最终报告约 3.7 万字；draft_report 约 5.7 万字；outputs 含 7 个字段。'
};

const followupBank={
  write_research_brief:[
    ['这次 run 的 research_brief 具体解决了什么问题？','它把“想了解 Memory”拆成架构分类、技术路线、路线取舍、工程落地、未来演进五块。这样 Supervisor 后面派任务时有边界，Evaluator 也有检查清单。'],
    ['如果简报写错了，后面会发生什么？','错误会一路传到拆题、研究和最终写作，因为当前代码没有单独的简报质量校验。面试时可以说：给简报加结构化字段和必填项检查，关键范围缺失就先停下来。']
  ],
  write_draft_report:[
    ['为什么先生成草稿再查资料？','草稿先搭出报告骨架，Supervisor 可以围绕“缺哪几块”派任务；这次 run 就是先读旧草稿，再发现混合记忆、工程落地和未来趋势的缺口。风险是草稿会把模型带偏，所以要把它当待验证假设。'],
    ['草稿会不会造成确认偏误？','会。改进方法是给每个结论标记“待验证”，同时安排反例或独立路线的研究，不要只让 Researcher 找支持材料。']
  ],
  supervisor:[
    ['这次 Supervisor 为什么先调用 think_tool？','真实 trace 里它先把旧草稿已经覆盖和缺失的部分列出来，再决定怎么补。think_tool 本身不思考，只是把模型写出的计划原样记录下来，真正的判断发生在 Supervisor 模型里。'],
    ['Supervisor 和 supervisor_tools 的边界是什么？','Supervisor 只做“选什么工具、下一步去哪”；supervisor_tools 才执行工具、启动 Researcher、修稿、评分并准备下一轮 State。把两者拆开后，路由和副作用更容易观测。'],
    ['一次调用多个 ConductResearch，结果怎么回到 Supervisor？','每个 Researcher 返回 compressed_research，父节点用原 tool_call_id 包成 ToolMessage，再追加到 supervisor_messages。这样下一次模型能知道每段结果对应哪个研究任务。']
  ],
  supervisor_tools:[
    ['真实 run 里的 3 个 Researcher 是怎么并发的？','代码把 3 个 researcher_agent.ainvoke 放进协程列表，交给 asyncio.gather 一起等待；gather 返回顺序跟输入顺序一致。当前没有 Semaphore，所以“最多 3 个”主要是提示词约束，不是硬限流。'],
    ['为什么第一次 8.67 分还不结束？','第一次评分认为五个维度基本覆盖，但指出技术路线的横向比较还不够突出。模型根据这条反馈又发起一次 ConductResearch，说明当前系统是“模型决定是否继续”，不是确定性质量门禁。'],
    ['3 次评分分别说明了什么？','真实 run 的分数是 8.67、8.0、8.67；它们反映 Evaluator 对覆盖、准确性、一致性的主观判断，不是准确率。第二次下降还暴露出来源可核验性和可读性问题。'],
    ['为什么最后一次修稿可能没看到同轮研究结果？','supervisor_tools 读取 findings 时用的是进入节点时的 state.supervisor_messages；本轮刚拿到的结果只在局部 tool_messages，返回 Command 后才写回。要修复就合并“旧消息 + 本轮结果”再生成 findings，或拆成两个节点。'],
    ['ResearchComplete 触发后还会执行同一条消息里的其他工具吗？','不会。代码先判断是否包含 ResearchComplete，只要命中就直接 END，其他 ConductResearch 或修稿调用也会被跳过。生产上应避免模型在同一条消息里混放互相冲突的结束和工作指令。'],
    ['一个 Researcher 失败，成功的两个结果会保留吗？','当前实现不保证：asyncio.gather 的异常会进入外层 catch，尚未合并的本轮结果可能丢失，然后子图直接结束。更稳的做法是逐任务返回 success/error，保留成功结果，只对可重试错误单独重试。'],
    ['quality_history 为什么用追加？有什么坑？','它用 operator.add 记录每一轮分数，方便画出 8.67 → 8.0 → 8.67 的变化；但追加不去重，重试可能产生重复记录。生产要用 run_id、iteration 和版本号做幂等键。'],
    ['active_critiques 什么时候算解决？','当前代码没有把 addressed 改成 true 的路径，红队返回 PASS 也不会清掉旧批评。面试时应指出这个闭环缺口：批评需要稳定 ID、修复证据和复核结果。']
  ],
  red_team:[
    ['Evaluator 和 Red Team 有什么区别？','Evaluator 给综合性、准确性、一致性打分；Red Team 直接挑论证漏洞。真实 run 里主要看到 Evaluator 的评分和理由，Red Team 机制在源码里存在，但这份导出的消息没有单独出现红队节点。'],
    ['红队返回 PASS 就代表可以上线吗？','不代表。PASS 只是模型没有输出超过阈值的批评，不能替代引用核验、事实校验和回归测试。']
  ],
  final_report_generation:[
    ['最终报告为什么会比 draft_report 短？','draft_report 约 56,666 个字符，最终报告约 37,450 个字符，说明最后写作阶段做了整理和压缩。长度变短不等于质量变高，还要看引用保留和关键结论是否完整。']
  ]
};

// 真实运行里最值得学习的几个 Supervisor 片段，直接覆盖课程中的示例文案。
Object.assign(lessons.find(x=>x.id===2),{
  input:'真实输入：已有一份 Memory 调研草稿，但缺高级实现、工程落地和未来趋势。',
  output:'Supervisor 一次提出 3 个 ConductResearch，三个主题可以互不等待。',
  question:'这次为什么能一次派 3 个 Researcher？',
  actual:'真实 run 里第一轮确实出现 3 个 ConductResearch；supervisor_tools 用 asyncio.gather 等它们回来，再把 3 个结果包装成 ToolMessage。',
  improve:'面试时补一句：代码把并发上限 3 写进提示词，但没有用 Semaphore 真正限流。',
  recall:'说出这 3 个主题分别是什么。'
});
Object.assign(lessons.find(x=>x.id===10),{
  input:'真实 run：Supervisor 看到旧草稿，先指出“混合记忆、工程落地、未来趋势”这些缺口。',
  output:'它先调用 think_tool，再决定一次派 3 个 ConductResearch。',
  question:'Supervisor 到底是在“思考”，还是在“执行”？',
  actual:'真实 run 里 supervisor 只负责选工具和下一步；真正执行搜索、等待子 Agent、修稿和评分的是 supervisor_tools。',
  improve:'面试时用一句话区分：Supervisor 做决定，工具节点干活。',
  recall:'第一轮为什么是 3 个研究任务，而不是 1 个大任务？'
});
Object.assign(lessons.find(x=>x.id===12),{
  input:'真实 run 第一轮：3 个 ConductResearch 同时启动。',
  output:'3 个长摘要回来后，Supervisor 再继续下一轮。',
  question:'并行的收益和代价是什么？',
  actual:'互不依赖的三个主题可以一起跑，省等待时间；代价是更多调用和更大的上下文。',
  improve:'代码还没有真正用 Semaphore 限流，提示词里的“最多 3 个”不是硬限制。',
  recall:'如果一次返回 5 个 ConductResearch，当前代码会怎么做？'
});
Object.assign(lessons.find(x=>x.id===0),{
  input:'真实输入：一名 AI 产品经理想了解 Agent Memory 的短期 / 长期记忆和投入方向。',
  output:'research_brief：拆成 5 个方向，明确要查架构、技术取舍、落地、评测和未来趋势。',
  question:'为什么先写 research_brief？',
  actual:'这次 run 的简报把一个大问题拆成五块，后面 Supervisor 才知道该派哪些研究任务。',
  improve:'面试时说清楚：简报是计划，不是最终结论。',
  recall:'真实 run 的简报要求了哪五个研究方向？'
});
Object.assign(lessons.find(x=>x.id===1),{
  input:'真实输入：先有一份约 4,216 字符的旧草稿，里面已经有 Memory 架构和技术路线的初步内容。',
  output:'草稿被放进 supervisor_messages，后面 Supervisor 先找缺口再派任务。',
  question:'为什么已经有草稿，还要再研究？',
  actual:'真实 run 里 Supervisor 先指出草稿缺少混合记忆、工程落地和未来趋势，再派 3 个研究 Agent 补齐。',
  improve:'一句话回答：草稿负责搭骨架，研究负责补证据和找反例。',
  recall:'这次第一轮研究补了哪三个大缺口？'
});
Object.assign(lessons.find(x=>x.id===10),{
  input:'真实 run：3 个研究结果已经回来了，下一步要把它们塞回草稿。',
  output:'3 个 ConductResearch 结果分别是 18,870、36,339、21,187 字符的长摘要。',
  question:'为什么研究结果要先变成 ToolMessage？',
  actual:'Supervisor 用原来的 tool_call_id 把每个 compressed_research 包成 ToolMessage，这样下一次模型调用能把“哪个任务的结果”对上。',
  improve:'如果结果很长，生产上还要做截断、引用保留和失败标记，不能只把字符串越堆越大。',
  recall:'3 个并行主题分别研究了什么？'
});
Object.assign(lessons.find(x=>x.id===13),{
  input:'真实 run 的第一次修稿后，Evaluator 给了 8.67/10，并指出技术路线横向对比还不够突出。',
  output:'Supervisor 没有立刻结束，而是又发起一轮“补对比数据”的研究。',
  question:'评分已经 8.67，为什么还要继续搜？',
  actual:'这次 run 里模型读到评语后，认为“向量 / 图谱 / 混合方案的准确性、召回、延迟、成本对比”还可以更完整，于是又调用 ConductResearch。',
  improve:'真实项目里要把“必须补齐的门槛”写成确定性规则，别完全依赖模型自己判断要不要继续。',
  recall:'8.67 分说明什么？它能证明事实都对吗？'
});
Object.assign(lessons.find(x=>x.id===14),{
  input:'真实 run：第二轮补充研究后，Evaluator 给 8.0/10，并担心部分 2026 来源难以核验。',
  output:'模型继续做了一轮产品经理实施框架研究，再次修稿得到 8.67/10。',
  question:'Evaluator 说“来源可能核验不了”，系统怎么处理？',
  actual:'这次代码只把 reason 放进 ToolMessage，让 Supervisor 自己决定下一步；没有自动验证 URL，也没有硬性阻止报告结束。',
  improve:'加来源校验、引用覆盖率和不可核验来源标记；关键事实低于门槛时走确定性返工。',
  recall:'这次 run 一共修稿几次？分数是多少？'
});
Object.assign(lessons.find(x=>x.id===15),{
  input:'真实 run：最后一次 think_tool 认为五个维度都覆盖，随后调用 ResearchComplete。',
  output:'supervisor_tools 看到 ResearchComplete，提取历史 ToolMessage，进入最终写作。',
  question:'ResearchComplete 是“模型说结束”还是代码保证质量？',
  actual:'它只是一个工具调用信号。代码看到它就结束 Supervisor 子图；这次运行没有额外的确定性质量门禁。',
  improve:'保留 ResearchComplete，同时加硬门槛：引用覆盖、关键事实核验、费用 / 时长预算和失败任务检查。',
  recall:'为什么 8.67 分仍不能等于“报告正确”？'
});
lessons.push({
  id:lessons.length,chapter:4,node:'supervisor_tools',title:'把这次真实运行讲成面试答案',
  takeaway:'面试官更关心你能不能把一次真实 trace 讲清楚，而不是背定义。',
  input:'问题：一次 Memory 调研为什么要经过多轮研究、修稿和评分？',
  output:'真实数据：3 个并行主题 → 3 次修稿；评分 8.67、8.0、8.67 → ResearchComplete。',
  question:'请用两句话讲清这次运行。',
  actual:'用户先生成简报和初稿；Supervisor 把缺口拆给 Researcher，汇总结果后修稿、打分，再根据评语补研究，最后结束。',
  improve:'再补一句风险：并发上限、异常恢复和引用核验仍要工程化，否则“跑完”不等于“可靠”。',
  avoid:'不要把 8.67 分说成准确率，也不要把一次成功 run 说成线上稳定性。',
  recall:'你能在 30 秒内说出：这次 run 的用户问题、三批研究和三个分数吗？',trace:20
});

// 以课程标题定位，避免前面按数组序号扩展课程后发生错位。
const byTitle=t=>lessons.find(x=>x.title===t);
Object.assign(byTitle('先分清规划者和执行者'),{
 input:'真实 run：Supervisor 先读旧草稿，列出缺口，再发起 3 个研究主题。',
 output:'它先用 think_tool 记下计划，再交给 supervisor_tools 执行。',
 question:'Supervisor 到底负责什么？',
 actual:'真实 trace 里 supervisor 负责选择工具和下一步；supervisor_tools 才负责启动子 Agent、修稿、评分和更新状态。',
 improve:'面试时说清边界：一个做决定，一个做执行。',
 recall:'为什么不让每个 Researcher 自己决定全局任务？'
});
Object.assign(byTitle('Command 同时表达状态更新和跳转'),{
 input:'真实 run：Supervisor 模型产出 tool_calls，同时要把 research_iterations 加 1。',
 output:'Command 同时带 update 和 goto="supervisor_tools"。',
 question:'Command 和普通条件边有什么区别？',
 actual:'Command 一次写状态补丁、一次决定去哪个节点；Researcher 的条件边只负责根据 tool_calls 选路。',
 improve:'如果路由规则能集中到一个地方，线上更容易排查；不要同时让静态边和 Command 指向不同目的地。',
 recall:'这次真实 run 里 Command 改了哪些字段？'
});
Object.assign(byTitle('并发发生在 gather，限流却尚未落实'),{
 input:'真实 run 第一轮：3 个 ConductResearch 同时启动。',
 output:'三个结果回来后，Supervisor 才进入下一轮修稿。',
 question:'代码真的保证最多 3 个并发吗？',
 actual:'没有。3 只是写进提示词的数字，代码会把模型返回的全部任务交给 asyncio.gather，没有 Semaphore 或队列。',
 improve:'生产环境应增加并发信号量、单任务超时和失败隔离，再用 p95 延迟和成功率验证。',
 recall:'如果模型一次返回 5 个任务，当前实现会怎样？'
});
Object.assign(byTitle('同一批新研究，修稿看不到'),{
 input:'真实 run：研究结果先回到 supervisor_tools 的局部变量。',
 output:'本轮结果要等 Command 返回后，才会进入下一次 State。',
 question:'为什么“代码先研究再修稿”不等于修稿能看到结果？',
 actual:'因为 findings 读取的是进入节点时的 state.supervisor_messages，刚拿到的结果还在局部 tool_messages 里。',
 improve:'把旧消息和本轮结果合并后再生成 findings，或干脆拆成研究节点和修稿节点。',
 recall:'这属于执行顺序问题，还是 State 提交边界问题？'
});
Object.assign(byTitle('评分是反馈信号，不是正确性证明'),{
 input:'真实 run：8.67 → 8.0 → 8.67，第二次评语担心部分来源难核验。',
 output:'模型又补了一轮产品经理实施框架研究，最后结束。',
 question:'为什么 8.67 分还不能说报告正确？',
 actual:'Evaluator 只是 LLM 裁判，分数代表它对完整性、准确性、一致性的判断，不是事实正确率。',
 improve:'关键事实应增加引用核验和确定性门槛，不能只靠平均分决定上线。',
 recall:'这次三次评分分别是什么？'
});
Object.assign(byTitle('批评能注入，但“已解决”闭环不完整'),{
 input:'源码设计：Red Team 发现问题后写入 Critique。',
 output:'下一轮 Supervisor 会把未 addressed 的批评放进系统提示词。',
 question:'Red Team 反馈什么时候算处理完？',
 actual:'当前代码没有把 addressed 改成 true 的路径，PASS 也不会自动清掉旧批评。',
 improve:'给批评加稳定 ID，记录修复证据和复核结果，确认后再标记解决。',
 recall:'Evaluator 和 Red Team 的分工分别是什么？'
});
Object.assign(byTitle('停止条件要比“模型说完成”更可靠'),{
 input:'真实 run：最后一条 AIMessage 调用 ResearchComplete。',
 output:'supervisor_tools 提取历史 ToolMessage，生成 15 条 notes 后结束。',
 question:'ResearchComplete 能保证报告质量吗？',
 actual:'不能，它只是模型发出的结束信号；当前代码看到它就结束，没有自动核验引用或失败任务。',
 improve:'加总时长、费用、引用覆盖和关键事实校验等硬门槛，再允许结束。',
 recall:'达到 research_iterations=15 时，当前代码会先执行工具还是直接结束？'
});

let lessonIndex=0,currentGraph='main',selected=steps[0],view='patch';
const $learn=id=>document.getElementById(id);
function shortText(text,max=2){
 const parts=String(text).split(/(?<=[。！？!?])\s*/).filter(Boolean);
 return parts.slice(0,max).join(' ')+(parts.length>max?'':'');
}
function element(tag,text,cls){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e}
function button(text,action){const b=element('button',text);b.type='button';b.onclick=action;return b}
function svgElement(tag,attrs){const e=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const[k,v]of Object.entries(attrs))e.setAttribute(k,v);return e}
function showLesson(index){
 lessonIndex=Math.max(0,Math.min(index,lessons.length-1));const l=lessons[lessonIndex],c=chapters[l.chapter];
 selected=helpers[l.node]?{...helpers[l.node],node:l.node,route:'返回调用方'}:steps[l.trace];
 currentGraph=c.graph;view='patch';$learn('trace-select').value=String(l.trace);
 for(const id of ['answer','details-state','reference','source-detail'])$learn(id).open=false;
 $learn('chapter-goal').textContent=c.goal;$learn('lesson-number').textContent=`第 ${l.chapter+1} 章 · 第 ${lessons.filter(x=>x.chapter===l.chapter).findIndex(x=>x.id===l.id)+1} 节`;
 $learn('lesson-title').textContent=l.title;$learn('takeaway').textContent=l.takeaway;
 $learn('node-name').textContent=l.node;$learn('mini-input').textContent=l.input;$learn('mini-output').textContent=l.output;
 $learn('question').textContent=l.question;$learn('actual').textContent=shortText(l.actual,2);$learn('improve').textContent=shortText(l.improve,1);$learn('avoid').textContent=shortText(l.avoid,1);$learn('recall').textContent=l.recall;
 $learn('node-detail').textContent=nodes[l.node][2];$learn('source').textContent='deep_research/'+nodes[l.node][1];
 $learn('course-prev').disabled=lessonIndex===0;$learn('course-next').disabled=lessonIndex===lessons.length-1;
 $learn('course-next').textContent=lessonIndex===lessons.length-1?'已到最后一节':lessonIndex<lessons.length-1&&lessons[lessonIndex+1].chapter!==l.chapter?'下一章 →':'下一节 →';
 $learn('position').textContent=`${lessonIndex+1} / ${lessons.length} 节`;
 $learn('chapters').replaceChildren(...chapters.map((chapter,i)=>{const b=button(`${i+1}. ${chapter.name}`,()=>showLesson(lessons.findIndex(x=>x.chapter===i)));b.setAttribute('aria-pressed',l.chapter===i);return b}));
 $learn('lesson-select').replaceChildren(...lessons.filter(x=>x.chapter===l.chapter).map(x=>{const o=element('option',x.title);o.value=x.id;return o}));$learn('lesson-select').value=l.id;
 renderFocus(l);renderState();renderBank(l);renderCase(l);drawGraph();
}
function renderCase(l){
 const runStage=l.chapter===0?'输入与初稿':l.chapter===1?'State 传递':l.chapter===2?'Researcher 执行':l.chapter===3?'Supervisor 循环':'一次真实 run 的工程复盘';
 const facts={
  '输入与初稿':'真实 run 的用户问题是 Memory 调研；输出先有 953 字符 research_brief，再带着一份约 4,216 字符旧草稿进入 Supervisor。',
  'State 传递':'最终 outputs 有 7 个字段；supervisor_messages 有 31 条，notes 有 15 条，raw_notes 有 5 条很长的原始记录。',
  'Researcher 执行':'第一轮 3 个子任务并行返回，摘要长度约 18,870、36,339、21,187 字符；之后又补了两轮定向研究。',
  'Supervisor 循环':'三次修稿评分是 8.67、8.0、8.67。第一轮评语说技术路线横向对比不够突出，第二轮又提醒部分 2026 来源难核验；最后模型调用 ResearchComplete，Supervisor 提取历史 ToolMessage 结束。',
  '一次真实 run 的工程复盘':'这次确实跑通，但仍不能证明线上可靠：来源没有自动核验，异常恢复和并发硬限流也没有实现。'
 };
 $learn('case-state').textContent=`当前课程站点：${runStage}\n${facts[runStage]}`;
}
function renderBank(l){
 const items=followupBank[l.node]||followupBank.supervisor_tools;
 const box=$learn('bank-list');box.replaceChildren(...items.map(([q,a],i)=>{const d=document.createElement('details');d.className='bank-item';const s=document.createElement('summary');s.textContent=`追问 ${i+1}：${q}`;const label=element('div','面试回答','label');const p=element('p',a);d.append(s,label,p);return d}));
}
function renderFocus(l){
 const scopes=l.chapter===2?['llm_call','tool_node','compress_research']:l.chapter>=3?['supervisor','supervisor_tools','red_team']:['write_research_brief','write_draft_report','supervisor_subgraph','final_report_generation'];
 const labels={write_research_brief:'明确需求',write_draft_report:'写初稿',supervisor_subgraph:'组织研究',final_report_generation:'写报告',llm_call:'决定动作',tool_node:'执行工具',compress_research:'压缩结果',supervisor:'规划',supervisor_tools:'执行 / 退出',red_team:'审查'};
 $learn('focus-flow').replaceChildren();
 scopes.forEach((node,i)=>{if(i)$learn('focus-flow').append(element('span','→','flow-arrow'));const b=button(labels[node],()=>{const target=lessons.find(x=>x.chapter===l.chapter&&x.node===node)||lessons.find(x=>x.node===node);showLesson(target.id)});b.title=node;b.setAttribute('aria-pressed',l.node===node||(['refine','evaluate','think'].includes(l.node)&&node==='supervisor_tools')||(l.node==='search'&&node==='tool_node'));$learn('focus-flow').append(b)});
 $learn('flow-caption').textContent=l.chapter===2?'有工具调用就继续循环；无工具调用才压缩。':l.chapter>=3?'普通工具后回规划；修稿后走审查，再回规划；满足退出条件则结束。':'先理解这四个阶段；内部循环放到后面的章节学习。';
}
function renderState(){
 const helper=!!helpers[selected.node];$learn('state-label').textContent=helper?'辅助调用的独立合成示例':`完整示例中的一次执行：${selected.label}`;
 $learn('io-tabs').replaceChildren(...[['input',helper?'调用参数':'输入 State'],['patch',helper?'返回值':'输出更新'],['after',helper?'调用方处理':'合并后 State']].map(([key,label])=>{const b=button(label,()=>{view=key;renderState()});b.setAttribute('aria-pressed',view===key);return b}));
 $learn('json').textContent=JSON.stringify(selected[view],null,2);$learn('merge-note').textContent=(selected.note||'')+(helper?'':' 节点返回的是字段更新；未更新字段保留。消息元数据在此简化展示。');
}
function drawGraph(){
 const d=defs[currentGraph];$learn('graph-title').textContent=d.sub;$learn('graph-note').textContent=d.note;
 $learn('graph-tabs').replaceChildren(...Object.entries(defs).map(([key,v])=>{const b=button(v.title,()=>{currentGraph=key;drawGraph()});b.setAttribute('aria-pressed',currentGraph===key);return b}));
 const canvas=$learn('canvas');canvas.replaceChildren();const svg=svgElement('svg',{viewBox:'0 0 670 540','aria-hidden':'true'}),def=svgElement('defs',{}),marker=svgElement('marker',{id:'arrow',viewBox:'0 0 10 10',refX:9,refY:5,markerWidth:7,markerHeight:7,orient:'auto-start-reverse'});marker.append(svgElement('path',{d:'M0 0 L10 5 L0 10z',fill:'#a5b5ca'}));def.append(marker);svg.append(def);
 function edge(path,label,x,y,kind){svg.append(svgElement('path',{d:path,class:kind==='call'?'edge invoke':'edge','marker-end':'url(#arrow)'}));if(label){const t=svgElement('text',{x,y,class:'edge-label'});t.textContent=label;svg.append(t)}}
 for(const[x1,y1,x2,y2,label,kind]of d.edges)edge(`M${x1} ${y1} L${x2} ${y2}`,label,(x1+x2)/2+8,(y1+y2)/2-5,kind);
 for(const[p,l,x,y]of d.paths||[])edge(p,l,x,y);canvas.append(svg);
 for(const[id,label,x,y]of d.nodes){const terminal=id==='start'||id==='end',b=element(terminal?'div':'button',undefined,'node'+(terminal?' terminal':'')+(helpers[id]||id==='research_link'?' helper':''));b.style.left=x+'px';b.style.top=y+'px';b.append(element('strong',terminal?label:id==='research_link'?'researcher_agent.ainvoke':id));if(!terminal){b.type='button';b.append(element('span',label));b.onclick=()=>{if(id==='research_link'){currentGraph='research';drawGraph();return}const target=lessons.find(l=>l.node===id);showLesson(target.id);$learn('lesson-title').scrollIntoView({block:'start',behavior:'instant'})}}canvas.append(b)}
}
$learn('course-prev').onclick=()=>showLesson(lessonIndex-1);$learn('course-next').onclick=()=>showLesson(lessonIndex+1);$learn('lesson-select').onchange=e=>showLesson(Number(e.target.value));
for(const row of fields){const tr=element('tr');for(const c of row)tr.append(element('td',c));$learn('fields').append(tr)}
steps.forEach((s,i)=>{const option=element('option',s.label);option.value=i;$learn('trace-select').append(option)});
$learn('trace-select').onchange=e=>{selected=steps[Number(e.target.value)];view='patch';renderState();$learn('details-state').open=true;$learn('details-state').scrollIntoView({block:'start',behavior:'instant'})};
showLesson(0);
