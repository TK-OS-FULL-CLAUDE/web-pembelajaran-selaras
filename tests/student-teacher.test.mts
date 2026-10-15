import assert from "node:assert/strict";
import { auditLesson, conceptStats, csvCell, comparisonTokens } from "../src/lib/teacher-tools";
import { clearLearnerPreferences, enqueueEvent, flushEvents, outboxState, queuedEvents, type StudentEvent } from "../src/lib/student-outbox";
import { DEFAULT_PREFS, type QuizQuestion } from "../src/lib/types";
import { questionKey } from "../src/lib/quiz";
import { feedbackSections } from "../src/lib/feedback";

class MemoryStorage {
  data = new Map<string, string>();
  get length() { return this.data.size; }
  key(i: number) { return [...this.data.keys()][i] ?? null; }
  getItem(k: string) { return this.data.get(k) ?? null; }
  setItem(k: string, v: string) { this.data.set(k, v); }
  removeItem(k: string) { this.data.delete(k); }
}
const storage = new MemoryStorage();
Object.defineProperty(globalThis, "localStorage", { value: storage, configurable: true });
Object.defineProperty(globalThis, "window", { value: new EventTarget(), configurable: true });
let passed = 0;
async function test(name: string, run: () => void | Promise<void>) { await run(); passed++; console.log(`  ✓ ${name}`); }

await test("Pergantian siswa menghapus seluruh preferensi/sesi lama tetapi menjaga antrean hasil", () => {
  ["selaras:prefs", "selaras:prefs:ABC234", "selaras:sesi:ABC234", "selaras:nama", "selaras:garis", "selaras:kiriman:keep", "selaras:perangkat"].forEach((k) => storage.setItem(k, "test"));
  clearLearnerPreferences(storage);
  assert.deepEqual([...storage.data.keys()].sort(), ["selaras:kiriman:keep", "selaras:perangkat"]);
  storage.data.clear();
});
const event = (id: string, session: string): StudentEvent => ({ eventId: id, occurredAt: new Date().toISOString(), code: "ABC234", sessionId: session, kind: "quiz", alias: "A", prefs: { ...DEFAULT_PREFS }, score: 1, total: 2 });
await test("Koneksi gagal: hasil dua siswa tetap terpisah dan tidak berubah saat preferensi diganti", async () => {
  globalThis.fetch = async () => { throw new Error("offline"); };
  const a = event("event-0001", "student-0001");
  enqueueEvent(a); enqueueEvent(event("event-0002", "student-0002"));
  a.alias = "BERUBAH"; a.prefs.besar = true;
  await flushEvents();
  assert.equal(outboxState().pending, 2);
  assert.equal(outboxState().volatile, false);
  const queued = queuedEvents();
  assert.equal(queued[0].alias, "A"); assert.equal(queued[0].prefs.besar, false);
  assert.equal(new Set(queued.map((e) => e.sessionId)).size, 2);
});
await test("Respons server gagal tidak dianggap tersimpan; pengiriman ulang memakai eventId yang sama", async () => {
  globalThis.fetch = async () => new Response("error", { status: 503 });
  await flushEvents(); assert.equal(outboxState().pending, 2);
  const ids: string[] = [];
  globalThis.fetch = async (_url, init) => { ids.push(JSON.parse(init!.body as string).eventId); return new Response("{}"); };
  await Promise.all([flushEvents(), flushEvents()]);
  assert.deepEqual(ids.sort(), ["event-0001", "event-0002"]); assert.equal(outboxState().pending, 0);
});
await test("Penyimpanan perangkat ditolak: status belum aman sampai server menerima", async () => {
  globalThis.fetch = async () => { throw new Error("offline"); };
  const original = storage.setItem;
  storage.setItem = () => { throw new Error("quota"); };
  enqueueEvent(event("event-0003", "student-0003")); await flushEvents();
  assert.equal(outboxState().volatile, true);
  storage.setItem = original;
  globalThis.fetch = async () => new Response("{}"); await flushEvents();
  assert.equal(outboxState().pending, 0);
});
await test("Rekap konsep membedakan jumlah sesi dari jumlah jawaban dan mengabaikan soal lama", () => {
  const a: QuizQuestion = { q: "Pertanyaan A", concept: "Pecahan", options: ["a", "b"], answer: 0, explain: "a" };
  const b = { ...a, q: "Pertanyaan B", concept: "pecahan" };
  const rows = conceptStats([a, b], [
    { session_id: "s1", detail: [{ k: questionKey(a), b: true }, { k: questionKey(b), b: false }, { k: "old", b: true }] },
    { session_id: "s2", detail: [{ k: questionKey(a), b: true }] },
  ]);
  assert.equal(rows.length, 1); assert.equal(rows[0].sessions, 2); assert.equal(rows[0].answers, 3); assert.equal(rows[0].pct, 67);
});
await test("CSV mengamankan rumus spreadsheet dan kutip/newline", () => {
  assert.equal(csvCell("=SUM(A1)"), '"\'=SUM(A1)"');
  assert.equal(csvCell(" @SUM(A1)"), '"\' @SUM(A1)"');
  assert.equal(csvCell('a,"b"\nc'), '"a,""b""\nc"');
});
await test("Audit menemukan judul melompat, istilah tanpa arti dan instruksi suara", () => {
  const issues = auditLesson({ body: "## Judul\n#### Langsung jauh\n**Klorofil** membantu tumbuhan.", glossary: [], versions: {}, figures: {},
    quiz: [{ q: "Dengarkan suara ini", options: ["a", "b"], answer: 0, explain: "" }] });
  assert.ok(issues.some((i) => i.message.includes("melompat")));
  assert.ok(issues.some((i) => i.message.includes("Klorofil")));
  assert.ok(issues.some((i) => i.message.includes("alternatif tertulis")));
});
await test("Pembanding menandai perubahan urutan, bukan hanya kata baru", () => {
  assert.equal(comparisonTokens("A\nB", "A\nB").some((t) => t.changed), false);
  assert.ok(comparisonTokens("A\nB", "B\nA").some((t) => t.changed));
  assert.ok(comparisonTokens("air menyerap akar", "akar menyerap air").some((t) => t.changed));
});
await test("Bagian belum paham mengikuti judul versi bacaan dan menghapus duplikasi", () => {
  assert.deepEqual(feedbackSections("Tanpa judul bagian."), ["Materi secara keseluruhan"]);
  assert.deepEqual(feedbackSections("## Pecahan\nIsi.\n## Pecahan\nIsi lain.\n### Membandingkan"),
    ["Materi secara keseluruhan", "Pecahan", "Membandingkan"]);
});
await test("Laporan belum paham tetap terikat kelas/siswa lama setelah Ganti siswa saat offline", async () => {
  globalThis.fetch = async () => { throw new Error("offline"); };
  const report: StudentEvent = { ...event("feedback-offline", "student-before"), kind: "confused", code: "KELASB",
    feedback: { section: "Pecahan", revision: 3 } };
  enqueueEvent(report); await flushEvents(); clearLearnerPreferences(storage);
  report.code = "KELASC"; report.feedback!.section = "Diubah";
  const pending = queuedEvents()[0];
  assert.equal(pending.code, "KELASB"); assert.equal(pending.sessionId, "student-before");
  assert.deepEqual(pending.feedback, { section: "Pecahan", revision: 3 });
  globalThis.fetch = async () => new Response("{}"); await flushEvents();
  assert.equal(outboxState().pending, 0);
});
console.log(`${passed} pengujian siswa dan guru lulus.`);
