import { createFileRoute } from "@tanstack/react-router";
import { FoodFlowApp } from "@/components/foodflow-app";
import { foodFlowHead } from "@/lib/foodflow-route-head";
export const Route = createFileRoute("/kitchen")({
  head: () =>
    foodFlowHead(
      "Kitchen Operations",
      "Coordinate food preparation, portions and service progress.",
    ),
  component: () => <FoodFlowApp page="kitchen" />,
});
