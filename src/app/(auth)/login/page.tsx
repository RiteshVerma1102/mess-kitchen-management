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
  const [isUnverified, setIsUnverified] = useState(false);

  const fillDemoCredentials = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setInstitutionSlug('thapar-demo');
    setErrorMessage(null);
    setIsUnverified(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsUnverified(false);
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
        if (msg.toLowerCase().includes('verification')) {
          setIsUnverified(true);
        }
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
    <div className="w-full">
      {/* Green status indicator */}
      <div className="flex items-center gap-2 mb-2">
        <span className="h-2 w-2 rounded-full bg-[#16A36A] animate-pulse" />
        <span className="text-[11px] font-extrabold tracking-widest text-[#16A36A] uppercase">
          Your FoodFlow Account
        </span>
      </div>

      {/* Main Form Heading */}
      <h2 className="text-3xl font-black tracking-tight text-[#253746]">
        Good to have you back.
      </h2>
      <p className="mt-1.5 text-xs text-[#718096]">
        Sign in to your FoodFlow workspace.
      </p>

      {/* 1-Click Instant Demo Role Selection */}
      <div className="mt-6">
        <div className="rounded-2xl border border-[#087E8B]/20 bg-[#DDF3F3]/40 p-3">
          <p className="text-[11px] font-bold text-[#087E8B] mb-2 flex items-center gap-1.5">
            <span>⚡</span>
            <span>1-Click Demo Login (Select Role):</span>
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => fillDemoCredentials('admin@thapar.edu', 'Password123!')}
              className="rounded-xl border border-[#E5EAF0] bg-white px-2.5 py-1.5 text-xs font-bold text-[#253746] hover:border-[#087E8B] hover:text-[#087E8B] shadow-2xs transition text-left"
            >
              👑 Admin
            </button>
            <button
              type="button"
              onClick={() => fillDemoCredentials('manager@thapar.edu', 'Password123!')}
              className="rounded-xl border border-[#E5EAF0] bg-white px-2.5 py-1.5 text-xs font-bold text-[#253746] hover:border-[#087E8B] hover:text-[#087E8B] shadow-2xs transition text-left"
            >
              📋 Manager
            </button>
            <button
              type="button"
              onClick={() => fillDemoCredentials('kitchen@thapar.edu', 'Password123!')}
              className="rounded-xl border border-[#E5EAF0] bg-white px-2.5 py-1.5 text-xs font-bold text-[#253746] hover:border-[#087E8B] hover:text-[#087E8B] shadow-2xs transition text-left"
            >
              🍳 Chef
            </button>
            <button
              type="button"
              onClick={() => fillDemoCredentials('student@thapar.edu', 'Password123!')}
              className="rounded-xl border border-[#E5EAF0] bg-white px-2.5 py-1.5 text-xs font-bold text-[#253746] hover:border-[#087E8B] hover:text-[#087E8B] shadow-2xs transition text-left"
            >
              🎓 Resident
            </button>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="relative my-6 text-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[#E5EAF0]" />
        </div>
        <span className="relative bg-white px-3 text-[10px] font-bold text-[#718096] uppercase tracking-wider">
          Or continue with email
        </span>
      </div>

      {/* Error alert */}
      {errorMessage && (
        <div className="mb-4 rounded-xl border border-[#DC5353]/20 bg-[#FCEEEE] p-3 text-xs text-[#DC5353] font-medium">
          <p>{errorMessage}</p>
          {isUnverified && (
            <div className="mt-2 pt-2 border-t border-[#DC5353]/20 flex items-center justify-between">
              <span className="text-[#253746]">Need to enter your 6-digit code?</span>
              <Link
                href={`/verify-email?email=${encodeURIComponent(email)}&institutionSlug=${encodeURIComponent(institutionSlug)}`}
                className="font-bold text-[#087E8B] hover:underline"
              >
                Verify Now →
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Form */}
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
          <label htmlFor="email" className="block text-xs font-bold text-[#253746] mb-1.5">
            Email address
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="block w-full rounded-xl border border-[#E5EAF0] bg-[#F5F7FA] px-3.5 py-2.5 text-xs font-semibold text-[#253746] shadow-2xs focus:border-[#087E8B] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#087E8B] transition"
            placeholder="you@institution.edu"
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
              placeholder="At least 8 characters"
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
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#087E8B] px-4 py-3 text-xs font-bold text-white shadow-xs hover:bg-[#066873] transition disabled:opacity-50"
        >
          <span>{loading ? 'Authenticating...' : 'Sign in to FoodFlow'}</span>
          <span>→</span>
        </button>

        <div className="text-center pt-2">
          <p className="text-xs text-[#718096]">
            New to FoodFlow?{' '}
            <Link href="/signup" className="font-bold text-[#087E8B] hover:underline">
              Create your account
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
}
