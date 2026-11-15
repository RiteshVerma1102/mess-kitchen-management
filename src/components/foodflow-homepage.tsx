'use client';

import React from 'react';
import Link from 'next/link';

export function FoodFlowHomepage() {
  return (
    <div className="min-h-screen bg-white text-[#253746] font-sans antialiased selection:bg-[#087E8B] selection:text-white">
      {/* ── TOP NAVIGATION NAVBAR ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 w-full border-b border-[#E5EAF0] bg-white/95 backdrop-blur-md transition">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#087E8B] text-white shadow-xs group-hover:bg-[#066873] transition">
              <span className="text-base font-black">🍴</span>
            </div>
            <span className="text-lg font-black tracking-tight text-[#253746]">
              SmartMess
            </span>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-bold text-[#718096]">
            <a href="#platform" className="hover:text-[#087E8B] transition">
              Platform
            </a>
            <a href="#how-it-works" className="hover:text-[#087E8B] transition">
              How it works
            </a>
            <a href="#team" className="hover:text-[#087E8B] transition">
              For your team
            </a>
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-3.5 py-2 text-xs font-bold text-[#253746] hover:text-[#087E8B] transition"
            >
              Sign in
            </Link>
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 rounded-xl bg-[#087E8B] px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#066873] transition"
            >
              <span>Explore the demo</span>
              <span>→</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ── HERO SECTION WITH COMMERCIAL KITCHEN BACKDROP ─────────────────── */}
      <section className="relative overflow-hidden bg-slate-900 py-24 sm:py-32 lg:py-40">
        {/* Background Image with Dark Vignette Overlay */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-45 mix-blend-luminosity filter saturate-150"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=2000&q=80')`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-900/75 to-slate-950/85" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Main Hero Copy */}
            <div className="lg:col-span-8 space-y-6">
              {/* Pill Tag */}
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white/90 backdrop-blur-md shadow-2xs">
                <span>⌖</span>
                <span>Clearer planning for every meal service</span>
              </div>

              {/* Main Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.1] max-w-2xl">
                Run a smarter mess. <br />
                <span className="text-[#DDF3F3]">Waste less food.</span>
              </h1>

              {/* Subtitle */}
              <p className="text-base sm:text-lg text-slate-200 max-w-xl leading-relaxed">
                Bring meal planning, kitchen operations and stock into one calm, connected workspace for your whole team.
              </p>

              {/* CTA Action Buttons */}
              <div className="flex flex-wrap items-center gap-4 pt-4">
                <Link
                  href="/dashboard"
                  className="flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-xs sm:text-sm font-bold text-[#253746] shadow-xl hover:bg-slate-100 transition"
                >
                  <span>Explore the sample workspace</span>
                  <span>→</span>
                </Link>
                <a
                  href="#how-it-works"
                  className="flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-6 py-3.5 text-xs sm:text-sm font-bold text-white hover:bg-white/20 backdrop-blur-sm transition"
                >
                  See how it works
                </a>
              </div>
            </div>

            {/* Right Side Glass Card */}
            <div className="lg:col-span-4 hidden lg:flex justify-end">
              <div className="w-full max-w-sm rounded-3xl border border-white/15 bg-white/10 p-6 backdrop-blur-xl shadow-2xl text-white">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-2xl mb-4 border border-white/20">
                  🛡️
                </div>
                <h2 className="text-base font-bold text-white mb-2">
                  One shared view
                </h2>
                <p className="text-xs text-slate-200 leading-relaxed">
                  For the managers, head chefs, and operators planning, preparing, and serving every meal.
                </p>
                <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-300">
                  <span>Institutional Multi-Tenancy</span>
                  <span className="font-bold text-[#DDF3F3]">Active 99.9%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 1: THE MOVING PARTS OF MEAL SERVICE ───────────────────── */}
      <section id="platform" className="py-20 sm:py-28 bg-[#F5F7FA] border-b border-[#E5EAF0]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-black tracking-widest text-[#087E8B] uppercase">
              One Connected Workspace
            </p>
            <h2 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight text-[#253746]">
              The moving parts of meal service, in step.
            </h2>
            <p className="mt-3 text-sm sm:text-base text-[#718096] leading-relaxed">
              Replace scattered checklists and last-minute guesswork with a shared picture of what is planned, what is on hand, and what happened at service.
            </p>
          </div>

          {/* 4 Feature Grid Cards */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
            {/* Card 1 */}
            <div className="rounded-2xl border border-[#E5EAF0] bg-white p-6 sm:p-8 shadow-xs hover:border-[#087E8B]/40 hover:shadow-md transition">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#DDF3F3] text-2xl text-[#087E8B] mb-5 border border-[#087E8B]/20">
                📅
              </div>
              <h3 className="text-lg font-bold text-[#253746]">
                Plan every service
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-[#718096] leading-relaxed">
                Keep menus, portions, dish recipes and campus calendar events synchronized before kitchen prep begins.
              </p>
            </div>

            {/* Card 2 */}
            <div className="rounded-2xl border border-[#E5EAF0] bg-white p-6 sm:p-8 shadow-xs hover:border-[#087E8B]/40 hover:shadow-md transition">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#DDF3F3] text-2xl text-[#087E8B] mb-5 border border-[#087E8B]/20">
                📊
              </div>
              <h3 className="text-lg font-bold text-[#253746]">
                See demand clearly
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-[#718096] leading-relaxed">
                Bring past attendance records and multi-day service forecasts into one unified operational projection.
              </p>
            </div>

            {/* Card 3 */}
            <div className="rounded-2xl border border-[#E5EAF0] bg-white p-6 sm:p-8 shadow-xs hover:border-[#087E8B]/40 hover:shadow-md transition">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#DDF3F3] text-2xl text-[#087E8B] mb-5 border border-[#087E8B]/20">
                📦
              </div>
              <h3 className="text-lg font-bold text-[#253746]">
                Stay ahead of stock
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-[#718096] leading-relaxed">
                Spot critical inventory shortages, supplier deliveries, and expiration alerts before they interrupt service.
              </p>
            </div>

            {/* Card 4 */}
            <div className="rounded-2xl border border-[#E5EAF0] bg-white p-6 sm:p-8 shadow-xs hover:border-[#087E8B]/40 hover:shadow-md transition">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#DDF3F3] text-2xl text-[#087E8B] mb-5 border border-[#087E8B]/20">
                ♻️
              </div>
              <h3 className="text-lg font-bold text-[#253746]">
                Learn from each meal
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-[#718096] leading-relaxed">
                Compare what was planned, what was cooked, and what was left over to make every successive meal cycle tighter.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 2: FROM PLAN TO PLATE (4 STEP FLOW) ───────────────────── */}
      <section id="how-it-works" className="py-20 sm:py-28 bg-white border-b border-[#E5EAF0]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#E5EAF0] pb-8">
            <div>
              <p className="text-xs font-black tracking-widest text-[#087E8B] uppercase">
                From Plan To Plate
              </p>
              <h2 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight text-[#253746]">
                A better rhythm for the kitchen.
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-[#718096] max-w-md">
              Keep the whole team working from the same meal plan, then carry what you learn into the next service.
            </p>
          </div>

          {/* 4 Steps Row */}
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Step 01 */}
            <div className="space-y-3">
              <span className="text-xs font-black text-[#087E8B] tracking-widest">
                01
              </span>
              <h3 className="text-base font-bold text-[#253746]">
                Plan the menu
              </h3>
              <p className="text-xs text-[#718096] leading-relaxed">
                Set meals, portions and service dates in one shared calendar and menu schedule.
              </p>
            </div>

            {/* Step 02 */}
            <div className="space-y-3">
              <span className="text-xs font-black text-[#087E8B] tracking-widest">
                02
              </span>
              <h3 className="text-base font-bold text-[#253746]">
                Prepare with context
              </h3>
              <p className="text-xs text-[#718096] leading-relaxed">
                Give kitchen teams a clear picture of expected attendance and exact ingredient indents.
              </p>
            </div>

            {/* Step 03 */}
            <div className="space-y-3">
              <span className="text-xs font-black text-[#087E8B] tracking-widest">
                03
              </span>
              <h3 className="text-base font-bold text-[#253746]">
                Run the service
              </h3>
              <p className="text-xs text-[#718096] leading-relaxed">
                Keep live RFID/barcode student attendance and production batches in unified view.
              </p>
            </div>

            {/* Step 04 */}
            <div className="space-y-3">
              <span className="text-xs font-black text-[#087E8B] tracking-widest">
                04
              </span>
              <h3 className="text-base font-bold text-[#253746]">
                Measure and improve
              </h3>
              <p className="text-xs text-[#718096] leading-relaxed">
                Record actuals and food waste audits to continuously calibrate demand forecast algorithms.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 3: MADE FOR THE WORK BEHIND EVERY MEAL ────────────────── */}
      <section id="team" className="py-20 sm:py-28 bg-[#F5F7FA] border-b border-[#E5EAF0]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Column */}
            <div className="lg:col-span-5 space-y-5">
              <p className="text-xs font-black tracking-widest text-[#087E8B] uppercase">
                Made For The Work Behind Every Meal
              </p>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-[#253746] leading-tight">
                One team. A clearer service, from the first plan to the last tray.
              </h2>
              <p className="text-xs sm:text-sm text-[#718096] leading-relaxed">
                Managers can coordinate menus and supplies. Kitchen teams can focus on the day&apos;s preparation. Attendance and service records bring the work back together.
              </p>
              <div className="pt-2">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#087E8B] px-5 py-3 text-xs font-bold text-white shadow-xs hover:bg-[#066873] transition"
                >
                  <span>Open the sample workspace</span>
                  <span>→</span>
                </Link>
              </div>
            </div>

            {/* Right Column: 3 Role Cards */}
            <div className="lg:col-span-7 space-y-4">
              {/* Role 1: Managers */}
              <div className="rounded-2xl border border-[#E5EAF0] bg-white p-6 shadow-xs flex items-start gap-4 hover:border-[#087E8B]/40 transition">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#DDF3F3] text-xl text-[#087E8B] border border-[#087E8B]/20">
                  📋
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#253746]">
                    Managers
                  </h3>
                  <p className="mt-1 text-xs text-[#718096] leading-relaxed">
                    Coordinate menus, events, suppliers, budget allocations, and the details that keep institutional service on track.
                  </p>
                </div>
              </div>

              {/* Role 2: Kitchen Teams */}
              <div className="rounded-2xl border border-[#E5EAF0] bg-white p-6 shadow-xs flex items-start gap-4 hover:border-[#087E8B]/40 transition">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#DDF3F3] text-xl text-[#087E8B] border border-[#087E8B]/20">
                  🍳
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#253746]">
                    Kitchen teams
                  </h3>
                  <p className="mt-1 text-xs text-[#718096] leading-relaxed">
                    See preparation tasks and record what was made, served, and left over without complex spreadsheets.
                  </p>
                </div>
              </div>

              {/* Role 3: Service Teams */}
              <div className="rounded-2xl border border-[#E5EAF0] bg-white p-6 shadow-xs flex items-start gap-4 hover:border-[#087E8B]/40 transition">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#DDF3F3] text-xl text-[#087E8B] border border-[#087E8B]/20">
                  📱
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#253746]">
                    Service teams
                  </h3>
                  <p className="mt-1 text-xs text-[#718096] leading-relaxed">
                    Keep attendance and meal service information synchronized with the daily production plan in real time.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 4: CALL TO ACTION BANNER (TEAL) ───────────────────────── */}
      <section className="bg-[#087E8B] py-16 sm:py-20 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="space-y-3 text-center md:text-left">
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#DDF3F3]">
                <span>✨</span>
                <span>A clearer start for your next service</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
                See how your kitchen can work in sync.
              </h2>
              <p className="text-xs sm:text-sm text-teal-100 max-w-xl">
                Explore a sample workspace or sign in to your institution to get started immediately.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/dashboard"
                className="rounded-xl bg-white px-6 py-3 text-xs sm:text-sm font-bold text-[#087E8B] shadow-xl hover:bg-slate-100 transition"
              >
                Explore the demo ↗
              </Link>
              <Link
                href="/login"
                className="rounded-xl border border-white/40 bg-transparent px-6 py-3 text-xs sm:text-sm font-bold text-white hover:bg-white/10 transition"
              >
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────────────── */}
      <footer className="bg-white py-12 border-t border-[#E5EAF0]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#087E8B] text-white">
                <span>🍴</span>
              </div>
              <div>
                <span className="text-sm font-black text-[#253746]">SmartMess</span>
                <p className="text-[11px] text-[#718096]">
                  Thoughtful tools for better meal service.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-6 text-xs font-semibold text-[#718096]">
              <a href="#platform" className="hover:text-[#087E8B] transition">
                Platform
              </a>
              <a href="#how-it-works" className="hover:text-[#087E8B] transition">
                How it works
              </a>
              <Link href="/login" className="hover:text-[#087E8B] transition">
                Sign in
              </Link>
            </div>

            <div className="text-xs text-[#718096]">
              © 2026 SmartMess. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
