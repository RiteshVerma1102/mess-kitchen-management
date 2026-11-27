import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import {
  browserLocalPersistence,
  browserSessionPersistence,
  confirmPasswordReset,
  createUserWithEmailAndPassword,
  getAuth,
  getRedirectResult,
  GoogleAuthProvider,
  sendEmailVerification,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  updateProfile,
  verifyPasswordResetCode,
  type Auth,
  type User,
} from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocFromServer,
  getFirestore,
  initializeFirestore,
  onSnapshot,
  persistentLocalCache,
  persistentMultipleTabManager,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Firestore,
  type Unsubscribe,
} from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";
import type { MealSlot } from "./domain/mess-ops";

export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  };
}

let cachedApp: FirebaseApp | null = null;
let cachedDb: Firestore | null = null;
let cachedAuth: Auth | null = null;
let lastSuccessfulWriteIso: string | null = null;

export function recordLastWriteSuccess(): string {
  lastSuccessfulWriteIso = new Date().toISOString();
  return lastSuccessfulWriteIso;
}

export function getLastSuccessfulWriteIso(): string | null {
  return lastSuccessfulWriteIso;
}

export function getFirebaseApp(): FirebaseApp {
  if (!cachedApp) {
    cachedApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  }
  return cachedApp;
}

export function getFirebaseDb(): Firestore {
  if (!cachedDb) {
    const app = getFirebaseApp();
    if (typeof window !== "undefined") {
      try {
        cachedDb = initializeFirestore(
          app,
          {
            localCache: persistentLocalCache({
              tabManager: persistentMultipleTabManager(),
            }),
          },
          firebaseConfig.firestoreDatabaseId,
        );
      } catch {
        cachedDb = getFirestore(app, firebaseConfig.firestoreDatabaseId);
      }
    } else {
      cachedDb = getFirestore(app, firebaseConfig.firestoreDatabaseId);
    }
  }
  return cachedDb;
}

export function getFirebaseAuth(): Auth {
  if (!cachedAuth) {
    cachedAuth = getAuth(getFirebaseApp());
  }
  return cachedAuth;
}

export function formatFirebaseAuthError(error: unknown): string {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: unknown }).code ?? "")
      : "";
  const message = error instanceof Error ? error.message : String(error ?? "");
  const host = typeof window !== "undefined" ? window.location.hostname : "this domain";

  if (code === "auth/unauthorized-domain" || message.includes("auth/unauthorized-domain")) {
    return `Domain "${host}" is not authorized for Firebase sign-in. In Firebase Console -> Authentication -> Settings -> Authorized domains, add "${host}".`;
  }
  if (code === "auth/operation-not-allowed" || message.includes("operation-not-allowed")) {
    return "This sign-in method is not enabled yet. In Firebase Console -> Authentication -> Sign-in method, enable Email/Password and Google.";
  }
  if (code === "auth/popup-blocked") {
    return "Popup was blocked by the browser. Redirecting to Google sign-in...";
  }
  if (code === "auth/popup-closed-by-user") {
    return "Google sign-in popup was closed before completing.";
  }
  if (code === "auth/user-not-found") {
    return "No account was found with that email address.";
  }
  if (code === "auth/wrong-password" || code === "auth/invalid-credential") {
    return "Incorrect email or password. Check your credentials or use Forgot password.";
  }
  if (code === "auth/email-already-in-use") {
    return "An account already exists with this email. Please sign in instead.";
  }
  if (code === "auth/weak-password") {
    return "Password is too weak. Use at least 8 characters.";
  }
  if (code === "auth/invalid-email") {
    return "Please enter a valid email address.";
  }
  if (code === "auth/too-many-requests") {
    return "Too many requests from this device. Please wait a few minutes and try again.";
  }
  if (code === "auth/network-request-failed") {
    return "Network error while contacting Firebase Authentication. Check your connection.";
  }
  return message || "Authentication failed. Please try again.";
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null,
): never {
  const auth = getFirebaseAuth();
  const currentUser = auth.currentUser;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentUser?.uid,
      email: currentUser?.email,
      emailVerified: currentUser?.emailVerified,
      isAnonymous: currentUser?.isAnonymous,
      tenantId: currentUser?.tenantId,
      providerInfo:
        currentUser?.providerData.map((provider) => ({
          providerId: provider.providerId,
          displayName: provider.displayName,
          email: provider.email,
          photoUrl: provider.photoURL,
        })) ?? [],
    },
    operationType,
    path,
  };
  const serialized = JSON.stringify(errInfo);
  console.error("Firestore Error:", serialized);
  throw new Error(serialized);
}

