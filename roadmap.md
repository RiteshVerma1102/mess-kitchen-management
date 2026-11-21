# FoodFlow Pro Max — Production Implementation Roadmap

## Phase 1: Foundation, Auth & Tenancy
- [x] Warm food-tech design system in `src/styles.css` (Deep teal `#087E8B`, Saffron `#FF7A1A`, Forest `#0F3D3A`, Cream `#FFF6E5`, Mint, Butter, Peach, Lavender, OKLCH, Fraunces + Inter + Bricolage Grotesque + Noto Sans Devanagari)
- [x] Split-screen enterprise authentication (`/login`, `/signup`, `/forgot-password`, `/reset-password`)
- [x] Password strength meter (Length, Caps, Numbers, Symbols) with live progress bar
- [x] Email verification screen with 60-second cooldown countdown timer
- [x] Native Supabase Google OAuth integration
- [x] 5-Step Institution Onboarding Wizard (`/onboarding`) for canteen managers
- [x] Student Join portal with pre-filled mess code (`/join/$code`)
- [x] Multi-tenant role boundary in `foodflow_user_roles` with tenant isolation

## Phase 2: Stock, Inventory & Purchasing
- [x] Food Inventory items with categories, minimum restock levels, units, and unit costs
- [x] Stock movement ledger with mandatory reason tracking (Stock In, Stock Out, Wastage, Spoilage, Adjustment)
- [x] Supplier directory with contact details and lead times
- [x] Purchase order workflow (Draft &rarr; Approved &rarr; Ordered &rarr; Received &rarr; Closed)
- [x] CSV bulk import/export for inventory and suppliers (`csv.ts`)

## Phase 3: Menus, Kitchen Board & Attendance
- [x] Weekly multi-hall menu planning with meal types (Breakfast, Lunch, Snacks, Dinner)
- [x] Diet tags (Veg, Non-Veg, Jain) and allergen warnings (Gluten, Dairy, Nuts)
- [x] Recipe engine with ingredient scaling, headcounts, and live cost-per-plate (`costing.ts`)
- [x] Kitchen operations Kanban board (To Prepare &rarr; Cooking &rarr; Ready &rarr; Served)
- [x] Camera QR Attendance scanner interface
- [x] Offline-first attendance queue in IndexedDB with auto-sync and local fallback (`offline-attendance.ts`)

## Phase 4: Demand Forecasting, Waste & Analytics
- [x] Mathematical demand forecasting engine (`forecast.ts`, `forecast-engine.ts`)
  - Day-of-week seasonality (8-week rolling history)
  - Turnout ratio multipliers (Breakfast 68%, Lunch 88%, Dinner 84%, Snacks 42%)
  - Campus exam, holiday, festival calendar impact weights
  - Safety buffer (8%) and Mean Absolute Percentage Error (MAPE) tracking
- [x] Daily food waste tracking (Prepared vs Served vs Leftover vs Spoiled)
- [x] Kitchen cost analytics, COGS trends, and cost-per-plate reporting
- [x] Real file downloads: UTF-8 BOM CSV, Excel XML, and printable A4 PDF (`export-helpers.ts`)

## Phase 5: Student Portal, Security & AI Assistant
- [x] Mobile-first Student Dining Portal (`/student`):
  - Today & Tomorrow menu with diet indicators and calorie counts
  - Interactive meal rating (1-5 stars + feedback comment)
  - Meal skip / Leave request notice with automated monthly rebate calculation
  - Personal digital QR pass with dynamic rotating token
  - Monthly mess bill breakdown and official PDF receipt download
- [x] Immutable System Security & Operational Audit Log (`/audit`) with CSV/PDF export
- [x] Global Command Palette (`Cmd/Ctrl+K` with `cmdk`) for instant keyboard navigation
- [x] "Ask FoodFlow" AI Assistant copilot panel with kitchen analytics prompts
- [x] Realistic Indian mess demo dataset: 3 halls, ~300 students, 60 inventory items, 40 recipes, 5 suppliers

## Phase 6: PWA, Internationalization & Verification
- [x] English + Hindi (i18n) language toggle
- [x] WCAG AA contrast, 44px tap targets, keyboard navigation
- [x] Clean production build (**✓ built in 3.06s, exit code 0**)
- [x] 100% test suite passing (**48/48 unit and routing tests passed**)
