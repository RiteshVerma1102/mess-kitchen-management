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
  const [agreeTerms, setAgreeTerms] = useState(true);
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
      setErrorMessage('Please accept the institutional terms to register.');
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
    <div className="w-full">
      {/* Green status indicator */}
      <div className="flex items-center gap-2 mb-2">
        <span className="h-2 w-2 rounded-full bg-[#16A36A] animate-pulse" />
        <span className="text-[11px] font-extrabold tracking-widest text-[#16A36A] uppercase">
          Your FoodFlow Account
        </span>
      </div>

      {/* Main Form Heading (Matching Screenshot 6) */}
      <h2 className="text-3xl font-black tracking-tight text-[#253746]">
        Bring your kitchen together.
      </h2>
      <p className="mt-1.5 text-xs text-[#718096]">
        Create an account and set up your institution.
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

      {/* Error alert */}
      {errorMessage && (
        <div className="mb-4 rounded-xl border border-[#DC5353]/20 bg-[#FCEEEE] p-3 text-xs text-[#DC5353] font-medium">
          {errorMessage}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="fullName" className="block text-xs font-bold text-[#253746] mb-1.5">
            Your name
          </label>
          <input
            id="fullName"
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="block w-full rounded-xl border border-[#E5EAF0] bg-[#F5F7FA] px-3.5 py-2.5 text-xs font-semibold text-[#253746] shadow-2xs focus:border-[#087E8B] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#087E8B] transition"
            placeholder="e.g. Vikram Sharma"
          />
        </div>

        <div>
          <label htmlFor="signupEmail" className="block text-xs font-bold text-[#253746] mb-1.5">
            Email address
          </label>
          <input
            id="signupEmail"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="block w-full rounded-xl border border-[#E5EAF0] bg-[#F5F7FA] px-3.5 py-2.5 text-xs font-semibold text-[#253746] shadow-2xs focus:border-[#087E8B] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#087E8B] transition"
            placeholder="you@institution.edu"
          />
        </div>

        <div>
          <label htmlFor="instSlug" className="block text-xs font-bold text-[#253746] mb-1.5">
            Institution code / Campus ID
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
          <div className="flex justify-between items-center mb-1.5">
            <label htmlFor="password" aria-label="Password" className="block text-xs font-bold text-[#253746]">
              Password
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
            id="password"
            type={showPassword ? 'text' : 'password'}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="block w-full rounded-xl border border-[#E5EAF0] bg-[#F5F7FA] px-3.5 py-2.5 text-xs font-semibold text-[#253746] shadow-2xs focus:border-[#087E8B] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#087E8B] transition"
            placeholder="At least 8 characters"
          />
        </div>

        <div>
          <label htmlFor="confirmPassword" aria-label="Confirm Password" className="block text-xs font-bold text-[#253746] mb-1.5">
            Confirm password
          </label>
          <input
            id="confirmPassword"
            type={showPassword ? 'text' : 'password'}
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="block w-full rounded-xl border border-[#E5EAF0] bg-[#F5F7FA] px-3.5 py-2.5 text-xs font-semibold text-[#253746] shadow-2xs focus:border-[#087E8B] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#087E8B] transition"
            placeholder="Enter your password again"
          />
        </div>

        {/* Real-time Checklist */}
        <div className="rounded-xl border border-[#E5EAF0] bg-[#F5F7FA] p-3 text-xs space-y-1">
          <div className={`flex items-center gap-1.5 ${hasMinLength ? 'text-[#16A36A] font-medium' : 'text-[#718096]'}`}>
            <span>{hasMinLength ? '✓' : '○'}</span>
            <span>At least 8 characters long</span>
          </div>
          <div className={`flex items-center gap-1.5 ${hasNumberOrSpecial ? 'text-[#16A36A] font-medium' : 'text-[#718096]'}`}>
            <span>{hasNumberOrSpecial ? '✓' : '○'}</span>
            <span>Contains number or special character</span>
          </div>
          <div className={`flex items-center gap-1.5 ${isMatch ? 'text-[#16A36A] font-medium' : 'text-[#718096]'}`}>
            <span>{isMatch ? '✓' : '○'}</span>
            <span>Passwords match</span>
          </div>
        </div>

        {/* Terms Agreement */}
        <div className="flex items-start gap-2 pt-1">
          <input
            id="agreeTerms"
            type="checkbox"
            checked={agreeTerms}
            onChange={(e) => setAgreeTerms(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#087E8B] focus:ring-[#087E8B]"
          />
          <label htmlFor="agreeTerms" className="text-xs text-[#718096] leading-tight">
            I agree to the institutional FoodFlow service policies, meal security guidelines, and data terms.
          </label>
        </div>

        <button
          type="submit"
          disabled={loading || !hasMinLength || !isMatch || !agreeTerms}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#087E8B] px-4 py-3 text-xs font-bold text-white shadow-xs hover:bg-[#066873] transition disabled:opacity-50"
        >
          <span>✓</span>
          <span>{loading ? 'Creating Account...' : 'Create FoodFlow account'}</span>
        </button>

        <div className="text-center pt-2">
          <p className="text-xs text-[#718096]">
            Already have an account?{' '}
            <Link href="/login" className="font-bold text-[#087E8B] hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
}
