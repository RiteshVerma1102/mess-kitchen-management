import { createFileRoute } from "@tanstack/react-router";
import { FoodFlowApp } from "@/components/foodflow-app";
import { foodFlowHead } from "@/lib/foodflow-route-head";
export const Route = createFileRoute("/reports")({
  head: () =>
    foodFlowHead(
      "FoodFlow Reports",
      "Download snapshots of institutional meal, stock and attendance records.",
    ),
  component: () => <FoodFlowApp page="reports" />,
});
