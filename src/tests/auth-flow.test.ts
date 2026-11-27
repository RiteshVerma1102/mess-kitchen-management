import { describe, expect, it } from "vitest";
import { formatFirebaseAuthError } from "@/lib/firebase";
import {
  canRoleWriteCollection,
  formatWorkspaceRole,
  isPageAllowedForRole,
} from "@/lib/domain/workspace-types";

describe("FoodFlow Firebase Auth & Workspace RBAC", () => {
  it("formats Firebase auth error messages cleanly with domain instructions", () => {
    expect(formatFirebaseAuthError({ code: "auth/user-not-found" })).toContain("No account");
    expect(formatFirebaseAuthError({ code: "auth/too-many-requests" })).toContain(
      "Too many requests",
    );
    expect(formatFirebaseAuthError({ code: "auth/unauthorized-domain" })).toContain(
      "Authorized domains",
    );
    expect(formatFirebaseAuthError({ code: "auth/wrong-password" })).toContain(
      "Incorrect email or password",
    );
  });

  it("enforces role-based page visibility across all 5 mess roles", () => {
    expect(isPageAllowedForRole("users", "admin")).toBe(true);
    expect(isPageAllowedForRole("audit", "admin")).toBe(true);

    expect(isPageAllowedForRole("kitchen", "kitchen_head")).toBe(true);
    expect(isPageAllowedForRole("forecast", "kitchen_head")).toBe(true);
    expect(isPageAllowedForRole("billing", "kitchen_head")).toBe(false);

    expect(isPageAllowedForRole("purchasing", "store_keeper")).toBe(true);
    expect(isPageAllowedForRole("inventory", "store_keeper")).toBe(true);
    expect(isPageAllowedForRole("billing", "store_keeper")).toBe(false);

    expect(isPageAllowedForRole("billing", "accountant")).toBe(true);
    expect(isPageAllowedForRole("kitchen", "accountant")).toBe(false);

    expect(isPageAllowedForRole("weekly-menu", "student")).toBe(true);
    expect(isPageAllowedForRole("billing", "student")).toBe(true);
    expect(isPageAllowedForRole("inventory", "student")).toBe(false);
    expect(isPageAllowedForRole("users", "student")).toBe(false);

    expect(isPageAllowedForRole("feedback", "warden")).toBe(true);
    expect(isPageAllowedForRole("students", "warden")).toBe(true);
    expect(isPageAllowedForRole("billing", "warden")).toBe(false);
  });

  it("enforces collection write boundaries per workspace role", () => {
    expect(canRoleWriteCollection("admin", "invites")).toBe(true);
    expect(canRoleWriteCollection("kitchen_head", "menus")).toBe(true);
    expect(canRoleWriteCollection("kitchen_head", "invoices")).toBe(false);
    expect(canRoleWriteCollection("store_keeper", "inventoryItems")).toBe(true);
    expect(canRoleWriteCollection("store_keeper", "menus")).toBe(false);
    expect(canRoleWriteCollection("accountant", "invoices")).toBe(true);
    expect(canRoleWriteCollection("warden", "complaints")).toBe(true);
    expect(canRoleWriteCollection("warden", "leaveRequests")).toBe(true);
    expect(canRoleWriteCollection("warden", "invoices")).toBe(false);
    expect(canRoleWriteCollection("student", "bookings")).toBe(true);
    expect(canRoleWriteCollection("student", "inventoryItems")).toBe(false);
  });

  it("formats role labels in both English and Hindi", () => {
    expect(formatWorkspaceRole("kitchen_head", "en")).toBe("Kitchen Head");
    expect(formatWorkspaceRole("kitchen_head", "hi")).toContain("रसोई");
    expect(formatWorkspaceRole("warden", "en")).toBe("Hostel Warden");
  });
});
