# 菜单翻译助手 · PROJECT_PLAN

> 状态：v0.2 · 2026-05-11 · 进入阶段 1
> 本文档与 `TODO.md` 配套阅读。本文聚焦「为什么这么做」，TODO 聚焦「具体做什么」。

---

## 0. 项目定位（首要目标）

**这是一个作品集项目（portfolio），求职用，附带自用功能。**

这个定位决定后续所有取舍：

| 决策点 | 偏向 |
|---|---|
| 工程深度 vs 功能广度 | **深度优先**——技术亮点写得清楚比 feature 多更值钱 |
| 通用方案 vs 私有黑科技 | **通用 + 抽象**——多供应商 LLM、可切换 key、记账等"工程素养"信号 |
| README | **作品集页面**，不是开发文档（demo 链接 / 截图 / 设计亮点 / 技术栈说明） |
| 部署 | **必须有 public demo URL**，30 秒内可点击体验 |
| Commit 历史 | **conventional commits**，从阶段 1 第一个 commit 开始（面试官会翻 git log） |
| 命名 | 不叫 `my-app` `test-project`，要有可记忆的 product 名字 |
| 代码注释 | 关键决策点写 `// WHY: ...` 注释，方便面试时讲解 |

**质量基线**：面试官点开 GitHub 仓库，**30 秒内**应能（a）看懂这是什么产品，（b）找到 demo 链接点击试用，（c）判断开发者掌握哪些技术栈。**30 秒看不明白 = 失败。**

被这个定位影响最重的几节：
- §3 技术栈：保留多供应商抽象，不为了简单砍掉
- §7 阶段 5：扩展为 5.1–5.9，含部署、README 重写、加分项
- §12 成本与计费：对面试官是"工程素养"信号

---

## 1. 产品一句话

> 拍一张外文菜单 → 每道菜识别、意译、解释、配图、口味雷达图、过敏警示。

目标用户：境外旅行/工作/留学的中文母语者，主用移动端。

---

## 2. 架构总览

```mermaid
flowchart LR
  subgraph Client["前端 PWA (React + Vite)"]
    UI[菜单上传页]
    Cards[菜品卡片]
    Profile[用户档案]
    History[历史记录]
    SW[Service Worker]
  end

  subgraph Server["后端 (Node + Express)"]
    API[/api/*]
    LLM[LLM Service]
    Allergen[过敏比对服务]
    Img[图片搜索/缓存]
    Auth[Auth 中间件]
    RL[Rate Limit]
  end

  subgraph External
    Claude[Anthropic Claude]
    Unsplash[Unsplash API]
  end

  subgraph Storage
    SQLite[(SQLite)]
    FS[(本地图片缓存)]
  end

  UI -->|图片| API
  API --> LLM --> Claude
  API --> Allergen --> SQLite
  Cards -->|关键词| API
  API --> Img --> Unsplash
  Img --> FS
  Profile --> API --> SQLite
  History --> API --> SQLite
  Auth --> SQLite
  SW -.缓存静态资源.-> Client
```

**核心数据流（拍照 → 卡片）：**

```
[拍照] → [前端压缩图] → POST /api/analyze-menu (multipart)
    → [后端 hash 去重] → [Claude tool_use 强 schema]
    → [Zod 校验 + 后处理过敏关键词兜底] → [入库 history]
    → 返回结构化 JSON
[前端] → 渲染卡片 → 各卡片懒加载 GET /api/dish-image?q=...
    → [后端缓存命中? 返回 : 调 Unsplash 缓存后返回]
```

---

## 3. 技术选型（最终）

