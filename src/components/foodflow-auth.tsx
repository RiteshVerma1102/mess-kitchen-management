import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronLeft,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Languages,
  Layers,
  LoaderCircle,
  Lock,
  Mail,
  RefreshCw,
  ShieldCheck,
  TrendingDown,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandLogo, BrandMark } from "@/features/marketing/brand";
import { useFirebaseAuth } from "@/components/firebase-provider";
import { formatFirebaseAuthError, verifyAndConfirmPasswordReset } from "@/lib/firebase";
import { TRANSLATIONS } from "@/lib/i18n";

type AuthMode = "signin" | "signup" | "forgot";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function withAuthTimeout<T>(promise: Promise<T>, timeoutMs = 25000): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error("Taking too long. Check your internet connection or try again."));
    }, timeoutMs);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timer!);
  }
}

export function AuthPage({
  onExploreDemo,
  initialMode = "signin",
  defaultPlan,
  redirectTo,
}: {
  onExploreDemo?: () => void;
  initialMode?: AuthMode;
  defaultPlan?: string;
  redirectTo?: string;
} = {}) {
  const navigate = useNavigate();
  const {
    user,
    loading: authLoading,
    workspaceLoading,
    memberships,
    role,
    language,
    setLanguage,
    signInWithGoogle,
    signUpEmail,
    signInEmail,
    resendVerification,
    reloadUserVerification,
    sendPasswordReset,
  } = useFirebaseAuth();

  const t = TRANSLATIONS[language];
  const [mode, setMode] = useState<AuthMode>(initialMode);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [agreedToTerms, setAgreedToTerms] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const [showConfirmation, setShowConfirmation] = useState<"verify" | "forgot" | null>(null);
  const [confirmationEmail, setConfirmationEmail] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [unauthorizedHost, setUnauthorizedHost] = useState<string | null>(null);

  useEffect(() => {
    setMode(initialMode);
    setErrorBanner(null);
    setUnauthorizedHost(null);
  }, [initialMode]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const [showInviteBox, setShowInviteBox] = useState(false);
  const [inviteCodeInput, setInviteCodeInput] = useState("");
  const [joiningInvite, setJoiningInvite] = useState(false);

  // If user is signed in & verified and workspace check finished, redirect straight to dashboard
  useEffect(() => {
    if (authLoading || workspaceLoading) return;
    if (!user) return;
    if (!user.emailVerified) {
      setConfirmationEmail(user.email || "");
      setShowConfirmation("verify");
      return;
    }
    if (redirectTo && redirectTo.startsWith("/")) {
      void navigate({ to: redirectTo as never });
      return;
    }
    if (memberships.length > 0) {
      void navigate({ to: (role === "student" ? "/student" : "/overview") as never });
    }
  }, [authLoading, workspaceLoading, user, memberships.length, role, redirectTo, navigate]);

  const passwordStrength = useMemo(() => {
    if (!password) return { label: "", percent: 0, color: "bg-muted" };
    let score = 0;
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;
    if (score <= 2) return { label: "Weak", percent: 25, color: "bg-red-500" };
    if (score === 3) return { label: "Fair", percent: 50, color: "bg-amber-500" };
    if (score === 4) return { label: "Good", percent: 75, color: "bg-blue-500" };
    return { label: "Strong", percent: 100, color: "bg-emerald-500" };
  }, [password]);

  const handleNavigateMode = (targetMode: AuthMode) => {
    setMode(targetMode);
    setShowConfirmation(null);
    setErrorBanner(null);
    setUnauthorizedHost(null);
    if (targetMode === "signin") {
      if (redirectTo) {
        void navigate({ to: "/login", search: { redirect: redirectTo } });
      } else {
        void navigate({ to: "/login" });
      }
    } else if (targetMode === "signup") {
      if (defaultPlan) {
        void navigate({ to: "/signup", search: { plan: defaultPlan } });
      } else {
        void navigate({ to: "/signup" });
      }
    } else if (targetMode === "forgot") {
      void navigate({ to: "/forgot-password" });
    }
  };

  const handleErrorDisplay = (err: unknown) => {
    const friendly = formatFirebaseAuthError(err);
    setErrorBanner(friendly);
    if (friendly.includes("Authorized domains")) {
      const host = typeof window !== "undefined" ? window.location.hostname : "";
      if (host) setUnauthorizedHost(host);
    }
    toast.error(friendly);
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setIsLoading(true);
    setErrorBanner(null);
    try {
      await withAuthTimeout(resendVerification());
      setResendCooldown(60);
      toast.success("Verification email sent! Please check your inbox and spam folder.");
    } catch (err) {
      handleErrorDisplay(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckVerified = async () => {
    setIsLoading(true);
    setErrorBanner(null);
    try {
      const ok = await withAuthTimeout(reloadUserVerification());
      if (ok) {
        toast.success("Email verified! Continuing to workspace setup...");
      } else {
        toast.info("Not verified yet. Click the link in your inbox, then tap again.");
      }
    } catch (err) {
      handleErrorDisplay(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorBanner(null);
    setUnauthorizedHost(null);
    try {
      const firebaseUser = await withAuthTimeout(signInWithGoogle(rememberMe), 30000);
      toast.success(
        `Signed in as ${firebaseUser.displayName || firebaseUser.email || "Google user"}`,
      );
    } catch (error) {
      handleErrorDisplay(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setErrorBanner(null);
    setUnauthorizedHost(null);

    try {
      const cleanEmail = email.trim().toLowerCase();
      if (!EMAIL_REGEX.test(cleanEmail)) {
        throw new Error("Please enter a valid email address.");
      }

      if (mode === "forgot") {
        await withAuthTimeout(sendPasswordReset(cleanEmail));
        setConfirmationEmail(cleanEmail);
        setShowConfirmation("forgot");
        toast.success("Password reset email sent. Check your inbox.");
        return;
      }

      if (mode === "signup") {
        const cleanName = name.trim();
        if (cleanName.length < 2 || cleanName.length > 80) {
          throw new Error("Full name must be between 2 and 80 characters.");
        }
        if (password.length < 8) {
          throw new Error("Password must be at least 8 characters long.");
        }
        if (password !== confirmPassword) {
          throw new Error("Passwords do not match.");
        }
        if (!agreedToTerms) {
          throw new Error("Please accept the terms of service to create your account.");
        }

        const createdUser = await withAuthTimeout(
          signUpEmail({ name: cleanName, email: cleanEmail, password }),
        );
        setConfirmationEmail(createdUser.email || cleanEmail);
        setShowConfirmation("verify");
        setResendCooldown(60);
        toast.success("Account created! Please verify your email address.");
        return;
      }

      // Mode: signin
      if (password.length < 8) {
        throw new Error("Password must be at least 8 characters long.");
      }
      const signedIn = await withAuthTimeout(
        signInEmail({ email: cleanEmail, password, rememberBrowser: rememberMe }),
      );
      if (!signedIn.emailVerified) {
        setConfirmationEmail(signedIn.email || cleanEmail);
        setShowConfirmation("verify");
        toast.info("Please verify your email address before entering your workspace.");
        return;
      }
      toast.success("Welcome back to FoodFlow.");
    } catch (error) {
      handleErrorDisplay(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen bg-[#F5F8FA] lg:grid-cols-[1.1fr_1fr] xl:grid-cols-[1.2fr_1fr]">
      {/* LEFT COLUMN */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-[#07545B] via-[#087E8B] to-[#054349] p-10 text-white lg:flex xl:p-14">
        <div className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-white/5 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 size-96 rounded-full bg-[#16A36A]/10 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px] opacity-10" />

        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BrandMark className="size-11 rounded-2xl shadow-md" />
            <div>
              <span className="font-display text-2xl font-bold tracking-tight text-white">
                {t.appName}
              </span>
              <span className="block text-xs font-medium text-white/70">{t.appTagline}</span>
            </div>
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
            <ShieldCheck className="size-3.5 text-[#34D399]" /> Multi-Tenant Firebase
          </div>
        </div>

        <div className="relative z-10 my-auto py-8">
          <h1 className="font-display text-3xl font-extrabold leading-tight tracking-tight text-white xl:text-4xl">
            Better food operations <br className="hidden xl:inline" />
            start here.
          </h1>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-white/80 xl:text-base">
            Coordinate cycle menus, meal skips with cut-off locks, QR attendance, inventory expiry
            alerts, and monthly hostel billing in one connected workspace.
          </p>

          <div className="mt-8 space-y-3.5 max-w-md">
            <div className="flex items-start gap-3.5 rounded-xl border border-white/10 bg-white/[0.06] p-3.5 backdrop-blur-sm transition-all hover:bg-white/[0.1]">
              <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/15 text-white">
                <Layers className="size-5 text-emerald-300" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Cycle Menu & Student Skips</h3>
                <p className="mt-0.5 text-xs leading-normal text-white/70">
                  Lock meal skip cut-offs automatically and feed accurate headcounts straight to the
                  kitchen.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 rounded-xl border border-white/10 bg-white/[0.06] p-3.5 backdrop-blur-sm transition-all hover:bg-white/[0.1]">
              <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/15 text-white">
                <Activity className="size-5 text-emerald-300" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">FEFO Inventory & Auto-POs</h3>
                <p className="mt-0.5 text-xs leading-normal text-white/70">
                  Track pantry stock, expiry dates, and raise low-stock vendor purchase orders in
                  one click.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 rounded-xl border border-white/10 bg-white/[0.06] p-3.5 backdrop-blur-sm transition-all hover:bg-white/[0.1]">
              <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/15 text-white">
                <TrendingDown className="size-5 text-emerald-300" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">
                  Weather Forecast & Waste Control
                </h3>
                <p className="mt-0.5 text-xs leading-normal text-white/70">
                  Combine Open-Meteo rain/heat forecasts with leftover logs and monthly student fee
                  rebates.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between border-t border-white/15 pt-5 text-xs text-white/70">
          <span>Indian Hostel & Mess Operations</span>
          <span className="font-medium text-white/90">Role-Isolated Cloud Security</span>
        </div>
      </aside>

      {/* RIGHT COLUMN */}
      <main className="flex min-h-screen flex-col justify-between px-4 py-8 sm:px-8 md:px-12 lg:px-10 xl:px-16">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 lg:hidden">
            <BrandLogo />
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 rounded-full border-[#E5EAF0] bg-white px-3 text-xs font-semibold text-[#172B3A]"
              onClick={() => void setLanguage(language === "en" ? "hi" : "en")}
            >
              <Languages className="size-3.5 text-[#087E8B]" />
              {language === "en" ? "हिन्दी" : "English"}
            </Button>

            {mode !== "signin" && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs font-medium text-[#718096] hover:text-[#172B3A]"
                onClick={() => handleNavigateMode("signin")}
              >
                <ChevronLeft className="mr-1 size-4" /> Back
              </Button>
            )}
          </div>
        </div>

        <div className="mx-auto my-auto w-full max-w-[440px] py-6">
          {authLoading ? (
            <div className="rounded-2xl border border-[#E5EAF0] bg-white p-8 text-center shadow-xs">
              <LoaderCircle className="mx-auto size-8 animate-spin text-[#087E8B]" />
              <p className="mt-3 text-xs font-semibold text-[#718096]">
                Checking authentication session...
              </p>
            </div>
          ) : showConfirmation ? (
            <div className="rounded-2xl border border-[#E5EAF0] bg-white p-8 shadow-sm">
              <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-[#E5F5F4] text-[#087E8B]">
                <Mail className="size-6" />
              </div>
              <h2 className="font-display text-2xl font-bold tracking-tight text-[#172B3A]">
                {showConfirmation === "forgot" ? "Check your email" : t.auth.verifyEmailTitle}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[#718096]">
                {showConfirmation === "forgot" ? (
                  <>
                    We sent a password reset link to{" "}
                    <span className="font-semibold text-[#172B3A]">{confirmationEmail}</span>.
                    Follow the link to choose a new password.
                  </>
                ) : (
                  <>
                    We sent a verification link to{" "}
                    <span className="font-semibold text-[#172B3A]">
                      {confirmationEmail || user?.email}
                    </span>
                    . Click the link in your inbox, then tap below to enter your workspace.
                  </>
                )}
              </p>

              {errorBanner && (
                <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" />
                  <span>{errorBanner}</span>
                </div>
              )}

              <div className="mt-6 space-y-3">
                {showConfirmation === "verify" && (
                  <>
                    <Button
                      type="button"
                      disabled={isLoading}
                      onClick={() => void handleCheckVerified()}
                      className="w-full bg-[#087E8B] font-semibold text-white hover:bg-[#066873]"
                    >
                      {isLoading ? (
                        <LoaderCircle className="mr-2 size-4 animate-spin" />
                      ) : (
                        <RefreshCw className="mr-2 size-4" />
                      )}
                      {t.auth.checkVerification}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={resendCooldown > 0 || isLoading}
                      onClick={() => void handleResend()}
                      className="w-full border-[#E5EAF0] text-sm text-[#172B3A] hover:bg-[#F5F8FA]"
                    >
                      {resendCooldown > 0
                        ? `Resend in ${resendCooldown}s`
                        : t.auth.resendVerification}
                    </Button>
                  </>
                )}
                <Button
                  type="button"
                  variant={showConfirmation === "forgot" ? "default" : "ghost"}
                  className={
                    showConfirmation === "forgot"
                      ? "w-full bg-[#087E8B] font-medium text-white hover:bg-[#066873]"
                      : "w-full text-xs text-[#718096]"
                  }
                  onClick={() => handleNavigateMode("signin")}
                >
                  <ArrowRight className="mr-2 size-4" /> Return to sign in
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-[#E5EAF0] bg-white p-7 shadow-xs sm:p-9">
              <div className="mb-6">
                {mode !== "forgot" && (
                  <div className="mb-5 flex rounded-lg border border-[#E5EAF0] bg-[#F5F8FA] p-1">
                    <button
                      type="button"
                      className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition-all ${
                        mode === "signin"
                          ? "bg-white text-[#172B3A] shadow-xs"
                          : "text-[#718096] hover:text-[#172B3A]"
                      }`}
                      onClick={() => handleNavigateMode("signin")}
                    >
                      {t.auth.signIn}
                    </button>
                    <button
                      type="button"
                      className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition-all ${
                        mode === "signup"
                          ? "bg-white text-[#172B3A] shadow-xs"
                          : "text-[#718096] hover:text-[#172B3A]"
                      }`}
                      onClick={() => handleNavigateMode("signup")}
                    >
                      {t.auth.createWorkspace}
                    </button>
                  </div>
                )}

                {defaultPlan && mode === "signup" && (
                  <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-[#FFF1C7] px-3 py-1 text-xs font-bold text-[#0F3D3A]">
                    Plan: <span className="capitalize">{defaultPlan}</span>
                  </div>
                )}
                <h2 className="font-display text-2xl font-bold tracking-tight text-[#172B3A]">
                  {mode === "signup"
                    ? t.auth.setupWorkspaceTitle
                    : mode === "forgot"
                      ? t.auth.resetPassword
                      : t.auth.welcomeBack}
                </h2>
                <p className="mt-1.5 text-sm text-[#718096]">
                  {mode === "signup"
                    ? "Create your verified account, then configure your mess or join via invite code."
                    : mode === "forgot"
                      ? "Enter your registered email to receive a Firebase reset link."
                      : "Sign in with Google or your institutional email and password."}
                </p>
              </div>

              {errorBanner && (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="mt-0.5 size-4 shrink-0" />
                    <div className="space-y-2">
                      <p className="leading-relaxed font-medium">{errorBanner}</p>
                      {unauthorizedHost && (
                        <div className="flex items-center gap-2 rounded-lg bg-white px-2.5 py-1.5 border border-red-200">
                          <code className="flex-1 truncate font-mono text-[11px] text-[#172B3A]">
                            {unauthorizedHost}
                          </code>
                          <button
                            type="button"
                            onClick={() => {
                              void navigator.clipboard.writeText(unauthorizedHost);
                              toast.success("Hostname copied for Firebase Console");
                            }}
                            className="inline-flex items-center gap-1 font-bold text-[#087E8B]"
                          >
                            <Copy className="size-3" /> Copy
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

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
                    {t.auth.continueWithGoogle}
                  </Button>

                  <div className="my-5 flex items-center gap-3 text-[11px] font-medium uppercase tracking-wider text-[#718096]">
                    <span className="h-px flex-1 bg-[#E5EAF0]" />
                    <span>Or continue with email</span>
                    <span className="h-px flex-1 bg-[#E5EAF0]" />
                  </div>
                </>
              )}

              <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)} noValidate>
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
                      placeholder="e.g. Rajesh Kumar"
                      className="h-10 border-[#E5EAF0] focus-visible:ring-[#087E8B]"
                      required
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="email-address" className="text-xs font-semibold text-[#172B3A]">
                    Email Address
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

                {mode !== "forgot" && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label
                        htmlFor="account-password"
                        className="text-xs font-semibold text-[#172B3A]"
                      >
                        Password
                      </Label>
                      {mode === "signin" && (
                        <button
                          type="button"
                          className="text-xs font-medium text-[#087E8B] hover:underline"
                          onClick={() => handleNavigateMode("forgot")}
                        >
                          {t.auth.forgotPassword}
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
                        className="h-10 border-[#E5EAF0] pr-10 focus-visible:ring-[#087E8B]"
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

                    {mode === "signup" && password && (
                      <div className="space-y-1.5 pt-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[#718096]">Strength:</span>
                          <span className="font-semibold text-[#172B3A]">
                            {passwordStrength.label}
                          </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#E5EAF0]">
                          <div
                            className={`h-full transition-all duration-300 ${passwordStrength.color}`}
                            style={{ width: `${passwordStrength.percent}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {mode === "signup" && (
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="confirm-password"
                      className="text-xs font-semibold text-[#172B3A]"
                    >
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
                        className="h-10 border-[#E5EAF0] pr-10 focus-visible:ring-[#087E8B]"
                        required
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#718096] hover:text-[#172B3A]"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        aria-label={
                          showConfirmPassword ? "Hide confirm password" : "Show confirm password"
                        }
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="size-4" />
                        ) : (
                          <Eye className="size-4" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {mode === "signin" && (
                  <div className="flex items-center space-x-2 pt-1">
                    <Checkbox
                      id="remember"
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(Boolean(checked))}
                    />
                    <label htmlFor="remember" className="cursor-pointer text-xs text-[#718096]">
                      {t.auth.rememberBrowser}
                    </label>
                  </div>
                )}

                {mode === "signup" && (
                  <div className="flex items-start space-x-2 pt-1">
                    <Checkbox
                      id="terms"
                      checked={agreedToTerms}
                      onCheckedChange={(checked) => setAgreedToTerms(Boolean(checked))}
                      className="mt-0.5"
                    />
                    <label
                      htmlFor="terms"
                      className="cursor-pointer text-xs leading-normal text-[#718096]"
                    >
                      I agree to the Institutional Kitchen Terms and Multi-Tenant Data Privacy
                      Policy.
                    </label>
                  </div>
                )}

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
                      ? t.auth.sendResetLink
                      : mode === "signup"
                        ? "Create Account & Verify Email"
                        : "Sign In to FoodFlow"}
                  </span>
                </Button>
              </form>

              {mode !== "forgot" ? (
                <div className="mt-5 text-center text-xs text-[#718096]">
                  {mode === "signup" ? "Already have an account?" : "New to FoodFlow?"}{" "}
                  <button
                    type="button"
                    className="font-semibold text-[#087E8B] hover:underline"
                    onClick={() => handleNavigateMode(mode === "signup" ? "signin" : "signup")}
                  >
                    {mode === "signup" ? "Sign in" : "Create account"}
                  </button>
                </div>
              ) : (
                <div className="mt-5 text-center text-xs text-[#718096]">
                  Remember your password?{" "}
                  <button
                    type="button"
                    className="font-semibold text-[#087E8B] hover:underline"
                    onClick={() => handleNavigateMode("signin")}
                  >
                    Back to sign in
                  </button>
                </div>
              )}

              {mode === "signin" && (
                <div className="mt-4 space-y-2 border-t border-[#E5EAF0] pt-4">
                  <div className="text-center">
                    <button
                      type="button"
                      className="text-xs font-semibold text-[#087E8B] hover:underline"
                      onClick={() => setShowInviteBox((prev) => !prev)}
                    >
                      {language === "hi" ? "क्या आपके पास आमंत्रण कोड है?" : "Have an invite code?"}
                    </button>
                  </div>

                  {showInviteBox && (
                    <div className="flex gap-2 rounded-xl border border-[#E5EAF0] bg-[#F5F8FA] p-2.5">
                      <Input
                        value={inviteCodeInput}
                        onChange={(e) => setInviteCodeInput(e.target.value.toUpperCase())}
                        placeholder="FF-ABC123"
                        className="h-9 bg-white text-xs font-mono uppercase"
                      />
                      <Button
                        type="button"
                        size="sm"
                        disabled={joiningInvite || !inviteCodeInput.trim()}
                        className="h-9 bg-[#087E8B] text-xs font-semibold text-white"
                        onClick={() => {
                          const clean = inviteCodeInput.trim().toUpperCase();
                          if (!clean) return;
                          setJoiningInvite(true);
                          try {
                            window.sessionStorage.setItem("foodflow_pending_invite_code", clean);
                          } catch {
                            // ignore
                          }
                          void navigate({ to: "/join/$code", params: { code: clean } });
                        }}
                      >
                        {language === "hi" ? "जुड़ें" : "Join"}
                      </Button>
                    </div>
                  )}

                  <Button
                    type="button"
                    variant="ghost"
                    className="h-9 w-full text-xs font-medium text-[#718096] hover:bg-[#F5F8FA] hover:text-[#172B3A]"
                    onClick={() => {
                      if (onExploreDemo) {
                        onExploreDemo();
                      } else {
                        try {
                          window.sessionStorage.setItem("foodflow-demo-access", "1");
                        } catch {
                          // ignore
                        }
                        void navigate({ to: "/overview" });
                      }
                    }}
                  >
                    {language === "hi"
                      ? "सैंपल मेस वर्कस्पेस देखें (रीड-ओनली)"
                      : "Explore read-only sample mess workspace"}
                    <ArrowRight className="ml-1.5 size-3.5" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="text-center text-xs text-[#718096]">© 2026 FoodFlow</div>
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
  const [oobCode, setOobCode] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("oobCode");
    if (code) setOobCode(code);
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!oobCode) {
      toast.error("Invalid or missing reset code.");
      return;
    }
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
      await withAuthTimeout(verifyAndConfirmPasswordReset(oobCode, password));
      setIsSuccess(true);
      toast.success("Password updated! You can sign in now.");
    } catch (error) {
      toast.error(formatFirebaseAuthError(error));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5F8FA] px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="flex items-center gap-3">
          <BrandLogo />
        </div>

        <div className="rounded-2xl border border-[#E5EAF0] bg-white p-8 shadow-xs">
          {isSuccess ? (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-100 text-[#16A36A]">
                <Check className="size-6" />
              </div>
              <h2 className="font-display text-2xl font-bold text-[#172B3A]">Password Updated</h2>
              <p className="text-sm text-[#718096]">
                Your FoodFlow password has been reset successfully.
              </p>
              <Button asChild className="w-full bg-[#087E8B] text-white hover:bg-[#066873]">
                <Link to="/login">Sign In Now</Link>
              </Button>
            </div>
          ) : oobCode ? (
            <div>
              <div className="mb-6">
                <h1 className="font-display text-2xl font-bold text-[#172B3A]">
                  Set a new password
                </h1>
                <p className="mt-1 text-sm text-[#718096]">
                  Enter a new password of at least 8 characters for your FoodFlow account.
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
                      className="h-10 border-[#E5EAF0] pr-10 focus-visible:ring-[#087E8B]"
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
                  <Label
                    htmlFor="confirm-new-password"
                    className="text-xs font-semibold text-[#172B3A]"
                  >
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
                      className="h-10 border-[#E5EAF0] pr-10 focus-visible:ring-[#087E8B]"
                      required
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#718096] hover:text-[#172B3A]"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="h-11 w-full bg-[#087E8B] text-sm font-semibold text-white shadow-sm hover:bg-[#066873]"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    <Lock className="size-4" />
                  )}
                  <span className="ml-2">Update Password</span>
                </Button>
              </form>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex size-11 items-center justify-center rounded-full bg-amber-100 text-[#E9A23B]">
                <KeyRound className="size-5" />
              </div>
              <h2 className="font-display text-xl font-bold text-[#172B3A]">
                Recovery Link Required
              </h2>
              <p className="text-sm leading-relaxed text-[#718096]">
                Open the password reset link sent to your email address to reset your password.
              </p>
              <div className="pt-2">
                <Button asChild variant="outline" className="w-full border-[#E5EAF0]">
                  <Link to="/forgot-password">Request a reset link</Link>
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
