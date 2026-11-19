import { createFileRoute } from "@tanstack/react-router";
import { FoodFlowApp } from "@/components/foodflow-app";
import { foodFlowHead } from "@/lib/foodflow-route-head";
export const Route = createFileRoute("/notifications")({ head: () => foodFlowHead("FoodFlow Notifications", "Review meal, inventory and purchasing updates for your workspace."), component: () => <FoodFlowApp page="notifications" /> });