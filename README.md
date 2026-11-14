# 🍽️ Smart Mess & Kitchen Management System

<div align="center">

![Smart Mess Banner](public/icon-192.png)

**A production-ready, AI-powered institutional food management platform**

Built for university hostels, hospitals, and large-scale institutional kitchens.

[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://typescriptlang.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-7-green?logo=mongodb)](https://mongodb.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-cyan?logo=tailwind-css)](https://tailwindcss.com)
[![Tests](https://img.shields.io/badge/Tests-73%20passing-brightgreen)](/)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

</div>

---

## ✨ Features

| Module | Description |
|--------|-------------|
| 🔐 **Authentication & RBAC** | JWT-based auth with 6 role levels and institution-scoped access |
| 📊 **Dashboard** | Real-time KPIs, inventory status, orders summary, waste tracker |
| 🗓️ **Weekly Menu Management** | 7-day menu calendar, meal planning, dish assignment |
| 📖 **Recipe Management** | Bill of Materials (BOM), portion scaling, ingredient requirements |
| 📅 **Academic Calendar** | Event registry, daily/weekly/monthly meal schedule views |
| 👥 **Student Management** | Enrollment, meal plans, dietary preferences, hostel allocation |
| ✅ **Meal Attendance** | QR/RFID/manual scanning with offline-first IndexedDB sync |
| 📈 **Demand Forecasting** | ML-based 7-day meal count predictions with seasonal factors |
| 🍳 **Kitchen Operations** | Preparation plans, ingredient indents, actual vs planned variance |
| 📦 **Inventory Management** | Stock tracking, movement history, shortage detection |
| 🗑️ **Food Waste Tracking** | Waste measurement, spoilage recording, cost impact |
| 💰 **Cost Analytics** | Per-meal cost, supplier analysis, 6-month financial overview |
| 🤖 **AI Kitchen Assistant** | Google Gemini-powered conversational insights and planning |
| 🔔 **Notifications & Jobs** | BullMQ background workers, cron-based forecasting jobs |

---

## 🚀 Tech Stack

### Frontend
- **Next.js 14** (App Router, Server Components)
- **TypeScript 5** (strict mode)
- **Tailwind CSS 3** (custom design system)
- **React 18** (hooks, concurrent features)
- **Recharts** (analytics charts)

### Backend
- **Next.js Route Handlers** (RESTful API)
- **MongoDB 7 + Mongoose** (multi-tenant data layer)
- **Redis + BullMQ** (job queues, caching)
- **JWT** (access + refresh token auth)
- **Zod** (schema validation)
- **bcryptjs** (password hashing)

### AI & Intelligence
- **Google Gemini AI** (demand insights, chat assistant)
- **Custom forecasting engine** (7-day predictions, ML factors)

### DevOps & Quality
- **Docker + Docker Compose** (containerized deployment)
- **Vitest** (unit + integration tests — 73 tests, 17 suites)
- **ESLint + TypeScript** (lint + typecheck)
- **Pino** (structured JSON logging)
- **Sentry** (error monitoring)

---

## 🏗️ Architecture

```
src/
├── app/
│   ├── (app)/              # Protected application routes
│   │   ├── dashboard/      # M0: Dashboard & KPIs
│   │   ├── menus/          # M1: Menu management
│   │   ├── attendance/     # M2: Meal attendance
│   │   ├── calendar/       # M3: Academic calendar
│   │   ├── forecast/       # M4+M5: Demand forecasting
│   │   ├── kitchen/        # M6+M7: Kitchen operations
│   │   ├── inventory/      # Inventory management
│   │   ├── recipes/        # Recipe & BOM management
│   │   ├── students/       # Student management
│   │   ├── users/          # User & role management
│   │   └── analytics/      # M8+M9: Waste & cost analytics
│   ├── (auth)/             # Public auth routes
│   │   ├── login/
│   │   └── forgot-password/
│   └── api/v1/             # REST API endpoints
│       ├── auth/           # Login, logout, refresh, me
│       ├── menus/          # Menu CRUD + weekly calendar
│       ├── recipes/        # Recipe + ingredient management
│       ├── attendance/     # Mark, sync, summary
│       ├── forecast/       # Daily/weekly predictions
│       ├── kitchen/        # Plans + actuals
│       ├── inventory/      # Stock + movements
│       ├── students/       # Student CRUD
│       ├── users/          # User management
│       ├── waste/          # Waste recording
│       ├── analytics/      # Overview metrics
│       ├── ai/             # Gemini insights + chat
│       └── reports/        # Data export
├── components/
│   ├── ui/                 # Reusable design system
│   │   ├── Card.tsx
│   │   ├── Badge.tsx
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Table.tsx
│   │   ├── Modal.tsx
│   │   ├── Skeleton.tsx
│   │   ├── EmptyState.tsx
│   │   └── AiAssistantModal.tsx
│   └── Toast.tsx
├── lib/
│   ├── mongodb.ts          # Database connection (pool 10–100)
│   ├── redis.ts            # Redis client
│   ├── cache.ts            # L1 in-memory + SingleFlight
│   ├── jwt.ts              # Token generation/verification
│   ├── auth.ts             # Auth middleware
│   ├── gemini.ts           # Google AI integration
│   ├── offline-attendance.ts # IndexedDB offline sync
│   └── ...
├── models/                 # Mongoose schemas
│   ├── User.ts
│   ├── Student.ts
│   ├── Menu.ts
│   ├── Recipe.ts
│   ├── Attendance.ts
│   ├── KitchenPlan.ts
│   ├── Inventory.ts
│   ├── Indent.ts
│   ├── WasteRecord.ts
│   └── ...
└── tests/                  # 17 test suites, 73 tests
```

---

## 👤 User Roles (RBAC)

| Role | Access Level |
|------|-------------|
| **Super Admin** | Full system access, all institutions |
| **Institution Admin** | Full access within institution |
| **Mess Manager** | Menu, recipes, kitchen, inventory, analytics |
| **Kitchen Staff** | Kitchen plans, actuals, attendance marking |
| **Attendance Operator** | Attendance marking and sync only |
| **Viewer** | Read-only access |

---

## 🛠️ Local Development Setup

### Prerequisites
- Node.js 18+
- MongoDB 7+ (local or Atlas)
- Redis 7+ (optional — degrades gracefully)
- npm 10+

### Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/RiteshVerma1102/smart-mess-kitchen-management-system.git
cd smart-mess-kitchen-management-system

# 2. Install dependencies
npm install

# 3. Set up environment
cp .env.example .env
# Edit .env — set JWT secrets and MongoDB URI

# 4. Start MongoDB (if running locally)
# Windows:
mongod --dbpath C:\data\db

# 5. Seed demo data
npm run seed

# 6. Start the development server
npm run dev
```

App runs at: **http://localhost:3000**

### Docker Quick Start

```bash
cp .env.example .env
# Set JWT secrets in .env
docker compose up --build
```

Services:
- Web: http://localhost:3000
- MongoDB: localhost:27017
- Redis: localhost:6379

---

## 🔑 Demo Accounts

After running `npm run seed`:

| Role | Email | Password |
|------|-------|----------|
| Super Admin | `admin@smartmess.edu` | `Admin@1234` |
| Mess Manager | `manager@smartmess.edu` | `Manager@1234` |
| Kitchen Staff | `kitchen@smartmess.edu` | `Kitchen@1234` |
| Attendance Operator | `operator@smartmess.edu` | `Operator@1234` |
| Viewer | `viewer@smartmess.edu` | `Viewer@1234` |

> ⚠️ Demo data only. Change all passwords before production deployment.

---

## 🧪 Testing

```bash
# Run all tests (17 suites, 73 tests)
npm test

# Run with coverage
npm run test:coverage

# Lint
npm run lint

# Type check
npm run typecheck

# Full quality gate
npm run lint && npm run typecheck && npm test && npm run build
```

---

## 🌍 Environment Variables

See [`.env.example`](.env.example) for all required variables.

| Variable | Description |
|----------|-------------|
| `MONGODB_URI` | MongoDB connection string |
| `REDIS_URL` | Redis connection URL |
| `JWT_ACCESS_SECRET` | JWT signing secret (min 32 chars) |
| `JWT_REFRESH_SECRET` | Refresh token signing secret |
| `ACCESS_TTL_SECONDS` | Access token TTL (default: 900s) |
| `REFRESH_TTL_SECONDS` | Refresh token TTL (default: 7 days) |
| `GEMINI_API_KEY` | Google Gemini AI API key |
| `FORECAST_CRON` | Forecast job schedule (cron) |
| `SENTRY_DSN` | Sentry error monitoring DSN |

---

## 📡 API Reference

All APIs at `/api/v1/`. Auth required unless noted.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/auth/login` | POST | Login (public) |
| `/api/v1/auth/logout` | POST | Logout |
| `/api/v1/auth/me` | GET | Current user profile |
| `/api/v1/dashboard/metrics` | GET | KPI summary |
| `/api/v1/menus` | GET/POST | List / create menus |
| `/api/v1/menus/weekly` | GET | Weekly calendar |
| `/api/v1/recipes` | GET/POST | Recipes list / create |
| `/api/v1/attendance` | GET/POST | Record attendance |
| `/api/v1/attendance/sync` | POST | Sync offline queue |
| `/api/v1/forecast/daily` | GET | Daily forecast |
| `/api/v1/kitchen/plans` | GET/POST | Kitchen plans |
| `/api/v1/inventory` | GET/POST | Inventory stock |
| `/api/v1/indents` | GET/POST | Purchase indents |
| `/api/v1/waste` | GET/POST | Waste records |
| `/api/v1/ai/insights` | POST | AI demand insights |
| `/api/v1/ai/chat` | POST | AI assistant chat |
| `/api/health` | GET | Health check (public) |
| `/api/ready` | GET | Readiness check (public) |

---

## 🏢 Project Status

| Check | Status |
|-------|--------|
| Tests | ✅ 73/73 passing |
| Build | ✅ 20 routes compiled |
| Lint | ✅ No errors |
| Type check | ✅ No errors |
| Security | ✅ `.env` ignored |

---

## 🗺️ Roadmap

- [ ] Vercel / Railway one-click deployment
- [ ] Multi-institution super admin console
- [ ] Mobile PWA for kitchen staff
- [ ] Supplier portal integration
- [ ] Advanced ML demand forecasting (Prophet model)
- [ ] WhatsApp / SMS notifications

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

<div align="center">

Made with ❤️ by [RiteshVerma1102](https://github.com/RiteshVerma1102)

</div>
