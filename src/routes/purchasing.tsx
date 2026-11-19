import { createFileRoute } from "@tanstack/react-router";
import { FoodFlowApp } from "@/components/foodflow-app";
import { foodFlowHead } from "@/lib/foodflow-route-head";
export const Route = createFileRoute("/purchasing")({ head: () => foodFlowHead("Suppliers and Purchasing", "Track suppliers and follow food purchase orders through delivery."), component: () => <FoodFlowApp page="purchasing" /> });