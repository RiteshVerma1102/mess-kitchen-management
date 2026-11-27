import { createFileRoute } from "@tanstack/react-router";
import { AuthPage } from "@/components/foodflow-auth";
import { foodFlowHead } from "@/lib/foodflow-route-head";

type SignupSearchParams = {
  plan?: string;
};

export const Route = createFileRoute("/signup")({
  validateSearch: (search: Record<string, unknown>): SignupSearchParams => {
    const planVal = search["plan"];
    if (typeof planVal === "string" && planVal.length > 0) {
      return { plan: planVal };
    }
    return {};
  },
  head: () =>
    foodFlowHead(
      "Create Workspace | FoodFlow",
      "Register your college mess, hostel, or institutional kitchen on FoodFlow Pro Max.",
    ),
  component: SignupComponent,
});

function SignupComponent() {
  const { plan } = Route.useSearch();
  return <AuthPage initialMode="signup" {...(plan ? { defaultPlan: plan } : {})} />;
}
