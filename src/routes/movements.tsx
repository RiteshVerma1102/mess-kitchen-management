import { createFileRoute } from "@tanstack/react-router";
import { FoodFlowApp } from "@/components/foodflow-app";
import { foodFlowHead } from "@/lib/foodflow-route-head";
export const Route = createFileRoute("/movements")({ head: () => foodFlowHead("Stock Movements", "Review ingredient adjustments and recorded stock movement reasons."), component: () => <FoodFlowApp page="movements" /> });