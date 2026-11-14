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
    <div className="rounded-3xl border border-slate-100 bg-white p-8 sm:p-10 shadow-xl">
      <div className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-2xl text-teal-800 border border-teal-100 shadow-2xs">
          🔑
        </div>
        <h2 className="mt-4 text-2xl font-black tracking-tight text-slate-900">Reset Password</h2>
        <p className="mt-1 text-xs text-slate-500">
          Enter your university email to receive account recovery instructions.
        </p>
      </div>

      {submitted ? (
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 text-center">
          <p className="text-sm font-bold text-emerald-900">
            Reset Link Dispatched
          </p>
          <p className="mt-1.5 text-xs text-emerald-800 leading-relaxed">
            If an active account exists for <span className="font-bold">{email}</span>, password reset credentials have been routed to the institutional administrator.
          </p>
          <Link
            href="/login"
            className="mt-4 inline-block text-xs font-bold text-teal-800 hover:underline"
          >
            ← Return to Sign In
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="recoveryEmail" className="block text-xs font-bold text-slate-700 mb-1.5">
              Registered University Email
            </label>
            <input
              id="recoveryEmail"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="block w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-800 shadow-2xs focus:border-teal-700 focus:outline-none focus:ring-1 focus:ring-teal-700 transition"
              placeholder="e.g. manager@thapar.edu"
            />
          </div>

          <button
            type="submit"
            className="flex w-full items-center justify-center rounded-xl bg-teal-800 px-4 py-3 text-xs font-bold text-white shadow-md shadow-teal-900/10 hover:bg-teal-900 transition"
          >
            Submit Recovery Request
          </button>

          <div className="text-center pt-2">
            <Link href="/login" className="text-xs text-slate-500 hover:text-slate-800 font-medium">
              Remember your password? Sign in
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
