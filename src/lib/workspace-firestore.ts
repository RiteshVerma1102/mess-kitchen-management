import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from "firebase/firestore";
import type { User } from "firebase/auth";
import {
  ensureUserProfile,
  getFirebaseDb,
  handleFirestoreError,
  OperationType,
  recordLastWriteSuccess,
} from "@/lib/firebase";
import type {
  AttendanceDoc,
  AuditLogDoc,
  BookingDoc,
  CalendarEventDoc,
  ComplaintDoc,
  FeedbackDoc,
  ForecastDoc,
  HallDoc,
  InventoryItemDoc,
  InvoiceDoc,
  KitchenTaskDoc,
  LeaveRequestDoc,
  MealSlotConfigDoc,
  MemberStatus,
  MenuPlanDoc,
  NotificationDoc,
  PaymentDoc,
  PurchaseOrderDoc,
  RecipeDoc,
  ServiceActualDoc,
  StockMovementDoc,
  StudentRecordDoc,
  SupportedLanguage,
  UserProfileDoc,
  VendorDoc,
  WasteLogDoc,
  WorkspaceDoc,
  WorkspaceInviteDoc,
  WorkspaceMemberDoc,
  WorkspaceRole,
} from "@/lib/domain/workspace-types";

export interface UserWorkspaceMembership {
  id: string;
  uid: string;
  workspaceId: string;
  workspaceName: string;
  role: WorkspaceRole;
  status: MemberStatus;
}

export interface AuditActor {
  uid: string;
  name: string;
  email: string;
  role: string;
}

export function sanitizeFirestoreId(raw: string, fallback = "item"): string {
  const cleaned = raw
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 96);
  return cleaned.length > 0 ? cleaned : fallback;
}

export function generateRandomCode(prefix = "FF"): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return `${prefix}-${out}`;
}

export function generateDocId(prefix = "doc"): string {
  const rand =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID().replace(/-/g, "").slice(0, 12)
      : Math.random().toString(36).slice(2, 12);
  return sanitizeFirestoreId(`${prefix}_${Date.now().toString(36)}_${rand}`);
}

export async function loadUserProfileDoc(uid: string): Promise<UserProfileDoc | null> {
  const db = getFirebaseDb();
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;
  return snap.data() as UserProfileDoc;
}

