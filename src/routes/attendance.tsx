import { createFileRoute } from "@tanstack/react-router";
import { FoodFlowApp } from "@/components/foodflow-app";
import { foodFlowHead } from "@/lib/foodflow-route-head";
export const Route = createFileRoute("/attendance")({ head: () => foodFlowHead("Meal Attendance", "Record student attendance for institutional meal services."), component: () => <FoodFlowApp page="attendance" /> });