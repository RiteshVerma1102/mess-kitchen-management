import {
  Component,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ErrorInfo,
  type ReactNode,
} from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import {
  consumeGoogleRedirectResult,
  ensureUserProfile,
  getFirebaseAuth,
  getLastSuccessfulWriteIso,
  resendVerificationForCurrentUser,
  sendFirebasePasswordReset,
  signInWithEmailPassword,
  signInWithGooglePopup,
  signOutFirebaseUser,
  signUpWithEmailPassword,
  testFirestoreConnection,
} from "@/lib/firebase";
import {
  ensureAutoDefaultWorkspace,
  listUserWorkspaces,
  loadUserProfileDoc,
  loadWorkspaceAndMember,
  updateUserProfilePreferences,
  type UserWorkspaceMembership,
} from "@/lib/workspace-firestore";
import type {
  SupportedLanguage,
  UserProfileDoc,
  WorkspaceDoc,
  WorkspaceMemberDoc,
  WorkspaceRole,
} from "@/lib/domain/workspace-types";

const ACTIVE_WS_STORAGE_KEY = "foodflow_active_workspace_id";
const LANG_STORAGE_KEY = "foodflow_language";

interface FirebaseAuthContextValue {
  user: User | null;
  loading: boolean;
  workspaceLoading: boolean;
  firestoreConnected: boolean;
  profile: UserProfileDoc | null;
  memberships: UserWorkspaceMembership[];
  activeWorkspace: WorkspaceDoc | null;
  activeMember: WorkspaceMemberDoc | null;
  role: WorkspaceRole | null;
  language: SupportedLanguage;
  lastWriteIso: string | null;
  setLanguage: (next: SupportedLanguage) => Promise<void>;
  switchWorkspace: (workspaceId: string) => Promise<void>;
  refreshWorkspaceContext: () => Promise<void>;
  markWriteRecorded: (iso?: string) => void;
  signInWithGoogle: (rememberBrowser?: boolean) => Promise<User>;
  signUpEmail: (params: { name: string; email: string; password: string }) => Promise<User>;
  signInEmail: (params: {
    email: string;
    password: string;
    rememberBrowser: boolean;
  }) => Promise<User>;
  resendVerification: () => Promise<void>;
  reloadUserVerification: () => Promise<boolean>;
  sendPasswordReset: (email: string) => Promise<void>;
  signOutFirebase: () => Promise<void>;
}

const FirebaseAuthContext = createContext<FirebaseAuthContextValue>({
  user: null,
  loading: true,
  workspaceLoading: false,
  firestoreConnected: false,
  profile: null,
  memberships: [],
  activeWorkspace: null,
  activeMember: null,
  role: null,
  language: "en",
  lastWriteIso: null,
  setLanguage: async () => {},
  switchWorkspace: async () => {},
  refreshWorkspaceContext: async () => {},
  markWriteRecorded: () => {},
  signInWithGoogle: async () => {
    throw new Error("Firebase provider is not mounted.");
  },
  signUpEmail: async () => {
    throw new Error("Firebase provider is not mounted.");
  },
  signInEmail: async () => {
    throw new Error("Firebase provider is not mounted.");
  },
  resendVerification: async () => {},
  reloadUserVerification: async () => false,
  sendPasswordReset: async () => {},
  signOutFirebase: async () => {},
});

