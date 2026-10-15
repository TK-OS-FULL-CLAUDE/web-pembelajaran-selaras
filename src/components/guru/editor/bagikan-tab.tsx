"use client";

// Peran 2: review → terbit → link + QR.

import { Check, Copy, Download, ExternalLink, Maximize2, Presentation, Send, Undo2, X } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { questionProblem } from "@/lib/quiz";
import { figureIds } from "@/lib/text";
import { Button, Card, Notice, Spinner, buttonClass } from "../../ui";
import { useToast } from "../../toast";
import type { EditableLesson, TabKey } from "./lesson-editor";
import { AccessibilityCheck } from "./accessibility-check";
import { ClassSharing } from "./class-sharing";
import type { LessonAudience } from "@/lib/data";

export function BagikanTab({
  lessonId,
  lesson,
  status,
  shareCode,
  flush,
  onPublished,
  onUnpublished,
  goTo,
  onProjector,
  projectorBusy,
  classes, primaryClassId, hasDraft, onAudiences,
}: {
  lessonId: string;
  lesson: EditableLesson;
  status: "draft" | "published";
  shareCode: string | null;
  flush: () => Promise<number>;
  onPublished: (code: string, revision: number) => void;
  classes: { id: string; name: string }[];
  primaryClassId: string | null;
  hasDraft: boolean;
  onAudiences: (audiences: LessonAudience[]) => void;
  onUnpublished: () => void;
  goTo: (tab: TabKey) => void;
  onProjector: () => void;
  projectorBusy: boolean;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [bigQr, setBigQr] = useState(false);
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);
  const [classCode, setClassCode] = useState(shareCode);
  const activeCode = classCode ?? shareCode;

  useEffect(() => setOrigin(window.location.origin), []);
  const link = activeCode && origin ? `${origin}/s/${activeCode}` : "";

  useEffect(() => {
    let alive = true;
    setQr(null);
    if (!link) return;
    QRCode.toDataURL(link, {
      margin: 2,
      width: 640,
      errorCorrectionLevel: "M",
      color: { dark: "#000000", light: "#ffffff" },
    })
      .then((data) => { if (alive) setQr(data); })
      .catch(() => { if (alive) setQr(null); });
    return () => { alive = false; };
  }, [link]);

  const versions = Object.entries(lesson.versions).filter(([, v]) => v && v.text.trim());
  const unchecked = versions.filter(([, v]) => v && !v.checked).length;
  const figIds = [...new Set([lesson.body, ...versions.map(([, v]) => (v?.checked ? v.text : ""))].flatMap(figureIds))];
  const figUnchecked = figIds.filter(
    (id) => !lesson.figures[id]?.alt?.trim() || !lesson.figures[id]?.altChecked,
  ).length;
  const incomplete = lesson.quiz.filter((q) => questionProblem(q) !== null).length;
  const checks = [
    {
      ok: lesson.body.trim().length >= 20,
      label: "Materi asli terisi",
      fix: () => goTo("materi"),
      required: true,
    },
    {
      ok: unchecked === 0,
      label:
        versions.length === 0
          ? "Belum ada versi teks (siswa tetap bisa memakai huruf besar, kontras, spasi lega, dan dibacakan)"
          : unchecked === 0
            ? `${versions.length} versi sudah dicek`
            : `${unchecked} versi belum dicek`,
      fix: () => goTo("versi"),
      required: true,
    },
    {
      ok: figUnchecked === 0,
      label:
        figIds.length === 0
          ? "Tidak ada gambar"
          : figUnchecked === 0
            ? `${figIds.length} gambar punya deskripsi yang sudah dicek`
            : `${figUnchecked} gambar belum punya deskripsi yang dicek (untuk siswa tunanetra & low vision)`,
      fix: () => goTo("materi"),
      required: true,
    },
    {
      ok: lesson.quiz.length > 0 && incomplete === 0,
      label:
        lesson.quiz.length === 0
          ? "Belum ada kuis (boleh menyusul)"
          : incomplete
            ? `${incomplete} dari ${lesson.quiz.length} soal belum lengkap (tidak ditampilkan ke siswa)`
            : `${lesson.quiz.length} soal kuis`,
      fix: () => goTo("kuis"),
      required: false,
    },
  ];
  const ready = checks.every((c) => c.ok || !c.required);

  async function publish() {
    setBusy(true);
    try {
      const baseRevision = await flush();
      const res = await api<{ shareCode: string; publishedRevision: number }>(`/api/materi/${lessonId}/terbit`, { method: "POST", body: { baseRevision } });
      onPublished(res.shareCode, res.publishedRevision);
      toast.ok("Materi diterbitkan. Bagikan link atau QR ke siswa.");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function unpublish() {
    setBusy(true);
    try {
      await api(`/api/materi/${lessonId}/terbit`, { method: "DELETE" });
      onUnpublished();
      toast.ok("Materi ditarik. Link tidak bisa dibuka siswa sampai diterbitkan lagi.");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
      <Card className="p-5">
        <h2 className="font-display text-lg font-bold">Sebelum terbit</h2>
        <ul className="mt-4 space-y-3">
          {checks.map((c) => (
            <li key={c.label} className="flex items-start gap-3">
              <span
                className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full ${
                  c.ok ? "bg-berhasil text-white" : c.required ? "bg-aksen text-white" : "bg-slate-200 text-tinta-2"
                }`}
                aria-hidden
              >
                {c.ok ? <Check className="size-4" /> : "!"}
              </span>
              <span className="flex-1">
                {c.label}
                {!c.ok && (
                  <button type="button" onClick={c.fix} className="ml-2 font-bold text-papan-600 underline">
                    Perbaiki
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
        <AccessibilityCheck lesson={lesson} goTo={goTo} />
        {status === "draft" || hasDraft ? (
          <div className="mt-6">
            {status === "published" && <p className="mb-3 text-sm">Perubahan ini masih berupa draf. Siswa tetap melihat versi terbit sebelumnya.</p>}
            <Button size="lg" onClick={publish} disabled={!ready || busy}>
              {busy ? <Spinner /> : <Send className="size-5" aria-hidden />}
              {status === "published" ? "Terbitkan perubahan ke semua kelas" : "Terbitkan untuk siswa"}
            </Button>
            {!ready && <p className="mt-2 text-[14px] text-tinta-2">Lengkapi tanda seru oranye dulu.</p>}
          </div>
        ) : (
          <Notice tone="ok" className="mt-6" title="Sudah terbit">
            Siswa melihat versi terakhir yang diterbitkan. Perubahan berikutnya disimpan sebagai draf sampai Anda menerbitkannya.
          </Notice>
        )}
      </Card>

      <Card className="p-5">
        <h2 className="font-display text-lg font-bold">Bagikan ke siswa</h2>
        {status === "published" && shareCode ? (
          <div className="mt-4 space-y-4">
            <ClassSharing lessonId={lessonId} classes={classes} primaryClassId={primaryClassId}
              selectedCode={activeCode} onSelect={setClassCode} onLoaded={onAudiences} />
            {!activeCode && <p>Pilih kelas tujuan untuk mengaktifkan link siswa.</p>}
            <div hidden={!activeCode} className="space-y-4">
            <div className="latar-titik flex flex-col items-center gap-4 rounded-2xl border border-garis bg-papan-50/50 p-4 sm:flex-row sm:items-start">
              {qr ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qr} alt={`Kode QR menuju ${link}`} className="size-44 rounded-xl bg-white shadow-kartu" />
              ) : (
                <div className="size-44 animate-pulse rounded-lg bg-slate-200" />
              )}
              <div className="min-w-0 flex-1 space-y-2 text-center sm:text-left">
                <p className="text-[14px] text-tinta-2">Kode materi</p>
                <p className="font-display text-4xl font-extrabold tracking-[0.14em] text-papan">{activeCode}</p>
                <p className="break-all text-[15px]">{link}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(link);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  } catch {
                    toast.error("Tidak bisa menyalin otomatis. Salin link secara manual.");
                  }
                }}
              >
                {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
                {copied ? "Tersalin" : "Salin link"}
              </Button>
              <Button variant="secondary" onClick={() => setBigQr(true)} disabled={!qr}>
                <Maximize2 className="size-4" aria-hidden />
                Tampilkan QR besar
              </Button>
              {qr && (
                <a href={qr} download={`selaras-${activeCode}.png`} className={buttonClass("secondary")}>
                  <Download className="size-4" aria-hidden />
                  Unduh QR
                </a>
              )}
              <a href={`/s/${activeCode}`} target="_blank" rel="noreferrer" className={buttonClass("ghost")}>
                <ExternalLink className="size-4" aria-hidden />
                Buka sebagai siswa
              </a>
            </div>
            </div>
            <div className="border-t border-garis pt-4">
              <Button variant="danger" size="sm" onClick={unpublish} disabled={busy}>
                <Undo2 className="size-4" aria-hidden />
                Tarik dari siswa
              </Button>
            </div>
          </div>
        ) : (
          <p className="mt-4 text-tinta-2">Link dan QR muncul di sini setelah materi diterbitkan.</p>
        )}
      </Card>

      <section
        aria-labelledby="judul-proyektor"
        className="flex flex-col gap-4 rounded-[1.5rem] border-2 border-papan bg-papan-50 p-5 sm:flex-row sm:items-center lg:col-span-2"
      >
        <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-papan text-white" aria-hidden>
          <Presentation className="size-7" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="judul-proyektor" className="font-display text-lg font-bold">
            Mode proyektor
          </h2>
          <p className="mt-1 text-tinta-2">
            Untuk kelas yang siswanya tidak memakai HP: tampilkan materi ke seluruh kelas lewat proyektor atau TV.
            Huruf sangat besar, satu bagian per layar, bisa dibacakan, lalu kuis bersama dengan jawaban yang Anda buka.
            Tidak tercatat di rekap. Bisa dipakai walau materi belum terbit.
          </p>
        </div>
        <Button onClick={onProjector} disabled={projectorBusy} className="shrink-0">
          {projectorBusy ? <Spinner /> : <Presentation className="size-5" aria-hidden />}
          Buka mode proyektor
        </Button>
      </section>

      {bigQr && qr && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-white p-6"
          role="dialog"
          aria-modal="true"
          aria-label="QR besar untuk ditampilkan di proyektor"
          onKeyDown={(e) => e.key === "Escape" && setBigQr(false)}
        >
          <button
            type="button"
            autoFocus
            onClick={() => setBigQr(false)}
            className="absolute right-4 top-4 flex size-12 items-center justify-center rounded-full hover:bg-slate-100"
            aria-label="Tutup QR besar"
          >
            <X className="size-6" aria-hidden />
          </button>
          <p className="font-display text-3xl font-extrabold text-papan">{lesson.title}</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt={`Kode QR menuju ${link}`} className="aspect-square w-[min(70vh,80vw)]" />
          <p className="text-center text-2xl">
            Pindai QR, atau buka <strong>{origin.replace(/^https?:\/\//, "")}/s/</strong>
            <strong className="tracking-[0.12em] text-papan">{activeCode}</strong>
          </p>
        </div>
      )}
    </div>
  );
}
