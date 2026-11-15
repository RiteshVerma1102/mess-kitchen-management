'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/components/Toast';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { success, error } = useToast();

  const emailParam = searchParams.get('email') || '';
  const codeParam = searchParams.get('code') || '';
  const instParam = searchParams.get('institution') || 'thapar-demo';

  const [email, setEmail] = useState(emailParam);
  const [code, setCode] = useState(codeParam);
  const [institutionSlug, setInstitutionSlug] = useState(instParam);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    if (emailParam) setEmail(emailParam);
    if (codeParam) setCode(codeParam);
    if (instParam) setInstitutionSlug(instParam);
  }, [emailParam, codeParam, instParam]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!code || code.trim().length < 6) {
      setErrorMessage('Please enter the complete 6-digit verification code.');
      return;
    }

    setErrorMessage(null);
    setLoading(true);

    try {
      const res = await fetch('/api/v1/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          code: code.trim(),
          institutionSlug,
        }),
      });

      const body = await res.json();

      if (!res.ok) {
        const msg = body?.error?.message ?? 'Invalid or expired verification code';
        setErrorMessage(msg);
        error('Verification Failed', msg);
        setLoading(false);
        return;
      }

      setIsVerified(true);
      success('Email Verified!', 'Your account is now activated. Welcome to FoodFlow!');
      setTimeout(() => {
        router.push('/dashboard');
        router.refresh();
      }, 1500);
    } catch {
      setErrorMessage('Network error occurred during verification.');
      error('Connection Error', 'Failed to reach verification endpoint');
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || !email) return;
    setResending(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/v1/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, institutionSlug }),
      });

      if (res.ok) {
        success('Code Sent', 'A fresh 6-digit verification code has been dispatched.');
        setResendCooldown(60);
      } else {
        const body = await res.json();
        error('Resend Failed', body?.error?.message ?? 'Could not resend code');
      }
    } catch {
      error('Error', 'Failed to communicate with auth server');
    } finally {
      setResending(false);
    }
  };

  if (isVerified) {
    return (
      <div className="rounded-3xl border border-[#E5EAF0] bg-white p-8 sm:p-10 shadow-xl text-center animate-in zoom-in-95">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#E8F7F0] text-3xl text-[#16A36A] border border-[#16A36A]/20 shadow-xs">
          ✓
        </div>
        <h2 className="mt-4 text-2xl font-black text-[#253746]">Email Verified!</h2>
        <p className="mt-1.5 text-xs text-[#718096]">
          Your account has been verified and activated. Logging you in now...
        </p>
        <div className="mt-6 flex justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#E5EAF0] border-t-[#087E8B]" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-[#E5EAF0] bg-white p-8 sm:p-10 shadow-xl">
      <div className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#DDF3F3] text-2xl text-[#087E8B] border border-[#087E8B]/20 shadow-xs">
          ✉️
        </div>
        <h2 className="mt-4 text-2xl font-black tracking-tight text-[#253746]">Verify Your Email</h2>
        <p className="mt-1 text-xs text-[#718096]">
          We sent a 6-digit verification code to <span className="font-bold text-[#253746]">{email || 'your email'}</span>
        </p>
      </div>

      {errorMessage && (
        <div className="mt-4 rounded-xl border border-[#DC5353]/20 bg-[#FCEEEE] p-3 text-xs text-[#DC5353] font-medium">
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleVerify} className="mt-6 space-y-4">
        <div>
          <label htmlFor="verifyCode" className="block text-xs font-bold text-[#253746] mb-1.5 text-center">
            Enter 6-Digit Code
          </label>
          <input
            id="verifyCode"
            type="text"
            maxLength={6}
            required
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            className="block w-full text-center tracking-[0.5em] text-2xl font-mono font-black rounded-xl border border-[#E5EAF0] bg-[#F5F7FA] px-3.5 py-3 text-[#087E8B] shadow-2xs focus:border-[#087E8B] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#087E8B] transition"
            placeholder="••••••"
          />
        </div>

        <button
          type="submit"
          disabled={loading || code.length < 6}
          className="mt-2 flex w-full items-center justify-center rounded-xl bg-[#087E8B] px-4 py-3 text-xs font-bold text-white shadow-xs hover:bg-[#066873] transition disabled:opacity-50"
        >
          {loading ? 'Verifying Code...' : 'Activate Account & Sign In →'}
        </button>
      </form>

      <div className="mt-6 flex flex-col items-center gap-2 text-xs text-[#718096]">
        <div>
          Didn&apos;t receive the email?{' '}
          <button
            type="button"
            onClick={handleResend}
            disabled={resending || resendCooldown > 0}
            className="font-bold text-[#087E8B] hover:underline disabled:opacity-50"
          >
            {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : resending ? 'Dispatching...' : 'Resend Code'}
          </button>
        </div>

        <Link href="/login" className="text-[11px] text-[#718096] hover:text-[#253746] hover:underline pt-2">
          ← Back to Sign In
        </Link>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-[#718096]">Loading verification...</div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
