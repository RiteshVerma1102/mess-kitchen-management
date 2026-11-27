import { createFileRoute } from "@tanstack/react-router";

import { FoodFlowApp } from "@/components/foodflow-app";
import { foodFlowHead } from "@/lib/foodflow-route-head";

export const Route = createFileRoute("/overview")({
  head: () =>
    foodFlowHead(
      "Kitchen Overview",
      "Review meal service, kitchen operations, inventory and forecasts in your workspace.",
    ),
  component: () => <FoodFlowApp page="overview" />,
});
