# As Your Dish

> Live demo: `[DEMO_URL_PLACEHOLDER]` (filled in phase 5.5)
> Hero screenshot: `[HERO_IMAGE_PLACEHOLDER]` (filled in phase 5.6)

A PWA that helps Chinese-speaking travelers and expats decode foreign-language menus. Take a photo → get every dish identified, translated (idiomatic, not literal), explained with cultural context, broken down by ingredients, scored on six flavor dimensions, illustrated, and **flagged in red if it conflicts with your declared allergies or dietary preferences**.

帮中文母语者在境外旅行/工作时看懂外文菜单的 PWA。拍一张菜单 → 每道菜识别、意译、文化背景解释、用料拆解、6 维口味雷达图、配图，并**根据你预设的过敏原和饮食偏好红色高亮警示**。

---

## Project status

Portfolio project under active development. See [`PROJECT_PLAN.md`](./PROJECT_PLAN.md) for the design rationale and [`TODO.md`](./TODO.md) for the granular task list.

| Phase                            | Status            | Highlights                                                                            |
|----------------------------------|-------------------|---------------------------------------------------------------------------------------|
| 1 · Scaffold                     | ✅ Done           | npm workspaces; PWA shell; concurrent dev servers (Vite + Express)                    |
| 2 · Core LLM · schema/provider   | ✅ Done           | Provider-neutral `LLMProvider`; Anthropic `tool_use` adapter; externalized prompt files |
| 2 · Core LLM · route/fixture     | ✅ Done          | `/api/analyze-menu`; image-hash cache; llm accounting; gated fixture acceptance test  |
| 2 · Frontend upload/results      | ✅ Done          | Image compression, upload flow, and dish result cards                                 |
| 2 · Browser acceptance           | ✅ Done          | Upload fixture in the UI and confirm cache-hit repeat upload                          |
| 3 · User profile & auth          | ✅ Done          | bcryptjs + JWT cookie auth; allergen / dietary / flavor pickers                       |
| 4 · Allergen warnings            | ✅ Done          | dish ∩ profile cross-check with bilingual keyword fallback                            |
| 5 · Polish & deploy              | 🔄 In progress   | Unsplash images; flavor radar; PWA polish; Vercel + Fly.io deploy                     |
| 5.5a · Local deploy prep         | ✅ Done          | demo guard; example menus; Fly/Vercel config; cross-origin cookie support             |

---

## Local development

Requires Node 20+ and npm 10+.

```bash
# 1. clone & install
git clone <repo-url>
cd menu-translator
npm install

# 2. configure secrets
cp .env.example .env
# edit .env and fill in ANTHROPIC_API_KEY, JWT_SECRET, etc.
# generate JWT_SECRET with: openssl rand -hex 32

# 3. run dev servers (concurrently starts backend:3000 + frontend:5173)
npm run dev

# 4. open http://localhost:5173
# you should see "Backend OK"
```

Other useful scripts:

```bash
npm run typecheck     # tsc --noEmit across all workspaces
npm run build         # production build
npm run test          # backend vitest (LLM tests skipped unless RUN_LLM_TESTS=1)
```

Minimum local `.env` values:

```env
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
JWT_SECRET=<openssl rand -hex 32>
DATABASE_URL=file:./backend/dev.db
PORT=3000
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
MONTHLY_QUOTA_PER_USER=30
DEMO_MODE=0
VITE_API_BASE_URL=
```

Optional values:

```env
UNSPLASH_ACCESS_KEY=       # enables dish images via Unsplash
OPENAI_API_KEY=            # only needed when LLM_PROVIDER=openai
GEMINI_API_KEY=            # only needed when LLM_PROVIDER=gemini
LLM_MODEL=                 # empty = adapter default
LLM_DEBUG=                 # set to 1 for raw LLM diagnostics
```

### Example menus for local demo

Example menu records are DB-backed but the images are not committed by default. To enable the "试用示例" flow locally:

```bash
# 1. place these files under backend/examples/
backend/examples/chinese-home-cooking.jpg
backend/examples/italian-trattoria.jpg
backend/examples/japanese-izakaya.jpg

# 2. migrate the database
npm run db:migrate -w backend

# 3. smoke-test the seed path without calling an LLM
SEED_DRY_RUN=1 npm run seed:examples

# 4. when you intentionally want real curated results, run without dry-run
npm run seed:examples
```

