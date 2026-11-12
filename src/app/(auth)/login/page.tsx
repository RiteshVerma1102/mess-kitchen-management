'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/components/Toast';

export default function LoginPage() {
  const router = useRouter();
  const { success, error } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [institutionSlug, setInstitutionSlug] = useState('thapar-demo');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fillDemoCredentials = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setInstitutionSlug('thapar-demo');
    setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, institutionSlug }),
      });

      const body = await res.json();

      if (!res.ok) {
        const msg = body?.error?.message ?? 'Invalid email or password';
        setErrorMessage(msg);
        error('Sign In Failed', msg);
        setLoading(false);
        return;
      }

      success('Sign In Successful', `Welcome back, ${body.data.user.fullName}`);
      router.push('/dashboard');
      router.refresh();
    } catch {
      setErrorMessage('Network error occurred. Please verify connectivity.');
      error('Connection Error', 'Failed to communicate with authentication server');
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-line bg-paper p-8 shadow-xl">
      {/* Brand header */}
      <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand text-2xl text-white shadow-md">
          🍲
        </div>
        <h2 className="mt-4 text-2xl font-bold tracking-tight text-ink">Smart Mess Portal</h2>
        <p className="mt-1 text-xs text-ink/70">
          Smart Food Waste Reduction & Kitchen Demand Planning
        </p>
      </div>

      {/* Demo helper pill bar */}
      <div className="mt-6 rounded-lg border border-brand/20 bg-brand/5 p-3">
        <p className="text-xs font-semibold text-brand">Quick Demo Sign-In (Select Role):</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => fillDemoCredentials('admin@thapar.edu', 'Password123!')}
            className="rounded bg-white dark:bg-stone-800 px-2.5 py-1 text-[11px] font-medium border border-line hover:border-brand transition"
          >
            👑 Super Admin
          </button>
          <button
            type="button"
            onClick={() => fillDemoCredentials('manager@thapar.edu', 'Password123!')}
            className="rounded bg-white dark:bg-stone-800 px-2.5 py-1 text-[11px] font-medium border border-line hover:border-brand transition"
          >
            📋 Mess Manager
          </button>
          <button
            type="button"
            onClick={() => fillDemoCredentials('kitchen@thapar.edu', 'Password123!')}
            className="rounded bg-white dark:bg-stone-800 px-2.5 py-1 text-[11px] font-medium border border-line hover:border-brand transition"
          >
            🍳 Kitchen Staff
          </button>
          <button
            type="button"
            onClick={() => fillDemoCredentials('student@thapar.edu', 'Password123!')}
            className="rounded bg-white dark:bg-stone-800 px-2.5 py-1 text-[11px] font-medium border border-line hover:border-brand transition"
          >
            🎓 Student
          </button>
        </div>
      </div>

      {/* Error alert */}
      {errorMessage && (
        <div className="mt-4 rounded-md border border-red-300 dark:border-red-900 bg-red-50 dark:bg-red-950/70 p-3 text-xs text-red-800 dark:text-red-200">
          {errorMessage}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="instSlug" className="block text-xs font-semibold text-ink/80">
            Institution Code / Slug
          </label>
          <input
            id="instSlug"
            type="text"
            required
            value={institutionSlug}
            onChange={(e) => setInstitutionSlug(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            placeholder="thapar-demo"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-xs font-semibold text-ink/80">
            Email Address
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            placeholder="admin@thapar.edu"
          />
        </div>

        <div>
          <div className="flex justify-between items-center">
            <label htmlFor="password" aria-label="Password" className="block text-xs font-semibold text-ink/80">
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-xs text-brand hover:underline font-medium"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative mt-1">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="block w-full rounded-lg border border-line bg-paper px-3 py-2 pr-10 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-xs text-ink/50 hover:text-ink"
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-2 flex w-full items-center justify-center rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow hover:opacity-90 transition disabled:opacity-50"
        >
          {loading ? 'Authenticating...' : 'Sign In to Mess Portal'}
        </button>
      </form>

      <div className="mt-6 text-center text-xs text-ink/60">
        Demo seed users have password: <span className="font-mono font-semibold">Password123!</span>
      </div>
    </div>
  );
}
