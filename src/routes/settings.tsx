import { createFileRoute } from "@tanstack/react-router";
import { FoodFlowApp } from "@/components/foodflow-app";
import { foodFlowHead } from "@/lib/foodflow-route-head";
export const Route = createFileRoute("/settings")({ head: () => foodFlowHead("FoodFlow Account Settings", "Manage your FoodFlow account details and workspace security."), component: () => <FoodFlowApp page="settings" /> });