export async function updateUserProfilePreferences(
  uid: string,
  updates: { name?: string; defaultWorkspaceId?: string | null; language?: SupportedLanguage },
): Promise<void> {
  const db = getFirebaseDb();
  const path = `users/${uid}`;
  try {
    await updateDoc(doc(db, "users", uid), {
      ...(updates.name !== undefined ? { name: updates.name.trim().slice(0, 120) } : {}),
      ...(updates.defaultWorkspaceId !== undefined
        ? { defaultWorkspaceId: updates.defaultWorkspaceId }
        : {}),
      ...(updates.language !== undefined ? { language: updates.language } : {}),
      updatedAt: serverTimestamp(),
    });
    recordLastWriteSuccess();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function listUserWorkspaces(uid: string): Promise<UserWorkspaceMembership[]> {
  const db = getFirebaseDb();
  const path = "userWorkspaces";
  try {
    const snap = await getDocs(query(collection(db, "userWorkspaces"), where("uid", "==", uid)));
    return snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<UserWorkspaceMembership, "id">),
    }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function loadWorkspaceAndMember(
  workspaceId: string,
  uid: string,
): Promise<{ workspace: WorkspaceDoc | null; member: WorkspaceMemberDoc | null }> {
  const db = getFirebaseDb();
  try {
    const [wsSnap, memberSnap] = await Promise.all([
      getDoc(doc(db, "workspaces", workspaceId)),
      getDoc(doc(db, "workspaces", workspaceId, "members", uid)),
    ]);
    const workspace = wsSnap.exists()
      ? ({ id: wsSnap.id, ...(wsSnap.data() as Omit<WorkspaceDoc, "id">) } satisfies WorkspaceDoc)
      : null;
    const member = memberSnap.exists() ? (memberSnap.data() as WorkspaceMemberDoc) : null;
    return { workspace, member };
  } catch (error) {
    console.warn("[workspace-firestore] Failed to load workspace context:", error);
    return { workspace: null, member: null };
  }
}

export async function writeAuditLog(
  workspaceId: string,
  actor: AuditActor,
  params: {
    action: AuditLogDoc["action"];
    targetCollection: string;
    targetId: string;
    summary: string;
  },
): Promise<void> {
  const db = getFirebaseDb();
  const id = generateDocId("aud");
  const path = `workspaces/${workspaceId}/auditLogs/${id}`;
  try {
    await setDoc(doc(db, "workspaces", workspaceId, "auditLogs", id), {
      workspaceId,
      actorUid: actor.uid,
      actorName: (actor.name || "Member").slice(0, 120),
      actorEmail: (actor.email || "").slice(0, 160),
      actorRole: (actor.role || "member").slice(0, 40),
      action: params.action,
      targetCollection: params.targetCollection.slice(0, 60),
      targetId: params.targetId.slice(0, 128),
      summary: params.summary.slice(0, 500),
      createdBy: actor.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    recordLastWriteSuccess();
  } catch (error) {
    console.warn("[audit] Failed to append audit log at", path, error);
  }
}

export interface CreateWorkspaceInput {
  name: string;
  institutionType: string;
  cityState: string;
  plan?: string;
  language?: SupportedLanguage;
  monthlyFeeRupees?: number;
  perDayRebateRupees?: number;
  guestMealRupees?: number;
  wasteTargetPct?: number;
  dailyPlatesEstimate?: number;
  halls?: { name: string; capacity: number }[];
  mealSlots?: {
    slot: "breakfast" | "lunch" | "snacks" | "dinner";
    label: string;
    timing: string;
    cutoffIst: string;
    enabled: boolean;
  }[];
  initialMenus?: {
    mealType: "Breakfast" | "Lunch" | "Snacks" | "Dinner";
    title: string;
    dishes: string[];
    expectedServings: number;
  }[];
  initialInvites?: { email: string; role: WorkspaceRole }[];
}

export async function createWorkspaceAtomic(
  user: User,
  input: CreateWorkspaceInput,
): Promise<{ workspaceId: string; inviteCodes: WorkspaceInviteDoc[] }> {
  if (!user.emailVerified) {
    throw new Error("Please verify your email address before creating a workspace.");
  }

  await ensureUserProfile(user);
  const db = getFirebaseDb();
  const workspaceId = generateDocId("ws");
  const cleanName = input.name.trim().slice(0, 120) || "Hostel Mess Workspace";
  const displayName = (user.displayName?.trim() || user.email?.split("@")[0] || "Mess Admin").slice(
    0,
    120,
  );
  const email = (user.email || "admin@foodflow.in").trim().toLowerCase().slice(0, 160);
  const language: SupportedLanguage = input.language ?? "en";

  const wsRef = doc(db, "workspaces", workspaceId);
  const memberRef = doc(db, "workspaces", workspaceId, "members", user.uid);
  const userWsRef = doc(db, "userWorkspaces", `${user.uid}_${workspaceId}`);
  const userProfileRef = doc(db, "users", user.uid);

  // Batch 1: Core atomic bootstrap (required by existsAfter/getAfter rules)
  try {
    const batch1 = writeBatch(db);
    batch1.set(wsRef, {
      name: cleanName,
      ownerUid: user.uid,
      institutionType: (input.institutionType || "College Hostel").slice(0, 64),
      cityState: (input.cityState || "India").slice(0, 120),
      plan: (input.plan || "Growth Campus").slice(0, 32),
      timezone: "Asia/Kolkata",
      language,
      monthlyFeePaise: Math.max(0, Math.round((input.monthlyFeeRupees ?? 4200) * 100)),
      perDayRebatePaise: Math.max(0, Math.round((input.perDayRebateRupees ?? 85) * 100)),
      guestMealUnitPaise: Math.max(0, Math.round((input.guestMealRupees ?? 90) * 100)),
      wasteTargetPct: Math.max(0, Math.min(100, Number(input.wasteTargetPct ?? 5))),
      dailyPlatesEstimate: Math.max(0, Math.round(input.dailyPlatesEstimate ?? 0)),
      createdBy: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    batch1.set(memberRef, {
      uid: user.uid,
      workspaceId,
      role: "admin",
      status: "active",
      invitedBy: user.uid,
      joinedAt: serverTimestamp(),
      name: displayName,
      email,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    batch1.set(userWsRef, {
      uid: user.uid,
      workspaceId,
      workspaceName: cleanName,
      role: "admin",
      status: "active",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    batch1.update(userProfileRef, {
      defaultWorkspaceId: workspaceId,
      language,
      updatedAt: serverTimestamp(),
    });

    await batch1.commit();
    recordLastWriteSuccess();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `workspaces/${workspaceId}`);
  }

  // Batch 2: Subcollections (now that member doc exists cleanly in Firestore)
  const createdInvites: WorkspaceInviteDoc[] = [];
  try {
    const batch2 = writeBatch(db);
    const halls =
      input.halls && input.halls.length > 0
        ? input.halls
        : [{ name: "Main Dining Hall", capacity: 250 }];
    for (const hall of halls) {
      if (!hall.name.trim()) continue;
      const hallId = generateDocId("hall");
      batch2.set(doc(db, "workspaces", workspaceId, "halls", hallId), {
        workspaceId,
        name: hall.name.trim().slice(0, 100),
        capacity: Math.max(0, Math.round(hall.capacity || 0)),
        active: true,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    const defaultSlots: NonNullable<CreateWorkspaceInput["mealSlots"]> = input.mealSlots ?? [
      {
        slot: "breakfast",
        label: "Breakfast",
        timing: "07:30 - 09:30",
        cutoffIst: "21:30 prev day",
        enabled: true,
      },
      {
        slot: "lunch",
        label: "Lunch",
        timing: "12:15 - 14:15",
        cutoffIst: "09:30 same day",
        enabled: true,
      },
      {
        slot: "snacks",
        label: "Evening Snacks",
        timing: "16:30 - 17:45",
        cutoffIst: "13:30 same day",
        enabled: true,
      },
      {
        slot: "dinner",
        label: "Dinner",
        timing: "19:30 - 21:30",
        cutoffIst: "16:30 same day",
        enabled: true,
      },
    ];
    for (const slotCfg of defaultSlots) {
      batch2.set(doc(db, "workspaces", workspaceId, "mealSlots", slotCfg.slot), {
        workspaceId,
        slot: slotCfg.slot,
        label: slotCfg.label.slice(0, 60),
        timing: slotCfg.timing.slice(0, 60),
        cutoffIst: slotCfg.cutoffIst.slice(0, 40),
        enabled: slotCfg.enabled,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    const todayKey = new Date().toISOString().slice(0, 10);
    if (input.initialMenus && input.initialMenus.length > 0) {
      for (const menu of input.initialMenus) {
        if (!menu.title.trim()) continue;
        const menuId = generateDocId("menu");
        batch2.set(doc(db, "workspaces", workspaceId, "menus", menuId), {
          workspaceId,
          serviceDate: todayKey,
          mealType: menu.mealType,
          title: menu.title.trim().slice(0, 140),
          dishes: menu.dishes.filter(Boolean).slice(0, 20),
          expectedServings: Math.max(0, Math.round(menu.expectedServings || 0)),
          status: "Published",
          createdBy: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    }

    if (input.initialInvites && input.initialInvites.length > 0) {
      const expiresAt = new Date(Date.now() + 14 * 86_400_000).toISOString();
      for (const inv of input.initialInvites) {
        const cleanEmail = inv.email.trim().toLowerCase().slice(0, 160);
        if (!cleanEmail) continue;
        const inviteId = generateDocId("inv");
        const code = generateRandomCode("FF");
        const payload = {
          inviteId,
          workspaceId,
          workspaceName: cleanName,
          email: cleanEmail,
          role: inv.role,
          code,
          status: "pending" as const,
          expiresAt,
          createdBy: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        batch2.set(doc(db, "workspaces", workspaceId, "invites", inviteId), payload);
        batch2.set(doc(db, "inviteCodes", code), payload);
        batch2.set(doc(db, "emailInvites", inviteId), payload);
        createdInvites.push({
          id: inviteId,
          workspaceId,
          workspaceName: cleanName,
          email: cleanEmail,
          role: inv.role,
          code,
          status: "pending",
          expiresAt,
          createdBy: user.uid,
        });
      }
    }

    const auditId = generateDocId("aud");
    batch2.set(doc(db, "workspaces", workspaceId, "auditLogs", auditId), {
      workspaceId,
      actorUid: user.uid,
      actorName: displayName,
      actorEmail: email,
      actorRole: "admin",
      action: "CREATE",
      targetCollection: "workspaces",
      targetId: workspaceId,
      summary: `Created workspace "${cleanName}" with ${halls.length} dining hall(s) and assigned Admin role.`,
      createdBy: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await batch2.commit();
    recordLastWriteSuccess();
  } catch (error) {
    console.warn("[workspace-firestore] Secondary setup batch warning:", error);
  }

  return { workspaceId, inviteCodes: createdInvites };
}

const autoWorkspaceLocks = new Map<string, Promise<string>>();

/**
 * Idempotently guarantees every verified user lands in a live workspace in one step:
 * claims pending email/code invites first, else creates "<FirstName>'s Mess" atomically once.
 */
export async function ensureAutoDefaultWorkspace(
  user: User,
  language: SupportedLanguage = "en",
  pendingInviteCode?: string | null,
): Promise<string> {
  if (!user.emailVerified) {
    throw new Error("Email verification is required before initializing a workspace.");
  }
  const existingLock = autoWorkspaceLocks.get(user.uid);
  if (existingLock) return existingLock;

  const task = (async () => {
    await ensureUserProfile(user);

    if (pendingInviteCode?.trim()) {
      try {
        const claimed = await claimInviteByCodeAtomic(user, pendingInviteCode.trim());
        return claimed.workspaceId;
      } catch (err) {
        console.warn("[workspace-firestore] Pending code claim skipped:", err);
      }
    }

    await claimPendingEmailInvites(user);

    const existingList = await listUserWorkspaces(user.uid);
    const active = existingList.find((m) => m.status === "active") ?? existingList[0];
    if (active) {
      return active.workspaceId;
    }

    const profile = await loadUserProfileDoc(user.uid);
    if (profile?.defaultWorkspaceId) {
      const check = await loadWorkspaceAndMember(profile.defaultWorkspaceId, user.uid);
      if (check.workspace && check.member) {
        return check.workspace.id;
      }
    }

    const rawName = (user.displayName?.trim() || user.email?.split("@")[0] || "My").trim();
    const firstName = rawName.split(/\s+/)[0]?.replace(/[^\p{L}\p{N}'-]/gu, "") || "My";
    const defaultMessName = language === "hi" ? `${firstName} का मेस` : `${firstName}'s Mess`;

    const created = await createWorkspaceAtomic(user, {
      name: defaultMessName.slice(0, 120),
      institutionType: "College Hostel",
      cityState: "New Delhi, India",
      language,
    });
    return created.workspaceId;
  })();

  autoWorkspaceLocks.set(user.uid, task);
  try {
    return await task;
  } finally {
    autoWorkspaceLocks.delete(user.uid);
  }
}

export async function updateWorkspaceSettings(
  workspaceId: string,
  actor: AuditActor,
  updates: Partial<
    Pick<
      WorkspaceDoc,
      | "name"
      | "institutionType"
      | "cityState"
      | "plan"
      | "language"
      | "monthlyFeePaise"
      | "perDayRebatePaise"
      | "guestMealUnitPaise"
      | "wasteTargetPct"
      | "dailyPlatesEstimate"
      | "minRebateDays"
      | "setupChecklistDismissed"
      | "cycleMenuWeek"
    >
  >,
): Promise<void> {
  const db = getFirebaseDb();
  const path = `workspaces/${workspaceId}`;
  try {
    await updateDoc(doc(db, "workspaces", workspaceId), {
      ...(updates.name !== undefined ? { name: updates.name.trim().slice(0, 120) } : {}),
      ...(updates.institutionType !== undefined
        ? { institutionType: updates.institutionType.slice(0, 64) }
        : {}),
      ...(updates.cityState !== undefined ? { cityState: updates.cityState.slice(0, 120) } : {}),
      ...(updates.plan !== undefined ? { plan: updates.plan.slice(0, 32) } : {}),
      ...(updates.language !== undefined ? { language: updates.language } : {}),
      ...(updates.monthlyFeePaise !== undefined
        ? { monthlyFeePaise: Math.max(0, Math.round(updates.monthlyFeePaise)) }
        : {}),
      ...(updates.perDayRebatePaise !== undefined
        ? { perDayRebatePaise: Math.max(0, Math.round(updates.perDayRebatePaise)) }
        : {}),
      ...(updates.guestMealUnitPaise !== undefined
        ? { guestMealUnitPaise: Math.max(0, Math.round(updates.guestMealUnitPaise)) }
        : {}),
      ...(updates.wasteTargetPct !== undefined
        ? { wasteTargetPct: Math.max(0, Math.min(100, Number(updates.wasteTargetPct))) }
        : {}),
      ...(updates.dailyPlatesEstimate !== undefined
        ? { dailyPlatesEstimate: Math.max(0, Math.round(updates.dailyPlatesEstimate)) }
        : {}),
      ...(updates.minRebateDays !== undefined
        ? { minRebateDays: Math.max(1, Math.min(30, Math.round(updates.minRebateDays))) }
        : {}),
      ...(updates.setupChecklistDismissed !== undefined
        ? { setupChecklistDismissed: Boolean(updates.setupChecklistDismissed) }
        : {}),
      ...(updates.cycleMenuWeek === "A" || updates.cycleMenuWeek === "B"
        ? { cycleMenuWeek: updates.cycleMenuWeek }
        : {}),
      updatedAt: serverTimestamp(),
    });
    recordLastWriteSuccess();
    await writeAuditLog(workspaceId, actor, {
      action: "UPDATE",
      targetCollection: "workspaces",
      targetId: workspaceId,
      summary: "Updated workspace preferences and mess fee settings.",
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function createWorkspaceInviteAtomic(
  workspaceId: string,
  workspaceName: string,
  actor: AuditActor,
  params: { email: string; role: WorkspaceRole },
): Promise<WorkspaceInviteDoc> {
  const db = getFirebaseDb();
  const inviteId = generateDocId("inv");
  const code = generateRandomCode("FF");
  const cleanEmail = params.email.trim().toLowerCase().slice(0, 160);
  const expiresAt = new Date(Date.now() + 14 * 86_400_000).toISOString();

  const payload = {
    inviteId,
    workspaceId,
    workspaceName: workspaceName.slice(0, 120),
    email: cleanEmail,
    role: params.role,
    code,
    status: "pending" as const,
    expiresAt,
    createdBy: actor.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    const batch = writeBatch(db);
    batch.set(doc(db, "workspaces", workspaceId, "invites", inviteId), payload);
    batch.set(doc(db, "inviteCodes", code), payload);
    if (cleanEmail) {
      batch.set(doc(db, "emailInvites", inviteId), payload);
    }
    await batch.commit();
    recordLastWriteSuccess();

    await writeAuditLog(workspaceId, actor, {
      action: "INVITE",
      targetCollection: "invites",
      targetId: inviteId,
      summary: `Invited ${cleanEmail || "open code holder"} as ${params.role} (code ${code}).`,
    });

    return {
      id: inviteId,
      workspaceId,
      workspaceName,
      email: cleanEmail,
      role: params.role,
      code,
      status: "pending",
      expiresAt,
      createdBy: actor.uid,
    };
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.CREATE,
      `workspaces/${workspaceId}/invites/${inviteId}`,
    );
  }
}

export async function revokeWorkspaceInvite(
  workspaceId: string,
  invite: WorkspaceInviteDoc,
  actor: AuditActor,
): Promise<void> {
  const db = getFirebaseDb();
  try {
    const batch = writeBatch(db);
    batch.update(doc(db, "workspaces", workspaceId, "invites", invite.id), {
      status: "revoked",
      updatedAt: serverTimestamp(),
    });
    batch.update(doc(db, "inviteCodes", invite.code), {
      status: "revoked",
      updatedAt: serverTimestamp(),
    });
    if (invite.email) {
      batch.update(doc(db, "emailInvites", invite.id), {
        status: "revoked",
        updatedAt: serverTimestamp(),
      });
    }
    await batch.commit();
    recordLastWriteSuccess();
    await writeAuditLog(workspaceId, actor, {
      action: "INVITE",
      targetCollection: "invites",
      targetId: invite.id,
      summary: `Revoked invite ${invite.code} (${invite.email || "open code"}).`,
    });
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.UPDATE,
      `workspaces/${workspaceId}/invites/${invite.id}`,
    );
  }
}

export async function claimInviteByCodeAtomic(
  user: User,
  rawCode: string,
  extra?: { hallId?: string; studentCode?: string },
): Promise<{ workspaceId: string; workspaceName: string; role: WorkspaceRole }> {
  if (!user.emailVerified) {
    throw new Error("Please verify your email address before joining a workspace.");
  }
  await ensureUserProfile(user);
  const db = getFirebaseDb();
  const code = rawCode
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, "");
  if (!code) throw new Error("Please enter a valid invite code.");

  const inviteSnap = await getDoc(doc(db, "inviteCodes", code));
  if (!inviteSnap.exists()) {
    throw new Error(
      `Invite code "${code}" was not found. Ask your mess admin for a fresh invite link.`,
    );
  }
  const inviteData = inviteSnap.data() as WorkspaceInviteDoc & { inviteId?: string };
  if (inviteData.status !== "pending") {
    throw new Error(`Invite code "${code}" has already been ${inviteData.status}.`);
  }
  if (inviteData.expiresAt && new Date(inviteData.expiresAt).getTime() < Date.now()) {
    throw new Error(`Invite code "${code}" has expired.`);
  }
  const userEmail = (user.email || "").trim().toLowerCase();
  if (inviteData.email && inviteData.email.trim().toLowerCase() !== userEmail) {
    throw new Error(
      `This invite was sent to ${inviteData.email}. Please sign in with that email address.`,
    );
  }

  const displayName = (user.displayName?.trim() || userEmail.split("@")[0] || "Mess Member").slice(
    0,
    120,
  );
  const workspaceId = inviteData.workspaceId;
  const inviteId = inviteData.inviteId || inviteData.id;

  try {
    const batch = writeBatch(db);
    batch.set(doc(db, "workspaces", workspaceId, "members", user.uid), {
      uid: user.uid,
      workspaceId,
      role: inviteData.role,
      status: "active",
      invitedBy: inviteData.createdBy,
      joinedAt: serverTimestamp(),
      name: displayName,
      email: userEmail,
      inviteCode: code,
      ...(extra?.hallId ? { hallId: extra.hallId.slice(0, 128) } : {}),
      ...(extra?.studentCode ? { studentCode: extra.studentCode.slice(0, 32) } : {}),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    batch.set(doc(db, "userWorkspaces", `${user.uid}_${workspaceId}`), {
      uid: user.uid,
      workspaceId,
      workspaceName: inviteData.workspaceName,
      role: inviteData.role,
      status: "active",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    batch.update(doc(db, "inviteCodes", code), {
      status: "claimed",
      claimedBy: user.uid,
      updatedAt: serverTimestamp(),
    });

    if (inviteId) {
      batch.update(doc(db, "workspaces", workspaceId, "invites", inviteId), {
        status: "claimed",
        claimedBy: user.uid,
        updatedAt: serverTimestamp(),
      });
      if (inviteData.email) {
        batch.update(doc(db, "emailInvites", inviteId), {
          status: "claimed",
          claimedBy: user.uid,
          updatedAt: serverTimestamp(),
        });
      }
    }

    batch.update(doc(db, "users", user.uid), {
      defaultWorkspaceId: workspaceId,
      updatedAt: serverTimestamp(),
    });

    await batch.commit();
    recordLastWriteSuccess();

    await writeAuditLog(
      workspaceId,
      { uid: user.uid, name: displayName, email: userEmail, role: inviteData.role },
      {
        action: "INVITE",
        targetCollection: "members",
        targetId: user.uid,
        summary: `${displayName} joined workspace via invite code ${code} as ${inviteData.role}.`,
      },
    );

    return {
      workspaceId,
      workspaceName: inviteData.workspaceName,
      role: inviteData.role,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `inviteCodes/${code}`);
  }
}

export async function claimPendingEmailInvites(user: User): Promise<number> {
  if (!user.emailVerified || !user.email) return 0;
  const db = getFirebaseDb();
  const userEmail = user.email.trim().toLowerCase();
  try {
    const snap = await getDocs(
      query(
        collection(db, "emailInvites"),
        where("email", "==", userEmail),
        where("status", "==", "pending"),
      ),
    );
    let claimed = 0;
    for (const d of snap.docs) {
      const inv = d.data() as WorkspaceInviteDoc;
      if (inv.status === "pending" && inv.code) {
        try {
          await claimInviteByCodeAtomic(user, inv.code);
          claimed += 1;
        } catch (err) {
          console.warn("[invites] Could not auto-claim invite:", inv.code, err);
        }
      }
    }
    return claimed;
  } catch (error) {
    console.warn("[invites] Pending email invite lookup skipped:", error);
    return 0;
  }
}

export async function updateWorkspaceMemberAtomic(
  workspaceId: string,
  targetUid: string,
  workspaceName: string,
  actor: AuditActor,
  updates: { role?: WorkspaceRole; status?: MemberStatus; name?: string },
): Promise<void> {
  const db = getFirebaseDb();
  try {
    const batch = writeBatch(db);
    batch.update(doc(db, "workspaces", workspaceId, "members", targetUid), {
      ...(updates.role !== undefined ? { role: updates.role } : {}),
      ...(updates.status !== undefined ? { status: updates.status } : {}),
      ...(updates.name !== undefined ? { name: updates.name.slice(0, 120) } : {}),
      updatedAt: serverTimestamp(),
    });
    batch.update(doc(db, "userWorkspaces", `${targetUid}_${workspaceId}`), {
      workspaceName: workspaceName.slice(0, 120),
      ...(updates.role !== undefined ? { role: updates.role } : {}),
      ...(updates.status !== undefined ? { status: updates.status } : {}),
      updatedAt: serverTimestamp(),
    });
    await batch.commit();
    recordLastWriteSuccess();
    await writeAuditLog(workspaceId, actor, {
      action: "ROLE",
      targetCollection: "members",
      targetId: targetUid,
      summary:
        `Updated member ${targetUid}: ${updates.role ? `role=${updates.role} ` : ""}${updates.status ? `status=${updates.status}` : ""}`.trim(),
    });
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.UPDATE,
      `workspaces/${workspaceId}/members/${targetUid}`,
    );
  }
}

export async function removeWorkspaceMemberAtomic(
  workspaceId: string,
  targetUid: string,
  actor: AuditActor,
): Promise<void> {
  const db = getFirebaseDb();
  try {
    const batch = writeBatch(db);
    batch.delete(doc(db, "workspaces", workspaceId, "members", targetUid));
    batch.delete(doc(db, "userWorkspaces", `${targetUid}_${workspaceId}`));
    await batch.commit();
    recordLastWriteSuccess();
    await writeAuditLog(workspaceId, actor, {
      action: "DELETE",
      targetCollection: "members",
      targetId: targetUid,
      summary: `Removed member ${targetUid} from workspace.`,
    });
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.DELETE,
      `workspaces/${workspaceId}/members/${targetUid}`,
    );
  }
}

export function subscribeWorkspaceMembers(
  workspaceId: string,
  onData: (rows: WorkspaceMemberDoc[]) => void,
): Unsubscribe {
  const db = getFirebaseDb();
  const q = query(
    collection(db, "workspaces", workspaceId, "members"),
    where("workspaceId", "==", workspaceId),
  );
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => d.data() as WorkspaceMemberDoc));
    },
    (error) => console.warn("[members] listener warning:", error.message),
  );
}

export function subscribeWorkspaceInvites(
  workspaceId: string,
  onData: (rows: WorkspaceInviteDoc[]) => void,
): Unsubscribe {
  const db = getFirebaseDb();
  const q = query(
    collection(db, "workspaces", workspaceId, "invites"),
    where("workspaceId", "==", workspaceId),
  );
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<WorkspaceInviteDoc, "id">) })));
    },
    (error) => console.warn("[invites] listener warning:", error.message),
  );
}

export function subscribeSubcollection<T extends { id: string }>(
  workspaceId: string,
  collectionName: string,
  onData: (rows: T[]) => void,
  options?: { uidFilterField?: string; uid?: string; orderByField?: string; maxRows?: number },
): Unsubscribe {
  const db = getFirebaseDb();
  const colRef = collection(db, "workspaces", workspaceId, collectionName);
  const constraints = [where("workspaceId", "==", workspaceId)];
  if (options?.uidFilterField && options?.uid) {
    constraints.push(where(options.uidFilterField, "==", options.uid));
  }
  const q = options?.maxRows
    ? query(colRef, ...constraints, limit(options.maxRows))
    : query(colRef, ...constraints);

  return onSnapshot(
    q,
    (snap) => {
      const rows = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<T, "id">),
      })) as T[];
      if (options?.orderByField) {
        const field = options.orderByField;
        rows.sort((a, b) => {
          const av = String((a as Record<string, unknown>)[field] ?? "");
          const bv = String((b as Record<string, unknown>)[field] ?? "");
          return bv.localeCompare(av);
        });
      }
      onData(rows);
    },
    (error) => {
      console.warn(`[sub:${collectionName}] listener warning:`, error.message);
    },
  );
}

export async function createSubDoc<T extends Record<string, unknown>>(
  workspaceId: string,
  collectionName: string,
  actor: AuditActor,
  payload: T,
  options?: { customId?: string; auditSummary?: string },
): Promise<string> {
  const db = getFirebaseDb();
  const id = sanitizeFirestoreId(options?.customId || generateDocId(collectionName.slice(0, 4)));
  const path = `workspaces/${workspaceId}/${collectionName}/${id}`;
  try {
    await setDoc(doc(db, "workspaces", workspaceId, collectionName, id), {
      ...payload,
      workspaceId,
      createdBy: actor.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    recordLastWriteSuccess();
    if (options?.auditSummary) {
      await writeAuditLog(workspaceId, actor, {
        action: "CREATE",
        targetCollection: collectionName,
        targetId: id,
        summary: options.auditSummary,
      });
    }
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateSubDoc(
  workspaceId: string,
  collectionName: string,
  docId: string,
  actor: AuditActor,
  updates: Record<string, unknown>,
  auditSummary?: string,
): Promise<void> {
  const db = getFirebaseDb();
  const path = `workspaces/${workspaceId}/${collectionName}/${docId}`;
  try {
    await updateDoc(doc(db, "workspaces", workspaceId, collectionName, docId), {
      ...updates,
      updatedAt: serverTimestamp(),
    });
    recordLastWriteSuccess();
    if (auditSummary) {
      await writeAuditLog(workspaceId, actor, {
        action: "UPDATE",
        targetCollection: collectionName,
        targetId: docId,
        summary: auditSummary,
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteSubDoc(
  workspaceId: string,
  collectionName: string,
  docId: string,
  actor: AuditActor,
  auditSummary?: string,
): Promise<void> {
  const db = getFirebaseDb();
  const path = `workspaces/${workspaceId}/${collectionName}/${docId}`;
  try {
    await deleteDoc(doc(db, "workspaces", workspaceId, collectionName, docId));
    recordLastWriteSuccess();
    if (auditSummary) {
      await writeAuditLog(workspaceId, actor, {
        action: "DELETE",
        targetCollection: collectionName,
        targetId: docId,
        summary: auditSummary,
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function adjustInventoryAtomic(
  workspaceId: string,
  item: InventoryItemDoc,
  quantityDelta: number,
  reason: string,
  actor: AuditActor,
): Promise<void> {
  const db = getFirebaseDb();
  const nextQty = Math.max(0, Number((item.quantity + quantityDelta).toFixed(2)));
  const moveId = generateDocId("mov");
  try {
    const batch = writeBatch(db);
    batch.update(doc(db, "workspaces", workspaceId, "inventoryItems", item.id), {
      quantity: nextQty,
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(db, "workspaces", workspaceId, "stockMovements", moveId), {
      workspaceId,
      itemId: item.id,
      itemName: item.name.slice(0, 120),
      quantityDelta: Number(quantityDelta.toFixed(2)),
      unit: item.unit,
      reason: reason.trim().slice(0, 160) || "Manual stock adjustment",
      movedAt: new Date().toISOString(),
      createdBy: actor.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await batch.commit();
    recordLastWriteSuccess();
    await writeAuditLog(workspaceId, actor, {
      action: "UPDATE",
      targetCollection: "inventoryItems",
      targetId: item.id,
      summary: `Adjusted "${item.name}" by ${quantityDelta >= 0 ? "+" : ""}${quantityDelta} ${item.unit} (${reason}).`,
    });
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.WRITE,
      `workspaces/${workspaceId}/inventoryItems/${item.id}`,
    );
  }
}

export async function deductRecipeInventoryAtomic(
  workspaceId: string,
  deductions: { item: InventoryItemDoc; deductQty: number }[],
  reason: string,
  actor: AuditActor,
): Promise<number> {
  const valid = deductions.filter((d) => d.deductQty > 0);
  if (!valid.length) return 0;
  const db = getFirebaseDb();
  const batch = writeBatch(db);
  for (const entry of valid) {
    const nextQty = Math.max(0, Number((entry.item.quantity - entry.deductQty).toFixed(2)));
    const actualDelta = Number((nextQty - entry.item.quantity).toFixed(2));
    if (actualDelta === 0) continue;
    const moveId = generateDocId("mov");
    batch.update(doc(db, "workspaces", workspaceId, "inventoryItems", entry.item.id), {
      quantity: nextQty,
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(db, "workspaces", workspaceId, "stockMovements", moveId), {
      workspaceId,
      itemId: entry.item.id,
      itemName: entry.item.name.slice(0, 120),
      quantityDelta: actualDelta,
      unit: entry.item.unit,
      reason: reason.trim().slice(0, 160) || "Recipe prep auto-deduction",
      movedAt: new Date().toISOString(),
      createdBy: actor.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
  try {
    await batch.commit();
    recordLastWriteSuccess();
    await writeAuditLog(workspaceId, actor, {
      action: "UPDATE",
      targetCollection: "inventoryItems",
      targetId: valid[0]!.item.id,
      summary: `Auto-deducted ${valid.length} recipe ingredient(s): ${reason}.`,
    });
    return valid.length;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `workspaces/${workspaceId}/inventoryItems`);
  }
}

export async function upsertWorkspaceBooking(
  workspaceId: string,
  actor: AuditActor,
  params: {
    studentCode: string;
    serviceDate: string;
    mealType: "breakfast" | "lunch" | "snacks" | "dinner";
    status: "booked" | "skipped";
    guestCount: number;
    tiffinRequested?: boolean;
    note?: string;
  },
): Promise<void> {
  const db = getFirebaseDb();
  const docId = sanitizeFirestoreId(`${actor.uid}_${params.serviceDate}_${params.mealType}`);
  const ref = doc(db, "workspaces", workspaceId, "bookings", docId);
  const path = `workspaces/${workspaceId}/bookings/${docId}`;
  try {
    const existing = await getDoc(ref);
    if (!existing.exists()) {
      await setDoc(ref, {
        workspaceId,
        userId: actor.uid,
        studentCode: params.studentCode.slice(0, 40) || "STU",
        serviceDate: params.serviceDate,
        mealType: params.mealType,
        status: params.status,
        guestCount: Math.max(0, Math.min(5, Math.round(params.guestCount))),
        tiffinRequested: Boolean(params.tiffinRequested),
        ...(params.note?.trim() ? { note: params.note.trim().slice(0, 300) } : {}),
        createdBy: actor.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        status: params.status,
        guestCount: Math.max(0, Math.min(5, Math.round(params.guestCount))),
        tiffinRequested: Boolean(params.tiffinRequested),
        ...(params.note !== undefined ? { note: params.note.trim().slice(0, 300) } : {}),
        updatedAt: serverTimestamp(),
      });
    }
    recordLastWriteSuccess();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function generateMonthlyInvoicesAtomic(
  workspace: WorkspaceDoc,
  students: StudentRecordDoc[],
  leaves: LeaveRequestDoc[],
  bookings: BookingDoc[],
  monthKey: string,
  actor: AuditActor,
): Promise<number> {
  if (students.length === 0) return 0;
  const db = getFirebaseDb();
  const batch = writeBatch(db);
  let count = 0;

  for (const stu of students.slice(0, 350)) {
    const invId = sanitizeFirestoreId(`inv_${monthKey}_${stu.studentCode}`);
    const minRebateDays = Math.max(1, Math.round(workspace.minRebateDays ?? 3));
    const approvedDays = leaves
      .filter(
        (l) =>
          l.status === "approved" &&
          l.days >= minRebateDays &&
          (l.studentCode === stu.studentCode || (stu.uid && l.userId === stu.uid)) &&
          l.startDate.startsWith(monthKey),
      )
      .reduce((sum, l) => sum + Math.max(0, Math.round(l.days)), 0);

    const guestPlates = bookings
      .filter(
        (b) =>
          (b.studentCode === stu.studentCode || (stu.uid && b.userId === stu.uid)) &&
          b.serviceDate.startsWith(monthKey) &&
          b.guestCount > 0,
      )
      .reduce((sum, b) => sum + Math.max(0, Math.round(b.guestCount)), 0);

    const baseProratedPaise = Math.max(0, Math.round(workspace.monthlyFeePaise || 420000));
    const leaveRebatePaise = Math.min(
      baseProratedPaise,
      Math.max(0, Math.round(approvedDays * (workspace.perDayRebatePaise || 8500))),
    );
    const guestChargesPaise = Math.max(
      0,
      Math.round(guestPlates * (workspace.guestMealUnitPaise || 9000)),
    );
    const subtotalPaise = Math.max(0, baseProratedPaise - leaveRebatePaise + guestChargesPaise);
    const gstPaise = Math.round(subtotalPaise * 0.05);
    const totalPayablePaise = subtotalPaise + gstPaise;

    batch.set(doc(db, "workspaces", workspace.id, "invoices", invId), {
      workspaceId: workspace.id,
      studentCode: stu.studentCode,
      studentName: stu.name,
      ...(stu.uid ? { studentUid: stu.uid } : {}),
      monthKey,
      baseProratedPaise,
      leaveRebatePaise,
      guestChargesPaise,
      gstPaise,
      totalPayablePaise,
      paidPaise: 0,
      status: "unpaid",
      createdBy: actor.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    count += 1;
  }

  try {
    await batch.commit();
    recordLastWriteSuccess();
    await writeAuditLog(workspace.id, actor, {
      action: "PAYMENT",
      targetCollection: "invoices",
      targetId: monthKey,
      summary: `Generated ${count} monthly bill(s) for ${monthKey} (with leave rebates + 5% GST).`,
    });
    return count;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `workspaces/${workspace.id}/invoices`);
  }
}

export async function recordPaymentAtomic(
  workspaceId: string,
  invoice: InvoiceDoc,
  amountRupees: number,
  method: PaymentDoc["method"],
  referenceNo: string,
  actor: AuditActor,
): Promise<void> {
  const amountPaise = Math.max(100, Math.round(amountRupees * 100));
  const nextPaid = Math.min(invoice.totalPayablePaise, invoice.paidPaise + amountPaise);
  const nextStatus: InvoiceDoc["status"] =
    nextPaid >= invoice.totalPayablePaise ? "paid" : nextPaid > 0 ? "partial" : "unpaid";

  const db = getFirebaseDb();
  const payId = generateDocId("pay");
  try {
    const batch = writeBatch(db);
    batch.set(doc(db, "workspaces", workspaceId, "payments", payId), {
      workspaceId,
      invoiceId: invoice.id,
      studentName: invoice.studentName,
      ...(invoice.studentUid ? { studentUid: invoice.studentUid } : {}),
      amountPaise,
      method,
      referenceNo: referenceNo.trim().slice(0, 80) || `TXN-${Date.now()}`,
      paidAt: new Date().toISOString(),
      createdBy: actor.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    batch.update(doc(db, "workspaces", workspaceId, "invoices", invoice.id), {
      paidPaise: nextPaid,
      status: nextStatus,
      updatedAt: serverTimestamp(),
    });
    await batch.commit();
    recordLastWriteSuccess();
    await writeAuditLog(workspaceId, actor, {
      action: "PAYMENT",
      targetCollection: "payments",
      targetId: payId,
      summary: `Recorded ₹${(amountPaise / 100).toFixed(2)} (${method.toUpperCase()}) for ${invoice.studentName} (${invoice.monthKey}).`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `workspaces/${workspaceId}/payments/${payId}`);
  }
}

export async function runHealthWriteTest(workspaceId: string, user: User): Promise<string> {
  const db = getFirebaseDb();
  const docId = sanitizeFirestoreId(`check_${user.uid}`);
  const ref = doc(db, "workspaces", workspaceId, "healthcheck", docId);
  const path = `workspaces/${workspaceId}/healthcheck/${docId}`;
  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        workspaceId,
        status: "ok",
        checkedBy: user.uid,
        note: `Diagnostic write verified at ${new Date().toISOString()}`,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        status: "ok",
        checkedBy: user.uid,
        note: `Diagnostic write verified at ${new Date().toISOString()}`,
        updatedAt: serverTimestamp(),
      });
    }
    return recordLastWriteSuccess();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function runHealthReadTest(workspaceId: string): Promise<{
  workspaceName: string;
  memberCount: number;
  hallCount: number;
  latencyMs: number;
}> {
  const db = getFirebaseDb();
  const started = performance.now();
  try {
    const [wsSnap, memSnap, hallSnap] = await Promise.all([
      getDoc(doc(db, "workspaces", workspaceId)),
      getDocs(
        query(
          collection(db, "workspaces", workspaceId, "members"),
          where("workspaceId", "==", workspaceId),
        ),
      ),
      getDocs(
        query(
          collection(db, "workspaces", workspaceId, "halls"),
          where("workspaceId", "==", workspaceId),
        ),
      ),
    ]);
    return {
      workspaceName: wsSnap.exists() ? String((wsSnap.data() as WorkspaceDoc).name) : "Missing",
      memberCount: memSnap.size,
      hallCount: hallSnap.size,
      latencyMs: Math.round(performance.now() - started),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `workspaces/${workspaceId}`);
  }
}

export async function listWorkspaceAuditLogsOnce(
  workspaceId: string,
  maxRows = 100,
): Promise<AuditLogDoc[]> {
  const db = getFirebaseDb();
  const snap = await getDocs(
    query(
      collection(db, "workspaces", workspaceId, "auditLogs"),
      where("workspaceId", "==", workspaceId),
      orderBy("createdAt", "desc"),
      limit(maxRows),
    ),
  );
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<AuditLogDoc, "id">) }));
}

export type WorkspaceCollectionsBundle = {
  halls: HallDoc[];
  students: StudentRecordDoc[];
  mealSlots: MealSlotConfigDoc[];
  menus: MenuPlanDoc[];
  recipes: RecipeDoc[];
  inventoryItems: InventoryItemDoc[];
  stockMovements: StockMovementDoc[];
  vendors: VendorDoc[];
  purchaseOrders: PurchaseOrderDoc[];
  bookings: BookingDoc[];
  attendance: AttendanceDoc[];
  wasteLogs: WasteLogDoc[];
  invoices: InvoiceDoc[];
  payments: PaymentDoc[];
  feedback: FeedbackDoc[];
  complaints: ComplaintDoc[];
  notifications: NotificationDoc[];
  auditLogs: AuditLogDoc[];
  kitchenTasks: KitchenTaskDoc[];
  forecasts: ForecastDoc[];
  calendarEvents: CalendarEventDoc[];
  serviceActuals: ServiceActualDoc[];
  leaveRequests: LeaveRequestDoc[];
};
