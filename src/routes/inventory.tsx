import { createFileRoute } from "@tanstack/react-router";
import { FoodFlowApp } from "@/components/foodflow-app";
import { foodFlowHead } from "@/lib/foodflow-route-head";
export const Route = createFileRoute("/inventory")({
  head: () =>
    foodFlowHead("Food Inventory", "Track ingredients, stock levels, costs and restocking needs."),
  component: () => <FoodFlowApp page="inventory" />,
});
