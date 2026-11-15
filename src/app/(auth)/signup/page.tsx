'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/components/Toast';

export default function SignupPage() {
  const router = useRouter();
  const { error } = useToast();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [institutionSlug, setInstitutionSlug] = useState('thapar-demo');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Password strength check
  const hasMinLength = password.length >= 8;
  const hasNumberOrSpecial = /[0-9!@#$%^&*(),.?":{}|<>]/.test(password);
  const isMatch = password.length > 0 && password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!agreeTerms) {
      setErrorMessage('You must accept the institutional terms of service to create an account.');
      return;
    }

    if (!hasMinLength) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/v1/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          email,
          password,
          institutionSlug,
        }),
      });

      const body = await res.json();

      if (!res.ok) {
        const msg = body?.error?.message ?? 'Failed to register account';
        setErrorMessage(msg);
        error('Registration Failed', msg);
        setLoading(false);
        return;
      }

      // Redirect directly to verify-email
      router.push(`/verify-email?email=${encodeURIComponent(email)}&institution=${encodeURIComponent(institutionSlug)}`);
    } catch {
      setErrorMessage('Network error occurred. Please check your connection.');
      error('Connection Error', 'Could not communicate with authentication server');
      setLoading(false);
    }
  };

  return (
    <div className="rounded-3xl border border-[#E5EAF0] bg-white p-8 sm:p-10 shadow-xl">
      {/* Brand header */}
      <div className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#087E8B] text-2xl text-white shadow-xs">
          🍃
        </div>
        <h2 className="mt-4 text-2xl font-black tracking-tight text-[#253746]">Create FoodFlow Account</h2>
        <p className="mt-1 text-xs text-[#718096]">
          Register for institutional dining hall, meal booking, and kitchen access
        </p>
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
          <label htmlFor="fullName" className="block text-xs font-bold text-[#253746] mb-1.5">
            Full Name
          </label>
          <input
            id="fullName"
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="block w-full rounded-xl border border-[#E5EAF0] bg-[#F5F7FA] px-3.5 py-2.5 text-xs font-semibold text-[#253746] shadow-2xs focus:border-[#087E8B] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#087E8B] transition"
            placeholder="e.g. Ritesh Verma"
          />
        </div>

        <div>
          <label htmlFor="signupEmail" className="block text-xs font-bold text-[#253746] mb-1.5">
            University / Campus Email
          </label>
          <input
            id="signupEmail"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="block w-full rounded-xl border border-[#E5EAF0] bg-[#F5F7FA] px-3.5 py-2.5 text-xs font-semibold text-[#253746] shadow-2xs focus:border-[#087E8B] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#087E8B] transition"
            placeholder="e.g. ritesh.verma@thapar.edu"
          />
        </div>

        <div>
          <label htmlFor="instSlug" className="block text-xs font-bold text-[#253746] mb-1.5">
            Campus ID / Institution Code
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
          <label htmlFor="signupPassword" aria-label="Password" className="block text-xs font-bold text-[#253746] mb-1.5">
            Password (Min 8 Characters)
          </label>
          <div className="relative">
            <input
              id="signupPassword"
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
          {/* Password strength checklist */}
          <div className="mt-2 flex items-center gap-3 text-[11px]">
            <span className={hasMinLength ? 'text-[#16A36A] font-bold' : 'text-[#718096]'}>
              {hasMinLength ? '✓' : '○'} 8+ characters
            </span>
            <span className={hasNumberOrSpecial ? 'text-[#16A36A] font-bold' : 'text-[#718096]'}>
              {hasNumberOrSpecial ? '✓' : '○'} Number or symbol
            </span>
          </div>
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-xs font-bold text-[#253746] mb-1.5">
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
          {confirmPassword.length > 0 && !isMatch && (
            <p className="mt-1 text-[11px] text-[#DC5353]">Passwords do not match.</p>
          )}
        </div>

        <div className="flex items-start gap-2 pt-1">
          <input
            id="terms"
            type="checkbox"
            checked={agreeTerms}
            onChange={(e) => setAgreeTerms(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded-md border-[#E5EAF0] text-[#087E8B] focus:ring-[#087E8B]"
            required
          />
          <label htmlFor="terms" className="text-xs text-[#718096] leading-tight">
            I agree to the <span className="font-bold text-[#253746]">Institutional Mess Dining Regulations</span> and <span className="font-bold text-[#253746]">Data Privacy Policy</span>.
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-2 flex w-full items-center justify-center rounded-xl bg-[#087E8B] px-4 py-3 text-xs font-bold text-white shadow-xs hover:bg-[#066873] transition disabled:opacity-50"
        >
          {loading ? 'Creating Account...' : 'Register & Verify Email →'}
        </button>
      </form>

      <div className="mt-6 text-center text-xs text-[#718096]">
        Already have an account?{' '}
        <Link href="/login" className="font-bold text-[#087E8B] hover:underline">
          Sign In
        </Link>
      </div>
    </div>
  );
}
