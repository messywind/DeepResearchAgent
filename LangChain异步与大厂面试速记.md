# LangChain `invoke`/`ainvoke` 与大厂面试速记

> 从 `get_chat_model()` / `.invoke` / `.ainvoke` 出发,梳理大厂常考的 asyncio、并发编排、抽象设计与高并发系统设计。

---

## 0. 三个引子概念

- **`get_chat_model()`**:通常是项目里**自定义的工厂函数**(非 LangChain 官方 API)。根据配置(模型名、API key、temperature 等)构造并返回一个 chat model 实例。返回的对象才是能调用大模型的东西。
- **`.invoke(input)`**:Runnable 接口的**同步**调用。阻塞等待,直到模型返回结果。
- **`.ainvoke(input)`**:对应的**异步**版本(`a` = async)。返回 coroutine,必须 `await`,适合并发 / Web 服务 / 高吞吐场景。

| | `.invoke` | `.ainvoke` |
|---|---|---|
| 类型 | 同步 | 异步 |
| 调用 | `r = x.invoke(...)` | `r = await x.ainvoke(...)` |
| 场景 | 普通脚本、顺序逻辑 | 并发、Web 服务、高吞吐 |

一句话:`get_chat_model()` **造出模型对象**,`invoke`/`ainvoke` **用它去请求模型**。

---

## 一、Python 异步基础(最常问)

### 1. `async`/`await` 本质;协程 vs 线程 vs 进程
- **协程(coroutine)**:一个**可以暂停和恢复的函数**。执行到 `await`(耗时 IO)就让出 CPU,结果回来再从此处继续。
- **进程**:OS 分配资源的单位,独立内存,切换开销最大。
- **线程**:进程内执行单元,共享内存,OS 调度,需考虑锁。
- **协程**:单线程内由**事件循环**调度,切换极轻量,可开几万个。

> 进程/线程是"操作系统帮你切",协程是"你在一个线程里主动让出"。

### 2. 异步加速的是 IO 密集还是 CPU 密集?
**IO 密集。**
- IO 密集 = 大部分时间在**等**(网络/磁盘/DB)。调 LLM 就是典型,等待期间 CPU 闲着,异步可利用间隙处理别的请求。
- CPU 密集 = 一直在**算**,没有等待间隙,异步帮不上;要用**多进程**。

### 3. 事件循环怎么工作?单线程为何能"并发"?
事件循环是一个**大 while 循环** + 任务队列:挑可运行任务去跑 → 遇 `await` 就挂起 → 转去跑别的 → IO 完成再唤醒对应任务。
- 同一时刻只有一个任务真正执行,但大家"等 IO"时都让出时间,宏观上多任务像同时推进。
- 这是**并发(concurrency)**,不是**并行(parallelism)**(并行是多核真正同时跑)。

### 4. 忘了 `await` 会怎样?
```python
result = model.ainvoke("你好")   # ❌ 忘了 await
```
`ainvoke` 不会真正执行,`result` 只是个 **coroutine 对象**;使用会报错,并打印 warning:`coroutine was never awaited`。

### 5. GIL 是什么?为何异步不受影响、多线程做 CPU 受影响?
GIL(全局解释器锁):CPython 中**同一时刻只允许一个线程执行 Python 字节码**。
- 多线程做 **CPU 密集**:线程互相抢锁,等于白开 → 用**多进程**绕过。
- IO 操作在等待时会**释放 GIL**,所以多线程做 **IO 密集**有效。
- 异步是**单线程**,无抢锁问题,靠"主动让出"并发,与 GIL 不冲突 → 对 IO 密集比多线程更轻量高效。

---

## 二、并发编排(考工程能力)

### 6. 10 个子任务同时请求模型
```python
# ❌ 串行:总耗时 = 10 个之和
for x in inputs:
    r = await model.ainvoke(x)

# ✅ 并发:总耗时 ≈ 最慢的那个
results = await asyncio.gather(*[model.ainvoke(x) for x in inputs])
```

