import { createFileRoute } from "@tanstack/react-router";
import { FoodFlowApp } from "@/components/foodflow-app";
import { foodFlowHead } from "@/lib/foodflow-route-head";
export const Route = createFileRoute("/actuals")({
  head: () =>
    foodFlowHead(
      "Meal Service Actuals",
      "Compare meal portions prepared, served, left over and spoiled.",
    ),
  component: () => <FoodFlowApp page="actuals" />,
});