| 层 | 选型 | 理由 / 说明 |
|---|---|---|
| 前端框架 | React 18 + Vite + TypeScript | 你建议；标配 |
| 样式 | Tailwind CSS | 你建议；移动端响应式快 |
| PWA | `vite-plugin-pwa` (Workbox) | 自动生成 manifest + SW，API 走 NetworkFirst |
| 客户端状态 | Zustand | 比 Redux 轻；只放用户档案、当前菜单这种小状态 |
| 服务端状态 | TanStack Query (React Query) | 自带缓存/重试/去抖，分析接口的天然搭档 |
| 表单 | React Hook Form + Zod | 用户档案表单校验 |
| 雷达图 | Recharts | 你建议；6 维 RadarChart 现成 |
| 图片压缩 | `browser-image-compression` | 客户端先压到 ≤1MB，省 token、省带宽 |
| 路由 | React Router v6 | 标配 |
| 后端语言 | Node.js + Express + TypeScript | **故意不选 FastAPI**，前后端共享 TS 类型，单语言团队心智负担低 |
| Schema 校验 | Zod | 同时给前端 form 和后端 LLM 输出复用 |
| 数据库 | better-sqlite3（开发）→ Postgres（生产） | 你建议；SQL 用 Drizzle ORM（轻、TS 友好） |
| 文件上传 | Multer (内存模式) | 不落盘，处理完即丢，符合隐私 |
| 鉴权 | bcrypt + JWT (HttpOnly cookie) | MVP 简单；后续可加 OAuth |
| LLM (默认) | Anthropic Claude Sonnet 4.6 | 多模态 + 强制结构化输出（tool_use） |
| LLM 抽象 | **供应商中立** `LLMProvider` 接口 + 三个 adapter | 接口只暴露业务语义 `analyze(images, opts)`，不裸露 `tool_use` 这种供应商专有词；阶段 2 完整实现 Anthropic、骨架 + TODO 实现 OpenAI / Gemini；详见 §5 |
| LLM 选择 | `LLM_PROVIDER` env 变量切换：`anthropic` / `openai` / `gemini` | 默认 `anthropic`；接口接受可选 `apiKey` 参数支持「用户自带 key」（详见 §12） |
| 图片搜索 | Unsplash Search API | MVP 够；冷门菜会未命中（见风险） |
| 速率限制 | `express-rate-limit` + Redis（生产）/ 内存（开发） | 防滥用 |
| 部署 | 开发本地双端口（5173/3000）；生产前端 Vercel/CF Pages，后端 Fly.io/Render | 阶段 5 末再定 |
| 测试 | Vitest（前后端）+ Playwright（E2E，可选） | 阶段 2 加 LLM 输出快照测试 |

---

## 4. 目录结构

