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
    <div className="rounded-3xl border border-[#E5EAF0] bg-white p-8 sm:p-10 shadow-xl">
      {/* Brand header (FoodFlow Inspired) */}
      <div className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#087E8B] text-2xl text-white shadow-xs">
          🍃
        </div>
        <h2 className="mt-4 text-2xl font-black tracking-tight text-[#253746]">FoodFlow Portal</h2>
        <p className="mt-1 text-xs text-[#718096]">
          Smart Food Waste Reduction & Central Kitchen Demand Planning
        </p>
      </div>

      {/* Demo helper pill bar */}
      <div className="mt-6 rounded-2xl border border-[#087E8B]/20 bg-[#DDF3F3]/50 p-3.5">
        <p className="text-xs font-bold text-[#087E8B]">Quick 1-Click Demo Sign-In (Select Role):</p>
        <div className="mt-2.5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => fillDemoCredentials('admin@thapar.edu', 'Password123!')}
            className="rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-[#253746] border border-[#E5EAF0] hover:border-[#087E8B] hover:text-[#087E8B] shadow-2xs transition"
          >
            👑 Super Admin
          </button>
          <button
            type="button"
            onClick={() => fillDemoCredentials('manager@thapar.edu', 'Password123!')}
            className="rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-[#253746] border border-[#E5EAF0] hover:border-[#087E8B] hover:text-[#087E8B] shadow-2xs transition"
          >
            📋 Mess Manager
          </button>
          <button
            type="button"
            onClick={() => fillDemoCredentials('kitchen@thapar.edu', 'Password123!')}
            className="rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-[#253746] border border-[#E5EAF0] hover:border-[#087E8B] hover:text-[#087E8B] shadow-2xs transition"
          >
            🍳 Kitchen Chef
          </button>
          <button
            type="button"
            onClick={() => fillDemoCredentials('student@thapar.edu', 'Password123!')}
            className="rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-[#253746] border border-[#E5EAF0] hover:border-[#087E8B] hover:text-[#087E8B] shadow-2xs transition"
          >
            🎓 Resident
          </button>
        </div>
      </div>

      {/* Error alert */}
      {errorMessage && (
        <div className="mt-4 rounded-xl border border-[#DC5353]/20 bg-[#FCEEEE] p-3 text-xs text-[#DC5353] font-medium">
          {errorMessage}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
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
          <label htmlFor="email" className="block text-xs font-bold text-[#253746] mb-1.5">
            Email Address
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="block w-full rounded-xl border border-[#E5EAF0] bg-[#F5F7FA] px-3.5 py-2.5 text-xs font-semibold text-[#253746] shadow-2xs focus:border-[#087E8B] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#087E8B] transition"
            placeholder="admin@thapar.edu"
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label htmlFor="password" aria-label="Password" className="block text-xs font-bold text-[#253746]">
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-xs text-[#087E8B] hover:underline font-bold"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="block w-full rounded-xl border border-[#E5EAF0] bg-[#F5F7FA] px-3.5 py-2.5 pr-10 text-xs font-semibold text-[#253746] shadow-2xs focus:border-[#087E8B] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#087E8B] transition"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-xs text-[#718096] hover:text-[#253746]"
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-2 flex w-full items-center justify-center rounded-xl bg-[#087E8B] px-4 py-3 text-xs font-bold text-white shadow-xs hover:bg-[#066873] transition disabled:opacity-50"
        >
          {loading ? 'Authenticating...' : 'Sign In to Operations Portal'}
        </button>
      </form>

      <div className="mt-6 text-center text-xs text-[#718096]">
        Demo seed users have password: <span className="font-mono font-bold text-[#253746]">Password123!</span>
      </div>
    </div>
  );
}
