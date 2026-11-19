import { createFileRoute } from "@tanstack/react-router";
import { FoodFlowApp } from "@/components/foodflow-app";
import { foodFlowHead } from "@/lib/foodflow-route-head";
export const Route = createFileRoute("/recipes")({ head: () => foodFlowHead("Recipes and Ingredients", "Plan kitchen recipes, serving sizes, ingredients and costs."), component: () => <FoodFlowApp page="recipes" /> });