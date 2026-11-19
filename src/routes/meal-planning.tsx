import { createFileRoute } from "@tanstack/react-router";
import { FoodFlowApp } from "@/components/foodflow-app";
import { foodFlowHead } from "@/lib/foodflow-route-head";
export const Route = createFileRoute("/meal-planning")({ head: () => foodFlowHead("Meal Planning", "Coordinate portions and meal service across the week."), component: () => <FoodFlowApp page="meal-planning" /> });