export function useFirebaseAuth() {
  return useContext(FirebaseAuthContext);
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class FirebaseErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { hasError: false, message: "" };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error.message || "Unexpected application error.",
    };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[FirebaseErrorBoundary]", error, info);
  }

  override render() {
    if (this.state.hasError) {
      let parsedMessage = this.state.message;
      try {
        const parsed = JSON.parse(this.state.message) as { error?: string; path?: string };
        if (parsed.error) {
          parsedMessage = `${parsed.error}${parsed.path ? ` (${parsed.path})` : ""}`;
        }
      } catch {
        // plain text error message
      }

      return (
        <div className="flex min-h-screen items-center justify-center bg-[#F5F8FA] p-6">
          <div className="max-w-md rounded-3xl border border-[#E5EAF0] bg-white p-6 text-center shadow-sm">
            <h2 className="font-display text-lg font-bold text-[#172B3A]">
              Something interrupted this screen
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-[#718096]">{parsedMessage}</p>
            <button
              type="button"
              onClick={() => this.setState({ hasError: false, message: "" })}
              className="mt-5 rounded-full bg-[#087E8B] px-5 py-2 text-xs font-bold text-white hover:bg-[#07545B]"
            >
              Recover workspace
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export function FirebaseProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [firestoreConnected, setFirestoreConnected] = useState(false);
  const [profile, setProfile] = useState<UserProfileDoc | null>(null);
  const [memberships, setMemberships] = useState<UserWorkspaceMembership[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceDoc | null>(null);
  const [activeMember, setActiveMember] = useState<WorkspaceMemberDoc | null>(null);
  const [lastWriteIso, setLastWriteIso] = useState<string | null>(() =>
    getLastSuccessfulWriteIso(),
  );
  const [language, setLanguageState] = useState<SupportedLanguage>(() => {
    if (typeof window !== "undefined") {
      return window.localStorage.getItem(LANG_STORAGE_KEY) === "hi" ? "hi" : "en";
    }
    return "en";
  });

  const markWriteRecorded = useCallback((iso?: string) => {
    setLastWriteIso(iso ?? getLastSuccessfulWriteIso() ?? new Date().toISOString());
  }, []);

  const resolveWorkspaceContext = useCallback(
    async (targetUser: User | null, preferredWsId?: string) => {
      if (!targetUser || !targetUser.emailVerified) {
        setProfile(null);
        setMemberships([]);
        setActiveWorkspace(null);
        setActiveMember(null);
        setWorkspaceLoading(false);
        return;
      }

      setWorkspaceLoading(true);
      try {
        await ensureUserProfile(targetUser);
        const pendingCode =
          typeof window !== "undefined"
            ? window.sessionStorage.getItem("foodflow_pending_invite_code")
            : null;
        if (pendingCode && typeof window !== "undefined") {
          window.sessionStorage.removeItem("foodflow_pending_invite_code");
        }

        await ensureAutoDefaultWorkspace(targetUser, language, pendingCode);

        const [nextProfile, nextMemberships] = await Promise.all([
          loadUserProfileDoc(targetUser.uid),
          listUserWorkspaces(targetUser.uid),
        ]);

        setProfile(nextProfile);
        setMemberships(nextMemberships);

        if (nextProfile?.language === "hi" || nextProfile?.language === "en") {
          setLanguageState(nextProfile.language);
          if (typeof window !== "undefined") {
            window.localStorage.setItem(LANG_STORAGE_KEY, nextProfile.language);
          }
        }

        const savedId =
          preferredWsId ||
          (typeof window !== "undefined"
            ? window.localStorage.getItem(ACTIVE_WS_STORAGE_KEY)
            : null) ||
          nextProfile?.defaultWorkspaceId ||
          null;

        const activeList = nextMemberships.filter((m) => m.status === "active");
        const chosen =
          activeList.find((m) => m.workspaceId === savedId) ??
          activeList[0] ??
          nextMemberships[0] ??
          null;

        if (chosen) {
          const { workspace, member } = await loadWorkspaceAndMember(
            chosen.workspaceId,
            targetUser.uid,
          );
          setActiveWorkspace(workspace);
          setActiveMember(member);
          if (workspace && typeof window !== "undefined") {
            window.localStorage.setItem(ACTIVE_WS_STORAGE_KEY, workspace.id);
          }
        } else {
          setActiveWorkspace(null);
          setActiveMember(null);
        }
        markWriteRecorded();
      } catch (error) {
        console.warn("[FirebaseProvider] Workspace hydration failed:", error);
      } finally {
        setWorkspaceLoading(false);
      }
    },
    [language, markWriteRecorded],
  );

  useEffect(() => {
    let active = true;
    void testFirestoreConnection().then((ok) => {
      if (active) setFirestoreConnected(ok);
    });

    void consumeGoogleRedirectResult();

    const auth = getFirebaseAuth();
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      if (!active) return;
      setUser(nextUser);
      setLoading(false);
      void resolveWorkspaceContext(nextUser);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [resolveWorkspaceContext]);

  const switchWorkspace = useCallback(
    async (workspaceId: string) => {
      if (!user) return;
      if (typeof window !== "undefined") {
        window.localStorage.setItem(ACTIVE_WS_STORAGE_KEY, workspaceId);
      }
      await resolveWorkspaceContext(user, workspaceId);
      if (user.emailVerified) {
        void updateUserProfilePreferences(user.uid, { defaultWorkspaceId: workspaceId }).catch(
          () => {},
        );
      }
    },
    [user, resolveWorkspaceContext],
  );

  const refreshWorkspaceContext = useCallback(async () => {
    const auth = getFirebaseAuth();
    await resolveWorkspaceContext(auth.currentUser);
  }, [resolveWorkspaceContext]);

  const setLanguage = useCallback(
    async (next: SupportedLanguage) => {
      setLanguageState(next);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(LANG_STORAGE_KEY, next);
      }
      if (user && user.emailVerified) {
        await updateUserProfilePreferences(user.uid, { language: next }).catch(() => {});
      }
    },
    [user],
  );

  const signInWithGoogle = useCallback(
    async (rememberBrowser = true) => {
      const signedUser = await signInWithGooglePopup(rememberBrowser);
      setUser(signedUser);
      await resolveWorkspaceContext(signedUser);
      return signedUser;
    },
    [resolveWorkspaceContext],
  );

  const signUpEmail = useCallback(
    async (params: { name: string; email: string; password: string }) => {
      const created = await signUpWithEmailPassword(params);
      setUser(created);
      return created;
    },
    [],
  );

  const signInEmail = useCallback(
    async (params: { email: string; password: string; rememberBrowser: boolean }) => {
      const signedUser = await signInWithEmailPassword(params);
      setUser(signedUser);
      await resolveWorkspaceContext(signedUser);
      return signedUser;
    },
    [resolveWorkspaceContext],
  );

  const resendVerification = useCallback(async () => {
    await resendVerificationForCurrentUser();
  }, []);

  const reloadUserVerification = useCallback(async () => {
    const auth = getFirebaseAuth();
    if (!auth.currentUser) return false;
    await auth.currentUser.reload();
    await auth.currentUser.getIdToken(true);
    const refreshed = auth.currentUser;
    setUser(refreshed);
    if (refreshed.emailVerified) {
      await resolveWorkspaceContext(refreshed);
      return true;
    }
    return false;
  }, [resolveWorkspaceContext]);

  const sendPasswordReset = useCallback(async (email: string) => {
    await sendFirebasePasswordReset(email);
  }, []);

  const signOutFirebase = useCallback(async () => {
    await signOutFirebaseUser();
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(ACTIVE_WS_STORAGE_KEY);
      window.sessionStorage.removeItem("foodflow-demo-access");
    }
    setUser(null);
    setProfile(null);
    setMemberships([]);
    setActiveWorkspace(null);
    setActiveMember(null);
  }, []);

  const role: WorkspaceRole | null =
    activeMember && activeMember.status === "active" ? activeMember.role : null;

  const value = useMemo<FirebaseAuthContextValue>(
    () => ({
      user,
      loading,
      workspaceLoading,
      firestoreConnected,
      profile,
      memberships,
      activeWorkspace,
      activeMember,
      role,
      language,
      lastWriteIso,
      setLanguage,
      switchWorkspace,
      refreshWorkspaceContext,
      markWriteRecorded,
      signInWithGoogle,
      signUpEmail,
      signInEmail,
      resendVerification,
      reloadUserVerification,
      sendPasswordReset,
      signOutFirebase,
    }),
    [
      user,
      loading,
      workspaceLoading,
      firestoreConnected,
      profile,
      memberships,
      activeWorkspace,
      activeMember,
      role,
      language,
      lastWriteIso,
      setLanguage,
      switchWorkspace,
      refreshWorkspaceContext,
      markWriteRecorded,
      signInWithGoogle,
      signUpEmail,
      signInEmail,
      resendVerification,
      reloadUserVerification,
      sendPasswordReset,
      signOutFirebase,
    ],
  );

  return (
    <FirebaseAuthContext.Provider value={value}>
      <FirebaseErrorBoundary>{children}</FirebaseErrorBoundary>
    </FirebaseAuthContext.Provider>
  );
}
