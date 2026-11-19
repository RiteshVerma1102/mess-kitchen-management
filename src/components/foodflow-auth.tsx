import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Activity,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronLeft,
  Eye,
  EyeOff,
  Flame,
  KeyRound,
  Layers,
  LoaderCircle,
  Lock,
  Mail,
  ShieldCheck,
  TrendingDown,
  UtensilsCrossed,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

type AuthMode = "signin" | "signup" | "forgot";

const INSTITUTION_TYPES = [
  "College",
  "University",
  "Hostel",
  "Institutional Kitchen",
  "Food Service Contractor",
  "Other",
] as const;

export function AuthPage({ onExploreDemo }: { onExploreDemo?: () => void } = {}) {
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>("signin");

  // Sign-in / Sign-up state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [institution, setInstitution] = useState("");
  const [institutionType, setInstitutionType] = useState<string>("College");

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [agreedToTerms, setAgreedToTerms] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState("");

  const goToApp = () => void navigate({ to: "/" });

  // Handle Google OAuth via native Supabase
  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not connect to Google sign-in.");
      setIsLoading(false);
    }
  };

  // Handle Email & Password submissions
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);

    try {
      if (mode === "forgot") {
        if (!email.trim() || !email.includes("@")) {
          throw new Error("Please enter a valid email address.");
        }
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
          redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
        });
        if (error) throw error;
        setConfirmationEmail(email.trim().toLowerCase());
        setShowConfirmation(true);
        toast.success("Password reset instructions sent.");
        return;
      }

      if (mode === "signup") {
        const cleanName = name.trim();
        const cleanEmail = email.trim().toLowerCase();
        const cleanInstitution = institution.trim();

        if (cleanName.length < 2 || cleanName.length > 80) {
          throw new Error("Full name must be between 2 and 80 characters.");
        }
        if (!cleanEmail.includes("@")) {
          throw new Error("Please enter a valid institutional work email.");
        }
        if (cleanInstitution.length < 2 || cleanInstitution.length > 120) {
          throw new Error("Institution name must be between 2 and 120 characters.");
        }
        if (password.length < 8) {
          throw new Error("Password must be at least 8 characters long.");
        }
        if (password !== confirmPassword) {
          throw new Error("Passwords do not match.");
        }
        if (!agreedToTerms) {
          throw new Error("Please accept the terms of service to create your workspace.");
        }

        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              full_name: cleanName,
              institution_name: cleanInstitution,
              institution_type: institutionType,
            },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });

        if (error) throw error;

        if (data.session) {
          toast.success("Welcome to FoodFlow! Your workspace is ready.");
          goToApp();
        } else {
          setConfirmationEmail(cleanEmail);
          setShowConfirmation(true);
          toast.success("Verification link sent. Please check your inbox.");
        }
        return;
      }

      // Mode: signin
      const cleanEmail = email.trim().toLowerCase();
      if (!cleanEmail || !password) {
        throw new Error("Please enter both email and password.");
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        if (error.message.toLowerCase().includes("invalid login credentials")) {
          throw new Error("Incorrect email or password. Please verify your details.");
        }
        if (error.message.toLowerCase().includes("email not confirmed")) {
          throw new Error("Your email address has not been confirmed yet. Please check your inbox.");
        }
        throw error;
      }

      if (data.user) {
        toast.success("Welcome back to FoodFlow.");
        goToApp();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Authentication failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen bg-[#F5F8FA] lg:grid-cols-[1.1fr_1fr] xl:grid-cols-[1.2fr_1fr]">
      {/* LEFT COLUMN: Premium Enterprise Brand & Value Showcase */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-[#07545B] via-[#087E8B] to-[#054349] p-10 text-white lg:flex xl:p-14">
        {/* Subtle decorative mesh background accents */}
        <div className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-white/5 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 size-96 rounded-full bg-[#16A36A]/10 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px] opacity-10" />

        {/* Top Header & Brand Identity */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-white/10 shadow-inner backdrop-blur-md">
              <UtensilsCrossed className="size-6 text-white" />
            </div>
            <div>
              <span className="text-2xl font-bold tracking-tight text-white">FoodFlow</span>
              <span className="block text-xs font-medium text-white/70">Institutional Kitchen Platform</span>
            </div>
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
            <ShieldCheck className="size-3.5 text-[#34D399]" /> Enterprise Ready
          </div>
        </div>

        {/* Middle Value Proposition */}
        <div className="relative z-10 my-auto max-w-lg py-8">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-white">
            <Flame className="size-3.5 text-amber-300" /> Smart Mess & Canteen Operations
          </div>
          <h1 className="text-4xl font-extrabold leading-[1.15] tracking-tight text-white xl:text-5xl">
            Better food operations start here.
          </h1>
          <p className="mt-4 text-base leading-relaxed text-white/80 xl:text-lg">
            Coordinate meal planning, kitchen prep schedules, ingredient inventory, and student attendance in one unified institutional workspace.
          </p>

          {/* 3 Pillars / Value Props */}
          <div className="mt-8 space-y-4">
            <div className="flex items-start gap-3.5 rounded-xl border border-white/10 bg-white/[0.06] p-3.5 backdrop-blur-sm transition-all hover:bg-white/[0.1]">
              <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/15 text-white">
                <Layers className="size-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Plan Smarter Menus</h3>
                <p className="mt-0.5 text-xs leading-normal text-white/70">
                  Manage cycle menus, standardized recipes, and nutritional dietary tags across halls.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 rounded-xl border border-white/10 bg-white/[0.06] p-3.5 backdrop-blur-sm transition-all hover:bg-white/[0.1]">
              <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/15 text-white">
                <Activity className="size-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Real-Time Stock & Supplier Control</h3>
                <p className="mt-0.5 text-xs leading-normal text-white/70">
                  Track pantry stock movements, restock minimum thresholds, and pending vendor orders.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 rounded-xl border border-white/10 bg-white/[0.06] p-3.5 backdrop-blur-sm transition-all hover:bg-white/[0.1]">
              <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/15 text-white">
                <TrendingDown className="size-5 text-emerald-300" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Cut Food Waste by up to 35%</h3>
                <p className="mt-0.5 text-xs leading-normal text-white/70">
                  Forecast portions using student attendance actuals, weather factors, and exam periods.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Social Proof / Trust */}
        <div className="relative z-10 flex items-center justify-between border-t border-white/15 pt-5 text-xs text-white/70">
          <span>Trusted by universities, residential schools & hostels</span>
          <span className="font-medium text-white/90">v2.4 Production</span>
        </div>
      </aside>

      {/* RIGHT COLUMN: Modern High-Conversion Auth Card */}
      <main className="flex min-h-screen flex-col justify-between px-4 py-8 sm:px-8 md:px-12 lg:px-10 xl:px-16">
        {/* Mobile / Compact Top Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 lg:hidden">
            <div className="flex size-9 items-center justify-center rounded-lg bg-[#087E8B] text-white">
              <UtensilsCrossed className="size-5" />
            </div>
            <span className="text-lg font-bold text-[#172B3A]">FoodFlow</span>
          </div>

          {mode !== "signin" ? (
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto text-xs font-medium text-[#718096] hover:text-[#172B3A]"
              onClick={() => {
                setMode("signin");
                setShowConfirmation(false);
              }}
            >
              <ChevronLeft className="mr-1 size-4" /> Back to sign in
            </Button>
          ) : (
            <div className="ml-auto flex items-center gap-2 text-xs text-[#718096]">
              <span className="size-2 rounded-full bg-[#16A36A]" />
              Secure Institutional Portal
            </div>
          )}
        </div>

        {/* Center Container */}
        <div className="mx-auto my-auto w-full max-w-[440px] py-6">
          {showConfirmation ? (
            /* Email Confirmation / Reset Sent Card */
            <div className="rounded-2xl border border-[#E5EAF0] bg-white p-8 shadow-sm">
              <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-[#E5F5F4] text-[#087E8B]">
                <Mail className="size-6" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-[#172B3A]">
                {mode === "forgot" ? "Check your email" : "Confirm your email"}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[#718096]">
                {mode === "forgot" ? (
                  <>
                    We sent a secure password reset link to{" "}
                    <span className="font-semibold text-[#172B3A]">{confirmationEmail}</span>. Click the link to set a new password.
                  </>
                ) : (
                  <>
                    We sent an activation link to{" "}
                    <span className="font-semibold text-[#172B3A]">{confirmationEmail}</span>. Click the link to activate your institution workspace.
                  </>
                )}
              </p>

              <div className="mt-6 space-y-3">
                <Button
                  className="w-full bg-[#087E8B] font-medium text-white hover:bg-[#066873]"
                  onClick={() => {
                    setShowConfirmation(false);
                    setMode("signin");
                  }}
                >
                  <ArrowRight className="mr-2 size-4" /> Return to sign in
                </Button>
                <p className="text-center text-xs text-[#718096]">
                  Didn’t receive it? Check your spam folder or try another email.
                </p>
              </div>
            </div>
          ) : (
            /* Main Authentication Card */
            <div className="rounded-2xl border border-[#E5EAF0] bg-white p-7 shadow-xs sm:p-9">
              {/* Header & Segmented Tabs */}
              <div className="mb-6">
                {mode !== "forgot" && (
                  <div className="mb-5 flex rounded-lg bg-[#F5F8FA] p-1 border border-[#E5EAF0]">
                    <button
                      type="button"
                      className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition-all ${
                        mode === "signin"
                          ? "bg-white text-[#172B3A] shadow-xs"
                          : "text-[#718096] hover:text-[#172B3A]"
                      }`}
                      onClick={() => setMode("signin")}
                    >
                      Sign In
                    </button>
                    <button
                      type="button"
                      className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition-all ${
                        mode === "signup"
                          ? "bg-white text-[#172B3A] shadow-xs"
                          : "text-[#718096] hover:text-[#172B3A]"
                      }`}
                      onClick={() => setMode("signup")}
                    >
                      Create Workspace
                    </button>
                  </div>
                )}

                <h2 className="text-2xl font-bold tracking-tight text-[#172B3A]">
                  {mode === "signup"
                    ? "Set up your FoodFlow workspace"
                    : mode === "forgot"
                    ? "Reset your password"
                    : "Welcome back"}
                </h2>
                <p className="mt-1.5 text-sm text-[#718096]">
                  {mode === "signup"
                    ? "Register your institution to begin managing kitchen ops."
                    : mode === "forgot"
                    ? "Enter your account email to receive reset instructions."
                    : "Enter your credentials to access your mess dashboard."}
                </p>
              </div>

              {/* Native Google OAuth Button (Visible for Sign In & Sign Up) */}
              {mode !== "forgot" && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    className="foodflow-google-button relative flex h-11 w-full items-center justify-center gap-3 rounded-lg text-sm font-medium text-[#172B3A]"
                    disabled={isLoading}
                    onClick={() => void handleGoogleSignIn()}
                  >
                    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"
                      />
                    </svg>
                    Continue with Google
                  </Button>

                  <div className="my-5 flex items-center gap-3 text-[11px] font-medium uppercase tracking-wider text-[#718096]">
                    <span className="h-px flex-1 bg-[#E5EAF0]" />
                    <span>Or continue with email</span>
                    <span className="h-px flex-1 bg-[#E5EAF0]" />
                  </div>
                </>
              )}

              {/* Form Body */}
              <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
                {/* SIGN UP: Full Name */}
                {mode === "signup" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="signup-name" className="text-xs font-semibold text-[#172B3A]">
                      Full Name
                    </Label>
                    <Input
                      id="signup-name"
                      autoComplete="name"
                      maxLength={80}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Dr. Rajesh Kumar"
                      className="h-10 border-[#E5EAF0] focus-visible:ring-[#087E8B]"
                      required
                    />
                  </div>
                )}

                {/* EMAIL ADDRESS */}
                <div className="space-y-1.5">
                  <Label htmlFor="email-address" className="text-xs font-semibold text-[#172B3A]">
                    {mode === "signup" ? "Institutional Email" : "Email Address"}
                  </Label>
                  <Input
                    id="email-address"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@institution.edu"
                    className="h-10 border-[#E5EAF0] focus-visible:ring-[#087E8B]"
                    required
                  />
                </div>

                {/* SIGN UP: Institution Name & Institution Type */}
                {mode === "signup" && (
                  <>
                    <div className="space-y-1.5">
                      <Label htmlFor="institution-name" className="text-xs font-semibold text-[#172B3A]">
                        Institution Name
                      </Label>
                      <Input
                        id="institution-name"
                        maxLength={120}
                        value={institution}
                        onChange={(e) => setInstitution(e.target.value)}
                        placeholder="e.g. Stanford University Dining or Apex Hostel"
                        className="h-10 border-[#E5EAF0] focus-visible:ring-[#087E8B]"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="institution-type" className="text-xs font-semibold text-[#172B3A]">
                        Institution Type
                      </Label>
                      <Select value={institutionType} onValueChange={setInstitutionType}>
                        <SelectTrigger id="institution-type" className="h-10 border-[#E5EAF0] focus:ring-[#087E8B]">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          {INSTITUTION_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                {/* PASSWORD (Sign In & Sign Up) */}
                {mode !== "forgot" && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="account-password" className="text-xs font-semibold text-[#172B3A]">
                        Password
                      </Label>
                      {mode === "signin" && (
                        <button
                          type="button"
                          className="text-xs font-medium text-[#087E8B] hover:underline"
                          onClick={() => setMode("forgot")}
                        >
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Input
                        id="account-password"
                        type={showPassword ? "text" : "password"}
                        autoComplete={mode === "signin" ? "current-password" : "new-password"}
                        minLength={8}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="At least 8 characters"
                        className="h-10 pr-10 border-[#E5EAF0] focus-visible:ring-[#087E8B]"
                        required
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#718096] hover:text-[#172B3A]"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </div>
                )}

                {/* SIGN UP: Confirm Password */}
                {mode === "signup" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="confirm-password" className="text-xs font-semibold text-[#172B3A]">
                      Confirm Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="confirm-password"
                        type={showConfirmPassword ? "text" : "password"}
                        autoComplete="new-password"
                        minLength={8}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter your password"
                        className="h-10 pr-10 border-[#E5EAF0] focus-visible:ring-[#087E8B]"
                        required
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#718096] hover:text-[#172B3A]"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                      >
                        {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </div>
                )}

                {/* SIGN IN: Remember Me */}
                {mode === "signin" && (
                  <div className="flex items-center space-x-2 pt-1">
                    <Checkbox
                      id="remember"
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(Boolean(checked))}
                    />
                    <label htmlFor="remember" className="text-xs text-[#718096] cursor-pointer">
                      Remember this browser for 30 days
                    </label>
                  </div>
                )}

                {/* SIGN UP: Terms Agreement */}
                {mode === "signup" && (
                  <div className="flex items-start space-x-2 pt-1">
                    <Checkbox
                      id="terms"
                      checked={agreedToTerms}
                      onCheckedChange={(checked) => setAgreedToTerms(Boolean(checked))}
                      className="mt-0.5"
                    />
                    <label htmlFor="terms" className="text-xs leading-normal text-[#718096] cursor-pointer">
                      I agree to the Institutional Kitchen Service Terms and Data Privacy Policy.
                    </label>
                  </div>
                )}

                {/* Primary Action Button */}
                <Button
                  type="submit"
                  className="h-11 w-full bg-[#087E8B] text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#066873]"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : mode === "forgot" ? (
                    <Mail className="size-4" />
                  ) : mode === "signup" ? (
                    <CheckCircle2 className="size-4" />
                  ) : (
                    <KeyRound className="size-4" />
                  )}
                  <span className="ml-2">
                    {mode === "forgot"
                      ? "Send Reset Link"
                      : mode === "signup"
                      ? "Create FoodFlow Workspace"
                      : "Sign In to FoodFlow"}
                  </span>
                </Button>
              </form>

              {/* Mode switch helper link */}
              {mode !== "forgot" ? (
                <div className="mt-5 text-center text-xs text-[#718096]">
                  {mode === "signup" ? "Already have an account?" : "Need an institutional workspace?"}{" "}
                  <button
                    type="button"
                    className="font-semibold text-[#087E8B] hover:underline"
                    onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
                  >
                    {mode === "signup" ? "Sign in" : "Create one now"}
                  </button>
                </div>
              ) : (
                <div className="mt-5 text-center text-xs text-[#718096]">
                  Remember your password?{" "}
                  <button
                    type="button"
                    className="font-semibold text-[#087E8B] hover:underline"
                    onClick={() => setMode("signin")}
                  >
                    Back to sign in
                  </button>
                </div>
              )}

              {/* Optional Demo explorer */}
              {mode === "signin" && onExploreDemo && (
                <div className="mt-4 border-t border-[#E5EAF0] pt-4">
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-9 w-full text-xs font-medium text-[#718096] hover:bg-[#F5F8FA] hover:text-[#172B3A]"
                    onClick={onExploreDemo}
                  >
                    Explore read-only sample mess workspace
                    <ArrowRight className="ml-1.5 size-3.5" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-[#718096]">
          © {new Date().getFullYear()} FoodFlow Inc. All institutional rights reserved.
        </div>
      </main>
    </div>
  );
}

export function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [recoveryReady, setRecoveryReady] = useState(false);

  useEffect(() => {
    // Check if recovery token exists in url hash or url params
    const hasHashRecovery = window.location.hash.includes("type=recovery") || window.location.hash.includes("access_token");
    const hasSearchRecovery = window.location.search.includes("recovery=true") || window.location.search.includes("type=recovery");

    // Also check current supabase session
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session || hasHashRecovery || hasSearchRecovery) {
        setRecoveryReady(true);
      }
    });
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setIsSuccess(true);
      toast.success("Your password has been successfully reset.");
      setTimeout(() => {
        window.location.replace("/auth");
      }, 2000);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not reset your password. Please request a new link.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5F8FA] px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-[#087E8B] text-white">
            <UtensilsCrossed className="size-5" />
          </div>
          <div>
            <span className="text-xl font-bold text-[#172B3A]">FoodFlow</span>
            <span className="block text-xs text-[#718096]">Security & Password Recovery</span>
          </div>
        </div>

        <div className="rounded-2xl border border-[#E5EAF0] bg-white p-8 shadow-xs">
          {isSuccess ? (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-100 text-[#16A36A]">
                <Check className="size-6" />
              </div>
              <h2 className="text-2xl font-bold text-[#172B3A]">Password Updated</h2>
              <p className="text-sm text-[#718096]">
                Your FoodFlow password has been reset successfully. Redirecting you to sign in...
              </p>
              <Button asChild className="w-full bg-[#087E8B] text-white hover:bg-[#066873]">
                <a href="/auth">Sign In Now</a>
              </Button>
            </div>
          ) : recoveryReady ? (
            <div>
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-[#172B3A]">Set a new password</h1>
                <p className="mt-1 text-sm text-[#718096]">
                  Enter a secure new password for your institutional FoodFlow account.
                </p>
              </div>

              <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="new-password" className="text-xs font-semibold text-[#172B3A]">
                    New Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      className="h-10 pr-10 border-[#E5EAF0] focus-visible:ring-[#087E8B]"
                      required
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#718096] hover:text-[#172B3A]"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirm-new-password" className="text-xs font-semibold text-[#172B3A]">
                    Confirm New Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirm-new-password"
                      type={showConfirmPassword ? "text" : "password"}
                      autoComplete="new-password"
                      minLength={8}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter your new password"
                      className="h-10 pr-10 border-[#E5EAF0] focus-visible:ring-[#087E8B]"
                      required
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#718096] hover:text-[#172B3A]"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="h-11 w-full bg-[#087E8B] text-sm font-semibold text-white shadow-sm hover:bg-[#066873]"
                  disabled={isLoading}
                >
                  {isLoading ? <LoaderCircle className="size-4 animate-spin" /> : <Lock className="size-4" />}
                  <span className="ml-2">Update Password</span>
                </Button>
              </form>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex size-11 items-center justify-center rounded-full bg-amber-100 text-[#E9A23B]">
                <KeyRound className="size-5" />
              </div>
              <h2 className="text-xl font-bold text-[#172B3A]">Recovery Link Required</h2>
              <p className="text-sm leading-relaxed text-[#718096]">
                This password reset page requires a valid, one-time recovery link sent to your institutional email.
              </p>
              <div className="pt-2">
                <Button asChild variant="outline" className="w-full border-[#E5EAF0]">
                  <a href="/auth">Request a new reset link</a>
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