```
menu-translator/
├── PROJECT_PLAN.md
├── TODO.md
├── README.md                     # 阶段 1 末添加
├── .env.example
├── .gitignore
├── package.json                  # workspaces 根
│
├── shared/                       # 前后端共享 TS 类型 + Zod schema
│   ├── src/
│   │   ├── dish.schema.ts        # LLM 输出的 Zod schema (单一事实源)
│   │   ├── allergen.ts           # 9 大过敏原常量与中文映射
│   │   ├── dietary.ts            # 饮食标签常量
│   │   └── index.ts
│   └── package.json
│
├── backend/
│   ├── src/
│   │   ├── index.ts              # 入口
│   │   ├── app.ts                # express app 装配
│   │   ├── config.ts             # env 读取与校验 (Zod)
│   │   ├── routes/
│   │   │   ├── health.ts
│   │   │   ├── analyzeMenu.ts    # POST /api/analyze-menu
│   │   │   ├── dishImage.ts      # GET  /api/dish-image
│   │   │   ├── auth.ts           # /api/auth/{register,login,logout,me}
│   │   │   ├── profile.ts        # GET/PUT /api/profile
│   │   │   └── history.ts        # GET /api/history, GET /api/history/:id
│   │   ├── services/
│   │   │   ├── llm/
│   │   │   │   ├── provider.ts   # interface LLMProvider (供应商中立)
│   │   │   │   ├── anthropic.ts  # Claude adapter (阶段 2 完整实现)
│   │   │   │   ├── openai.ts     # GPT-4o adapter (骨架 + TODO)
│   │   │   │   ├── gemini.ts     # Gemini adapter (骨架 + TODO)
│   │   │   │   ├── pricing.ts    # 多供应商单价表 + estimateCost
│   │   │   │   └── index.ts      # 工厂：按 LLM_PROVIDER env 选 adapter
│   │   │   ├── allergen.ts       # dish vs profile 比对 + 关键词兜底
│   │   │   ├── llmAccounting.ts  # 写 llm_calls 表
│   │   │   ├── imageSearch.ts    # Unsplash 调用 + 本地缓存
│   │   │   └── hash.ts           # 图片 sha256 用于去重缓存
│   │   ├── middleware/
│   │   │   ├── auth.ts
│   │   │   ├── rateLimit.ts
│   │   │   └── errorHandler.ts
│   │   ├── db/
│   │   │   ├── client.ts         # Drizzle 初始化
│   │   │   ├── schema.ts         # users / profiles / menus / dishes / image_cache
│   │   │   └── migrations/
│   │   ├── prompts/
│   │   │   ├── analyze-menu.v1.md   # 主 prompt，markdown 形式
│   │   │   ├── analyze-menu.v1.ts   # 导出 prompt 字符串 + tool 定义
│   │   │   └── README.md            # prompt 改动记录
│   │   └── utils/logger.ts
│   ├── tests/
│   │   ├── fixtures/
│   │   │   ├── menu-french.jpg      # 测试用固定菜单
│   │   │   └── menu-french.expected.json
│   │   ├── llm.spec.ts
│   │   └── allergen.spec.ts
│   ├── tsconfig.json
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── main.tsx
    │   ├── App.tsx
    │   ├── routes.tsx
    │   ├── pages/
    │   │   ├── HomePage.tsx          # 上传入口
    │   │   ├── ResultsPage.tsx       # 卡片列表
    │   │   ├── ProfilePage.tsx       # 过敏/饮食/口味
    │   │   ├── HistoryPage.tsx
    │   │   ├── LoginPage.tsx
    │   │   └── RegisterPage.tsx
    │   ├── components/
    │   │   ├── MenuUploader.tsx
    │   │   ├── DishCard.tsx
    │   │   ├── AllergenWarning.tsx
    │   │   ├── FlavorRadar.tsx
    │   │   ├── ConfidenceBadge.tsx
    │   │   ├── AllergenPicker.tsx    # FDA 9 大复选
    │   │   └── ui/                   # 通用按钮、卡片、Toast
    │   ├── hooks/
    │   │   ├── useAnalyzeMenu.ts
    │   │   ├── useDishImage.ts
    │   │   ├── useAuth.ts
    │   │   └── useProfile.ts
    │   ├── services/api.ts           # 封装 fetch
    │   ├── store/
    │   │   ├── authStore.ts
    │   │   └── profileStore.ts
    │   ├── utils/compress.ts
    │   └── styles/index.css
    ├── public/
    │   ├── icons/                    # PWA 图标
    │   └── manifest.webmanifest
    ├── index.html
    ├── vite.config.ts
    ├── tailwind.config.ts
    └── package.json
```

---

## 5. LLM 调用方式（重要）

**多供应商抽象 + 主供应商 Anthropic Claude `tools` 字段强制结构化输出**：

### 5.1 接口契约（供应商中立）

```ts
interface LLMProvider {
  readonly name: 'anthropic' | 'openai' | 'gemini';
  readonly defaultModel: string;
  analyze(images: Buffer[], opts?: {
    apiKey?: string;
    userId?: string | null;
    signal?: AbortSignal;
  }): Promise<{
    result: AnalyzeMenuResult;
    usage: { inputTokens: number; outputTokens: number };
    model: string;
    keySource: 'server' | 'user';
    estimatedUsd: number;
  }>;
}
```

业务路由只调 `provider.analyze(...)`，**不感知**底下走哪家。

