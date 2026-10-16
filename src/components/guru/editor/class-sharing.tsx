"use client";

import { useEffect, useState } from "react";
import type { LessonAudience } from "@/lib/data";
import { api } from "@/lib/client";
import { Notice } from "../../ui";

export function ClassSharing({ lessonId, classes, primaryClassId, selectedCode, onSelect, onLoaded }: {
  lessonId: string;
  classes: { id: string; name: string }[];
  primaryClassId: string | null;
  selectedCode: string | null;
  onSelect: (code: string) => void;
  onLoaded: (audiences: LessonAudience[]) => void;
}) {
  const [rows, setRows] = useState<LessonAudience[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let alive = true;
    api<{ audiences: LessonAudience[] }>(`/api/materi/${lessonId}/kelas`)
      .then(({ audiences }) => { if (alive) {
        setRows(audiences); onLoaded(audiences);
        if (!audiences.some((a) => a.active && a.share_code === selectedCode)) onSelect(audiences.find((a) => a.active)?.share_code ?? "");
      } })
      .catch((e) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setBusy(false); });
    return () => { alive = false; };
  }, [lessonId, onLoaded]);
  async function toggle(classId: string, active: boolean) {
    setBusy(true); setError("");
    try {
      const { audiences } = await api<{ audiences: LessonAudience[] }>(`/api/materi/${lessonId}/kelas`, {
        method: "POST", body: { classId, active },
      });
      setRows(audiences); onLoaded(audiences);
      if (!audiences.some((a) => a.active && a.share_code === selectedCode)) {
        onSelect(audiences.find((a) => a.active)?.share_code ?? "");
      }
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  return <section className="mb-5 rounded-xl surface-card p-4">
    <h3 className="font-bold">Satu materi untuk beberapa kelas</h3>
    <p className="mt-1 text-sm text-tinta-2">Centang kelas tujuan. Setiap kelas mendapat kode sendiri dan rekap terpisah. Terbitkan perubahan sekali untuk memperbarui semua kelas.</p>
    <fieldset disabled={busy} className="mt-3 grid gap-2 sm:grid-cols-2">
      <legend className="sr-only">Kelas tujuan</legend>
      {classes.map((c) => <label key={c.id} className="flex min-h-11 items-center gap-2">
        <input type="checkbox" checked={c.id === primaryClassId || rows.some((a) => a.class_id === c.id && a.active)}
          disabled={c.id === primaryClassId} onChange={(e) => void toggle(c.id, e.target.checked)} />
        {c.name}{c.id === primaryClassId ? " (kelas asal)" : ""}
      </label>)}
    </fieldset>
    {!classes.length && <p className="mt-2 text-sm">Buat kelas dari menu Kelas untuk membagikan materi per kelas.</p>}
    {error && <Notice tone="error" className="mt-2">{error}</Notice>}
    <label className="mt-3 block font-bold">Tampilkan link dan QR untuk
      <select className="mt-1 min-h-11 w-full rounded-xl border border-batas bg-white px-3 font-normal"
        value={selectedCode ?? ""} onChange={(e) => onSelect(e.target.value)} disabled={busy}>
        {rows.filter((a) => a.active).map((a) => <option key={a.id} value={a.share_code}>{a.class_name || "Materi umum"} · {a.share_code}</option>)}
      </select>
    </label>
    <p className="mt-2 text-sm text-tinta-2">Melepas centang menonaktifkan link kelas itu; hasil belajar tetap tersimpan. Kode menentukan kelas rekap, bukan bukti identitas siswa.</p>
  </section>;
}
