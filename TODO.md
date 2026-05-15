# 菜单翻译助手 · TODO

> 配套 `PROJECT_PLAN.md` 阅读。
> 每个 task 是一个「文件级别 / 单一职责」的可执行项。
> 标注：🔴 阻塞下游 / 🟡 可并行 / 🟢 收尾打磨

---

## 阶段 0 · 共识对齐（开工前）

### 0.1 已完成
- [x] 用户回复 PROJECT_PLAN 第 9 节 P1–P9 的意见
- [x] 用户回复 Q1–Q4 业务问题
- [x] 用户提出成本治理需求 → 已写入 PLAN §12
- [x] 用户提出作品集定位需求 → 已写入 PLAN §0、§7 拆分为 5.1–5.9

### 0.2 项目命名 & GitHub
- [ ] **（用户操作）** 从我提供的 5 个候选中选一个 product 名（DishDecoder / MenuLens / Plato / TasteBridge / Gastronaut）🔴
- [ ] **（用户操作）** 在 GitHub 创建 public 仓库（仓库名建议小写连字符，如 `dish-decoder`） 🔴
- [ ] 我在阶段 1 末把 README 顶部的产品名占位符替换成最终名，并 push 第一个 commit 🟡

### 0.3 Conventional Commits 规范（贯穿全程）
- [ ] 所有 commit 用 `<type>(<scope>): <subject>` 格式 🔴
  - 类型：`feat / fix / refactor / docs / chore / test / perf / style`
  - scope 可选，例如 `feat(llm): ...` / `fix(allergen): ...`
  - subject 中英文皆可，**但要有实质内容**，禁 "update" / "fix bug" / "wip"
- [ ] 阶段结束的 commit 用 `feat: complete phase N · <一句话>` 格式 🔴
- [ ] **业务代码关键决策点写 `// WHY: ...` 注释**（方便面试讲解） 🟡

### 0.4 Anthropic 成本闸（阶段 2 开始前必须完成）
- [ ] **（用户操作）** 在 https://console.anthropic.com 设月度 Spend limit ≥ $20 🔴
- [ ] **（用户操作）** 为本项目单独建一个 API key（命名 `menu-translator`） 🔴
- [ ] 用户在阶段 2 开始前提供 `ANTHROPIC_API_KEY`（写入本地 `.env`） 🔴

---

## 阶段 1 · 工程骨架（0.5–1 天）

### 1.1 仓库初始化
- [x] `git init`（在 `menu-translator/` 内） 🔴
- [x] `menu-translator/.gitignore`（node_modules / dist / .env / *.sqlite / coverage / .DS_Store） 🔴
- [x] `menu-translator/package.json` 根，配置 npm workspaces：`["frontend","backend","shared"]` 🔴
- [x] `menu-translator/.env.example` 列出所有 env 占位（ANTHROPIC_API_KEY / OPENAI_API_KEY / GEMINI_API_KEY / LLM_PROVIDER / LLM_MODEL / JWT_SECRET / UNSPLASH_ACCESS_KEY / DATABASE_URL / PORT / MONTHLY_QUOTA_PER_USER） 🔴
- [x] `menu-translator/README.md` **作品集化骨架版**（阶段 1 留位，阶段 5.6 重写）：
  - 顶部：产品名占位符 `[PRODUCT_NAME]`、demo URL 占位符、hero 图占位符
  - 一段中文 + 一段英文产品介绍
  - 启动命令、env 说明
  - **「成本估算」节**（搬 PLAN §12.9，含三家供应商单价表）
  - **「防破产清单」节**（搬 §12.8）
  - 占位区："设计亮点"（5.6 时填）、"截图"（5.6 时填） 🔴
- [x] 阶段 1 首个 commit：`chore: scaffold workspaces and tooling` 🔴

### 1.2 shared 包
- [x] `shared/package.json` 🔴
- [x] `shared/tsconfig.json`（输出 esm + dts） 🔴
- [x] `shared/src/index.ts` 占位导出 🔴

