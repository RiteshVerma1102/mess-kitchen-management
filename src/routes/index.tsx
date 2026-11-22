import { createFileRoute } from "@tanstack/react-router";

import {
  AudienceMarquee,
  Faq,
  Features,
  FinalCta,
  Hero,
  HowItWorks,
  LoopSection,
  Outcomes,
  Pricing,
  SiteFooter,
  SiteNav,
} from "@/features/marketing/sections";

const TITLE = "FoodFlow — Mess & canteen management for Indian institutions";
const DESCRIPTION =
  "Plan menus, forecast every meal, buy only what you need, track QR attendance offline and cut food waste. Built for hostels, colleges, schools and canteens.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen">
      <SiteNav />
      <main>
        <Hero />
        <AudienceMarquee />
        <LoopSection />
        <Features />
        <HowItWorks />
        <Outcomes />
        <Pricing />
        <Faq />
        <FinalCta />
      </main>
      <SiteFooter />
    </div>
  );
}