### 5.2 各供应商 adapter 实现策略

| 供应商 | 阶段 2 | 结构化输出手段 | Token 字段映射 |
|---|---|---|---|
| Anthropic Claude | **完整实现** | `tools` + `tool_choice` 强制工具调用 | `usage.input_tokens` → `inputTokens` |
| OpenAI GPT-4o | **骨架 + TODO** | `response_format: json_schema`（structured outputs） | `usage.prompt_tokens` → `inputTokens` |
| Google Gemini | **骨架 + TODO** | `responseSchema` + `responseMimeType: application/json` | `usageMetadata.promptTokenCount` → `inputTokens` |

骨架实现意味着：文件存在、接口实现、`throw new Error("not implemented yet")`，但单价表 + 类型映射逻辑完整写好。这样作品集说"已抽象多供应商"是真的、可验证的，不是空话。

### 5.3 通用约束（在主 prompt 文件保证）

1. 主 prompt `backend/src/prompts/analyze-menu.v1.md` **保持中立**，不用任何供应商特有提示词技巧。
2. 各 adapter 内部如需要拼接供应商特有 prefix（如 Gemini 对 system prompt 处理不同），在 adapter 内做，主 prompt 不动。
3. 每次大改 prompt 版本号 +1，旧版保留。

### 5.4 共通处理

1. 每个 adapter 内部把响应解析为统一的 `AnalyzeMenuResult`，**用 Zod 再校验一遍**（LLM 偶尔会偷懒；不通过则一次性 retry，附带错误信息让模型自纠）。
2. **过敏关键词兜底**（在 LLM 之外的 service 层）：维护中英双语 `ingredient → allergen` 词表，遍历 dish.ingredients，如果命中而 LLM 漏标，自动补上并在 `warnings` 中追加说明。**保守优先：宁可误报。**
3. **多图处理**：同一个 request 把多张图作为多个 image content block 送入同一次调用。

### 5.5 成本相关的 prompt 硬约束

- Prompt 中明确写「**一次调用返回菜单中所有菜，不要分多轮对话**」，避免上下文重传翻倍 token。
- Schema 中 `description` 字段 **硬上限 100 字**（覆盖需求里的 50–100），prompt 显式声明，超出请压缩。中文越写越长是开销失控的常见来源。
- 设置 `max_tokens` / 等价参数（建议 4096），各 adapter 内硬截断，超出直接判定异常并提示用户重试。

---

## 6. 数据库 schema 草图

```
users(id, email, password_hash, created_at)
profiles(user_id PK/FK,
         allergens JSON,           -- ["shellfish", ...]
         dietary JSON,             -- ["vegetarian", "no_pork"]
         flavor_prefs JSON,        -- {"spicy_max": 2, ...}
         updated_at)
menus(id, user_id, image_hash, created_at, language_detected)
dishes(id, menu_id, payload JSON, confidence, position)
image_cache(query_hash PK, url, fetched_at)
llm_calls(id, user_id NULL, created_at,
          call_type,             -- "analyze_menu" | "recommend" (阶段 5.8) | ...
          provider,              -- "anthropic" | "openai" | "gemini"
          model,                 -- "claude-sonnet-4-6" / "gpt-4o" / "gemini-1.5-pro"
          input_tokens, output_tokens,
          estimated_usd,         -- 浮点，按 provider+model 单价表估算
          key_source,            -- "server" | "user"
          cache_hit BOOLEAN,     -- true 时其它字段为 0
          status)                -- "ok" | "error" | "rate_limited"
```

> 阶段 4 加密：`profiles.allergens / dietary` 视为健康数据。MVP 阶段先做 SQLite 文件权限 + bcrypt 密码；生产阶段加列级加密（pgcrypto / app 层 AES）。

---

## 7. 五阶段路线 + 时间估计

