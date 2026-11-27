import { createFileRoute } from "@tanstack/react-router";
import { FoodFlowApp } from "@/components/foodflow-app";
import { foodFlowHead } from "@/lib/foodflow-route-head";
export const Route = createFileRoute("/users")({
  head: () =>
    foodFlowHead("FoodFlow Team Access", "Review institution team roles and access permissions."),
  component: () => <FoodFlowApp page="users" />,
});
