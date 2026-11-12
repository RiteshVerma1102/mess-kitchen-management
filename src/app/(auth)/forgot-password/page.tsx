'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="rounded-2xl border border-line bg-paper p-8 shadow-xl">
      <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-2xl text-amber-600 shadow-sm">
          🔑
        </div>
        <h2 className="mt-4 text-2xl font-bold tracking-tight text-ink">Reset Password</h2>
        <p className="mt-1 text-xs text-ink/70">
          Enter your university email to receive recovery instructions.
        </p>
      </div>

      {submitted ? (
        <div className="mt-6 rounded-lg border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 p-4 text-center">
          <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
            Reset Link Dispatched
          </p>
          <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-300">
            If an active account exists for <span className="font-semibold">{email}</span>, password reset credentials have been routed to the institution administrator.
          </p>
          <Link
            href="/login"
            className="mt-4 inline-block text-xs font-semibold text-brand underline"
          >
            Return to Login
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="recoveryEmail" className="block text-xs font-semibold text-ink/80">
              Registered University Email
            </label>
            <input
              id="recoveryEmail"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm shadow-sm focus:border-brand focus:outline-none"
              placeholder="e.g. manager@thapar.edu"
            />
          </div>

          <button
            type="submit"
            className="flex w-full items-center justify-center rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow hover:opacity-90"
          >
            Submit Recovery Request
          </button>

          <div className="text-center">
            <Link href="/login" className="text-xs text-ink/70 hover:underline">
              Remember your password? Sign in
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