| 阶段 | 范围 | 估时（一人开发） | 验收点 |
|---|---|---|---|
| 1 · 骨架 | 工程脚手架，前端访问 `/api/health` 200，env 配齐，git init + 首次 conventional commit | 0.5–1 天 | 浏览器看到「Backend OK」 |
| 2 · 核心翻译 | 上传 → LLM（多供应商抽象，Anthropic 完整 + OpenAI/Gemini 骨架）→ 卡片（无图无警示） | 2–3 天 | fixture 跑通；切 `LLM_PROVIDER=openai` 报"未实现"但不崩 |
| 3 · 用户档案 | 注册登录 + 过敏/饮食/口味设置 | 1.5–2 天 | 设置可保存、刷新还在 |
| 4 · 警示 | dish ∩ profile 比对 + 红色警示条 + 低置信度提示 | 1 天 | 含贝类菜对贝类过敏用户出红条 |
| 5 · 作品集化 | 拆 5.1–5.9：配图、雷达、历史、打磨、**部署、README 重写、加分项** | 3–5 天 | demo URL 可点击；README 30 秒看懂 |

### 阶段 5 拆解（作品集化是核心目标）

| 子阶段 | 内容 | 优先级 |
|---|---|---|
| 5.1 | 配图（Unsplash + 三级回退） | P0 |
| 5.2 | 口味雷达图（Recharts） | P0 |
| 5.3 | 历史记录页 | P0 |
| 5.4 | UI 打磨（loading/error/empty/PWA/移动端 + 激活 L2 月度配额） | P0 |
| 5.5 | **部署 demo**（Vercel 前端 + Fly.io 后端 + demo 严格限流 + 预设示例账号） | **P0**（作品集必须） |
| 5.6 | **README 作品集化重写**（hero / 截图 / 架构图 / 设计亮点 / 中英双语） | **P0**（作品集必须） |
| 5.7 | **Conventional commits 规范**（从阶段 1 第一个 commit 起执行） | **P0**（贯穿全程） |
| 5.8 | 加分项：智能推荐（多任务 LLM 编排） | P1（有时间则做） |
| 5.9 | 加分项：原文 + 拼音/罗马音 + 复制原文功能 | P1（有时间则做） |

合计：~10–15 天有效开发时间（比 v0.1 增加 3–5 天，多在 5.5 部署 + 5.6 README）。

---

## 8. 风险与应对

| # | 风险 | 影响 | 应对 |
|---|---|---|---|
| R1 | LLM 漏标过敏原（漏报） | **健康风险** | Zod 校验 + 中英食材→过敏词表后处理兜底；`prompts/` 中明确「保守优先」；卡片始终带「请向服务员核实」免责语 |
| R2 | LLM 输出 schema 漂移 | 卡片渲染挂 | 强制 tool_use + 服务端 Zod 校验 + 一次自纠重试 |
| R3 | Unsplash 找不到冷门地方菜配图 | 体验降级 | 三级回退：Unsplash → 占位图 + cuisine emoji → 隐藏图位 |
| R4 | 移动端拍照原图 8MB+ | 上传慢、token 贵 | 客户端 `browser-image-compression` 压到长边 1600px / ≤1MB |
| R5 | LLM 成本失控 | 钱（个人开发者破产风险） | 多道闸（详见 §12）：①Anthropic console 月度 spend limit（人工设）；②客户端压图；③图片 hash 缓存秒返；④prompt 硬约束「一次返回所有菜 + description ≤100 字」+ `max_tokens` 截断；⑤每次调用记 `llm_calls` 表，可查可追；⑥按 user_id 月度限额接口预留（阶段 5 启用）；⑦支持用户自带 key 模式 |
| R6 | 用户重复点提交 | 重复扣费 | 前端按钮 disabled + 后端 hash 去重（同 hash 30min 内直接返回缓存） |
| R7 | 健康数据隐私 | 合规/信任 | 不在日志打印 profile 字段；生产加密；提供「清空我的数据」按钮 |
| R8 | tool_use 不支持流式好用 | 等待感 | UI 用 skeleton + 进度文案（"正在识别…翻译中…"）；阶段 5 可调研 streaming partial JSON |
| R9 | 法餐菜名直译丢文化背景 | 翻译质量差 | Prompt 中给 5 个 few-shot 示例（Bangers and Mash 等），强调"意译 + 文化解释" |
| R10 | PWA Service Worker 误缓存 API | 看到旧数据 | Workbox 规则：`/api/*` NetworkFirst 不缓存；只缓存静态资源 |
| R11 | Confidence 低却被用户当真 | 误导 | confidence < 0.7 卡片置灰 + 文字「⚠️ 此菜识别不确定，请向服务员核实」 |

