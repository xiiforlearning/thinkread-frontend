# ThinkRead — Mini App and dashboard (frontend)

The frontend of [thinkread-backend](https://github.com/xiiforlearning/thinkread-backend) (NestJS
API + Telegram bot), split into its own repository for Vercel. Keep `src/api/types.ts` and
`src/admin/api.ts` in sync with the backend serializers by hand.

Two pages in one Vite project: the students' Telegram Mini App (`index.html`) and the owner's /
teachers' web dashboard (`admin.html`). React 19 + Vite 7 + TypeScript, TanStack Query, React
Router (hash routing). The UI is the **ThinkRead Design System** (artifact): `src/ui/tokens.css` and
`src/ui/components.css` are copied from it verbatim, `src/ui/components.tsx` is the React port of
its component bundle. Screens follow the artboards of «ThinkRead — кликабельный дизайн».

## Run

```bash
pnpm install
cp .env.example .env        # VITE_API_URL, VITE_DEMO
pnpm dev                    # http://localhost:5173
```

- **Inside Telegram** the app signs in with `initData` (`POST /auth/webapp`) and talks to the
  backend at `VITE_API_URL`.
- **Outside Telegram** a production build shows the "open in Telegram" screen with a link to
  `VITE_BOT_USERNAME`; with `?demo=1` in the URL or `VITE_DEMO=1` at build time it runs on
  in-memory demo data (`src/api/mock.ts`) with the same API contract — nothing to deploy to
  show the UI. The dashboard offers its demo buttons under the same condition. `?demo=pending` shows the first
  login (name form), `?demo=not_member` the "no access" screen, `?demo=staff` the teacher's
  hand-over to the dashboard.

`pnpm build` → `dist/` (static, relative paths — any static host works; `base: './'`).

## Deploy (Vercel)

Import this repository in Vercel: framework **Vite** (auto-detected, `vercel.json` pins the
commands), root directory `/`. Environment variables:

| Variable | Value |
|---|---|
| `VITE_API_URL` | public URL of the backend, e.g. `https://thinkread-api.up.railway.app` |
| `VITE_BOT_USERNAME` | bot username without `@` — the "open in Telegram" button when the site is visited in a plain browser |

Every push to `main` redeploys. The Mini App is the site root (`https://<project>.vercel.app/`), the
dashboard is `…/admin.html`. Then in the backend set `WEBAPP_URL` to the site root and
`CORS_ORIGINS` to the origin (the bot sets its own menu button from `WEBAPP_URL`; the dashboard
signs in with a code the bot sends, so BotFather needs nothing else). At run time `?api=https://…` in the page URL overrides the API
address (remembered in localStorage; `?api=` forgets it) — handy for a local backend behind a
tunnel. `.github/workflows/pages.yml` (manual run) is a fallback on GitHub Pages.

## Dashboard (`admin.html`)

`http://localhost:5173/admin.html` — the web dashboard for Рустам and the teachers, on the same
design system and the `/admin/*` API (`src/admin/api.ts` mirrors `admin/serializers.ts`).

- **Sign-in**: a one-time 6-digit code the bot sends in Telegram — «Прислать код» calls
  `POST /auth/code/request` (the owner gets a DM), a teacher writes anything to the bot and gets
  one back; the code goes to `POST /auth/code/verify` and only OWNER / TEACHER get a JWT (kept in
  localStorage). Nothing to configure in BotFather. For local work paste a token from `pnpm dev:token owner` into «Войти по токену
  разработчика». **Demo**: the «Демо» buttons, `?demo=1` or `VITE_DEMO=1` run `MockAdminApi`
  (`src/admin/mock.ts`) — the school of the artboards, no backend.
- **Screens** (`src/admin/screens/`): Overview (norm rates, health by group, 8-week chart, top
  readers, attention list), Students (list pane + card: rename / archive / recheck, quiet flags,
  calendar, reports feed, vocabulary, AI chat), Flags (inbox + flagged report vs previous ones,
  «проверено» / «ложная тревога»), Groups (levels, membership checks, teacher word lists),
  Settings (owner: norms, reminders, health thresholds, staff, AI spend).
- The teacher's AI chat (`POST /admin/students/:id/chat`, history kept in memory) and the parents'
  report (`…/parent-report`) answer from facts the backend computes; the demo answers from the mock.
  Settings → «Рассылки» runs the reminders and the weekly summary on demand (owner).
- Teachers see only their groups (the API scopes everything); the Settings page is owner-only.

## Layout

```
src/
├── api/        types.ts (API shapes), client.ts (Api interface + HttpApi), mock.ts (MockApi)
├── admin/      the dashboard: api.ts (AdminApi + HttpAdminApi), mock.ts, session.tsx, Shell.tsx,
│               Login.tsx, format.ts, screens/{Overview,Students,Flags,Groups,Settings}.tsx
├── app/        session.tsx (sign-in, demo switch), hooks.ts (queries, BackButton), Shell.tsx (Screen frame)
├── screens/    Onboarding, NotRegistered, Main, Cards, Dictionary, Word, AddWords, TeacherWords,
│               Reports, SubmitReport, Method, Profile
├── telegram/   webapp.ts — typed wrapper over window.Telegram.WebApp (theme, BackButton, haptics)
├── lib/        dates.ts (ru formatting, Asia/Tashkent), labels.ts (levels, methods, method steps)
└── ui/         tokens.css, components.css, components.tsx, app.css, admin.css — the design system
```

Rules: every colour / radius / size is a token from `tokens.css`; user-facing text is Russian; the
API is the source of truth for data shapes (`src/api/types.ts` mirrors `me/serializers.ts` in the
backend). Cards go through `/me/cards` (one attempt at a time; the mock reproduces the same rules).

## Telegram setup

1. Deploy `dist/` over HTTPS; set the same URL as `WEBAPP_URL` in the backend `.env`.
2. In @BotFather: `/newapp` (or Menu Button → Web App URL) pointing to that URL.
3. `CORS_ORIGINS` in the backend must include the Mini App origin.
