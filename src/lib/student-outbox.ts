import type { StudentPrefs } from "./types";

export type StudentEvent = {
  eventId: string;
  occurredAt: string;
  code: string;
  sessionId: string;
  kind: "open" | "quiz";
  alias: string | null;
  prefs: StudentPrefs;
  score?: number;
  total?: number;
  durasi?: number;
  detail?: { k: string; b: boolean; j?: string; h?: number }[];
};
const PREFIX = "selaras:kiriman:";
const memory = new Map<string, StudentEvent>();
let running: Promise<void> | null = null;
export const OUTBOX_CHANGED = "selaras-kiriman-berubah";
function notify() { window.dispatchEvent(new Event(OUTBOX_CHANGED)); }

export function queuedEvents(): StudentEvent[] {
  const all = new Map(memory);
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(PREFIX)) continue;
      try {
        const value = JSON.parse(localStorage.getItem(key) || "null") as StudentEvent | null;
        if (value?.eventId && value.sessionId && /^[A-Za-z0-9]{4,12}$/.test(value.code)) all.set(value.eventId, value);
      } catch { /* Satu entri rusak tidak menghalangi kiriman lain. */ }
    }
  } catch { /* Mode penyimpanan terbatas: antrean tetap hidup selama halaman terbuka. */ }
  return [...all.values()].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
}

export function outboxState() {
  const events = queuedEvents();
  return { pending: events.length, volatile: events.some((e) => {
    try { return !localStorage.getItem(PREFIX + e.eventId); } catch { return true; }
  }) };
}

export function enqueueEvent(event: StudentEvent) {
  // Snapshot tidak ikut berubah ketika siswa berikutnya mengganti nama/pilihan.
  const snapshot: StudentEvent = JSON.parse(JSON.stringify(event));
  memory.set(event.eventId, snapshot);
  try { localStorage.setItem(PREFIX + event.eventId, JSON.stringify(snapshot)); } catch { /* Lihat status volatile. */ }
  notify();
  void flushEvents();
}

export function flushEvents(): Promise<void> {
  if (running) return running;
  running = (async () => {
    for (const event of queuedEvents()) {
      try {
        const response = await fetch(`/api/s/${event.code}/catat`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(event), signal: AbortSignal.timeout(12000),
        });
        if (!response.ok) continue;
        try { localStorage.removeItem(PREFIX + event.eventId); } catch { /* Retrying uses the same id. */ }
        memory.delete(event.eventId);
      } catch { break; }
    }
  })().finally(() => { running = null; notify(); });
  return running;
}

export function clearLearnerPreferences(storage: Pick<Storage, "length" | "key" | "removeItem">) {
  const keys: string[] = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key && (key.startsWith("selaras:prefs") || key.startsWith("selaras:sesi:") ||
      key === "selaras:nama" || key === "selaras:garis")) keys.push(key);
  }
  keys.forEach((key) => storage.removeItem(key));
  // Antrean hasil siswa sebelumnya sengaja dipertahankan.
}
