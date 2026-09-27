# Gym Scoreboard - AGENTS.md

## Quickstart

### Dev server
```bash
docker compose up -d db      # Start PostgreSQL
npm install                  # Install deps (root + frontend + backend)
npm run dev                  # Runs: concurrently "npm run dev:web" "npm run dev:api"
# Frontend: http://localhost:3000, API: http://localhost:4000, DB: port 55432
```

### Build
```bash
npm run build                # Builds both frontend (next build) and backend (tsc)
npm run start                # Runs: concurrently "npm run start:api" "npm run start:web"
```

### Lint / Typecheck
```bash
npm run lint               # Runs tsc on both frontend and backend with --noEmit --incremental false
```

## Project Structure

This is a full-stack TypeScript project (not a monorepo with package.json per package):

- `backend/` - Node/Express API (TS source in `backend/src/`, compiled to `backend/dist/`)
- `frontend/` - Next.js app (TSX/TS in `frontend/app/`, `frontend/components/`, `frontend/lib/`)
- `docker-compose.yml` - defines `db` service (Postgres 16, port 55432)
- `sql/schema.sql` - PostgreSQL schema migration
- `sql/seed.sql` - seed data

### Backend entrypoints
- `backend/src/index.ts` - Express app setup, middleware, error handling, starts on `env.PORT`
- `backend/src/routes.ts` - All API routes mounted under `/api`
- Key services: `workout-service.ts`, `auth-service.ts`, `workout-image-service.ts`
- Key controllers: `workout-controller.ts`, `auth-controller.ts`, `workout-image-controller.ts`
- Repositories: `workout-repository.ts`, `auth-repository.ts`, etc.
- Validators: `validation.ts` (Zod schemas for create workout, submit score, login, register)
- Agents (NEW): `ocr-agent.ts`, `parser-agent.ts` - OpenAI image parsing for WOD extraction

### Frontend entrypoints
- `frontend/app/layout.tsx` - Root layout with Google fonts, sets metadata
- `frontend/app/page.tsx` - Home renders `<AuthPage />`
- `frontend/components/dashboard-view.tsx` + `dashboard-shell.tsx` - Main dashboard with WOD preview, leaderboard, athlete summary
- `frontend/components/workout-submit-view.tsx` - WOD builder (manual or photo + AI extraction)
- `frontend/components/score-submit-view.tsx` - Dedicated score loading screen (NEW)
- `frontend/lib/api.ts` - `apiFetch()` wrapper with `NEXT_PUBLIC_API_BASE_URL`
- `frontend/lib/types.ts` - Shared types (AthleteSummary, DashboardResponse, WorkoutBlockType, etc.)

### Key DB tables (from schema.sql)
- `athletes` - id, name, email, password_hash, level, favorite_format, created_at
- `workouts` - id, title, workout_date, workout_type, ranking_order, description
- `scores` - id, workout_id, athlete_id, score_value, score_display, note, rank, is_personal_record

## Environment Variables

Copy `.env` from `.env.example`. Must set:

```
PORT=4000
DATABASE_URL=postgres://postgres:postgres@localhost:55432/gym_scoreboard
# Neon prod example:
# DATABASE_URL=postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require
CLIENT_URL=http://localhost:3000
# Para prod con Vercel + Neon, permite múltiples orígenes:
# CLIENT_URL=http://localhost:3000,https://tu-app.vercel.app
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
# En Vercel setear NEXT_PUBLIC_API_BASE_URL a URL del backend externo (ej. Render/Railway/Fly)
OPENAI_API_KEY=sk-...            # REQUIRED for image extraction
OPENAI_MODEL=gpt-4.1-mini
```

## Deploy

### Opción A (actual) — Frontend en Vercel + DB Neon, Backend separado, dev local con concurrency

