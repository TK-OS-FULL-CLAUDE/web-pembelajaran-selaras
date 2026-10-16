"use client";

// Pemeriksa kesetiaan draf: (1) tanpa AI, angka di draf yang tidak ada di sumber langsung ditandai;
// (2) dengan AI kedua, kalimat yang menambah fakta, mengubah angka/makna, atau menghilangkan gagasan penting
// ditandai dengan kutipan persis, supaya guru cukup membaca bagian itu.

import { CircleAlert, ShieldCheck, TriangleAlert } from "lucide-react";
import { useState } from "react";
import type { Finding, FindingKind } from "@/lib/ai-kelas";
import { api } from "@/lib/client";
import { newNumbers } from "@/lib/matematika";
import { fingerprint } from "@/lib/text";
import { InlineText } from "../../reader-text";
import { Badge, Button, Spinner } from "../../ui";
import { useToast } from "../../toast";

const KIND_LABEL: Record<FindingKind, string> = {
  fakta_baru: "Fakta baru",
  angka: "Angka",
  makna_berubah: "Makna berubah",
  hilang: "Hilang dari draf",
};

export function FaithfulnessCheck({
  lessonId,
  target,
  draft,
  source,
  sourceLabel = "materi asli",
  aiOn,
  checkNumbers = true,
}: {
  lessonId: string;
  target: string;
  draft: string;
  source: string;
  sourceLabel?: string;
  aiOn: boolean;
  /** Perangkat ajar boleh memuat angka baru (menit, nomor soal latihan), jadi pemeriksaan angka dimatikan. */
  checkNumbers?: boolean;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ print: string; findings: Finding[] } | null>(null);
  const added = checkNumbers && draft.trim() ? newNumbers(source, draft) : [];
  const stale = !!result && result.print !== fingerprint(draft);

  async function run() {
    setBusy(true);
    try {
      const res = await api<{ findings: Finding[] }>("/api/ai/periksa", {
        method: "POST",
        body: { lessonId, target, draft, source },
      });
      setResult({ print: fingerprint(draft), findings: res.findings });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!draft.trim()) return null;
  return (
    <div className="mt-3 space-y-2">
      {added.length > 0 && (
        <p className="flex gap-2 rounded-xl bg-aksen-50 px-3 py-2 text-[14px] text-aksen">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            Angka yang tidak ada di {sourceLabel}: <strong>{added.slice(0, 8).join(", ")}</strong>. Pastikan angka ini
            benar.
          </span>
        </p>
      )}
      {aiOn && (
        <Button variant="secondary" size="sm" onClick={run} disabled={busy || draft.trim().length < 20}>
          {busy ? <Spinner /> : <ShieldCheck className="size-4" aria-hidden />}
          {busy ? "Memeriksa…" : result ? "Periksa ulang kesetiaan" : "Periksa kesetiaan dengan AI"}
        </Button>
      )}
      {result && (
        <div role="status" className="rounded-xl surface-card bg-kertas px-3 py-2 text-[14px]">
          {stale && <p className="mb-1 font-bold text-aksen">Teks berubah sejak diperiksa. Periksa ulang bila perlu.</p>}
          {result.findings.length === 0 ? (
            <p className="flex gap-2 text-berhasil">
              <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
              Tidak ada bagian yang ditandai. Pemeriksaan AI bisa melewatkan sesuatu, jadi tetap baca sekilas sebelum
              menandai sudah dicek.
            </p>
          ) : (
            <>
              <p className="flex gap-2 font-bold text-tinta">
                <CircleAlert className="mt-0.5 size-4 shrink-0 text-aksen" aria-hidden />
                {result.findings.length} bagian perlu Anda baca:
              </p>
              <ul className="mt-2 space-y-2">
                {result.findings.map((f, i) => (
                  <li key={i} className="rounded-lg bg-white px-3 py-2">
                    <Badge tone={f.jenis === "hilang" ? "info" : "aksen"}>{KIND_LABEL[f.jenis]}</Badge>{" "}
                    <q className="font-bold">
                      <InlineText text={f.kutipan} />
                    </q>
                    <span className="block text-tinta-2">
                      <InlineText text={f.penjelasan} />
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
