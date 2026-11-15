import React from 'react';
import Link from 'next/link';
import { ToastProvider } from '@/components/Toast';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <div className="flex min-h-screen w-full bg-white text-[#253746] antialiased">
        {/* ── LEFT PANEL: DEEP TEAL BRAND HERO (Matching Screenshot 5, 6, 7) ─ */}
        <div className="hidden lg:flex lg:w-5/12 xl:w-1/2 flex-col justify-between bg-[#087E8B] p-12 xl:p-16 text-white relative overflow-hidden select-none">
          {/* Subtle decorative background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#065C66]/50 via-transparent to-black/20 pointer-events-none" />

          {/* Top Logo */}
          <div className="relative z-10">
            <Link href="/" className="inline-flex items-center gap-2.5 group">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#087E8B] shadow-md transition group-hover:scale-105">
                <span className="text-lg font-black">🍃</span>
              </div>
              <span className="text-xl font-black tracking-tight text-white">
                FoodFlow
              </span>
            </Link>
          </div>

          {/* Middle Value Proposition */}
          <div className="relative z-10 my-auto py-12 max-w-lg space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white/90 backdrop-blur-md">
              <span>✨</span>
              <span>Made for busy kitchens</span>
            </div>

            <h1 className="text-4xl xl:text-5xl font-black tracking-tight text-white leading-[1.15]">
              Good food starts <br />
              with a better plan.
            </h1>

            <p className="text-sm xl:text-base text-teal-100 leading-relaxed max-w-md">
              Keep menus, stock, and every meal service moving in step across your entire institution.
            </p>

            {/* 3 Metric Value Points */}
            <div className="pt-8 border-t border-white/15 grid grid-cols-3 gap-4">
              <div>
                <p className="text-2xl font-black text-white">01</p>
                <p className="mt-1 text-xs font-semibold text-teal-100">Plan ahead</p>
              </div>
              <div>
                <p className="text-2xl font-black text-white">02</p>
                <p className="mt-1 text-xs font-semibold text-teal-100">Serve on time</p>
              </div>
              <div>
                <p className="text-2xl font-black text-white">03</p>
                <p className="mt-1 text-xs font-semibold text-teal-100">Waste less</p>
              </div>
            </div>
          </div>

          {/* Bottom Trust Line */}
          <div className="relative z-10 pt-6 border-t border-white/10 flex items-center justify-between text-xs text-teal-200">
            <span>Simple tools for the work behind every meal.</span>
            <span className="opacity-80">🔒 Secure</span>
          </div>
        </div>

        {/* ── RIGHT PANEL: FORM CONTAINER (Matching Screenshot 5, 6, 7) ───── */}
        <div className="flex flex-1 flex-col justify-between bg-white px-4 sm:px-8 md:px-12 lg:px-16 py-8 min-h-screen overflow-y-auto">
          {/* Top Subheader Bar */}
          <div className="flex items-center justify-between text-xs text-[#718096] pb-6 border-b border-[#E5EAF0]">
            <span className="font-semibold">Smart Mess & Kitchen Management</span>
            <Link
              href="/"
              className="font-bold text-[#087E8B] hover:text-[#066873] transition"
            >
              ← Back to site
            </Link>
          </div>

          {/* Form Content Wrapper */}
          <div className="my-auto py-8 w-full max-w-md mx-auto">
            {children}
          </div>

          {/* Bottom Security Notice & Copyright */}
          <div className="pt-6 border-t border-[#E5EAF0] text-center space-y-2 max-w-md mx-auto w-full">
            <p className="text-[11px] text-[#718096] flex items-center justify-center gap-1.5">
              <span>🛡️</span>
              <span>
                Your account is secured with email confirmation. Institution roles are set by a trusted administrator.
              </span>
            </p>
            <p className="text-[11px] text-[#718096]">
              © 2026 FoodFlow • Thoughtful tools for better meal service
            </p>
          </div>
        </div>
      </div>
    </ToastProvider>
  );
}