### 7. 限制并发数(API 有 QPS 限制)
```python
sem = asyncio.Semaphore(5)          # 最多 5 个同时跑

async def call(x):
    async with sem:                 # 拿不到令牌就排队
        return await model.ainvoke(x)

results = await asyncio.gather(*[call(x) for x in inputs])
```

### 8. 超时、重试、异常隔离
```python
# 超时
r = await asyncio.wait_for(model.ainvoke(x), timeout=10)

# 异常隔离:一个失败不影响其他,失败项以异常对象形式返回
results = await asyncio.gather(*tasks, return_exceptions=True)
# 默认不加该参数时,任一异常会导致 gather 整体失败
```
重试:用 `tenacity` 等装饰器,自动重试 + 指数退避。

### 9. 同步调异步 / 异步里调阻塞同步函数
- **同步里跑异步**:`asyncio.run(main())` 启动事件循环。
- **异步里调了阻塞同步函数**(如 `time.sleep`、同步 `requests.get`):⚠️ **会卡死整个事件循环**!单线程被阻塞,无法切去别的任务,所有并发全停。
  - 正确:用异步版本(`asyncio.sleep`、`httpx` 异步客户端),或丢线程池:`await asyncio.to_thread(阻塞函数, 参数)`。

---

## 三、抽象设计(考对框架的理解)

### 10. 为何 LangChain 设计 Runnable 统一接口?
所有组件(模型/prompt/检索器/chain)都实现同一套方法(`invoke`/`batch`/`stream` + async 版),从而**像乐高一样拼接**。LCEL 用 `|` 串联:
```python
chain = prompt | model | output_parser
chain.invoke({"question": "..."})
```
收益:可组合、可替换、并发/流式能力自动继承。

### 11. `invoke / batch / stream / ainvoke / abatch / astream` 关系
三种用法 × 同步/异步:
- `invoke`:一个输入 → 一个完整结果。
- `batch`:一批输入 → 内部并发 → 一批结果。
- `stream`:流式,逐 token 吐出(生成器)。
- 前缀 `a` = 异步版本,需 `await` 或 `async for`。

### 12. 流式(streaming)怎么实现?为何用 `astream`?
- 模型逐 token 生成,流式即**生成一个推一个**;底层是 HTTP 的 SSE / 分块传输。
- 用 `astream` 是为**体验**:文字一点点冒出,几百毫秒即见响应;异步还能推流的同时不阻塞其他请求。
```python
async for chunk in model.astream("讲个故事"):
    print(chunk.content, end="")
```

---

## 四、系统设计(资深岗)

### 13. 高并发 LLM 网关/Agent 服务(QPS 上千)怎么扛?
- **异步 IO**:全链路 async,单机扛大量并发连接。
- **限流**:令牌桶/漏桶,保护下游模型 API。
- **缓存**:相同/语义相似请求走缓存,省钱又快。
- **连接池 + 批处理**:复用连接,合并 batch。
- **降级容错**:主模型超时/失败 → 重试 / 切备用模型 / 兜底结果。
- **水平扩展**:多实例 + 负载均衡。
- **可观测性**:监控延迟、失败率、token 消耗。

### 14. 为何 FastAPI 里推荐 `ainvoke` 而非 `invoke`?
FastAPI 靠少量 worker 处理大量请求。同步 `invoke` 会**阻塞 worker 好几秒**(等模型),期间该 worker 无法处理任何请求,并发崩溃;`ainvoke` 在等待期间**释放 worker** 去处理别的请求,吞吐更高。
```python
@app.post("/chat")
async def chat(q: str):
    return await model.ainvoke(q)   # 等待期间不占用 worker
```

---

## 核心一句话
大厂考的不是"会不会用",而是:**懂不懂异步为什么快、什么时候用、怎么会翻车,以及怎么放进高并发系统里。**

准备重点:asyncio 事件循环、`gather` 并发、`Semaphore` 限流、**阻塞卡死事件循环**这个陷阱、Runnable 统一接口、FastAPI 用异步的理由。
