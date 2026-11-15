'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/components/Toast';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { success, error } = useToast();

  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const queryToken = searchParams.get('token');
    if (queryToken) {
      setToken(queryToken);
    }
  }, [searchParams]);

  // Password requirements calculation
  const hasMinLength = newPassword.length >= 8;
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const hasDigitOrSpecial = /[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const isFormValid = hasMinLength && hasUpper && hasLower && hasDigitOrSpecial && passwordsMatch && token.trim().length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!isFormValid) {
      setErrorMessage('Please ensure the token is present and all password requirements are satisfied.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/v1/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.trim(), newPassword }),
      });

      const body = await res.json();

      if (!res.ok) {
        const msg = body?.error?.message ?? 'Failed to reset password. The token may be expired or invalid.';
        setErrorMessage(msg);
        error('Password Reset Failed', msg);
        setLoading(false);
        return;
      }

      setIsSuccess(true);
      success('Password Reset Successful', 'Your password has been securely updated. Please sign in.');
    } catch {
      setErrorMessage('Network error occurred. Please check connectivity.');
      error('Connection Error', 'Failed to communicate with authentication server');
    } finally {
      setLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="w-full text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E8F7F0] text-3xl text-[#16A36A] border border-[#16A36A]/20 shadow-2xs">
          ✓
        </div>
        <h2 className="mt-4 text-3xl font-black tracking-tight text-[#253746]">Password Updated!</h2>
        <p className="mt-2 text-xs text-[#718096] leading-relaxed">
          Your credentials have been securely refreshed. You may now access the Operations Portal with your new password.
        </p>

        <div className="mt-6">
          <Link
            href="/login"
            className="flex w-full items-center justify-center rounded-xl bg-[#087E8B] px-4 py-3 text-xs font-bold text-white shadow-xs hover:bg-[#066873] transition"
          >
            Sign In with New Password →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Green status indicator */}
      <div className="flex items-center gap-2 mb-2">
        <span className="h-2 w-2 rounded-full bg-[#16A36A] animate-pulse" />
        <span className="text-[11px] font-extrabold tracking-widest text-[#16A36A] uppercase">
          Your FoodFlow Account
        </span>
      </div>

      <h2 className="text-3xl font-black tracking-tight text-[#253746]">Set New Password</h2>
      <p className="mt-1.5 text-xs text-[#718096]">
        Enter your verification reset token and choose a strong password.
      </p>

      {errorMessage && (
        <div className="mt-4 rounded-xl border border-[#DC5353]/20 bg-[#FCEEEE] p-3 text-xs text-[#DC5353] font-medium">
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="token" className="block text-xs font-bold text-[#253746] mb-1.5">
            Reset Token
          </label>
          <input
            id="token"
            type="text"
            required
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="block w-full rounded-xl border border-[#E5EAF0] bg-[#F5F7FA] px-3.5 py-2.5 font-mono text-xs text-[#253746] shadow-2xs focus:border-[#087E8B] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#087E8B] transition"
            placeholder="Paste your 64-char reset token here"
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label htmlFor="newPassword" aria-label="New Password" className="block text-xs font-bold text-[#253746]">
              New Password
            </label>
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-xs text-[#718096] hover:text-[#253746]"
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
          <input
            id="newPassword"
            type={showPassword ? 'text' : 'password'}
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="block w-full rounded-xl border border-[#E5EAF0] bg-[#F5F7FA] px-3.5 py-2.5 text-xs font-semibold text-[#253746] shadow-2xs focus:border-[#087E8B] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#087E8B] transition"
            placeholder="••••••••"
          />
        </div>

        <div>
          <label htmlFor="confirmPassword" aria-label="Confirm Password" className="block text-xs font-bold text-[#253746] mb-1.5">
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            type={showPassword ? 'text' : 'password'}
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="block w-full rounded-xl border border-[#E5EAF0] bg-[#F5F7FA] px-3.5 py-2.5 text-xs font-semibold text-[#253746] shadow-2xs focus:border-[#087E8B] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#087E8B] transition"
            placeholder="••••••••"
          />
        </div>

        {/* Security Checklist */}
        <div className="rounded-xl border border-[#E5EAF0] bg-[#F5F7FA] p-3 text-xs space-y-1">
          <p className="font-bold text-[#253746] mb-1.5">Password Requirements:</p>
          <div className={`flex items-center gap-1.5 ${hasMinLength ? 'text-[#16A36A] font-medium' : 'text-[#718096]'}`}>
            <span>{hasMinLength ? '✓' : '○'}</span>
            <span>At least 8 characters</span>
          </div>
          <div className={`flex items-center gap-1.5 ${hasUpper ? 'text-[#16A36A] font-medium' : 'text-[#718096]'}`}>
            <span>{hasUpper ? '✓' : '○'}</span>
            <span>Uppercase letter (A-Z)</span>
          </div>
          <div className={`flex items-center gap-1.5 ${hasLower ? 'text-[#16A36A] font-medium' : 'text-[#718096]'}`}>
            <span>{hasLower ? '✓' : '○'}</span>
            <span>Lowercase letter (a-z)</span>
          </div>
          <div className={`flex items-center gap-1.5 ${hasDigitOrSpecial ? 'text-[#16A36A] font-medium' : 'text-[#718096]'}`}>
            <span>{hasDigitOrSpecial ? '✓' : '○'}</span>
            <span>Number or symbol</span>
          </div>
          <div className={`flex items-center gap-1.5 ${passwordsMatch ? 'text-[#16A36A] font-medium' : 'text-[#718096]'}`}>
            <span>{passwordsMatch ? '✓' : '○'}</span>
            <span>Passwords match</span>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !isFormValid}
          className="flex w-full items-center justify-center rounded-xl bg-[#087E8B] px-4 py-3 text-xs font-bold text-white shadow-xs hover:bg-[#066873] transition disabled:opacity-50"
        >
          {loading ? 'Updating Password...' : 'Save New Password'}
        </button>

        <div className="text-center pt-2">
          <Link href="/login" className="text-xs text-[#718096] hover:text-[#253746] font-medium">
            Remember your credentials? <span className="font-bold text-[#087E8B]">Sign in</span>
          </Link>
        </div>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#E5EAF0] border-t-[#087E8B]" />
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}

