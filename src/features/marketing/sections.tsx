import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Check, Menu, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

import { BrandLogo } from "./brand";
import { ProductMockup } from "./product-mockup";
import { AUDIENCES, EXTRAS, FAQS, FEATURES, LOOP, NAV_LINKS, OUTCOMES, PLANS, STEPS } from "./content";

export function SiteNav() {
  const [open, setOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setIsLoggedIn(Boolean(data.session?.user));
    });
  }, []);

  return (
    <header className="glass sticky top-0 z-50 border-b">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6" aria-label="Main">
        <Link to="/" aria-label="FoodFlow home">
          <BrandLogo />
        </Link>
        <div className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href} className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              {l.label}
            </a>
          ))}
        </div>
        <div className="hidden items-center gap-3 md:flex">
          {isLoggedIn ? (
            <Button asChild variant="hero">
              <Link to="/overview">
                Open App <ArrowRight className="ml-1.5 size-4" />
              </Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost">
                <Link to="/login">Sign In</Link>
              </Button>
              <Button asChild variant="hero">
                <Link to="/signup">Start Free Trial</Link>
              </Button>
            </>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X /> : <Menu />}
        </Button>
      </nav>
      {open && (
        <div className="border-t px-4 pb-4 md:hidden">
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="block py-3 text-sm font-medium">
              {l.label}
            </a>
          ))}
          <div className="mt-3 flex flex-col gap-2">
            {isLoggedIn ? (
              <Button asChild variant="hero" className="w-full">
                <Link to="/overview" onClick={() => setOpen(false)}>
                  Open App <ArrowRight className="ml-1.5 size-4" />
                </Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" className="w-full justify-center">
                  <Link to="/login" onClick={() => setOpen(false)}>
                    Sign In
                  </Link>
                </Button>
                <Button asChild variant="hero" className="w-full justify-center">
                  <Link to="/signup" onClick={() => setOpen(false)}>
                    Start Free Trial
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

export function Hero() {
  return (
    <section id="top" className="relative overflow-hidden bg-hero">
      <div className="grain pointer-events-none absolute inset-0 opacity-60" aria-hidden />
      <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-4 pb-20 pt-16 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:pb-28 lg:pt-24">
        <div className="animate-fade-up">
          <Badge variant="saffron" className="mb-6 gap-2 rounded-full px-3 py-1 text-xs">
            <span className="size-1.5 rounded-full bg-saffron" /> The operating system for Indian mess kitchens
          </Badge>
          <h1 className="text-balance text-5xl font-semibold leading-[1.02] sm:text-6xl lg:text-7xl">
            Cook what gets <em className="font-normal italic text-primary">eaten.</em>
            <br />
            Not a plate more.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
            FoodFlow plans your menu, forecasts every meal, tells you exactly what to buy and tracks every plate — so hostels,
            colleges and canteens cut waste and cost per plate without the registers.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Button asChild variant="saffron" size="xl">
              <Link to="/signup">
                Start Free Trial <ArrowRight />
              </Link>
            </Button>
            <Button asChild variant="glass" size="xl">
              <a href="#how">See how it works</a>
            </Button>
          </div>
          <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            {["Veg · Non-veg · Jain", "English + हिन्दी", "Works offline", "GST-ready bills"].map((t) => (
              <li key={t} className="flex items-center gap-2">
                <Check className="size-4 text-success" /> {t}
              </li>
            ))}
          </ul>
        </div>
        <div className="animate-fade-up [animation-delay:150ms]">
          <ProductMockup />
        </div>
      </div>
    </section>
  );
}

export function AudienceMarquee() {
  const list = [...AUDIENCES, ...AUDIENCES];
  return (
    <section aria-label="Who uses FoodFlow" className="border-y bg-card py-6">
      <div className="relative overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_10%,black_90%,transparent)]">
        <div className="flex w-max animate-marquee gap-12">
          {list.map((a, i) => (
            <span key={i} className="whitespace-nowrap font-display text-lg text-muted-foreground">
              {a} <span className="ml-12 text-saffron">✦</span>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function SectionHead({ eyebrow, title, body, center }: { eyebrow: string; title: string; body?: string; center?: boolean }) {
  return (
    <div className={cn("max-w-2xl", center && "mx-auto text-center")}>
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">{eyebrow}</p>
      <h2 className="mt-3 text-balance text-4xl font-semibold leading-tight sm:text-5xl">{title}</h2>
      {body && <p className="mt-4 text-lg text-muted-foreground">{body}</p>}
    </div>
  );
}

export function LoopSection() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
      <SectionHead
        center
        eyebrow="One loop, every day"
        title="From tomorrow's menu to tonight's leftovers."
        body="Every step feeds the next, so each day's numbers make tomorrow's plan sharper."
      />
      <ol className="mt-14 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {LOOP.map((s, i) => (
          <li key={s.label} className="group relative rounded-2xl border bg-card p-5 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:shadow-md">
            <span className="text-xs font-semibold tabular text-muted-foreground">0{i + 1}</span>
            <s.icon className="mt-6 size-7 text-primary transition-colors group-hover:text-saffron" />
            <p className="mt-3 font-display text-lg font-semibold">{s.label}</p>
            {i < LOOP.length - 1 && (
              <ArrowRight className="absolute -right-3.5 top-1/2 z-10 hidden size-5 -translate-y-1/2 rounded-full bg-background text-muted-foreground lg:block" />
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}

const toneClass = {
  teal: "bg-primary-soft text-primary",
  saffron: "bg-saffron-soft text-accent-foreground",
  ink: "bg-ink text-ink-foreground",
} as const;

export function Features() {
  return (
    <section id="features" className="bg-secondary/40 py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHead eyebrow="Built for real mess halls" title="Everything a mess manager touches, in one place." />
        <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <article key={f.title} className="flex flex-col justify-between rounded-3xl border bg-card p-7 shadow-xs transition-all hover:shadow-md">
              <div>
                <span className={cn("inline-flex size-11 items-center justify-center rounded-2xl", toneClass[f.tone])}>
                  <f.icon className="size-5" />
                </span>
                <h3 className="mt-5 text-xl font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
              </div>
              <p className="mt-6 font-mono text-xs text-muted-foreground">{f.stat}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function HowItWorks() {
  return (
    <section id="how" className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
      <SectionHead eyebrow="How it works" title="Four steps from morning prep to lights-out." />
      <div className="mt-14 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((s) => (
          <div key={s.num} className="relative rounded-3xl border bg-card p-7 shadow-xs">
            <span className="font-display text-4xl font-semibold text-primary">{s.num}</span>
            <h3 className="mt-4 text-xl font-semibold">{s.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function Outcomes() {
  return (
    <section className="bg-ink py-24 text-ink-foreground">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-saffron">What changes</p>
          <h2 className="mt-3 text-balance text-4xl font-semibold leading-tight sm:text-5xl">
            Real outcomes from the first full cycle menu.
          </h2>
        </div>
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {OUTCOMES.map((o) => (
            <div key={o.label} className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur-xs">
              <p className="font-display text-5xl font-semibold text-saffron sm:text-6xl">{o.big}</p>
              <p className="mt-2 text-base font-semibold text-white">{o.label}</p>
              <p className="mt-1 text-xs text-ink-foreground/70">{o.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Pricing() {
  return (
    <section id="pricing" className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
      <SectionHead center eyebrow="Pricing" title="Simple plans. Pays for itself in saved food." body="All prices exclude GST. Every plan starts with a 14-day free trial." />
      <div className="mt-14 grid gap-6 lg:grid-cols-3">
        {PLANS.map((p) => {
          const isCustom = p.price === "Custom";
          const planSlug = p.name.toLowerCase();

          return (
            <article
              key={p.name}
              className={cn(
                "relative flex flex-col rounded-3xl border bg-card p-8 shadow-xs",
                p.featured && "border-primary shadow-lg ring-1 ring-primary lg:-translate-y-3",
              )}
            >
              {p.featured && (
                <Badge variant="saffron" className="absolute -top-3 left-8 rounded-full px-3 py-1">
                  Most popular
                </Badge>
              )}
              <h3 className="text-2xl font-semibold">{p.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{p.blurb}</p>
              <p className="mt-6 flex items-baseline gap-1">
                <span className="font-display text-5xl font-semibold tabular">{p.price}</span>
                <span className="text-muted-foreground">{p.cadence}</span>
              </p>
              <ul className="mt-8 grid flex-1 gap-3 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <Check className="mt-0.5 size-4 shrink-0 text-success" /> {f}
                  </li>
                ))}
              </ul>
              {isCustom ? (
                <Button asChild variant="outline" size="lg" className="mt-8 w-full">
                  <a href="mailto:hello@foodflow.in?subject=FoodFlow%20Enterprise%20Plan">Talk to us</a>
                </Button>
              ) : (
                <Button asChild variant={p.featured ? "saffron" : "outline"} size="lg" className="mt-8 w-full">
                  <Link to="/signup" search={{ plan: planSlug }}>
                    Start free trial
                  </Link>
                </Button>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function Faq() {
  return (
    <section id="faq" className="bg-secondary/50 py-24">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[0.8fr_1.2fr]">
        <SectionHead eyebrow="FAQ" title="Questions mess managers ask us." />
        <Accordion type="single" collapsible className="rounded-2xl border bg-card px-6">
          {FAQS.map((f, i) => (
            <AccordionItem key={f.q} value={`q${i}`} className={i === FAQS.length - 1 ? "border-b-0" : undefined}>
              <AccordionTrigger className="py-5 text-left text-base font-semibold">{f.q}</AccordionTrigger>
              <AccordionContent className="text-base leading-relaxed text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

export function FinalCta() {
  return (
    <section id="contact" className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
      <div className="relative overflow-hidden rounded-[2rem] bg-teal-gradient px-8 py-16 text-center text-primary-foreground shadow-lg sm:px-16">
        <div className="absolute -right-20 -top-20 size-72 rounded-full bg-saffron opacity-30 blur-3xl" aria-hidden />
        <h2 className="relative mx-auto max-w-3xl text-balance text-4xl font-semibold leading-tight sm:text-5xl">
          See your own mess on FoodFlow in a 20-minute call.
        </h2>
        <p className="relative mx-auto mt-4 max-w-xl text-lg text-primary-foreground/80">
          We'll load your menu and a week of numbers so you see real forecasts, not a slideshow.
        </p>
        <div className="relative mt-9 flex flex-wrap justify-center gap-3">
          <Button asChild variant="saffron" size="xl">
            <Link to="/signup">
              Start Free Trial <ArrowRight />
            </Link>
          </Button>
          <Button asChild variant="glass" size="xl">
            <a href="mailto:hello@foodflow.in?subject=FoodFlow%20demo">
              Book a demo
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t bg-card">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-12 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div>
          <BrandLogo />
          <p className="mt-3 max-w-sm text-sm text-muted-foreground">Mess and canteen management for Indian colleges, hostels, schools and corporate kitchens.</p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-6 text-sm text-muted-foreground">
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href} className="hover:text-foreground">{l.label}</a>
          ))}
          <a href="mailto:hello@foodflow.in" className="hover:text-foreground">hello@foodflow.in</a>
        </nav>
      </div>
      <p className="border-t py-6 text-center text-xs text-muted-foreground">© 2026 FoodFlow. Made in India.</p>
    </footer>
  );
}