---

## 9. 我对你方案的几点提议（待你拍板）

> 这些不是阻塞项，但建议在开工前回我一下，避免阶段中途回滚。

**P1 · 后端坚决用 Node 而不是 FastAPI**
你给了二选一。我建议 Node：前后端共享 `shared/` 包里的 Zod schema（菜品 schema、过敏原常量），避免两套定义漂移。FastAPI 在 Python 生态熟的团队更合适，本项目里收益小。

**P2 · 增加一层「过敏关键词兜底」**
需求里写了「保守优先」，我把它落成代码：维护中英双语食材词表（`shrimp/虾/prawn/lobster → shellfish`），后端在 LLM 返回后再扫一遍 ingredients，命中而未标的，强制补标并在 warnings 中写「系统补充检测到 X」。这是健康安全兜底，必须有。

**P3 · 引入 `shared/` 包**
TS monorepo（npm workspaces，不上 Turborepo / pnpm，避免增加心智负担）。让前后端引用同一份 Zod schema。新人看一眼 `shared/dish.schema.ts` 就懂数据结构。

**P4 · Unsplash 期望管理**
Unsplash 对「Bangers and Mash」「Khao Soi」「Hokkien Mee」这种菜名命中率不稳定。我加三级回退（图 → emoji 占位 → 无图）。如果你后期觉得不够好，再上 Google Custom Search（每天 100 次免费，超出收费）或 Bing Image Search。MVP 先 Unsplash。

**P5 · 客户端图片压缩**
Multimodal LLM 对超过 ~5MB 的图反而准确率会下降，且费 token。前端压到长边 1600px、JPEG quality 0.8（≤ ~1MB）再上传。这条建议直接写进阶段 2。

**P6 · UI 语言**
默认 UI 中文（按钮、提示、卡片标签），菜单内容才是双语。需要 i18n 框架吗？MVP 我建议**不要**，硬编码中文，到了真要支持英文 UI 再上 i18next。

**P7 · 历史记录默认开 or 关？**
菜单里包含拍摄场景（隐私）。我建议**默认开但提供「清空全部」**，并在注册时一句话说明。如果你想更保守，默认关、用户主动开启也可以——回我一下。

**P8 · 不引入 LangChain / Vercel AI SDK**
直接用 `@anthropic-ai/sdk`，自己抽一层 `LLMProvider`。多一层框架 = 多一层抽象漏洞，本项目调用模式很简单，不需要。

**P9 · 测试策略**
阶段 2 加一个 fixture：固定菜单图 + 期望输出 JSON 的关键字段断言（不是 string 全等，是「检测到 ≥3 道菜、含贝类的菜要标 shellfish」这种弱断言）。每次改 prompt 跑一次。这是省 prompt 调试时间的关键。

---

## 10. 需要你提供的信息（开工前）

**API key（带获取链接）：**

