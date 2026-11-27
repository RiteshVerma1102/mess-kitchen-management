# FoodFlow — Implementation Roadmap

## Phase 1: Auth, Multi-Tenancy & Security
- [x] Warm food-tech design system in `src/styles.css`
- [x] Split-screen authentication (`/login`, `/signup`, `/forgot-password`, `/reset-password`)
- [x] Firebase Authentication: Google OAuth (popup + redirect fallback), Email/Password, verification, reset, persistence
- [x] 5-Step Institution Onboarding Wizard (`/onboarding`) & Shareable Student Join Code (`/join/$code`)
- [x] Multi-tenant Firestore isolation (`workspaces/{workspaceId}`) with 5 RBAC roles (`admin`, `kitchen_head`, `store_keeper`, `accountant`, `student`)

## Phase 2: Stock, Inventory & Purchasing
- [x] Food Inventory items with categories, minimum restock alerts, units, unit costs, and FEFO expiry alerts
- [x] Stock movement ledger with mandatory reason tracking
- [x] Supplier directory and purchase order workflow (Pending &rarr; Approved &rarr; Ordered &rarr; Received)
- [x] CSV bulk import/export (`csv.ts`)

## Phase 3: Menus, Kitchen Board & Attendance
- [x] Weekly multi-hall menu planning with meal types (Breakfast, Lunch, Snacks, Dinner)
- [x] Recipe engine with ingredient scaling and cost-per-plate (`costing.ts`)
- [x] Kitchen operations Kanban board and offline-first attendance queue (`offline-attendance.ts`)

## Phase 4: Demand Forecasting, Waste & Free-Tier Gemini AI
- [x] Tomorrow Demand Forecasting (`forecast.ts`, Open-Meteo weather + Gemini + deterministic formula fallback)
- [x] "Ask FoodFlow" AI Copilot drawer grounded in non-PII mess summaries with caching & debouncing
- [x] Menu suggestions (stock + cost per plate + student ratings) and Waste tips from the food waste log
- [x] Daily AI usage counter in Settings

## Phase 5: Student Portal, Billing, i18n & Verification
- [x] Mobile-first Student Dining Portal (`/student`) with IST cut-offs, rotating QR pass, tiffin option, leave rebates, and bills
- [x] English + Hindi (i18n) language switcher across all modules
- [x] Unit & integration test suite (`vitest`)
