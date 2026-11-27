import { createFileRoute } from "@tanstack/react-router";
import { FoodFlowApp } from "@/components/foodflow-app";
import { foodFlowHead } from "@/lib/foodflow-route-head";

export const Route = createFileRoute("/feedback")({
  head: () =>
    foodFlowHead(
      "Feedback & Complaints | FoodFlow",
      "Collect meal taste & hygiene ratings and resolve student mess complaints.",
    ),
  component: () => <FoodFlowApp page="feedback" />,
});