| Key | 必须? | 用途 | 获取方式 | 备注 |
|---|---|---|---|---|
| `ANTHROPIC_API_KEY` | ✅ 阶段 2 起 | Claude 调用 | https://console.anthropic.com → API Keys | 充值 ≥ $5 即可开发；务必先设月度 spend limit |
| `JWT_SECRET` | ✅ 阶段 3 起（自生成） | 登录 token 签名 | `openssl rand -hex 32` | 不要提交到 git |
| `UNSPLASH_ACCESS_KEY` | ⚠️ 阶段 5 才用 | 菜品配图 | https://unsplash.com/developers | Demo 模式 50 req/h，够开发 |
| `OPENAI_API_KEY` | 可选 | 切到 GPT-4o adapter 时用 | https://platform.openai.com | 不切换可不给 |
| `GEMINI_API_KEY` | 可选 | 切到 Gemini adapter 时用 | https://aistudio.google.com → API key | 不切换可不给 |
| `LLM_PROVIDER` | env（默认 `anthropic`） | 选 adapter | — | `anthropic` / `openai` / `gemini` |
| `LLM_MODEL` | env（默认 `claude-sonnet-4-6`） | 模型 ID | — | 各 provider 默认值 fallback 在 adapter 里 |
| `MONTHLY_QUOTA_PER_USER` | env（默认 `Infinity`） | L2 限流配额 | — | 阶段 5.4 改成有限值 |

**业务确认状态（v0.1 → v0.2）：**
- Q1：`shared/` workspace ✅ 已确认
- Q2：邮箱+密码 MVP ✅ 已确认
- Q3：部署 ✅ 按 Vercel（前端）+ Fly.io（后端）假设准备配置；阶段 5.5 才执行
- Q4：项目目录 ✅ 沿用 `menu-translator/` 子目录（外层 `交互网页版lab管理器` 作为工作区容器，不影响）

---

## 11. 不在 MVP 范围（明确放后面）

- 拍照实时翻译（AR 取景框）
- 多语言 UI（i18next）
- 社交分享（菜单/菜品）
- 收藏夹、菜品收藏
- 营养成分估算
- 餐厅评分整合（Google Places）
- OAuth、手机号登录
- 服务端流式响应（partial JSON streaming）
- 离线 LLM 推理

---

## 12. 成本与计费模型

> 个人开发者项目，**成本治理是头等大事**。本节说明系统从一开始就要设计成可演进的三种计费模式，并给出运营层面的「防破产」清单。

### 12.1 三种模式（系统须能在不改业务代码的前提下切换）

| 模式 | 谁付费 | 何时启用 | 落地方式 |
|---|---|---|---|
| **A · 服务端统一 key** | 我（开发者） | 阶段 1–4 默认 | 后端读 env 里的 `ANTHROPIC_API_KEY` |
| **B · 用户自带 key** | 用户 | 上线后主推 | 前端发请求时附带 `X-Anthropic-Key` header；后端优先使用 |
| **C · 混合** | 白名单/注册用户 → 用 A；超限 → 强制要求 B | 阶段 5 之后 | 路由层判定 user 状态 + 月度配额 → 决策走 A 还是要求 B |

### 12.2 LLMProvider 接口设计

```ts
// shared/src/llm.types.ts (或 backend 内部)
interface AnalyzeOptions {
  apiKey?: string;       // 传入则用，否则用 server env
  userId?: string | null;
  signal?: AbortSignal;
}
interface LLMProvider {
  analyze(images: Buffer[], opts?: AnalyzeOptions): Promise<{
    result: AnalyzeMenuResult;
    usage: { input_tokens: number; output_tokens: number };
    keySource: 'server' | 'user';
  }>;
}
```

**关键点**：业务代码（路由、service）永远不读 env，只调 `provider.analyze(imgs, { apiKey: req.userKey ?? undefined })`。env 读取收敛在 provider 工厂里。

### 12.3 路由层 key 注入（阶段 2 落地）

`POST /api/analyze-menu` 处理：
1. 读取 `req.headers['x-anthropic-key']`（注意 Express 把 header 名小写化）。
2. 也接受 body 里的 `apiKey` 字段（但优先 header；body 是逃生通道，不在前端 UI 暴露）。
3. 校验格式（以 `sk-ant-` 开头 + 长度），不通过则忽略并走服务端 key。
4. 把 key 透传给 `provider.analyze`，**绝不**记日志、**绝不**写入 db。
5. `keySource` 字段写入 `llm_calls` 表用于审计。

