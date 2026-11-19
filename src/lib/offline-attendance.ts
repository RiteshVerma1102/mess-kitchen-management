/**
 * FoodFlow Pro Max - Offline Attendance Engine
 * IndexedDB offline queue + local fallback + auto-sync for mess counters.
 */

export interface QueuedAttendance {
  clientUuid: string;
  studentId: string;
  studentCode: string;
  studentName?: string;
  hallId: string;
  serviceDate: string;
  mealType: "breakfast" | "lunch" | "snacks" | "dinner";
  method: "qr" | "manual" | "bulk";
  operatorId?: string;
  clientTimestamp: string;
  status: "pending" | "synced" | "failed";
  error?: string;
  queuedAt: string;
}

export interface SyncReport {
  success: boolean;
  totalAttempted: number;
  syncedCount: number;
  duplicateCount: number;
  failedCount: number;
  errors: string[];
}

const DB_NAME = "foodflow_attendance_offline";
const DB_VERSION = 1;
const STORE_NAME = "queued_scans";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB is not available in this environment"));
      return;
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "clientUuid" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function queueAttendance(record: QueuedAttendance): Promise<void> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(record);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // LocalStorage fallback
    try {
      const stored = localStorage.getItem("foodflow_offline_scans") || "[]";
      const list: QueuedAttendance[] = JSON.parse(stored);
      const filtered = list.filter((r) => r.clientUuid !== record.clientUuid);
      filtered.push(record);
      localStorage.setItem("foodflow_offline_scans", JSON.stringify(filtered));
    } catch {
      // ignore
    }
  }
}

export async function getPendingAttendanceQueue(): Promise<QueuedAttendance[]> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    try {
      const stored = localStorage.getItem("foodflow_offline_scans") || "[]";
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }
}

export async function removeSyncedAttendance(clientUuids: string[]): Promise<void> {
  if (!clientUuids.length) return;
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      clientUuids.forEach((id) => store.delete(id));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    try {
      const stored = localStorage.getItem("foodflow_offline_scans") || "[]";
      const list: QueuedAttendance[] = JSON.parse(stored);
      const filtered = list.filter((r) => !clientUuids.includes(r.clientUuid));
      localStorage.setItem("foodflow_offline_scans", JSON.stringify(filtered));
    } catch {
      // ignore
    }
  }
}