- **Vercel**: `vercel.json` en root con `buildCommand: "npm run build:web"` y `outputDirectory: "frontend/.next"` (`framework: nextjs`). En Vercel Dashboard setear `NEXT_PUBLIC_API_BASE_URL` a URL del backend desplegado y `CLIENT_URL` si aplica. No tocar `docker-compose.yml`.
- **Neon**: crear proyecto Neon, copiar `DATABASE_URL` con `?sslmode=require`. `backend/src/db.ts` detecta `neon.tech`/`sslmode=require`/`pooler.supabase.com` y activa `ssl: {rejectUnauthorized:false}` automáticamente.
- **Backend prod**: desplegar `backend` en Render/Railway/Fly con `DATABASE_URL` de Neon + `CLIENT_URL` con origen de Vercel (`https://tu-app.vercel.app`) + `OPENAI_*`. Ejecutar `npm run db:migrate` apuntando a Neon una vez.
- **Local**: sigue `docker compose up -d db && npm run dev` (concurrently `dev:web` + `dev:api`). `DATABASE_URL` local sigue apuntando a `localhost:55432`.

### Comandos Vercel

```bash
vercel --prod                # deploy frontend
vercel env add NEXT_PUBLIC_API_BASE_URL production
vercel env add DATABASE_URL production # solo si centralizas, para preview no necesario
```

## Workflows

### Creating a new WOD
1. Go to `/workouts/new` (or "Cargar WOD" from dashboard)
2. Choose "Formulario" or "Subir foto" tab
3. If manual: set date, add blocks with exercises, reps/time_cap/loads, then "Publicar WOD"
4. If photo: upload PNG/JPG/WebP < 8MB, AI extracts structure, then edit preview + "Publicar WOD"
5. After publish, navigation routes to `/scores/new` for score entry

### Submitting a score
- Go to `/scores/new` (or "Cargar score" from dashboard)
- Select a WOD + athlete, enter score value + display name
- API: `POST /api/workouts/:workoutId/scores`
- Backend: `submitWorkoutScore()` in `workout-service.ts` (transactional, recalculates ranking, detects PRs)

### Image + OpenAI extraction
- Backend service: `workout-image-service.ts:extractWorkoutFromImage()`
- Requires `OPENAI_API_KEY` in env
- Uses `gpt-4.1-mini` via OpenAI Responses API
- Parses image → `CrossfitClassSchema` (Zod validation) → returns `{ workoutDate, blocks, usedFallbackDate }`
- Frontend: `handleExtractWorkoutFromPhoto()` in `workout-submit-view.tsx` calls `/api/workouts/extract-image`

## Important Conventions & Quirks

- **Authentication**: `x-athlete-id` header passed from frontend (via `frontend/lib/auth.ts` `buildAuthHeaders()`). Backend validates via `request-auth.ts:getAuthenticatedAthleteId()`.
- **HTTP errors**: `HttpError` class (`backend/src/errors.ts`) with `statusCode` property. Caught in `index.ts` error handler → returns appropriate status + JSON.
- **Zod validation**: All payloads validated with Zod. `validation.ts` has `createWorkoutSchema`, `submitWorkoutScoreSchema`, `extractWorkoutImageSchema`, `loginSchema`, `registerSchema`.
- **Ranking logic**: `workout-service.ts:recalculateWorkoutRanking()` sorts scores ASC for amrap, DESC for other types. Detects PRs vs previous best.
- **Tabata special case**: In `validation.ts`, tabata format forces all exercises to `targetType = "time_cap"`. Frontend enforces this too (disables reps input for tabata).
- **Image extraction**: 8MB max, PNG/JPG/WebP only. If no date detected in image, uses today's date (`usedFallbackDate` flag).
- **No test suite** in the repo. Only `node_modules` test files. If you need to verify changes, run `npm run lint` and manual API checks.
- **Docker**: `db` container on port 55432. Ensure it's running before `npm run db:migrate` or `npm run db:seed`.
- **Branch**: Current branch is `formulario-carga` with recent commits separating WOD publication from individual score loading.

## Commands Cheatsheet

| Action | Command |
|---|---|
| Start dev | `npm run dev` |
| Start API only | `npm run dev:api` |
| Start web only | `npm run dev:web` |
| Build all | `npm run build` |
| Lint/typecheck | `npm run lint` |
| DB migrate | `npm run db:migrate` |
| DB seed | `npm run db:seed` |
| OpenAI image extraction | Ensure `OPENAI_API_KEY` set, then upload photo in WOD builder |
| Score submission | `POST /api/workouts/:workoutId/scores` with `x-athlete-id` header |