The real seed command calls the configured LLM once per example image. Dish images are not warmed during seed because Unsplash search/download registration consumes API quota; they lazy-load through `/api/dish-image` on first view.

### Deployment notes

Run Fly deploy commands from the repository root, not from `backend/`, because the Dockerfile builds the monorepo and needs access to `package-lock.json`, `shared/`, and `backend/`. The `dockerfile = "Dockerfile"` path in `backend/fly.toml` is resolved relative to `backend/fly.toml`, while the build context is the repository root.

```bash
# build-only smoke check; does not deploy a new release
fly deploy . --config backend/fly.toml --app as-your-dish-api --build-only

# actual deploy, after build-only succeeds
fly deploy . --config backend/fly.toml --app as-your-dish-api
```

Do not put provider keys or JWT secrets in `fly.toml`. Set production secrets through Fly's secret store from your own terminal, and do not paste real values into issues, chats, docs, or screenshots:

```bash
fly secrets set ANTHROPIC_API_KEY="<production-provider-key>" JWT_SECRET="<jwt-secret>" UNSPLASH_ACCESS_KEY="<unsplash-key>" --app as-your-dish-api
```

`DATABASE_URL=file:/data/as-your-dish.db` is intentionally kept in `fly.toml` because it is only a SQLite file path on the Fly volume, not a credential.

---

## Architecture

See [`PROJECT_PLAN.md`](./PROJECT_PLAN.md) §2 for the full mermaid diagram. In short:

- **Frontend**: React + Vite + TypeScript + Tailwind, PWA via `vite-plugin-pwa`. Mobile-first.
- **Backend**: Node + Express + TypeScript. Multer for image upload, Drizzle ORM + SQLite for storage, `express-rate-limit` for cost control.
- **Shared**: a `shared/` workspace with Zod schemas (single source of truth for the `Dish` shape) consumed by both ends.
- **LLM**: provider-neutral `LLMProvider` interface with three adapters — Anthropic Claude (full impl), OpenAI GPT-4o (skeleton), Google Gemini (skeleton). Switch via `LLM_PROVIDER` env var.

---

## Cost model & "don't-go-broke" checklist

This is a personal-budget portfolio project. Cost governance is treated as a first-class concern, not an afterthought. See [`PROJECT_PLAN.md`](./PROJECT_PLAN.md) §12 for full design. TL;DR:

### Per-call cost estimates (rough)

| Provider | Model | Input price (per 1M tok) | Output price (per 1M tok) | Approx. cost per menu analyze |
|---|---|---|---|---|
| Anthropic | claude-sonnet-4-6 | ~$3 | ~$15 | $0.02–0.06 |
| OpenAI | gpt-4o | ~$2.5 | ~$10 | $0.02–0.05 |
| Google | gemini-1.5-pro | ~$1.25 | ~$5 | $0.01–0.03 |

> Prices are approximate. Always check the provider's pricing page before trusting these numbers. Authoritative values live in `backend/src/services/llm/pricing.ts`.

A typical analyze call uses ~3000–4500 input tokens (image + prompt + tool schema) and ~1000–3000 output tokens (5–15 dishes × ~200 tok each).

### Don't-go-broke checklist (manual operator tasks)

- [ ] **Set a monthly Spend Limit** in your provider console (Anthropic ≥ $20 recommended). Hitting the limit returns errors instead of silently billing more.
- [ ] **Use a dedicated API key** for this project (named `menu-translator`). Don't reuse a key shared with other projects — easier to revoke if compromised.
- [ ] **`.env` is in `.gitignore`.** Run `git status` before every push. If `.env` shows up, **stop**, remove it, rotate keys.
- [ ] **Periodically inspect the `llm_calls` table** to spot anomalies:
  ```sql
  SELECT date(created_at) AS day, count(*) AS calls, sum(estimated_usd) AS cost_usd
  FROM llm_calls GROUP BY 1 ORDER BY 1 DESC LIMIT 7;
  ```
- [ ] **At deploy time (phase 5.5)**, switch `MONTHLY_QUOTA_PER_USER` to a finite value (default 30) so a single user can't drain your budget.

---

## Design highlights

> _Filled in phase 5.6 README rewrite._
>
> - Claude `tool_use` for hard-constrained structured output
> - Two-layer allergen detection (LLM + post-process keyword fallback)
> - Provider-neutral LLM abstraction + bring-your-own-key
> - Image hash dedup cache + client-side compression for cost control
> - PWA + mobile-first for traveler use cases

---

## License

TBD.
