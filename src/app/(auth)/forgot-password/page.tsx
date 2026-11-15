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
    <div className="rounded-3xl border border-[#E5EAF0] bg-white p-8 sm:p-10 shadow-xl">
      {/* Brand Header */}
      <div className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#DDF3F3] text-2xl text-[#087E8B] border border-[#087E8B]/20 shadow-2xs">
          🔑
        </div>
        <h2 className="mt-4 text-2xl font-black tracking-tight text-[#253746]">Forgot Password</h2>
        <p className="mt-1 text-xs text-[#718096]">
          Enter your institutional credentials to receive a secure password reset token.
        </p>
      </div>

      {errorMessage && (
        <div className="mt-4 rounded-xl border border-[#DC5353]/20 bg-[#FCEEEE] p-3 text-xs text-[#DC5353] font-medium">
          {errorMessage}
        </div>
      )}

      {submitted ? (
        <div className="mt-6 rounded-2xl border border-[#16A36A]/20 bg-[#E8F7F0] p-6 text-center">
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
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="instSlug" className="block text-xs font-bold text-[#253746] mb-1.5">
              Institution Code
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
              Registered University / Staff Email
            </label>
            <input
              id="recoveryEmail"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="block w-full rounded-xl border border-[#E5EAF0] bg-[#F5F7FA] px-3.5 py-2.5 text-xs font-semibold text-[#253746] shadow-2xs focus:border-[#087E8B] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#087E8B] transition"
              placeholder="e.g. manager@thapar.edu"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center rounded-xl bg-[#087E8B] px-4 py-3 text-xs font-bold text-white shadow-xs hover:bg-[#066873] transition disabled:opacity-50"
          >
            {loading ? 'Dispatching Instructions...' : 'Send Recovery Token'}
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
