import { QueryClient } from "@tanstack/react-query";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { routeTree } from "@/routeTree.gen";

// Match routes without running loaders or rendering: loaders may need a server or
// network the test run lacks, and jsdom never loads the stylesheets React waits on.
describe("App routing", () => {
  const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

  it("matches a page for / instead of falling back to not found", () => {
    const matches = router.matchRoutes("/");
    expect(matches.at(-1)?.routeId).not.toBe(rootRouteId);
  });

  it("matches dedicated auth and onboarding routes", () => {
    expect(router.matchRoutes("/login").at(-1)?.routeId).not.toBe(rootRouteId);
    expect(router.matchRoutes("/signup").at(-1)?.routeId).not.toBe(rootRouteId);
    expect(router.matchRoutes("/forgot-password").at(-1)?.routeId).not.toBe(rootRouteId);
    expect(router.matchRoutes("/reset-password").at(-1)?.routeId).not.toBe(rootRouteId);
    expect(router.matchRoutes("/auth/callback").at(-1)?.routeId).not.toBe(rootRouteId);
    expect(router.matchRoutes("/onboarding").at(-1)?.routeId).not.toBe(rootRouteId);
  });

  it("matches student portal and audit log routes", () => {
    expect(router.matchRoutes("/student").at(-1)?.routeId).not.toBe(rootRouteId);
    expect(router.matchRoutes("/audit").at(-1)?.routeId).not.toBe(rootRouteId);
  });
});