### 1.3 后端骨架
- [x] `backend/package.json` 加 deps：express, cors, dotenv, zod, multer, **bcryptjs**, jsonwebtoken, @anthropic-ai/sdk, drizzle-orm, **@libsql/client**, express-rate-limit；devDeps：tsx, typescript, vitest, **drizzle-kit**, @types/bcryptjs, @types/multer, @types/jsonwebtoken, @types/* 🔴（方案 B：避开 better-sqlite3 / bcrypt 的 native 编译） 🔴
- [x] `backend/tsconfig.json` 🔴
- [x] `backend/src/config.ts` Zod 校验 env，缺 ANTHROPIC_API_KEY 直接 throw 🔴
- [x] `backend/src/utils/logger.ts` 简易 logger（pino 或 console，先 console） 🟡
- [x] `backend/src/middleware/errorHandler.ts` 统一 JSON 错误格式 🔴
- [x] `backend/src/routes/health.ts` `GET /api/health` → `{ ok: true, ts }` 🔴
- [x] `backend/src/app.ts` 装配 cors / json / health / errorHandler 🔴
- [x] `backend/src/index.ts` 监听端口 3000 🔴
- [x] `backend/package.json` script：`dev: tsx watch src/index.ts` 🔴

### 1.4 前端骨架
- [x] `npm create vite@latest frontend -- --template react-ts` 🔴
- [x] 加 deps：react-router-dom, @tanstack/react-query, zustand, react-hook-form, @hookform/resolvers, zod, recharts, browser-image-compression, tailwindcss, autoprefixer 🔴
- [x] `frontend/tailwind.config.ts` + `frontend/src/styles/index.css` Tailwind 三件套 🔴
- [x] `frontend/vite.config.ts` 加 `vite-plugin-pwa`（最简 manifest，可后调） 🔴
- [x] `frontend/vite.config.ts` 配 `/api` proxy → `http://localhost:3000` 🔴
- [x] `frontend/src/services/api.ts` 封装 fetch（baseURL='/api'，统一错误） 🔴
- [x] `frontend/src/App.tsx` 调 `/api/health`，页面显示 "Backend OK / Backend DOWN" 🔴
- [x] `frontend/public/manifest.webmanifest` + 占位 icon-192/512 🟢

### 1.5 阶段 1 验收
- [x] 一条 `npm run dev` 同时起前后端（用 `concurrently` 或 npm workspace script） 🔴
- [x] 浏览器访问 `localhost:5173` 看到 "Backend OK" 🔴
- [x] 提交首版 commit："chore: scaffold frontend/backend/shared" 🟢

---

## 阶段 2 · 核心翻译流程（2–3 天）

### 2.1 Schema（前后端共享）
- [x] `shared/src/allergen.ts` FDA 9 大常量 + 中文映射：`{ shellfish: "贝类", peanuts: "花生", dairy: "乳制品", gluten: "麸质", eggs: "蛋", soy: "大豆", tree_nuts: "坚果", fish: "鱼", sesame: "芝麻" }` 🔴
- [x] `shared/src/dietary.ts` 饮食标签常量：`vegetarian / vegan / halal / kosher / contains_alcohol / contains_pork / gluten_free` 🔴
- [x] `shared/src/dish.schema.ts` Zod 定义 Dish 与 AnalyzeMenuResult，导出 TS 类型 🔴

### 2.2 LLM Service
- [x] `backend/src/prompts/analyze-menu.v1.md` 主 prompt（中文写作，含意译规则、文化背景要求、置信度规则、5 个 few-shot 示例；**显式声明：一次返回所有菜不分多轮 + description 硬上限 100 字**） 🔴
- [x] `backend/src/prompts/analyze-menu.v1.ts` 导出 `SYSTEM_PROMPT` 和 `MENU_ANALYSIS_TOOL`（input_schema 用 zod-to-json-schema 转 dish.schema；description 字段在 schema 上 `.max(100)`） 🔴
- [x] `backend/src/prompts/README.md` 修改记录模板 🟡
- [x] `backend/src/services/llm/provider.ts` **供应商中立接口**：
  - [x] `interface LLMProvider { name; defaultModel; analyze(images, opts?) }` 🔴
  - [x] **接口层不出现 `tool_use` / `function_calling` / `responseSchema` 等供应商专有词** 🔴
  - [x] 返回类型 `{ result, usage: { inputTokens, outputTokens }, model, keySource, estimatedUsd }` 🔴
- [x] `backend/src/services/llm/anthropic.ts` **完整实现**：
  - [x] 构造 messages（system + user + image blocks） 🔴
  - [x] `tool_choice: { type: "tool", name: "submit_menu_analysis" }`、`max_tokens: 4096` 🔴
  - [x] **优先用 opts.apiKey，否则用 env**；构造 client 时注入；`keySource = opts.apiKey ? 'user' : 'server'` 🔴
  - [x] 提取 tool_use input、Zod 校验 → 失败一次自纠重试 🔴
  - [x] 从 `response.usage.input_tokens / output_tokens` 映射为统一字段 🔴
- [x] `backend/src/services/llm/openai.ts` **骨架 + TODO**：
  - [x] 实现 LLMProvider 接口、`name = 'openai'`、`defaultModel = 'gpt-4o'` 🟡
  - [x] `analyze` 内 `throw new Error('OpenAI adapter: not implemented yet — use response_format json_schema')` 🟡
  - [x] 文件顶部 `// TODO(phase-2.x): implement using response_format json_schema; map usage.prompt_tokens → inputTokens` 🟡
  - [x] pricing 表里加 `gpt-4o` 单价占位 🟡
- [x] `backend/src/services/llm/gemini.ts` **骨架 + TODO**：
  - [x] 实现 LLMProvider 接口、`name = 'gemini'`、`defaultModel = 'gemini-1.5-pro'` 🟡
  - [x] `analyze` 内 `throw new Error('Gemini adapter: not implemented yet — use responseSchema + responseMimeType: application/json')` 🟡
  - [x] 文件顶部 `// TODO(phase-2.x): implement using responseSchema; map usageMetadata.promptTokenCount → inputTokens` 🟡
  - [x] pricing 表里加 `gemini-1.5-pro` 单价占位 🟡
- [x] `backend/src/services/llm/index.ts` 工厂：
  - [x] 按 `LLM_PROVIDER` env 选 adapter（默认 `anthropic`） 🔴
  - [x] 不存在的 provider 抛清晰错误 🔴
- [x] `backend/src/services/llm/pricing.ts`：
  - [x] 多供应商单价表 `{ anthropic: { 'claude-sonnet-4-6': { input: 3, output: 15 } }, openai: {...}, gemini: {...} }` USD per 1M tokens 🔴
  - [x] `estimateCost(provider, model, inTok, outTok)` 函数 🔴
  - [x] 模型不在表里返回 0 + console.warn（不要崩） 🟡
- [x] `backend/src/services/hash.ts` `sha256(buffer)` 🟡

### 2.3 接口
- [x] `backend/src/middleware/rateLimit.ts`：
  - [x] L1：内存版 IP 限流（每 IP 每分钟 5 次 analyze） 🔴
  - [x] L2：`monthlyUserQuota` 中间件函数，查 `llm_calls` 当月 server-key 调用计数；**阶段 2 阈值设为 `Infinity`**（env `MONTHLY_QUOTA_PER_USER` 默认 `Infinity`），代码路径完整存在 🔴
- [x] `backend/src/routes/analyzeMenu.ts` `POST /api/analyze-menu`（multer.memoryStorage，最多 5 张图，每张 ≤ 5MB） 🔴
  - [x] 读 `req.headers['x-anthropic-key']` 或 body.apiKey，校验 `sk-ant-` 前缀 + 长度，不通过则忽略 🔴
  - [x] 把 key 透传给 provider；**绝不**写日志、**绝不**入库 🔴
- [x] `backend/src/app.ts` 挂载 analyzeMenu 路由 + L1/L2 rateLimit 🔴
- [x] `backend/src/db/client.ts` Drizzle + libsql 初始化 🟡
- [x] `backend/src/db/schema.ts` `menus` / `dishes` / `image_cache` / `llm_calls` 表（user 表等阶段 3） 🔴
- [x] `backend/src/db/migrations/0000_init.sql` / `0001_llm_call_cache_status.sql` 由 drizzle-kit 生成 🟡
- [x] `backend/src/services/llmAccounting.ts` `recordCall({ userId, callType, provider, model, inputTokens, outputTokens, keySource, cacheHit, status })` → 写 `llm_calls`，估算 USD 用 pricing.ts 🔴
- [x] analyzeMenu 路由编排：图片 hash → 命中 cache → `recordCall(cacheHit=true)` 直返；否则调 LLM → `recordCall(usage, status)` → 写 menus/dishes → 返回 🔴

### 2.4 测试
- [x] `backend/tests/fixtures/menu-korean.jpg`（本地 fixture；图片文件被 .gitignore 排除） 🔴
- [x] `backend/tests/fixtures/menu-korean.expected.json` 弱断言：菜数 ≥ 3、language_detected = "ko"、描述长度/风味/海鲜过敏原一致性 🟡
- [x] `backend/tests/llm.spec.ts` Vitest，跑 fixture，断言通过（默认 skip，环境变量 `RUN_LLM_TESTS=1` 才跑，避免 CI 烧钱） 🟡
- [x] `backend/tests/pricing.spec.ts` 单测 `estimateCost`：1M input tok = $3，1M output tok = $15，混合算正确 🟡
- [x] `backend/tests/analyzeMenu.spec.ts` 单测：传 X-Anthropic-Key header → keySource='user'；不传/非法格式（`abc`）→ 'server'；覆盖 cache hit 和 quota 🟡

### 2.5 前端：上传 + 卡片
- [x] `frontend/src/utils/compress.ts` 用 browser-image-compression，长边 1600 / quality 0.8 / maxSize 1MB 🔴
- [x] `frontend/src/components/MenuUploader.tsx` 支持拍照（capture="environment"）、相册多选、粘贴；显示缩略图列表 🔴
- [x] `frontend/src/hooks/useAnalyzeMenu.ts` React Query mutation，包 FormData 上传 🔴
- [x] `frontend/src/components/DishCard.tsx` 极简版：原文 / 中文 / 描述 / 用料 list（无图无警示无雷达） 🔴
- [x] `frontend/src/pages/HomePage.tsx` Uploader 入口 🔴
- [x] `frontend/src/pages/ResultsPage.tsx` 接收 mutation 结果，渲染 DishCard 列表 🔴
- [x] `frontend/src/routes.tsx` `/`, `/results` 路由 🔴
- [x] 加全局 React Query Provider 🔴

### 2.6 阶段 2 验收
- [x] 上传 fixture 韩餐图 → 看到 ≥ 3 张菜品卡片，中文意译合理、解释带文化背景 🔴
- [x] 重复上传同一张 → 第二次秒返（缓存生效） 🔴
- [x] 提交 commit："feat: end-to-end menu analysis MVP" 🟢

---

## 阶段 3 · 用户档案（1.5–2 天）

### 3.1 数据库 & Auth
- [x] `backend/src/db/schema.ts` 加 `users` / `profiles` 表 🔴
- [x] migration 0002_user 🔴
- [x] `backend/src/services/auth.ts` register/login/verify（bcrypt + JWT，HttpOnly cookie） 🔴
- [x] `backend/src/middleware/auth.ts` 解析 cookie，挂 `req.user` 🔴
- [x] `backend/src/routes/auth.ts` `POST /api/auth/register|login|logout` + `GET /api/auth/me` 🔴
- [x] `backend/src/routes/profile.ts` `GET/PUT /api/profile` 🔴

### 3.2 前端 Auth
- [x] `frontend/src/store/authStore.ts` Zustand，存当前 user 🔴
- [x] `frontend/src/hooks/useAuth.ts` 启动时调 `/api/auth/me` 🔴
- [x] `frontend/src/pages/LoginPage.tsx` 邮箱+密码表单（react-hook-form + zod） 🔴
- [x] `frontend/src/pages/RegisterPage.tsx` 同上 🔴
- [x] 路由守卫：未登录访问 /profile 跳 /login 🔴

### 3.3 用户档案 UI
- [x] `frontend/src/components/AllergenPicker.tsx` 9 大过敏原网格选择，每项配 emoji + 中文名 🔴
- [x] `frontend/src/components/DietaryPicker.tsx` 饮食标签复选 🔴
- [x] `frontend/src/components/FlavorPrefSlider.tsx` 各味道 0–5 上限滑块（先做"不吃辣"= spicy_max=1） 🟡
- [x] `frontend/src/pages/ProfilePage.tsx` 整合三个 picker，保存到 `/api/profile` 🔴
- [x] `frontend/src/store/profileStore.ts` 缓存 profile 🔴

### 3.4 阶段 3 验收
- [ ] 注册 → 登录 → 设置「贝类过敏」+「素食」+「不吃辣」→ 刷新仍在 🔴
- [ ] 退出登录后再登录数据还在 🔴
- [ ] commit："feat: user accounts and dietary profile" 🟢

---

## 阶段 4 · 警示系统（1 天）

### 4.1 后端比对
- [ ] `backend/src/services/allergen.ts`：
  - [ ] `crossCheck(dish, profile)` → `{ hits: [{allergen, evidence}], hitDietary: [...] }` 🔴
  - [ ] 内置中英食材→过敏词表（`shrimp/虾/prawn/lobster/crab/螃蟹 → shellfish`、`peanut/花生 → peanuts` 等，覆盖 9 类常见 30+ 词） 🔴
  - [ ] 后处理：扫 dish.ingredients[].name，如命中词表但 dish.allergens 没标，强制补标，warnings 追加 "系统补充检测：X 含 Y" 🔴
- [ ] `backend/src/routes/analyzeMenu.ts`：登录用户的请求附带 profile，对每道菜跑比对，返回时把 hits 一起塞进 dish 🔴
- [ ] `backend/tests/allergen.spec.ts` 单测：含「fish sauce」必出 fish；含「prawn」必出 shellfish；vegetarian 用户遇到 contains_pork 必标 dietary hit 🔴

### 4.2 前端展示
- [ ] `frontend/src/components/AllergenWarning.tsx` 红色顶栏：「⚠️ 含 [虾]（您已声明对 贝类 过敏）」 🔴
- [ ] `frontend/src/components/ConfidenceBadge.tsx` confidence < 0.7 时显示「⚠️ 此菜识别不确定，请向服务员核实」 🔴
- [ ] `DishCard.tsx` 集成 AllergenWarning + ConfidenceBadge，并整张卡片在有警示时加红边 🔴
- [ ] 卡片底部固定一行小字："本应用结果仅供参考，重要过敏请向服务员二次确认" 🔴

### 4.3 阶段 4 验收
- [ ] 设置贝类过敏的用户上传含虾仁的菜单 → 对应卡片红条+红边 🔴
- [ ] 故意构造一个低置信度菜（prompt 测试）→ 看到不确定提示 🟡
- [ ] commit："feat: allergen cross-check and warnings" 🟢

---

## 阶段 5 · 作品集化（3–5 天）

> 这阶段从「打磨」升级为「作品集化」。5.1–5.4 是产品功能收尾；5.5–5.7 是作品集必需；5.8–5.9 是加分项。

### 5.1 配图（P0）
- [ ] `backend/src/services/imageSearch.ts` Unsplash search，按 image_search_keywords 取首张，本地落盘 + image_cache 表记录 🔴
- [ ] `backend/src/routes/dishImage.ts` `GET /api/dish-image?q=...`，命中 cache 返本地 URL，否则现拉 🔴
- [ ] `frontend/src/hooks/useDishImage.ts` React Query，懒加载（IntersectionObserver 触发） 🔴
- [ ] `DishCard.tsx` 接入 useDishImage，三级回退（图 → emoji 占位 → 隐藏图位） 🔴

### 5.2 口味雷达图（P0）
- [ ] `frontend/src/components/FlavorRadar.tsx` Recharts RadarChart，6 维（咸酸甜苦辣鲜），0-5 比例 🔴
- [ ] DishCard 集成 FlavorRadar 🔴

### 5.3 历史记录（P0）
- [ ] `backend/src/routes/history.ts` `GET /api/history`（分页，最近 20）、`GET /api/history/:menuId`、`DELETE /api/history` 🔴
- [ ] `frontend/src/pages/HistoryPage.tsx` 列表 + 点击查看 🔴
- [ ] ProfilePage 加「清空历史」按钮 🟡
- [ ] 注册页加一句提示「我们会保存你的菜单历史，可在档案页一键清空」 🟡

### 5.4 UI 打磨 + L2 月度配额激活（P0）
- [ ] 全局 loading skeleton（卡片 ghost） 🟢
- [ ] 全局错误 toast（react-hot-toast 或自写） 🟢
- [ ] 空态插画 + 文案 🟢
- [ ] 移动端样式过 iPhone SE 375px 宽 🟢
- [ ] PWA：manifest 完整、apple-touch-icon、theme-color 🟢
- [ ] Lighthouse 跑一遍 PWA 评分 ≥ 90 🟢
- [ ] `backend/src/middleware/rateLimit.ts` 升级为按 user_id（已登录）/ IP（未登录） 🟡
- [ ] **激活 L2 月度配额**：env `MONTHLY_QUOTA_PER_USER` 设有限值（默认 30），超额返回 402 + `{ error: "quota_exceeded", action: "use_your_own_key" }` 🔴
- [ ] 前端：拦截 402 响应，显示「本月免费额度已用完」+「填入你自己的 API key 继续使用」对话框 🔴
- [ ] `frontend/src/components/ApiKeyDialog.tsx`：保存到 localStorage（不发其他后端）；后续 mutation 自动塞 `X-Anthropic-Key` 🔴

### 5.5 部署 demo（P0 · 作品集必需）
- [ ] **demo 限流**：每 IP 每天 3 次 analyze（独立的 demo 限流，比开发环境更严） 🔴
- [ ] **demo 友好提示**：触发限流时 UI 显示「demo 限额已耗尽，请填自己的 API key 继续使用」并打开 ApiKeyDialog 🔴
- [ ] **预设示例数据**：seed 脚本灌入一个 demo 账号 `demo@dishdecoder.app` / 预设过敏档案 / 一份预先分析好的菜单结果（不再调 LLM） 🔴
- [ ] **预加载示例菜单**：HomePage 加「试试示例菜单」按钮，一键载入 fixture 结果（**不调 LLM**，直接读 db 里的 demo menu） 🔴
- [ ] 前端部署 Vercel：
  - [ ] `vercel.json` 配置（如果需要） 🟡
  - [ ] env：`VITE_API_BASE_URL` 指向后端 fly.dev URL 🔴
  - [ ] 绑定自定义域（可选） 🟢
- [ ] 后端部署 Fly.io：
  - [ ] `fly.toml` 配置 🔴
  - [ ] `Dockerfile`（多阶段构建：build → tsc → 运行 dist） 🔴
  - [ ] Fly secrets 设：ANTHROPIC_API_KEY / JWT_SECRET / UNSPLASH_ACCESS_KEY / DEMO_RATE_LIMIT 🔴
  - [ ] Fly volume：persist SQLite 文件 / 或迁移到 Fly Postgres（看时间） 🟡
  - [ ] CORS 允许 Vercel 域 🔴
- [ ] 端到端冒烟：从 demo URL 走完整流程一次 🔴
- [ ] 把 demo URL 写入 README 顶部 🔴

### 5.6 README 作品集化重写（P0 · 作品集必需）
- [ ] 顶部 hero 区：
  - [ ] 产品名（大字）+ tagline（一句中文 + 一句英文） 🔴
  - [ ] 「Live Demo →」按钮链接 🔴
  - [ ] hero 截图 / GIF（手机端拍照→出卡片的演示）🔴
- [ ] 「主要功能」区：4–6 张截图（拍照页 / 卡片 / 警示 / 档案 / 历史 / 雷达图）🔴
- [ ] 「架构」区：复用 PROJECT_PLAN §2 的 mermaid 图 🔴
- [ ] 「技术栈」区：表格列出选型 + 一句话理由 🔴
- [ ] **「设计亮点」区（重点，每个 2–3 段）**：
  - [ ] 1. Claude tool_use 强约束结构化输出：解决了什么 / 替代方案是什么 / 为什么这个更好 🔴
  - [ ] 2. 过敏关键词双层防护（LLM + 后处理兜底）：健康安全场景的"宁错勿漏"工程化 🔴
  - [ ] 3. 多供应商 LLM 抽象 + 用户自带 key：可演进的成本治理架构 🔴
  - [ ] 4. 图片 hash 去重缓存 + 客户端压缩：成本控制的工程实现 🔴
  - [ ] 5. PWA + 移动端优先：境外旅行场景的离线/弱网考量 🔴
- [ ] 「本地开发」区：clone / install / env 配置 / dev / build 🔴
- [ ] 「成本估算」区（搬 PLAN §12.9 + 三家供应商表） 🔴
- [ ] 双语版本：默认 README.md 英文（面试官读），README.zh.md 中文（可选） 🟡

### 5.7 Conventional Commits 规范（贯穿全程，5.7 是最终审视点）
- [ ] 阶段 1–4 期间每次 commit 都按规范来（非 5.7 任务，是横切关注） 🔴
- [ ] 阶段 5 末 review 一次 `git log --oneline`：是否每条都有实质信息 🔴
- [ ] 必要时 `git rebase -i` 改写早期不规范 commit message（**仅在 push 之前**；用户确认后再做） 🟡

### 5.8 加分项 · 智能推荐（P1 · 时间允许才做）
- [ ] `backend/src/prompts/recommend.v1.md`：输入 = 菜单 dishes 数组 + 用户档案，输出 = top 3 推荐 + 推荐理由 🟡
- [ ] `backend/src/routes/recommend.ts` `POST /api/recommend`（要登录） 🟡
- [ ] `llm_calls.call_type = 'recommend'` 区分记账 🟡
- [ ] 前端 ResultsPage 加「为我推荐」按钮 + 推荐结果区 🟡
- [ ] **作品集亮点**：README 设计亮点区加一条「LLM 多任务编排」 🟡

### 5.9 加分项 · 拼音/罗马音（P1 · 时间允许才做）
- [ ] `shared/src/dish.schema.ts` Dish 加 `transliteration` 字段（可空） 🟡
- [ ] prompt 要求：原文是日/韩/中文等非拉丁字符语言时，提供罗马音/拼音 🟡
- [ ] `DishCard.tsx` 显示原文下方一行小字 transliteration 🟡
- [ ] 卡片加「复制原文」按钮，clipboard API 🟡

### 5.10 阶段 5 验收
- [ ] 上传一张菜单：每张卡片有图（或有占位）、有雷达图、有警示 🔴
- [ ] HistoryPage 看到过去的菜单 🔴
- [ ] iPhone Safari 「添加到主屏幕」可装、离线打开壳子可用 🔴
- [ ] **demo URL 可被任何人点开试用** 🔴
- [ ] **README 30 秒看懂**（自测：找一个不了解项目的朋友看 30 秒，问能不能讲出是什么） 🔴
- [ ] commit：`feat: complete phase 5 · portfolio-ready demo and README` 🟢

---

## 横切关注 · 全程注意

- [ ] 不在日志打印 user.profile / 密码 / token / **用户传入的 X-Anthropic-Key** 🔴
- [ ] 不把 fixture 真人菜单图带入 git（用 .gitignore 排除非 expected.json） 🔴
- [ ] 每次改 `prompts/analyze-menu.v*.md` 必须升版本号、保留旧文件、更新 prompts/README.md 🔴
- [ ] 任何报错给用户的中文文案：友好 + 不暴露内部细节 🟡
- [ ] LLM 调用失败要明确告知用户「服务暂时不可用，请稍后再试」，不要假装成功 🔴
- [ ] **每次帮用户提 commit 前，主动跑 `git status` 检查是否有 `.env` / `*.sqlite` 被加入** 🔴
- [ ] **业务代码永远不直接读 `process.env.ANTHROPIC_API_KEY`**，env 收敛在 `config.ts` 与 LLM provider 工厂里 🔴

---

_TODO 结束。阶段 0 大部分已对齐，开干阶段 1（项目命名 + GitHub 仓库 + Anthropic key 在阶段 2 前并行解决）。_
