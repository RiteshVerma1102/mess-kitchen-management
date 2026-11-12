'use client';

export interface QueuedAttendance {
  clientUuid: string;
  studentRef: string;
  studentName?: string;
  messHallId: string;
  serviceDate: string;
  mealType: 'breakfast' | 'lunch' | 'snacks' | 'dinner';
  method: 'qr' | 'rfid' | 'manual';
  deviceId: string;
  clientTimestamp: string;
  status: 'pending' | 'failed' | 'synced';
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

const DB_NAME = 'smart_mess_attendance_db';
const DB_VERSION = 1;
const STORE_NAME = 'pending_scans';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported in this environment'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'clientUuid' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function queueAttendanceRecord(record: QueuedAttendance): Promise<void> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(record);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // LocalStorage fallback if IndexedDB fails or restricted
    try {
      const existingStr = localStorage.getItem('smartmess_pending_scans') || '[]';
      const existing: QueuedAttendance[] = JSON.parse(existingStr);
      const filtered = existing.filter((r) => r.clientUuid !== record.clientUuid);
      filtered.push(record);
      localStorage.setItem('smartmess_pending_scans', JSON.stringify(filtered));
    } catch {
      // ignore
    }
  }
}

export async function getPendingAttendanceQueue(): Promise<QueuedAttendance[]> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    try {
      const existingStr = localStorage.getItem('smartmess_pending_scans') || '[]';
      return JSON.parse(existingStr);
    } catch {
      return [];
    }
  }
}

export async function removeSyncedAttendance(clientUuids: string[]): Promise<void> {
  if (clientUuids.length === 0) return;
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      clientUuids.forEach((id) => store.delete(id));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    try {
      const existingStr = localStorage.getItem('smartmess_pending_scans') || '[]';
      const existing: QueuedAttendance[] = JSON.parse(existingStr);
      const filtered = existing.filter((r) => !clientUuids.includes(r.clientUuid));
      localStorage.setItem('smartmess_pending_scans', JSON.stringify(filtered));
    } catch {
      // ignore
    }
  }
}

export async function markAttendanceFailed(clientUuid: string, errorMsg: string): Promise<void> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const getReq = store.get(clientUuid);
      getReq.onsuccess = () => {
        const item: QueuedAttendance | undefined = getReq.result;
        if (item) {
          item.status = 'failed';
          item.error = errorMsg;
          store.put(item);
        }
        resolve();
      };
      getReq.onerror = () => reject(getReq.error);
    });
  } catch {
    // fallback
  }
}

export async function syncPendingAttendance(): Promise<SyncReport> {
  const pending = await getPendingAttendanceQueue();
  if (pending.length === 0) {
    return {
      success: true,
      totalAttempted: 0,
      syncedCount: 0,
      duplicateCount: 0,
      failedCount: 0,
      errors: [],
    };
  }

  // Format payload for sync endpoint
  const payloadRecords = pending.map((p) => ({
    clientUuid: p.clientUuid,
    studentRef: p.studentRef,
    messHallId: p.messHallId,
    serviceDate: p.serviceDate,
    mealType: p.mealType,
    method: p.method,
    deviceId: p.deviceId,
    clientTimestamp: p.clientTimestamp,
  }));

  try {
    const res = await fetch('/api/v1/attendance/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ records: payloadRecords }),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      const msg = errBody?.error?.message ?? 'Sync endpoint returned error';
      return {
        success: false,
        totalAttempted: pending.length,
        syncedCount: 0,
        duplicateCount: 0,
        failedCount: pending.length,
        errors: [msg],
      };
    }

    const body = await res.json();
    const data = body.data;

    const toRemoveIds: string[] = [];
    const errors: string[] = [];

    for (const r of data.results || []) {
      if (r.status === 'synced' || r.status === 'duplicate') {
        toRemoveIds.push(r.clientUuid);
      } else if (r.status === 'failed') {
        await markAttendanceFailed(r.clientUuid, r.error || 'Server rejected');
        if (r.error) errors.push(r.error);
      }
    }

    await removeSyncedAttendance(toRemoveIds);

    return {
      success: true,
      totalAttempted: data.total,
      syncedCount: data.syncedCount,
      duplicateCount: data.duplicateCount,
      failedCount: data.failedCount,
      errors,
    };
  } catch (e) {
    return {
      success: false,
      totalAttempted: pending.length,
      syncedCount: 0,
      duplicateCount: 0,
      failedCount: pending.length,
      errors: [(e as Error).message || 'Network unreachable'],
    };
  }
}
