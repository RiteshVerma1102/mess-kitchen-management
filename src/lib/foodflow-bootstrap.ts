import { supabase } from "@/integrations/supabase/client";

export type BootstrapResult =
  | { status: "unauthenticated"; destination: "/login" }
  | { status: "needs_onboarding"; destination: "/onboarding" }
  | { status: "ready"; destination: "/overview" | "/student"; institutionId: string; role: string };

/**
 * Idempotently checks the user's institution status and bootstraps
 * pending workspaces from signup metadata if present.
 */
export async function bootstrapWorkspace(client = supabase): Promise<BootstrapResult> {
  const { data: { session } } = await client.auth.getSession();
  if (!session?.user) {
    return { status: "unauthenticated", destination: "/login" };
  }

  const user = session.user;

  // 1. Check if profile already has an institution assigned
  const { data: profile } = await client
    .from("foodflow_profiles")
    .select("institution_id, display_name")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profile?.institution_id) {
    const { data: roles } = await client
      .from("foodflow_user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("institution_id", profile.institution_id);

    const userRoles = (roles ?? []).map((r: { role: string }) => r.role);
    const isStudent = userRoles.includes("student");

    return {
      status: "ready",
      destination: isStudent ? "/student" : "/overview",
      institutionId: profile.institution_id,
      role: userRoles[0] || "member",
    };
  }

  // 1b. Check if user has an active membership in institution_members
  try {
    const { data: member } = (await (client as any)
      .from("institution_members")
      .select("institution_id, role")
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle()) as { data: { institution_id?: string; role?: string } | null };

    if (member?.institution_id) {
      return {
        status: "ready",
        destination: member.role === "student" ? "/student" : "/overview",
        institutionId: member.institution_id,
        role: member.role || "member",
      };
    }
  } catch {
    // Table may not exist yet, continue
  }

  // 2. Check if user metadata contains pending institution details from signup
  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const pendingName =
    meta?.["institution_name"] ||
    meta?.["pending_institution_name"];

  if (pendingName && typeof pendingName === "string" && pendingName.trim().length >= 2) {
    try {
      const { data: institutionId, error } = await client.rpc(
        "foodflow_complete_setup_for_current_user",
        { _institution_name: pendingName.trim() }
      );

      if (!error && institutionId) {
        // Clear pending metadata so it's only created once
        await client.auth.updateUser({
          data: {
            institution_name: null,
            pending_institution_name: null,
            pending_institution_type: null,
          },
        });

        return {
          status: "ready",
          destination: "/overview",
          institutionId: institutionId as string,
          role: "institution_admin",
        };
      }
    } catch (err) {
      console.error("[auth] bootstrapWorkspace creation failed:", err);
    }
  }

  // 3. User is signed in but has no institution
  return { status: "needs_onboarding", destination: "/onboarding" };
}
