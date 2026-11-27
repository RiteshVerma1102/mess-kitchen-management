import { createFileRoute } from "@tanstack/react-router";
import { FoodFlowApp } from "@/components/foodflow-app";
import { foodFlowHead } from "@/lib/foodflow-route-head";
export const Route = createFileRoute("/waste")({
  head: () =>
    foodFlowHead(
      "Food Waste Tracking",
      "Compare prepared, served and leftover quantities in your kitchen.",
    ),
  component: () => <FoodFlowApp page="waste" />,
});
