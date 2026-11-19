import { createFileRoute } from "@tanstack/react-router";
import { FoodFlowHomepage } from "@/components/foodflow-homepage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SmartMess | Smarter Meal & Kitchen Management" },
      { name: "description", content: "Plan institutional meals, coordinate kitchen operations and manage food stock in one connected workspace." },
      { property: "og:title", content: "SmartMess | Smarter Meal & Kitchen Management" },
      { property: "og:description", content: "Plan institutional meals, coordinate kitchen operations and manage food stock in one connected workspace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FoodFlowHomepage,
});