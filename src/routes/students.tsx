import { createFileRoute } from "@tanstack/react-router";
import { FoodFlowApp } from "@/components/foodflow-app";
import { foodFlowHead } from "@/lib/foodflow-route-head";
export const Route = createFileRoute("/students")({ head: () => foodFlowHead("Student Dining Records", "Review student meal plans, dining halls and dietary preferences."), component: () => <FoodFlowApp page="students" /> });