### 12.4 调用记账

每次 LLM 调用（无论成功失败、命中缓存与否）都写一行 `llm_calls`：

| 字段 | 说明 |
|---|---|
| `user_id` | 未登录为 NULL |
| `call_type` | 当前只有 `analyze_menu` |
| `model` | 调用的模型 ID |
| `input_tokens` / `output_tokens` | Anthropic response.usage 取 |
| `estimated_usd` | 内置当前模型单价表（hard-coded JSON），改价时改一处 |
| `key_source` | `server` / `user` |
| `cache_hit` | 命中本地图片 hash 缓存时 true，token 计 0 |
| `status` | `ok` / `error` / `rate_limited` |

**用途**：① 我自己每周看一眼花了多少；② 阶段 5 给 user 月度配额做基础；③ 出问题倒查。

### 12.5 限流（双层，第二层先占位）

- **L1（上线即开）**：`express-rate-limit` 按 IP，每分钟 5 次 analyze。
- **L2（代码存在 / 阶段 2–4 全为 Infinity / 阶段 5 启用）**：按 user_id 查 `llm_calls` 当月 server-key 调用计数，超过 `MONTHLY_QUOTA_PER_USER`（env 配置）则返回 402 + `{ error: "quota_exceeded", action: "use_your_own_key" }`，前端引导填 key。

### 12.6 prompt 层省 token

- 一次返回所有菜，禁多轮。
- description ≤ 100 字硬约束，prompt 中明示。
- `max_tokens: 4096` 客户端硬截断。
- 不在 prompt 里塞示例图片（few-shot 只用文字示例）。

### 12.7 客户端层省 token

- 图片压到长边 1600px / quality 0.8 / ≤1MB。
- 提交按钮在 mutation pending 时 disabled。
- 同一图 30 分钟内 hash 命中缓存秒返、不再调 LLM。

### 12.8 防破产清单（README 须列出，开发者人工执行）

> 这些是**系统外**的人肉操作，写代码无法替你做：

- [ ] 在 https://console.anthropic.com 设月度 **Spend limit**（建议先设 $20）。Anthropic 触顶会拒绝调用而不是先扣钱再通知。
- [ ] 为本项目**单独建一个 API key**，名字带 `menu-translator`，不要复用别项目的。出问题可定点废弃。
- [ ] `.env` 已在 `.gitignore`。每次 `git push` 前运行 `git status` 确认无 `.env`、无 `*.sqlite`。我（Claude）每次帮你提 commit 前会主动检查并提醒你。
- [ ] 偶尔抽查 `llm_calls` 表：`SELECT date(created_at), count(*), sum(estimated_usd) FROM llm_calls GROUP BY 1 ORDER BY 1 DESC LIMIT 7;`
- [ ] 上线时切到模式 C，给注册用户发邮件提醒「你的本月免费额度还剩 X 次」。

### 12.9 估算（用于 README「成本估算」一节）

> 以 Claude Sonnet 4.6 当前公开单价为参考（input ~$3 / 1M tok，output ~$15 / 1M tok，**最终以 Anthropic 官网为准**）。

每次 analyze-menu 大致消耗：
- 一张菜单图片 ≈ 1500–2500 input tokens（取决于尺寸）
- prompt + tool schema ≈ 1500 input tokens
- 输出 5–15 道菜 × ~200 tokens ≈ 1000–3000 output tokens
- **单次调用约 $0.02–0.06**

按 100 个用户、人均 5 次/月 → 500 次 → ~$15–30/月。设 spend limit $20 是保守值。

---

_文档结束。请审阅 §12 与 TODO 中新增的成本相关任务，确认后开始阶段 1。_
