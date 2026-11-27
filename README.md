# SmartMess FoodFlow

> **Operating System for Indian University Messes, Hostels, and Institutional Dining Kitchens.**
> Plan Menu &rarr; Forecast Demand &rarr; Procure Real Stock &rarr; Cook to Station Kanban &rarr; Instant QR Attendance &rarr; Eliminate Food Waste.

---

## 1. System Architecture

- **Frontend**: TanStack Start + React 19 + Strict TypeScript + Tailwind CSS v4 + Lucide + Recharts
- **Authentication & Database**: Firebase Authentication (Google OAuth + Email/Password + Email Verification + Password Reset) and Cloud Firestore with multi-tenant `workspaces/{workspaceId}` security rules (`firestore.rules`)
- **AI & Weather (Free Tier Only)**:
  - Server-side `/api/gemini/*` endpoints calling Gemini (`gemini-4-hydrogen`, `gemini-3.1-flash-lite`) with `GEMINI_API_KEY` kept strictly in server environment variables
  - Automatic deterministic formula-based fallbacks when quota is exceeded or offline
  - Keyless Open-Meteo weather integration for tomorrow's meal turnout adjustments

---

## 2. Roles & Permissions

- **Admin**: Full workspace, team invites, billing, purchasing, kitchen, and audit access
- **Kitchen Head**: Menus, recipes, kitchen prep, waste logs, attendance, feedback, and forecasts
- **Store Keeper**: Inventory stock, FEFO expiry alerts, vendors, purchase orders, and stock movements
- **Accountant**: Monthly student billing, rebates, payments ledger, PO cost reviews, and financial reports
- **Student**: View menus, skip meals before IST cut-off, display rotating QR pass, request leave, and view own bill

---

## 3. Environment Variables

Only regional defaults and the server-side Gemini key are configured in `.env`:

```bash
APP_CURRENCY=INR
APP_LOCALE=en-IN
APP_TIMEZONE=Asia/Kolkata
GEMINI_API_KEY=
VITE_GOOGLE_AUTH_ENABLED=true
```

Firebase client configuration is read from `firebase-applet-config.json`.

---

## 4. Development & Verification

```bash
npm install
npm run dev
npm run typecheck
npm run test
npm run build
```
