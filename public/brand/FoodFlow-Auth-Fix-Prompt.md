# FOODFLOW — AUTH FIX + NEW "F" LOGO + SELF-TEST PROMPT

> Paste this whole file in one message. Attach the 5 logo files from the `logo/` folder (`foodflow-mark.svg`, `foodflow-logo-full.svg`, `foodflow-logo-full.png`, `foodflow-mark-1024.png`, `favicon-64.png`) with it.

You are fixing the authentication of the FoodFlow-ProMax project. I run it locally at `http://localhost:8080` and it is connected to **my own Supabase project** (`https://vqxzkirixwteljacfrfi.supabase.co`). Read the current code of `/signup`, the sign-in tab, the auth/session hooks, `src/integrations/supabase/*`, the migrations and the homepage nav first. Then fix ALL the problems below, **test every flow yourself**, and only then tell me it is done. Do not ask me questions. Do not break the existing design system, homepage or `src/lib/domain/*` tests.

---

## PROBLEM 1: "Continue with Google" shows a JSON error

Opening the Google button goes to `…supabase.co/auth/v1/authorize?provider=google&redirect_to=http://localhost:8080/auth/callback` and shows:

`{"code":400,"error_code":"validation_failed","msg":"Unsupported provider: missing OAuth secret"}`

**Cause:** the Google provider is not configured in my Supabase project (no Client ID / Secret). That part I will do in the dashboards (steps in section 6). The CODE must still be correct and must never leave the user on a raw JSON page. Do this:

1. Because the project now uses my own Supabase (not Lovable Cloud), do NOT use `@lovable.dev/cloud-auth-js` for Google. Use `supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/auth/callback`, queryParams: { prompt: "select_account" } } })`. Remove the Lovable-only Google path from the sign-in UI (keep the package only if something else still needs it).
2. Create the route **`/auth/callback`**: it exchanges the PKCE code for a session (`exchangeCodeForSession` or `getSession` after `detectSessionInUrl`), reads `error` / `error_description` from the URL and shows a friendly error card with a "Back to sign in" button, then redirects: user with an institution → `/app` (or `/student` for student role); user without an institution → `/onboarding`. It must never hang on a spinner: add a 15 second timeout with a retry button.
3. Add an env flag `VITE_GOOGLE_AUTH_ENABLED` (default `true`). If `false`, hide the Google button and the "or continue with email" divider. Document it in `.env.example`.
4. If the OAuth start returns an error (provider disabled, network), catch it, stop the loading state and show a clear toast: "Google sign-in isn't set up for this workspace yet. Use email and password." Never show raw JSON.
5. After Google login for a NEW user (no profile institution), send them to `/onboarding` where they create the workspace (name + type) or join with a code.

## PROBLEM 2: "Create FoodFlow Workspace" and "Sign In to FoodFlow" spin forever

Both buttons show a loading spinner and nothing happens. Find the root cause and fix it properly. Likely causes to check and fix, in this order:

1. **Loading state never resets.** Every submit handler must use `try { … } catch (e) { show error } finally { setLoading(false) }`.
2. **Supabase request hangs or fails silently.** Wrap auth calls with a 20 second timeout (AbortController or `Promise.race`) that shows "Taking too long. Check your internet or try again." Log the real error to the console with a clear prefix `[auth]`.
3. **Sign-up with email confirmation ON gives no session.** Then calling `create_institution` right after `signUp` fails with "Not signed in" or hangs. Fix the flow like this:
   - Call `supabase.auth.signUp({ email, password, options: { data: { display_name: fullName, pending_institution_name, pending_institution_type }, emailRedirectTo: `${origin}/auth/callback` } })`.
   - If a session is returned (confirmation OFF) → call `create_institution` immediately → go to `/onboarding` step 2 or `/app`.
   - If no session (confirmation ON) → show a full "Check your email" screen with the email shown, a **Resend email** button (60 second cooldown) and "Use a different email".
   - After the user confirms and signs in for the first time, if they have no membership and `user_metadata.pending_institution_name` exists, create the institution automatically (idempotent: never create two) and clear the pending values. Put this in one `bootstrapWorkspace()` function used by `/auth/callback`, login and onboarding.
   - Handle "User already registered" (show "Account exists. Sign in instead." with a link) and weak password errors from Supabase.
4. **Database not ready on my Supabase.** The functions `create_institution`, `join_institution`, `handle_new_user` and the tables from migration `0000` may not exist in my project. Create an ordered `supabase/schema.sql` (all migrations combined, idempotent with `if not exists` / `create or replace`) that I can paste once into the Supabase SQL editor. Also add a **startup health check** (dev and prod): verify env vars exist, and call a tiny RPC/select to confirm the schema is installed. If something is missing, show a full-page setup error with the exact missing item and the fix ("Run supabase/schema.sql in your Supabase SQL editor") instead of a spinner.
5. **Institution type mismatch.** The form offers "University" but the database enum `institution_type` only has `hostel, college, school, corporate, hospital, canteen, ngo, other`. Add a NEW migration `alter type public.institution_type add value if not exists 'university'` (never edit `0000`), regenerate types, and make the dropdown options come from one shared constant that matches the enum exactly.
6. **Sign-in flow.** `signInWithPassword` → on success run `bootstrapWorkspace()` → redirect by role (staff → `/app`, student → `/student`, no institution → `/onboarding`) or to the page the user originally wanted (`?redirect=`). Map errors to human messages: wrong email/password, email not confirmed (offer resend), too many attempts, network error.
7. **"Remember this browser for 30 days" must really work**: checked → persistent session (localStorage); unchecked → session only (sessionStorage). If you cannot support it cleanly, remove the checkbox. No fake options.
8. Make sure the auth listener (`onAuthStateChange`) is set up once, does not deadlock (no awaited Supabase calls inside the callback body; use `setTimeout`/queue), and cleans up on unmount. Check there is no infinite redirect loop between `/login`, `/signup`, `/onboarding` and `/app`.

## PROBLEM 3: Sign-in option is not visible / auth pages structure

1. Keep both `/login` and `/signup` as real routes (today everything is on `/signup` with two tabs). The tabs can stay as a visual switch, but each must change the URL (`/login` ↔ `/signup`) so links and refresh work.
2. The **homepage top nav** (desktop and mobile menu) must show **Sign in** (ghost button) and **Create workspace / Start free** (primary button). If the user is already signed in show **Open app** instead. The final CTA and pricing buttons go to `/signup?plan=starter|pro|institution`. "Talk to us" stays a mailto.
3. Auth page layout: keep the split design, but make it match the homepage design system (Fraunces for headings, Manrope for UI, the same teal/saffron tokens and radii) instead of the current generic Inter look. Fully responsive: on mobile show only the form with a small logo on top.
4. Remove claims the product does not prove: the "v2.4 Production" badge, "Enterprise Ready" badge, "Trusted by universities…" line, "Cut Food Waste by up to 35%", and "weather factors" (not implemented). Use honest copy based on real features (menu planning, stock and suppliers, QR attendance, demand forecast, waste tracking).
5. Add a visible "Forgot password?" flow that actually works (`/forgot-password` sends the email, `/reset-password` sets the new password from the recovery link) and a show/hide password button, correct `autocomplete` attributes, Enter-to-submit, and focus on the first invalid field.

## PROBLEM 4: Replace the logo with a new "F" logo

Remove ALL existing logos/icons used as brand: the bowl + steam `BrandMark` in `src/features/marketing/brand.tsx` and the fork-and-knife (utensils) icon in the auth panel, nav, footer, sidebar and anywhere else (search the whole project). Replace them with ONE new brand mark: a rounded-square teal tile with a white letter **F** whose middle bar is saffron and ends in a small saffron dot (like a plate on a table). I designed it already; do not redraw it. Use exactly this SVG as the source of truth:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="FoodFlow">
  <defs>
    <linearGradient id="ff-bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#14919B"/>
      <stop offset="1" stop-color="#0B5C66"/>
    </linearGradient>
    <linearGradient id="ff-saffron" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#FFB93B"/>
      <stop offset="1" stop-color="#F58A07"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="120" fill="url(#ff-bg)"/>
  <path fill="#FFFFFF" d="M150 112c-22 0-40 18-40 40v208c0 22 18 40 40 40s40-18 40-40V192h128c22 0 40-18 40-40s-18-40-40-40z"/>
  <path fill="url(#ff-saffron)" d="M190 250h112c22 0 40 18 40 40s-18 40-40 40H190z"/>
  <circle cx="392" cy="290" r="26" fill="url(#ff-saffron)"/>
</svg>
```

