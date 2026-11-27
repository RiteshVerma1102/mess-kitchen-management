import { createFileRoute } from "@tanstack/react-router";
import { AuthPage } from "@/components/foodflow-auth";
import { foodFlowHead } from "@/lib/foodflow-route-head";

export const Route = createFileRoute("/forgot-password")({
  head: () =>
    foodFlowHead(
      "Forgot Password | FoodFlow",
      "Reset your FoodFlow institutional kitchen account password.",
    ),
  component: () => <AuthPage initialMode="forgot" />,
});
