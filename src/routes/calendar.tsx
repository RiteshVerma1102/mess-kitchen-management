import { createFileRoute } from "@tanstack/react-router";
import { FoodFlowApp } from "@/components/foodflow-app";
import { foodFlowHead } from "@/lib/foodflow-route-head";
export const Route = createFileRoute("/calendar")({
  head: () =>
    foodFlowHead("Academic Calendar", "Keep campus events visible beside upcoming meal plans."),
  component: () => <FoodFlowApp page="calendar" />,
});