Do this:
1. Save the attached files to `public/brand/` and make `BrandMark` (React component, accepts `className`, unique gradient ids via `useId` so several marks on one page never clash) and `BrandLogo` (mark + wordmark "Food**Flow**" in Fraunces, "Flow" in primary color). Use `BrandLogo` in: homepage nav + footer, auth pages (left panel and mobile header), app sidebar (collapsed sidebar shows only the mark), emails/PDF headers if any.
2. Favicon + PWA: `public/favicon.svg`, `favicon.ico`, `apple-touch-icon.png` (180), `icon-192.png`, `icon-512.png`, `og-image.png` (1200×630 with the logo + tagline). Update `<head>` links and the OG/Twitter tags in `__root.tsx`.
3. Search the repo to confirm **no old logo, no utensils icon used as a logo and no "FoodFlow Inc." placeholder** remains. The company text in the footer should just say "© 2026 FoodFlow".

## 5. TEST EVERYTHING YOURSELF (required, do not skip)

Run the app and actually test each flow in the browser, then fix whatever fails. Also add automated tests (Vitest + mocked Supabase client, and a Playwright e2e if you can) for the flows below. Report results as a checklist at the end.

- [ ] Sign up with email, confirmation ON (check-your-email screen, resend cooldown, then first login creates the workspace once)
- [ ] Sign up with email, confirmation OFF (instant workspace + redirect)
- [ ] Sign up with an existing email (clear message, no spinner)
- [ ] Weak password / mismatched confirm password / terms unchecked (inline errors)
- [ ] Sign in: correct login, wrong password, unconfirmed email, network offline (each shows the right message and the button recovers)
- [ ] Sign in redirect by role + `?redirect=` return path; logout; refresh keeps the session; "remember me" on/off
- [ ] Forgot password → email → reset → login with the new password
- [ ] Google button: with provider enabled (works, lands on `/auth/callback` then app/onboarding); with provider missing (friendly toast, no JSON page)
- [ ] `/app` and `/student` redirect to `/login` when signed out; `/login` redirects to the app when already signed in; no redirect loops
- [ ] Health check screen appears if env vars or schema are missing
- [ ] Every button that shows a spinner returns to normal within the timeout in all failure cases
- [ ] No console errors; `build`, `lint`, `typecheck`, `test` all pass

## 6. WHAT I WILL DO MANUALLY (give me exact, short steps at the end)

At the end of your answer list these steps for my project so I can finish quickly:

1. **Run the schema:** paste `supabase/schema.sql` in Supabase → SQL Editor → Run.
2. **Google login:** Google Cloud Console → APIs & Services → Credentials → Create OAuth client ID (Web application). Authorized JavaScript origin: `http://localhost:8080` (and my production domain later). Authorized redirect URI: `https://vqxzkirixwteljacfrfi.supabase.co/auth/v1/callback`. Then Supabase → Authentication → Providers → Google → enable → paste Client ID and Client Secret → Save.
3. **URLs:** Supabase → Authentication → URL Configuration: Site URL `http://localhost:8080`, Redirect URLs add `http://localhost:8080/**` (and production URL later).
4. **Email:** tell me whether to keep "Confirm email" ON or OFF for development and how to change it (Authentication → Providers → Email). Mention the default Supabase email rate limit and how to add a custom SMTP (Resend/Brevo) for production.
5. `.env` values required: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_GOOGLE_AUTH_ENABLED`.

When finished, show: what was the exact root cause of the endless spinners, what you changed, the test checklist with pass/fail, and the manual steps above.
