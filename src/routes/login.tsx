import { createFileRoute } from "@tanstack/react-router";
import { AuthPage } from "@/components/foodflow-auth";
import { foodFlowHead } from "@/lib/foodflow-route-head";

type LoginSearchParams = {
  redirect?: string;
};

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): LoginSearchParams => {
    return {
      redirect: typeof search.redirect === "string" ? search.redirect : undefined,
    };
  },
  head: () =>
    foodFlowHead(
      "Sign In | FoodFlow",
      "Sign in to your FoodFlow institutional mess and kitchen management workspace."
    ),
  component: LoginComponent,
});

function LoginComponent() {
  const { redirect } = Route.useSearch();
  return <AuthPage initialMode="signin" redirectTo={redirect} />;
}
