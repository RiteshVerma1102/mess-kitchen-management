import { createFileRoute } from "@tanstack/react-router";
import { AuthPage } from "@/components/foodflow-auth";
import { foodFlowHead } from "@/lib/foodflow-route-head";
export const Route = createFileRoute("/auth")({ head: () => foodFlowHead("Sign In to FoodFlow", "Sign in or create a FoodFlow account to manage institutional meals and kitchen operations."), component: AuthPage });