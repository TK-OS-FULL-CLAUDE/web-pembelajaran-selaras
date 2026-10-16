"use client";
import { useState } from "react";
import { api } from "@/lib/client";
import { VERSION_LABEL, type VersionKey, type LessonRow } from "@/lib/types";
import { Button, Card, Notice } from "../../ui";
type Revision = { revision: number; saved_at: string; title: string };
export function HistoryPanel({ lessonId, prepare, restored }: {
  lessonId: string; prepare: () => Promise<number>; restored: () => void;
}) {
  const [rows, setRows] = useState<Revision[] | null>(null);
  const [selected, setSelected] = useState<LessonRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function load() {
    setBusy(true); setError("");
    try {
      await prepare();
      setRows((await api<{ revisions: Revision[] }>(`/api/materi/${lessonId}/riwayat`)).revisions);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function preview(revision: number) {
    setBusy(true); setError("");
    try { setSelected((await api<{ snapshot: LessonRow }>(`/api/materi/${lessonId}/riwayat?revision=${revision}`)).snapshot); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function restore() {
    if (!selected || !window.confirm(`Pulihkan revisi ${selected.revision} sebagai draf perubahan? Siswa tetap melihat versi terbit sebelumnya sampai Anda menerbitkan perubahan.`)) return;
    setBusy(true); setError("");
    try {
      const baseRevision = await prepare();
      await api(`/api/materi/${lessonId}/riwayat`, { method: "POST", body: { revision: selected.revision, baseRevision } });
      restored();
    } catch (e) { setError((e as Error).message); setBusy(false); }
  }
  return <Card className="mt-5 p-5">
    <h2 className="text-lg font-bold">Riwayat revisi</h2>
    <p className="mt-1 text-sm text-tinta-2">Menyimpan hingga 50 revisi sebelumnya sejak fitur ini aktif. Pemulihan membuat draf baru; hasil kuis yang sudah tercatat tetap tersimpan.</p>
    <Button className="mt-3" variant="secondary" disabled={busy} onClick={load}>{busy ? "Memuat…" : "Muat riwayat"}</Button>
    {error && <Notice tone="error" className="mt-3">{error}</Notice>}
    {rows?.length === 0 && <p className="mt-3">Belum ada revisi sebelumnya. Riwayat terbentuk setelah materi disimpan ulang.</p>}
    {!!rows?.length && <div className="mt-4 grid gap-4 md:grid-cols-[15rem_1fr]">
      <ul className="max-h-80 space-y-2 overflow-y-auto">{rows.map((r) => <li key={r.revision}>
        <button type="button" disabled={busy} onClick={() => preview(r.revision)} aria-pressed={selected?.revision === r.revision}
          className="w-full rounded-xl border border-batas p-3 text-left hover:bg-papan-50 aria-pressed:bg-papan-50">
          <strong>Revisi {r.revision}</strong><span className="block text-sm">{new Date(r.saved_at).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} WIB</span>
        </button>
      </li>)}</ul>
      {selected && <div><h3 className="font-bold">{selected.title}</h3>
        <p className="text-sm">{selected.subject} · {selected.quiz.length} soal · {Object.keys(selected.versions).length} versi</p>
        <pre className="my-3 max-h-72 overflow-auto whitespace-pre-wrap rounded-xl bg-kertas p-3 font-sans text-sm">{selected.body}</pre>
        <details className="mb-4 rounded-xl border border-garis p-3"><summary className="cursor-pointer font-bold">Lihat versi, kuis, glosarium, dan kategori yang dipulihkan</summary>
          <div className="mt-3 max-h-80 space-y-4 overflow-auto text-sm">
            <p>Topik: {selected.topic || "Belum diisi"} · Jenjang: {selected.target_grade || "Mengikuti kelas"} · {selected.is_template ? "Templat" : "Materi biasa"}</p>
            {Object.entries(selected.versions).map(([key, version]) => <section key={key}><h4 className="font-bold">{VERSION_LABEL[key as VersionKey]}</h4><p className="whitespace-pre-wrap">{version?.text}</p></section>)}
            <section><h4 className="font-bold">Glosarium</h4><ul>{selected.glossary.map((g, i) => <li key={i}><strong>{g.kata}:</strong> {g.arti}</li>)}</ul></section>
            <section><h4 className="font-bold">Kuis</h4><ol className="list-inside list-decimal space-y-3">{selected.quiz.map((q, i) => <li key={i}><strong>{q.q}</strong>
              <p>Konsep: {q.concept || "Belum diisi"}</p><p>Pilihan: {q.options.filter(Boolean).join(" / ") || "Isian atau pasangan"}</p>
              <p>Kunci: {q.type === "isian" ? q.accepted?.join(" / ") : q.type === "jodoh" ? q.pairs?.map((p) => `${p.kiri} → ${p.kanan}`).join("; ") : q.type === "pgk" ? q.answers?.map((a) => q.options[a]).join(" / ") : q.options[q.answer]}</p>
              <p>Pembahasan: {q.explain}</p></li>)}</ol></section>
            <section><h4 className="font-bold">Deskripsi gambar</h4><ul>{Object.values(selected.figures ?? {}).map((f, i) => <li key={i}>{f.alt || "Belum diisi"}</li>)}</ul></section>
          </div>
        </details>
        <Button disabled={busy} onClick={restore}>Pulihkan revisi {selected.revision} sebagai draf</Button>
      </div>}
    </div>}
  </Card>;
}
