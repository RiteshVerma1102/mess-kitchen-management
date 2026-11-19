import { createFileRoute } from "@tanstack/react-router";
import { ResetPasswordPage } from "@/components/foodflow-auth";
import { foodFlowHead } from "@/lib/foodflow-route-head";
export const Route = createFileRoute("/reset-password")({ head: () => foodFlowHead("Reset FoodFlow Password", "Securely reset your FoodFlow account password."), component: ResetPasswordPage });