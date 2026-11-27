import { createFileRoute } from "@tanstack/react-router";
import { FoodFlowApp } from "@/components/foodflow-app";
import { foodFlowHead } from "@/lib/foodflow-route-head";
export const Route = createFileRoute("/analytics")({
  head: () =>
    foodFlowHead("Kitchen Cost Analytics", "Review meal service, food costs and waste records."),
  component: () => <FoodFlowApp page="analytics" />,
});