export async function testFirestoreConnection(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    await getDocFromServer(doc(getFirebaseDb(), "test", "connection"));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.error("Please check your Firebase configuration.");
    }
    return false;
  }
}

export async function applyAuthPersistence(rememberBrowser: boolean): Promise<void> {
  if (typeof window === "undefined") return;
  const auth = getFirebaseAuth();
  await setPersistence(auth, rememberBrowser ? browserLocalPersistence : browserSessionPersistence);
}

export async function signInWithGooglePopup(rememberBrowser = true): Promise<User> {
  const auth = getFirebaseAuth();
  await applyAuthPersistence(rememberBrowser);
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  try {
    const cred = await signInWithPopup(auth, provider);
    return cred.user;
  } catch (error) {
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? String((error as { code?: unknown }).code ?? "")
        : "";
    if (code === "auth/popup-blocked") {
      await signInWithRedirect(auth, provider);
      throw new Error("Redirecting to Google sign-in...");
    }
    throw error;
  }
}

export async function consumeGoogleRedirectResult(): Promise<User | null> {
  if (typeof window === "undefined") return null;
  try {
    const result = await getRedirectResult(getFirebaseAuth());
    return result?.user ?? null;
  } catch (error) {
    console.warn("[auth] getRedirectResult:", formatFirebaseAuthError(error));
    return null;
  }
}

export async function signUpWithEmailPassword(params: {
  name: string;
  email: string;
  password: string;
}): Promise<User> {
  const auth = getFirebaseAuth();
  await applyAuthPersistence(true);
  const cred = await createUserWithEmailAndPassword(auth, params.email, params.password);
  if (params.name.trim()) {
    await updateProfile(cred.user, { displayName: params.name.trim() });
  }
  await sendEmailVerification(cred.user);
  return cred.user;
}

export async function signInWithEmailPassword(params: {
  email: string;
  password: string;
  rememberBrowser: boolean;
}): Promise<User> {
  const auth = getFirebaseAuth();
  await applyAuthPersistence(params.rememberBrowser);
  const cred = await signInWithEmailAndPassword(auth, params.email, params.password);
  return cred.user;
}

export async function resendVerificationForCurrentUser(): Promise<void> {
  const auth = getFirebaseAuth();
  if (!auth.currentUser) {
    throw new Error("Please sign in first to resend your verification email.");
  }
  await sendEmailVerification(auth.currentUser);
}

export async function sendFirebasePasswordReset(email: string): Promise<void> {
  const auth = getFirebaseAuth();
  await sendPasswordResetEmail(auth, email.trim().toLowerCase());
}

export async function verifyAndConfirmPasswordReset(
  oobCode: string,
  newPassword: string,
): Promise<void> {
  const auth = getFirebaseAuth();
  await verifyPasswordResetCode(auth, oobCode);
  await confirmPasswordReset(auth, oobCode, newPassword);
}

export async function signOutFirebaseUser(): Promise<void> {
  await signOut(getFirebaseAuth());
}

function sanitizeId(raw: string, fallback = "doc"): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 96);
  return cleaned.length > 0 ? cleaned : fallback;
}

