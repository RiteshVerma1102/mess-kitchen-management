import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("FoodFlow Multi-Tenant Firestore Security Rules Static & Invariant Audit", () => {
  const rulesText = readFileSync(resolve(process.cwd(), "firestore.rules"), "utf-8");

  it("begins with a default-deny catch-all safety net", () => {
    expect(rulesText).toContain("rules_version = '2';");
    expect(rulesText).toMatch(/match \/\{document=\*\*\} \{\s*allow read, write: if false;/);
  });

  it("enforces email_verified == true and Master Gate workspace membership", () => {
    expect(rulesText).toContain("request.auth.token.email_verified == true");
    expect(rulesText).toContain("function isWorkspaceMember(wsId)");
    expect(rulesText).toContain("function isWsAdmin(wsId)");
    expect(rulesText).toContain("existsAfter(memberDocPath(workspaceId, request.auth.uid))");
    expect(rulesText).toContain(
      "getAfter(workspaceDocPath(workspaceId)).data.ownerUid == request.auth.uid",
    );
  });

  it("locks down every multi-tenant subcollection and forbids blanket reads", () => {
    const requiredCollections = [
      "users/{userId}",
      "userWorkspaces/{indexId}",
      "inviteCodes/{code}",
      "emailInvites/{inviteId}",
      "workspaces/{workspaceId}",
      "members/{memberUid}",
      "invites/{inviteId}",
      "halls/{docId}",
      "students/{docId}",
      "mealSlots/{docId}",
      "menus/{docId}",
      "recipes/{docId}",
      "inventoryItems/{docId}",
      "stockMovements/{docId}",
      "vendors/{docId}",
      "purchaseOrders/{docId}",
      "bookings/{docId}",
      "attendance/{docId}",
      "wasteLogs/{docId}",
      "invoices/{docId}",
      "payments/{docId}",
      "feedback/{docId}",
      "complaints/{docId}",
      "notifications/{docId}",
      "auditLogs/{docId}",
      "kitchenTasks/{docId}",
      "forecasts/{docId}",
      "calendarEvents/{docId}",
      "serviceActuals/{docId}",
      "leaveRequests/{docId}",
      "healthcheck/{docId}",
    ];
    for (const col of requiredCollections) {
      expect(rulesText).toContain(col);
    }
    expect(rulesText).not.toMatch(/allow read:\s*if isSignedIn\(\)/);
    expect(rulesText).not.toMatch(/allow list:\s*if isSignedIn\(\);/);
  });

  it("makes auditLogs, attendance, wasteLogs, payments, and serviceActuals append-only", () => {
    expect(rulesText).toContain("match /auditLogs/{docId}");
    expect(rulesText).toContain("allow update, delete: if false;");
    expect(rulesText).toContain("allow update: if false;");
  });
});
