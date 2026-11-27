import { createFileRoute } from "@tanstack/react-router";
import { FoodFlowApp } from "@/components/foodflow-app";
import { foodFlowHead } from "@/lib/foodflow-route-head";
export const Route = createFileRoute("/forecast")({
  head: () =>
    foodFlowHead("Meal Demand Forecast", "Review expected meal portions before food preparation."),
  component: () => <FoodFlowApp page="forecast" />,
});
