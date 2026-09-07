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

let lessonIndex=0,currentGraph='main',selected=steps[0],view='patch';
const $learn=id=>document.getElementById(id);
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
 $learn('question').textContent=l.question;$learn('actual').textContent=l.actual;$learn('improve').textContent=l.improve;$learn('avoid').textContent=l.avoid;$learn('recall').textContent=l.recall;
 $learn('node-detail').textContent=nodes[l.node][2];$learn('source').textContent='deep_research/'+nodes[l.node][1];
 $learn('course-prev').disabled=lessonIndex===0;$learn('course-next').disabled=lessonIndex===lessons.length-1;
 $learn('course-next').textContent=lessonIndex===lessons.length-1?'已到最后一节':lessonIndex<lessons.length-1&&lessons[lessonIndex+1].chapter!==l.chapter?'下一章 →':'下一节 →';
 $learn('position').textContent=`${lessonIndex+1} / ${lessons.length} 节`;
 $learn('chapters').replaceChildren(...chapters.map((chapter,i)=>{const b=button(`${i+1}. ${chapter.name}`,()=>showLesson(lessons.findIndex(x=>x.chapter===i)));b.setAttribute('aria-pressed',l.chapter===i);return b}));
 $learn('lesson-select').replaceChildren(...lessons.filter(x=>x.chapter===l.chapter).map(x=>{const o=element('option',x.title);o.value=x.id;return o}));$learn('lesson-select').value=l.id;
 renderFocus(l);renderState();drawGraph();
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
