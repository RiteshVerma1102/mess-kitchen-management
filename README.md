# SmartMess FoodFlow Pro Max

> **Production-grade Operating System for Indian University Messes, Hostels, and Corporate Dining Kitchens.**
> Plan Menu &rarr; Forecast Demand &rarr; Procure Real Stock &rarr; Cook to Station Kanban &rarr; Instant QR Attendance &rarr; Eliminate Food Waste.

---

## 1. System Architecture

```text
                                 [ Browser Client ]
                                          │
                  ┌───────────────────────┴───────────────────────┐
                  ▼                                               ▼
         [ TanStack Start ]                             [ Offline IndexedDB ]
        (React 19 + Vite 8)                             (Attendance Scans Queue)
                  │                                               │
                  │ (Strict TypeScript + Zod)                     │ (Auto Sync)
                  ▼                                               ▼
     [ Supabase Edge / Server Functions ] ──────────────► [ PostgreSQL 15+ ]
       - Mathematical Demand Forecasting                     - Row Level Security (RLS)
       - Inventory Movement Ledger                           - Immutable Audit Log
       - Gemini Tool-Calling Assistant                       - Atomic SQL Functions
```

---

## 2. Tech Stack

- **Frontend**: TanStack Start + React 19 + TypeScript (Strict) + Tailwind CSS v4 + shadcn/ui + Lucide + Recharts + TanStack Query + React Hook Form + Zod + Date-fns + Sonner
- **Design Tokens**: Custom Food-Tech Palette (Teal `#087E8B`, Saffron `#FF7A1A`, Deep Forest `#0F3D3A`, Cream `#FFF6E5`, Mint, Butter, Peach, Lavender)
- **Typography**: Bricolage Grotesque (Headings), Fraunces (Serif Italic Accent), Inter (Body & Data UI), Noto Sans Devanagari (Hindi)
- **Backend & Database**: Supabase PostgreSQL with full Row Level Security (RLS), triggers, atomic RPC functions
- **Authentication**: Native Supabase Google OAuth + Email/Password + Email confirmation + Session persistence
- **Testing**: Vitest unit & integration test suite

---

## 3. Roles & Permission Matrix

| Module / Area | Institution Admin | Mess Manager | Kitchen Staff | Attendance Operator | Student | Viewer |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Institution Settings & Halls** | Read / Write | Read | &mdash; | &mdash; | &mdash; | &mdash; |
| **User Roles & Audit Logs** | Read / Write | Read | &mdash; | &mdash; | &mdash; | &mdash; |
| **Menu Planning & Recipes** | Read / Write | Read / Write | Read | Read | Read (Published) | Read |
| **Inventory & Stock Movements** | Read / Write | Read / Write | Read / Write (Adjust) | &mdash; | &mdash; | Read |
| **Suppliers & Purchase Orders** | Read / Write | Read / Write | Read | &mdash; | &mdash; | Read |
| **Kitchen Kanban & Actuals** | Read / Write | Read / Write | Read / Write | &mdash; | &mdash; | Read |
| **Attendance Kiosk** | Read / Write | Read / Write | Read | Read / Write | Own pass only | Read |
| **Students & Billing** | Read / Write | Read / Write | &mdash; | Read | Own bill only | Read |
| **Forecasting & Analytics** | Read / Write | Read / Write | Read | &mdash; | &mdash; | Read |

*Note: Role enforcement is enforced in PostgreSQL Row-Level Security (RLS) policies and `foodflow_user_roles` table, not merely in the browser UI.*

---

## 4. Environment Variables Setup

Create a `.env` file in the root directory (based on `.env.example`):

```bash
# 1. Supabase Client Keys (Exposed to browser)
VITE_SUPABASE_URL="https://<your-project-id>.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="<your-anon-key>"

# 2. Supabase Server Secret (Server functions & triggers only)
SUPABASE_SERVICE_ROLE_KEY="<your-service-role-key>"

# 3. AI Gateway / Gemini API Key (Server only)
AI_GATEWAY_KEY="<your-gemini-or-lovable-gateway-key>"
GEMINI_API_KEY="<your-gemini-api-key>"

# 4. Regional Institutional Settings
APP_TIMEZONE="Asia/Kolkata"
APP_CURRENCY="INR"
APP_LOCALE="en-IN"
```

---

## 5. Development & Testing Commands

```bash
# Install dependencies
npm install --legacy-peer-deps

# Run local development server
npm run dev

# Run Vitest test suite (Unit & Integration tests)
npm run test

# Build production bundle with Vite & Nitro
npm run build

# Preview production build locally
npm run preview
```

---

## 6. How to Connect Your Own Supabase Project

1. **Create a Supabase Project**: Go to [https://supabase.com](https://supabase.com) and create a project.
2. **Apply Migrations**:
   Run the idempotent SQL files located in `drizzle/migrations/` in numerical order (`0000` through `0007`) in the Supabase SQL Editor.
3. **Configure Google OAuth**:
   - In Supabase Dashboard &rarr; Authentication &rarr; Providers &rarr; Google: Enable Google sign-in.
   - Add your Google Client ID and Client Secret from Google Cloud Console.
   - Add your authorized redirect URI: `https://<your-project-id>.supabase.co/auth/v1/callback` and `http://localhost:5173/auth/callback`.
4. **Configure Email Provider**:
   - In Supabase Dashboard &rarr; Authentication &rarr; Email Templates: Customize your confirmation and password reset links.

---

## 7. Demo Accounts Matrix

When using illustrative sample mode or demo seed data:

| Role | Email | Password | Primary Screen |
| :--- | :--- | :--- | :--- |
| **Institution Admin** | `admin@smartmess.edu` | `MessAdmin@2026` | Overview, Settings, Users, Audit |
| **Mess Manager** | `manager@smartmess.edu` | `MessManager@2026` | Forecast, Menu Planning, POs |
| **Kitchen Head** | `kitchen@smartmess.edu` | `KitchenStaff@2026` | Kitchen Kanban, Stock Adjust |
| **Attendance Operator**| `counter@smartmess.edu` | `CounterPass@2026` | Live Scanner Kiosk, Swipes |
| **Hostel Resident** | `student@smartmess.edu` | `StudentPass@2026` | Student Pass, Menu, Feedback |
