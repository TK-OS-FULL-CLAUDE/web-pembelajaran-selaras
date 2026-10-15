"use client";

// Ambil materi dari foto halaman buku, PDF, atau Word. Semua diproses di browser guru;
// gambar dan diagram ikut diambil dan diunggah, lalu deskripsinya dicek guru di panel Gambar.

import { Camera, FileText, FileType2, Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import type { ImportResult } from "@/lib/impor/types";
import { Button, Spinner, cx } from "../ui";
import { useToast } from "../toast";

type Kind = "foto" | "pdf" | "word";

export function ImportPanel({
  lessonId,
  aiOn,
  onImported,
  compact = false,
}: {
  lessonId?: string | null;
  aiOn: boolean;
  onImported: (result: ImportResult) => void;
  compact?: boolean;
}) {
  const toast = useToast();
  const inputs = {
    foto: useRef<HTMLInputElement>(null),
    pdf: useRef<HTMLInputElement>(null),
    word: useRef<HTMLInputElement>(null),
  };
  const [busy, setBusy] = useState<Kind | null>(null);
  const [progress, setProgress] = useState<{ message: string; fraction?: number } | null>(null);
  const [pdf, setPdf] = useState<{ file: File; pages: number; from: number; to: number } | null>(null);
  const [notes, setNotes] = useState<string[]>([]);

  const onProgress = (message: string, fraction?: number) => setProgress({ message, fraction });

  async function run(kind: Kind, job: () => Promise<ImportResult>) {
    setBusy(kind);
    setNotes([]);
    try {
      const result = await job();
      onImported(result);
      setNotes(result.notes);
      toast.ok(
        kind === "foto"
          ? "Teks dari foto sudah masuk. Periksa dan rapikan sebelum dipakai."
          : `Isi ${kind === "pdf" ? "PDF" : "dokumen Word"} sudah masuk. Periksa dan rapikan sebelum dipakai.`,
      );
    } catch (err) {
      toast.error((err as Error).message || "Gagal mengimpor file.");
    } finally {
      setBusy(null);
      setProgress(null);
      Object.values(inputs).forEach((r) => r.current && (r.current.value = ""));
    }
  }

  async function onFile(kind: Kind, file: File | undefined) {
    if (!file) return;
    if (kind === "foto") {
      const { importPhoto } = await import("@/lib/impor/photo");
      return run("foto", () => importPhoto(file, { lessonId, onProgress }));
    }
    if (kind === "word") {
      const { importDocx } = await import("@/lib/impor/docx");
      return run("word", () => importDocx(file, { lessonId, onProgress }));
    }
    setBusy("pdf");
    setProgress({ message: "Membuka PDF…" });
    try {
      const { pdfPageCount } = await import("@/lib/impor/pdf");
      const pages = await pdfPageCount(file);
      setPdf({ file, pages, from: 1, to: Math.min(pages, 10) });
    } catch (err) {
      toast.error((err as Error).message || "PDF tidak bisa dibuka.");
    } finally {
      setBusy(null);
      setProgress(null);
    }
  }

  async function startPdf() {
    if (!pdf) return;
    const { importPdf } = await import("@/lib/impor/pdf");
    const job = pdf;
    setPdf(null);
    await run("pdf", () => importPdf(job.file, { lessonId, from: job.from, to: job.to, aiOn, onProgress }));
  }

  const pick = (kind: Kind) => inputs[kind].current?.click();

  return (
    <div className="space-y-3">
      <div className={cx("flex flex-wrap items-center gap-2", compact && "gap-1.5")}>
        {!compact && (
          <span className="mr-1 inline-flex items-center gap-1.5 text-[14px] font-bold text-tinta-2">
            <Upload className="size-4" aria-hidden />
            Ambil dari:
          </span>
        )}
        <Button
          variant="ai"
          size="sm"
          onClick={() => pick("foto")}
          disabled={!aiOn || busy !== null}
          title={aiOn ? undefined : "Butuh kunci AI"}
        >
          {busy === "foto" ? <Spinner /> : <Camera className="size-4" aria-hidden />}
          Foto halaman buku
        </Button>
        <Button variant="secondary" size="sm" onClick={() => pick("pdf")} disabled={busy !== null}>
          {busy === "pdf" ? <Spinner /> : <FileText className="size-4 text-mawar" aria-hidden />}
          PDF
        </Button>
        <Button variant="secondary" size="sm" onClick={() => pick("word")} disabled={busy !== null}>
          {busy === "word" ? <Spinner /> : <FileType2 className="size-4 text-biru" aria-hidden />}
          Word (.docx)
        </Button>
        <input
          ref={inputs.foto}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(e) => onFile("foto", e.target.files?.[0])}
        />
        <input
          ref={inputs.pdf}
          type="file"
          accept="application/pdf,.pdf"
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(e) => onFile("pdf", e.target.files?.[0])}
        />
        <input
          ref={inputs.word}
          type="file"
          accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.doc"
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(e) => onFile("word", e.target.files?.[0])}
        />
      </div>
      {!aiOn && !compact && (
        <p className="text-[13px] text-tinta-2">
          Foto halaman butuh ANTHROPIC_API_KEY atau GEMINI_API_KEY. PDF dan Word tetap bisa.
        </p>
      )}

      {pdf && (
        <div
          className="muncul rounded-2xl border border-garis bg-white p-4 shadow-kartu"
          role="group"
          aria-label="Pilih halaman PDF"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-bold">{pdf.file.name}</p>
              <p className="text-[14px] text-tinta-2">
                {pdf.pages} halaman. Pilih halaman yang dipakai (maks. 30 sekaligus).
              </p>
            </div>
            <button
              type="button"
              onClick={() => setPdf(null)}
              className="flex size-9 items-center justify-center rounded-lg hover:bg-slate-100"
              aria-label="Batal"
            >
              <X className="size-5" aria-hidden />
            </button>
          </div>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-[14px] font-bold">
              Dari halaman
              <input
                type="number"
                min={1}
                max={pdf.pages}
                value={pdf.from}
                onChange={(e) =>
                  setPdf({ ...pdf, from: Math.max(1, Math.min(pdf.pages, Number(e.target.value) || 1)) })
                }
                className="h-11 w-24 rounded-xl border border-batas px-3 text-[16px] font-normal"
              />
            </label>
            <label className="flex flex-col gap-1 text-[14px] font-bold">
              Sampai
              <input
                type="number"
                min={pdf.from}
                max={pdf.pages}
                value={pdf.to}
                onChange={(e) =>
                  setPdf({
                    ...pdf,
                    to: Math.max(pdf.from, Math.min(pdf.pages, pdf.from + 29, Number(e.target.value) || pdf.from)),
                  })
                }
                className="h-11 w-24 rounded-xl border border-batas px-3 text-[16px] font-normal"
              />
            </label>
            <Button onClick={startPdf}>
              <FileText className="size-4" aria-hidden />
              Ambil {pdf.to - pdf.from + 1} halaman
            </Button>
          </div>
        </div>
      )}

      {progress && (
        <div className="rounded-2xl border border-papan/20 bg-papan-50 p-3" role="status" aria-live="polite">
          <p className="flex items-center gap-2 text-[14px] font-bold text-papan">
            <Spinner />
            {progress.message}
          </p>
          {progress.fraction !== undefined && (
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white" aria-hidden>
              <div
                className="h-2 rounded-full bg-papan transition-[width]"
                style={{ width: `${Math.round(progress.fraction * 100)}%` }}
              />
            </div>
          )}
        </div>
      )}

      {notes.length > 0 && !busy && (
        <ul className="space-y-1 rounded-2xl border border-aksen/25 bg-aksen-50 p-3 text-[14px]">
          {notes.map((n, i) => (
            <li key={i}>{n}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