export async function ensureUserProfile(user: User): Promise<void> {
  if (!user.emailVerified) return;
  const db = getFirebaseDb();
  const profileRef = doc(db, "users", user.uid);
  const displayName = (
    user.displayName?.trim() ||
    user.email?.split("@")[0] ||
    "Mess Member"
  ).slice(0, 120);
  const email = (user.email || "member@foodflow.in").trim().toLowerCase().slice(0, 160);
  const photo = (user.photoURL || "").slice(0, 500);

  try {
    const existing = await getDoc(profileRef);
    if (!existing.exists()) {
      await setDoc(profileRef, {
        uid: user.uid,
        name: displayName,
        email,
        photo,
        defaultWorkspaceId: null,
        language: "en",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      recordLastWriteSuccess();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
  }
}

export interface MealSkipDoc {
  id: string;
  userId: string;
  studentCode: string;
  serviceDate: string;
  mealType: MealSlot;
  status: "booked" | "skipped" | "locked";
  guestCount: number;
  note?: string;
}

export async function upsertMealSkipRecord(params: {
  userId: string;
  studentCode: string;
  serviceDate: string;
  mealType: MealSlot;
  status: "booked" | "skipped";
  guestCount: number;
  note?: string;
}): Promise<void> {
  const db = getFirebaseDb();
  const docId = sanitizeId(`${params.userId}_${params.serviceDate}_${params.mealType}`);
  const path = `meal_skips/${docId}`;
  const ref = doc(db, "meal_skips", docId);
  const safeStudentCode = sanitizeId(params.studentCode, "STU001").slice(0, 32);
  const safeGuestCount = Math.max(0, Math.min(5, Math.round(params.guestCount)));
  const cleanNote = params.note?.trim().slice(0, 240);

  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        userId: params.userId,
        studentCode: safeStudentCode,
        serviceDate: params.serviceDate,
        mealType: params.mealType,
        status: params.status,
        guestCount: safeGuestCount,
        ...(cleanNote ? { note: cleanNote } : {}),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        status: params.status,
        guestCount: safeGuestCount,
        ...(cleanNote !== undefined ? { note: cleanNote } : {}),
        updatedAt: serverTimestamp(),
      });
    }
    recordLastWriteSuccess();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function submitMealFeedbackRecord(params: {
  userId: string;
  mealType: MealSlot;
  serviceDate: string;
  rating: number;
  category: "taste" | "hygiene" | "portion" | "timing" | "other";
  comment: string;
}): Promise<void> {
  const db = getFirebaseDb();
  const docId = sanitizeId(
    `${params.userId}_${params.serviceDate}_${params.mealType}_${Date.now()}`,
  );
  const path = `meal_feedback/${docId}`;
  try {
    await setDoc(doc(db, "meal_feedback", docId), {
      userId: params.userId,
      mealType: params.mealType,
      serviceDate: params.serviceDate,
      rating: Math.max(1, Math.min(5, Math.round(params.rating))),
      category: params.category,
      comment: params.comment.trim().slice(0, 500),
      status: "open",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    recordLastWriteSuccess();
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export interface VoiceLogDoc {
  id: string;
  userId: string;
  category: "waste" | "inventory" | "feedback" | "general";
  transcript: string;
  summary?: string;
}

export async function saveVoiceLogRecord(params: {
  userId: string;
  category: "waste" | "inventory" | "feedback" | "general";
  transcript: string;
  summary?: string;
}): Promise<string> {
  const db = getFirebaseDb();
  const docId = sanitizeId(`${params.userId}_voice_${Date.now()}`);
  const path = `voice_logs/${docId}`;
  const transcript = params.transcript.trim().slice(0, 1500) || "Audio memo recorded";
  const summary = params.summary?.trim().slice(0, 400);

  try {
    await setDoc(doc(db, "voice_logs", docId), {
      userId: params.userId,
      category: params.category,
      transcript,
      ...(summary ? { summary } : {}),
      createdAt: serverTimestamp(),
    });
    recordLastWriteSuccess();
    return docId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export function subscribeToMyMealSkips(
  userId: string,
  onData: (rows: MealSkipDoc[]) => void,
): Unsubscribe {
  const q = query(collection(getFirebaseDb(), "meal_skips"), where("userId", "==", userId));
  return onSnapshot(
    q,
    (snapshot) => {
      const rows: MealSkipDoc[] = snapshot.docs.map((d) => {
        const raw = d.data() as Omit<MealSkipDoc, "id">;
        return { id: d.id, ...raw };
      });
      onData(rows);
    },
    (error) => {
      console.warn("Meal skips listener warning:", error.message);
    },
  );
}

export function subscribeToMyVoiceLogs(
  userId: string,
  onData: (rows: VoiceLogDoc[]) => void,
): Unsubscribe {
  const q = query(collection(getFirebaseDb(), "voice_logs"), where("userId", "==", userId));
  return onSnapshot(
    q,
    (snapshot) => {
      const rows: VoiceLogDoc[] = snapshot.docs.map((d) => {
        const raw = d.data() as Omit<VoiceLogDoc, "id">;
        return { id: d.id, ...raw };
      });
      onData(rows);
    },
    (error) => {
      console.warn("Voice logs listener warning:", error.message);
    },
  );
}
