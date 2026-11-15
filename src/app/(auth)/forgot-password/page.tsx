'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { success, error } = useToast();

  const [email, setEmail] = useState('');
  const [institutionSlug, setInstitutionSlug] = useState('thapar-demo');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      const res = await fetch('/api/v1/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, institutionSlug }),
      });

      const body = await res.json();

      if (!res.ok) {
        const msg = body?.error?.message ?? 'Failed to send recovery instructions';
        setErrorMessage(msg);
        error('Recovery Request Failed', msg);
        setLoading(false);
        return;
      }

      setSubmitted(true);
      success('Recovery Email Dispatched', 'Password reset instructions have been dispatched.');
    } catch {
      setErrorMessage('Network error occurred. Please check connectivity.');
      error('Connection Error', 'Failed to communicate with authentication server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      {/* Green status indicator */}
      <div className="flex items-center gap-2 mb-2">
        <span className="h-2 w-2 rounded-full bg-[#16A36A] animate-pulse" />
        <span className="text-[11px] font-extrabold tracking-widest text-[#16A36A] uppercase">
          Your FoodFlow Account
        </span>
      </div>

      {/* Main Form Heading (Matching Screenshot 7) */}
      <h2 className="text-3xl font-black tracking-tight text-[#253746]">
        Reset your password.
      </h2>
      <p className="mt-1.5 text-xs text-[#718096]">
        We&apos;ll email a password reset link.
      </p>

      {/* Divider */}
      <div className="relative my-6 text-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[#E5EAF0]" />
        </div>
        <span className="relative bg-white px-3 text-[10px] font-bold text-[#718096] uppercase tracking-wider">
          Or continue with email
        </span>
      </div>

      {errorMessage && (
        <div className="mb-4 rounded-xl border border-[#DC5353]/20 bg-[#FCEEEE] p-3 text-xs text-[#DC5353] font-medium">
          {errorMessage}
        </div>
      )}

      {submitted ? (
        <div className="rounded-2xl border border-[#16A36A]/20 bg-[#E8F7F0] p-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#16A36A] text-white text-xl mb-3 shadow-xs">
            ✓
          </div>
          <p className="text-sm font-bold text-[#16A36A]">
            Reset Token Dispatched
          </p>
          <p className="mt-1.5 text-xs text-[#253746] leading-relaxed">
            If an active account exists for <span className="font-bold text-[#087E8B]">{email}</span>, a secure password recovery token has been generated and dispatched.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => router.push(`/reset-password`)}
              className="flex-1 rounded-xl bg-[#087E8B] px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#066873] transition"
            >
              Enter Reset Token →
            </button>
            <Link
              href="/login"
              className="flex-1 rounded-xl border border-[#E5EAF0] bg-white px-4 py-2.5 text-xs font-bold text-[#253746] hover:bg-[#F5F7FA] text-center transition"
            >
              Return to Sign In
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="instSlug" className="block text-xs font-bold text-[#253746] mb-1.5">
              Institution Code / Campus ID
            </label>
            <input
              id="instSlug"
              type="text"
              required
              value={institutionSlug}
              onChange={(e) => setInstitutionSlug(e.target.value)}
              className="block w-full rounded-xl border border-[#E5EAF0] bg-[#F5F7FA] px-3.5 py-2.5 text-xs font-semibold text-[#253746] shadow-2xs focus:border-[#087E8B] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#087E8B] transition"
              placeholder="thapar-demo"
            />
          </div>

          <div>
            <label htmlFor="recoveryEmail" className="block text-xs font-bold text-[#253746] mb-1.5">
              Email address
            </label>
            <input
              id="recoveryEmail"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="block w-full rounded-xl border border-[#E5EAF0] bg-[#F5F7FA] px-3.5 py-2.5 text-xs font-semibold text-[#253746] shadow-2xs focus:border-[#087E8B] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#087E8B] transition"
              placeholder="you@institution.edu"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#087E8B] px-4 py-3 text-xs font-bold text-white shadow-xs hover:bg-[#066873] transition disabled:opacity-50"
          >
            <span>✉️</span>
            <span>{loading ? 'Dispatching...' : 'Send reset link'}</span>
          </button>

          <div className="text-center pt-2">
            <Link href="/login" className="text-xs text-[#718096] hover:text-[#253746] font-medium">
              Remember your password? <span className="font-bold text-[#087E8B]">Sign in</span>
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
