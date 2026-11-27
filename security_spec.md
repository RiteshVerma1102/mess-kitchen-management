# FoodFlow Multi-Tenant Firestore Security Specification

## 1. Data Invariants
1. **Default Deny**: All unspecified paths under `/databases/{database}/documents` return `PERMISSION_DENIED`.
2. **Verified Identity & Strict UID Binding**: Writes require `request.auth != null && request.auth.token.email_verified == true`. Document `uid`, `ownerUid`, and `createdBy` fields must strictly equal `request.auth.uid`.
3. **Master Gate Tenant Isolation**: Every workspace subcollection under `/workspaces/{workspaceId}/...` derives authorization strictly from `/workspaces/{workspaceId}/members/{request.auth.uid}` (`status == 'active'`). Revoking or suspending a member immediately revokes subcollection access.
4. **Atomic Workspace Bootstrap (`existsAfter` / `getAfter`)**: Creating `/workspaces/{workspaceId}` requires simultaneously creating `/workspaces/{workspaceId}/members/{request.auth.uid}` with `role == 'admin'` and `status == 'active'`. Creating a self-admin member doc requires simultaneously creating the parent workspace with `ownerUid == request.auth.uid`.
5. **Zero Self-Elevation on Invites**: Joining via invite code (`/inviteCodes/{code}`) requires an existing `status == 'pending'` invite whose `workspaceId` and `role` exactly match the newly created member document (`incoming().role == invite.data.role`) and, if email-locked, matches `request.auth.token.email`.
6. **Whole-Paise Financial Integrity**: Monetary totals (`monthlyFeePaise`, `perDayRebatePaise`, `totalPaise`, `totalPayablePaise`, `amountPaise`) are stored as non-negative `int` paise values and writable only by authorized roles (`admin`, `accountant`, `store_keeper` for POs).
7. **Immutable Audit Logs**: `/workspaces/{workspaceId}/auditLogs/{docId}` is append-only (`allow update, delete: if false`).
8. **Query Enforcer (`allow list`)**: Top-level collections (`users`, `userWorkspaces`, `emailInvites`, `meal_skips`, `meal_feedback`, `voice_logs`) explicitly enforce `resource.data.uid == request.auth.uid` (or `email == request.auth.token.email`) without `get()` inside `allow list`. Workspace subcollections require `resource.data.workspaceId == workspaceId` plus `isWorkspaceMember(workspaceId)` (single cached member lookup).

## 2. The "Dirty Dozen" Attack Payloads (Expected: PERMISSION_DENIED)
1. **Shadow Role Elevation on User Profile**: `POST /users/{uid}` or `PATCH /users/{uid}` adding `{ "role": "admin" }`.
2. **Orphan Workspace Creation**: Creating `/workspaces/{wsId}` without creating `/workspaces/{wsId}/members/{uid}` in the same batch.
3. **Hostile Admin Takeover**: Creating `/workspaces/{otherWsId}/members/{attackerUid}` with `{ "role": "admin" }`.
4. **Role Spoof via Invite Claim**: Claiming an invite issued for `role: "student"` while setting member `{ "role": "admin" }`.
5. **Cross-Tenant Read Scraping**: Member of `ws-A` reading `/workspaces/ws-B/students/{id}` or `/workspaces/ws-B/invoices/{id}`.
6. **Suspended Member Write**: Member with `status: "suspended"` trying to create an inventory item or PO.
7. **Student Creating Invoice or Menu**: User with `role: "student"` writing to `/workspaces/{wsId}/invoices/{id}` or `/workspaces/{wsId}/menus/{id}`.
8. **Student Reading Another Student's Invoice**: Student A reading `/workspaces/{wsId}/invoices/{studentBInvoiceId}` (`studentUid != request.auth.uid`).
9. **Audit Log Tampering**: Even `admin` attempting `UPDATE` or `DELETE` on `/workspaces/{wsId}/auditLogs/{id}`.
10. **ID Poisoning / Denial-of-Wallet**: Creating doc with 200-char ID or invalid characters `../admin`.
11. **Backdated Timestamp Spoofing**: Writing `createdAt: "2020-01-01"` instead of `request.time`.
12. **Unverified Email Bypass**: Account with `email_verified: false` trying to create a workspace or modify inventory.
