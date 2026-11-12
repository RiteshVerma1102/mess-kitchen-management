# P05 - Meal Demand Forecasting and Food-Waste Reduction Platform (Track J)

Next.js 14 (App Router) + TypeScript + MongoDB + Redis/BullMQ. Prompt 2 foundation.

## One-command start (Docker)
```bash
cp .env.example .env        # then set the two JWT secrets (openssl rand -base64 48)
docker compose up --build   # web :3000, worker, MongoDB (replica set), Redis
```
Check: http://localhost:3000/api/health and /api/ready (ready = Mongo + Redis reachable).

## Local dev without Docker
```bash
cp .env.example .env
docker compose up -d mongo redis
npm install
npm run dev          # web
npm run worker:dev   # scheduled jobs (separate terminal)
```

## Quality gates
```bash
npm run lint && npm run typecheck && npm run test:coverage && npm run build
```
CI (`.github/workflows/ci.yml`) runs lint, typecheck, tests with a coverage gate, `npm audit --audit-level=high`, build, secret scan, Docker build.

## Architecture rules (enforced in code)
- Modular monolith: `src/modules/<name>` (M1-M9). Other modules import only from a module's `index.ts`.
- Business logic in `*.service.ts`, testable without HTTP. Routes are thin.
- Every document has `institutionId`; use `tenantRepo()` so the tenant filter cannot be forgotten.
- Money = integer paise (`src/lib/money.ts`). Time = UTC stored, IST displayed.
- Every endpoint goes through `protectedRoute(permission, handler)`: auth, rate limit, RBAC.
- Audit log is append-only (`src/core/audit`).
- Config only from environment variables, validated by Zod (`src/config/env.ts`).

## Layout
```
src/app/api/{health,ready,v1/dishes}   routes
src/core/{auth,rbac,audit,tenant}      cross-cutting
src/lib                                money, time, logger, db, redis, http, rate-limit, errors
src/modules/menus                      M1 example vertical slice (dishes) - copy this pattern
src/modules/{attendance,calendar,analysis,forecasting,planning,actuals,waste,reporting}
src/worker                             BullMQ repeatable jobs (daily forecast, reminders)
```
Next: Prompt 3 (data models, seed, synthetic history) then Prompt 4 (M1/M3 APIs + login).
