import { createFileRoute } from "@tanstack/react-router";
import { FoodFlowApp } from "@/components/foodflow-app";
import { foodFlowHead } from "@/lib/foodflow-route-head";
export const Route = createFileRoute("/suppliers")({ head: () => foodFlowHead("Food Supplier Directory", "Manage supplier contacts and delivery information for your institution."), component: () => <FoodFlowApp page="suppliers" /> });