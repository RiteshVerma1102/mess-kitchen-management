import { createFileRoute } from "@tanstack/react-router";
import { AuthPage } from "@/components/foodflow-auth";
import { foodFlowHead } from "@/lib/foodflow-route-head";

type LoginSearchParams = {
  redirect?: string;
};

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): LoginSearchParams => {
    const redirectVal = search["redirect"];
    if (typeof redirectVal === "string" && redirectVal.length > 0) {
      return { redirect: redirectVal };
    }
    return {};
  },
  head: () =>
    foodFlowHead(
      "Sign In | FoodFlow",
      "Sign in to your FoodFlow institutional mess and kitchen management workspace.",
    ),
  component: LoginComponent,
});

function LoginComponent() {
  const { redirect } = Route.useSearch();
  return <AuthPage initialMode="signin" {...(redirect ? { redirectTo: redirect } : {})} />;
}
