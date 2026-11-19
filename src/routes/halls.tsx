import { createFileRoute } from "@tanstack/react-router";
import { FoodFlowApp } from "@/components/foodflow-app";
import { foodFlowHead } from "@/lib/foodflow-route-head";
export const Route = createFileRoute("/halls")({ head: () => foodFlowHead("Dining Halls", "Organise dining hall details and meal service capacity."), component: () => <FoodFlowApp page="halls" /> });