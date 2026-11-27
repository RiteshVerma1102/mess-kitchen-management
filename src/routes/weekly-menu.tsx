import { createFileRoute } from "@tanstack/react-router";
import { FoodFlowApp } from "@/components/foodflow-app";
import { foodFlowHead } from "@/lib/foodflow-route-head";
export const Route = createFileRoute("/weekly-menu")({
  head: () =>
    foodFlowHead(
      "Weekly Menu",
      "Keep the whole week’s institutional meal menu clear and up to date.",
    ),
  component: () => <FoodFlowApp page="weekly-menu" />,
});
