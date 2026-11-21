import { describe, expect, it } from "vitest";
import { bootstrapWorkspace } from "@/lib/foodflow-bootstrap";

describe("FoodFlow Auth & Workspace Bootstrap", () => {
  it("returns unauthenticated when no session exists", async () => {
    const mockClient = {
      auth: {
        getSession: async () => ({ data: { session: null }, error: null }),
      },
    };

    const result = await bootstrapWorkspace(mockClient as never);
    expect(result.status).toBe("unauthenticated");
    expect(result.destination).toBe("/login");
  });

  it("routes existing institution staff to /overview", async () => {
    const mockClient = {
      auth: {
        getSession: async () => ({
          data: {
            session: {
              user: {
                id: "user-test-123",
                email: "admin@institution.edu",
                user_metadata: {},
              },
            },
          },
          error: null,
        }),
      },
      from: (table: string) => {
        if (table === "foodflow_profiles") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { institution_id: "inst-456", display_name: "Manager" },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === "foodflow_user_roles") {
          return {
            select: () => ({
              eq: () => ({
                eq: async () => ({
                  data: [{ role: "mess_manager" }],
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      },
    };

    const result = await bootstrapWorkspace(mockClient as never);
    expect(result.status).toBe("ready");
    expect(result.destination).toBe("/overview");
  });

  it("routes student role to /student portal", async () => {
    const mockClient = {
      auth: {
        getSession: async () => ({
          data: {
            session: {
              user: {
                id: "user-student-789",
                email: "student@institution.edu",
                user_metadata: {},
              },
            },
          },
          error: null,
        }),
      },
      from: (table: string) => {
        if (table === "foodflow_profiles") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { institution_id: "inst-456", display_name: "Student" },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === "foodflow_user_roles") {
          return {
            select: () => ({
              eq: () => ({
                eq: async () => ({
                  data: [{ role: "student" }],
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      },
    };

    const result = await bootstrapWorkspace(mockClient as never);
    expect(result.status).toBe("ready");
    expect(result.destination).toBe("/student");
  });

  it("routes users without institution to /onboarding", async () => {
    const mockClient = {
      auth: {
        getSession: async () => ({
          data: {
            session: {
              user: {
                id: "user-fresh-000",
                email: "fresh@institution.edu",
                user_metadata: {},
              },
            },
          },
          error: null,
        }),
      },
      from: (table: string) => {
        if (table === "foodflow_profiles") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { institution_id: null, display_name: "Fresh User" },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      },
    };

    const result = await bootstrapWorkspace(mockClient as never);
    expect(result.status).toBe("needs_onboarding");
    expect(result.destination).toBe("/onboarding");
  });
});
