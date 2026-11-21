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

---

## 8. Master Delivery Checklist (Section 10)

| Module / Requirement | Status | Details & Notes |
| :--- | :---: | :--- |
| **Split-Screen Enterprise Auth** | **Works** | `/login`, `/signup`, `/forgot-password`, `/reset-password` |
| **Password Strength Meter** | **Works** | 4-tier score (Weak, Fair, Good, Strong) with visual bar |
| **Email Verification & Cooldown** | **Works** | 60-second cooldown timer on resend button |
| **5-Step Onboarding Wizard** | **Works** | `/onboarding` (Manager wizard + Student join code paths) |
| **Student QR Pass & Portal** | **Works** | `/student` (Mobile-first, Today/Tomorrow menu, skip meals, bill) |
| **Student Shareable Join Link** | **Works** | `/join/$code` (Pre-fills join code for rapid onboarding) |
| **System Security & Audit Log** | **Works** | `/audit` (Immutable log with filter by action & CSV/PDF export) |
| **Global Command Palette** | **Works** | `Cmd/Ctrl+K` dialog with instant keyboard module navigation |
| **"Ask FoodFlow" AI Copilot** | **Works** | Side drawer with contextual kitchen analysis prompts |
| **English / Hindi Language Toggle** | **Works** | Top header & student portal language switcher |
| **Mathematical Demand Engine** | **Works** | `forecast.ts` (8-week rolling history + DOW + events + buffer) |
| **Offline IndexedDB Attendance** | **Works** | `offline-attendance.ts` (Instant queue with background sync) |
| **Real File Exports** | **Works** | `export-helpers.ts` (UTF-8 BOM CSV, Excel XML, printable PDF) |
| **Strict TypeScript & Test Suite** | **Works** | **48/48 tests passing**, zero type errors, clean build |

---

## 9. External Configuration Requirements (What You Need to Provide)

1. **Google OAuth Configuration**:
   - Open [Google Cloud Console](https://console.cloud.google.com/) &rarr; APIs & Services &rarr; Credentials.
   - Create an OAuth 2.0 Client ID (Web Application).
   - Add Authorized JavaScript Origin: `http://localhost:8080` (and your production domain).
   - Add Authorized Redirect URI: `https://vqxzkirixwteljacfrfi.supabase.co/auth/v1/callback`.
   - In Supabase Dashboard &rarr; Authentication &rarr; Providers &rarr; Google: Paste your Client ID and Client Secret, then toggle Enable.

2. **Transactional Email (Resend / SMTP)**:
   - In Supabase Dashboard &rarr; Authentication &rarr; Email Settings: Add custom SMTP credentials (e.g. Resend, SendGrid) to remove the default 30 emails/hour Supabase rate limit.

3. **Custom Domain (Production)**:
   - In your hosting provider (Vercel, Cloudflare, etc.), map your custom domain (e.g., `app.smartmess.edu`).
   - In Supabase Dashboard &rarr; Authentication &rarr; URL Configuration, add your production domain to Site URL and Redirect URLs.

---

## 10. Known Limitations & Suggested Next Features

1. **Biometric Face / RFID Hardware Turnstiles**:
   - Currently, attendance runs via camera QR scanner and manual student roll search. Integration with physical TCP/IP biometric turnstiles (ZKTeco/Essl) can be added via an edge relay agent.
2. **Push Notifications**:
   - Web Push API (PWA service worker) can be wired for morning menu alerts ("Today's lunch menu has been published!").
