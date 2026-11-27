import { createFileRoute } from "@tanstack/react-router";
import { FoodFlowApp } from "@/components/foodflow-app";
import { foodFlowHead } from "@/lib/foodflow-route-head";

export const Route = createFileRoute("/billing")({
  head: () =>
    foodFlowHead(
      "Monthly Billing & Payments | FoodFlow",
      "Generate paise-accurate hostel mess bills with leave rebates, guest meals, 5% GST, and payment tracking.",
    ),
  component: () => <FoodFlowApp page="billing" />,
});
