"use client";

// Panel Gambar (tab Materi): setiap gambar/diagram di materi wajib punya deskripsi (alt text) yang dicek guru.
// Deskripsi ini dibacakan pembaca layar untuk siswa tunanetra, dan bisa dibuka siswa low vision.

import { Check, ImagePlus, Sparkles, Trash2, Upload, Wand2 } from "lucide-react";
import { useRef, useState } from "react";
import { api } from "@/lib/client";
import { uploadImageFile } from "@/lib/image";
import { FIGURE_LINE, figureIds, figureLine, wordCount } from "@/lib/text";

/** Baris gambar saat keterangan sedang diketik (spasi di akhir tidak dibuang supaya bisa mengetik antarkata). */
const editingLine = (id: string, caption: string) => `![${caption.replace(/[\[\]\n\r]+/g, " ")}](gambar:${id})`;
import type { LessonFigure } from "@/lib/types";
import { Badge, Button, Spinner, cx, inputClass } from "../../ui";
import { useToast } from "../../toast";
import type { EditableLesson, UpdateLesson } from "./lesson-editor";

const LEGACY = /^\[(gambar|diagram|foto|ilustrasi|tabel|grafik|peta)\s*:\s*(.+)\]$/i;

/** Keterangan gambar dari baris ![keterangan](gambar:ID) pertama di teks. */
function captionOf(text: string, id: string): string {
  for (const raw of text.split("\n")) {
    const m = raw.trim().match(FIGURE_LINE);
    if (m && m[2] === id) return m[1];
  }
  return "";
}

/** Teks di sekitar baris gambar, sebagai konteks untuk AI. */
function nearbyText(body: string, id: string): string {
  const lines = body.split("\n");
  const at = lines.findIndex((l) => l.includes(`(gambar:${id})`));
  if (at < 0) return "";
  return lines
    .slice(Math.max(0, at - 8), at + 8)
    .filter((l) => !FIGURE_LINE.test(l.trim()))
    .join("\n")
    .trim();
}

function replaceFigureLine(text: string, id: string, fn: (caption: string) => string | null): string {
  const out: string[] = [];
  for (const raw of text.split("\n")) {
    const m = raw.trim().match(FIGURE_LINE);
    if (m && m[2] === id) {
      const next = fn(m[1]);
      if (next !== null) out.push(next);
    } else out.push(raw);
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n");
}

export function FiguresPanel({
  lessonId,
  lesson,
  update,
  aiOn,
  onInsert,
}: {
  lessonId: string;
  lesson: EditableLesson;
  update: UpdateLesson;
  aiOn: boolean;
  /** Sisipkan baris gambar baru di posisi kursor editor. */
  onInsert: (line: string) => void;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [bulk, setBulk] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const legacyRef = useRef<HTMLInputElement>(null);
  const [legacyTarget, setLegacyTarget] = useState<string | null>(null);

  const ids = [
    ...new Set([lesson.body, ...Object.values(lesson.versions).map((v) => v?.text ?? "")].flatMap(figureIds)),
  ];
  const legacy = lesson.body
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => LEGACY.test(l));
  const fig = (id: string): LessonFigure => lesson.figures[id] ?? { alt: "", altOrigin: "guru", altChecked: false };
  const needsWork = ids.filter((id) => !fig(id).alt.trim() || !fig(id).altChecked);
  const empty = ids.filter((id) => !fig(id).alt.trim());

  const setFigure = (id: string, patch: Partial<LessonFigure>) =>
    update((l) => ({
      figures: {
        ...l.figures,
        [id]: { ...(l.figures[id] ?? { alt: "", altOrigin: "guru", altChecked: false }), ...patch },
      },
    }));

  const setCaption = (id: string, caption: string) =>
    update((l) => {
      const versions = { ...l.versions };
      for (const [k, v] of Object.entries(versions)) {
        if (v)
          versions[k as keyof typeof versions] = {
            ...v,
            text: replaceFigureLine(v.text, id, () => editingLine(id, caption)),
          };
      }
      return { body: replaceFigureLine(l.body, id, () => editingLine(id, caption)), versions };
    });

  const remove = (id: string) => {
    if (!window.confirm("Hapus gambar ini dari materi (dan dari semua versi)?")) return;
    update((l) => {
      const versions = { ...l.versions };
      for (const [k, v] of Object.entries(versions)) {
        if (v) versions[k as keyof typeof versions] = { ...v, text: replaceFigureLine(v.text, id, () => null) };
      }
      const figures = { ...l.figures };
      delete figures[id];
      return { body: replaceFigureLine(l.body, id, () => null), versions, figures };
    });
  };

  async function describe(id: string, silent = false) {
    setBusy((b) => ({ ...b, [id]: true }));
    try {
      const res = await api<{ alt: string; caption: string }>("/api/ai/alt", {
        method: "POST",
        body: {
          lessonId,
          imageId: id,
          caption: captionOf(lesson.body, id) || undefined,
          nearby: nearbyText(lesson.body, id) || undefined,
        },
      });
      setFigure(id, { alt: res.alt, altOrigin: "ai", altChecked: false });
      const current = captionOf(lesson.body, id);
      if (res.caption && (!current || /^gambar( halaman \d+)?$/i.test(current))) setCaption(id, res.caption);
      if (!silent) toast.ok("Draf deskripsi siap. Baca, sesuaikan, lalu tandai sudah dicek.");
      return true;
    } catch (err) {
      toast.error((err as Error).message);
      return false;
    } finally {
      setBusy((b) => ({ ...b, [id]: false }));
    }
  }

  async function describeAll() {
    setBulk(true);
    let ok = 0;
    for (const id of empty) {
      if (await describe(id, true)) ok++;
      else break;
    }
    setBulk(false);
    if (ok) toast.ok(`${ok} draf deskripsi siap. Periksa satu per satu.`);
  }

  async function addImage(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      const { id, width, height } = await uploadImageFile(file, lessonId);
      update((l) => ({
        figures: { ...l.figures, [id]: { alt: "", altOrigin: "guru", altChecked: false, width, height } },
      }));
      onInsert(
        figureLine(
          id,
          file.name
            .replace(/\.[a-z0-9]+$/i, "")
            .replace(/[-_]+/g, " ")
            .slice(0, 60) || "Gambar",
        ),
      );
      toast.ok("Gambar ditambahkan. Tulis deskripsinya di bawah.");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  /** Ganti baris [Gambar: …] (dari foto buku lama) dengan gambar asli yang diunggah guru. */
  async function uploadForLegacy(file: File | undefined) {
    const target = legacyTarget;
    setLegacyTarget(null);
    if (!file || !target) return;
    setUploading(true);
    try {
      const desc = target.match(LEGACY)?.[2]?.trim() ?? "";
      const { id, width, height } = await uploadImageFile(file, lessonId);
      update((l) => ({
        body: l.body
          .split("\n")
          .map((raw) => (raw.trim() === target ? figureLine(id, "Gambar") : raw))
          .join("\n"),
        figures: { ...l.figures, [id]: { alt: desc, altOrigin: "ai", altChecked: false, width, height } },
      }));
      toast.ok("Gambar dipasang. Deskripsi dari foto buku dipakai sebagai draf.");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploading(false);
      if (legacyRef.current) legacyRef.current.value = "";
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-[14px] text-tinta-2">
        Deskripsi gambar dibacakan untuk siswa <strong className="text-tinta">tunanetra</strong> dan bisa dibuka siswa{" "}
        <strong className="text-tinta">low vision</strong>. Materi baru bisa terbit setelah semua deskripsi dicek.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
          {uploading ? <Spinner /> : <ImagePlus className="size-4" aria-hidden />}
          Tambah gambar
        </Button>
        {aiOn && empty.length > 0 && (
          <Button variant="ai" size="sm" onClick={describeAll} disabled={bulk}>
            {bulk ? <Spinner /> : <Wand2 className="size-4" aria-hidden />}
            Deskripsi AI untuk {empty.length} gambar
          </Button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(e) => addImage(e.target.files?.[0])}
        />
        <input
          ref={legacyRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(e) => uploadForLegacy(e.target.files?.[0])}
        />
      </div>

      {ids.length === 0 && legacy.length === 0 && (
        <p className="rounded-xl bg-kertas p-3 text-[14px] text-tinta-2">
          Belum ada gambar. Gambar ikut masuk otomatis saat mengambil materi dari foto buku, PDF, atau Word.
        </p>
      )}
      {ids.length > 0 && (
        <p className="text-[14px] font-bold" role="status">
          {ids.length} gambar ·{" "}
          {needsWork.length ? (
            <span className="text-aksen">{needsWork.length} perlu dicek</span>
          ) : (
            <span className="text-berhasil">semua sudah dicek</span>
          )}
        </p>
      )}

      <ul className="space-y-4">
        {ids.map((id, i) => {
          const f = fig(id);
          const caption =
            captionOf(lesson.body, id) ||
            captionOf(
              Object.values(lesson.versions)
                .map((v) => v?.text ?? "")
                .join("\n"),
              id,
            );
          const words = wordCount(f.alt);
          return (
            <li
              key={id}
              className={cx(
                "rounded-2xl border bg-white p-3",
                f.alt.trim() && f.altChecked ? "border-berhasil/30" : "border-aksen/40",
              )}
            >
              <div className="flex gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/gambar/${id}`}
                  alt=""
                  className="size-20 shrink-0 rounded-lg border border-garis bg-kertas object-contain"
                />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[13px] font-bold text-tinta-2">Gambar {i + 1}</span>
                    {!f.alt.trim() ? (
                      <Badge tone="ai">Belum ada deskripsi</Badge>
                    ) : f.altChecked ? (
                      <Badge tone="ok">
                        <Check className="size-3.5" aria-hidden />
                        Sudah dicek
                      </Badge>
                    ) : (
                      <Badge tone="ai">{f.altOrigin === "ai" ? "Draf AI" : "Perlu dicek"}</Badge>
                    )}
                  </div>
                  <label htmlFor={`cap-${id}`} className="sr-only">
                    Keterangan gambar {i + 1}
                  </label>
                  <input
                    id={`cap-${id}`}
                    value={caption}
                    placeholder="Keterangan (judul gambar)"
                    onChange={(e) => setCaption(id, e.target.value.slice(0, 160))}
                    className={cx(inputClass, "h-9 px-2.5 py-1 text-[14px]")}
                  />
                </div>
              </div>
              <label htmlFor={`alt-${id}`} className="mt-3 block text-[14px] font-bold">
                Deskripsi gambar
              </label>
              <textarea
                id={`alt-${id}`}
                rows={4}
                value={f.alt}
                placeholder="Contoh: Diagram daun dengan panah. Cahaya matahari masuk dari kiri atas, air naik dari akar…"
                onChange={(e) => setFigure(id, { alt: e.target.value.slice(0, 1200), altOrigin: "guru" })}
                className={cx(inputClass, "mt-1 text-[14px] leading-relaxed")}
                aria-describedby={`alt-hint-${id}`}
              />
              <p id={`alt-hint-${id}`} className={cx("mt-1 text-[12px]", words > 70 ? "text-aksen" : "text-tinta-2")}>
                {words} kata. Jelaskan isi penting: label, arah panah, urutan. Idealnya 1–3 kalimat.
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Button
                  size="sm"
                  variant={f.altChecked ? "secondary" : "primary"}
                  disabled={!f.alt.trim()}
                  onClick={() => setFigure(id, { altChecked: !f.altChecked })}
                >
                  <Check className="size-4" aria-hidden />
                  {f.altChecked ? "Batalkan dicek" : "Tandai sudah dicek"}
                </Button>
                {aiOn && (
                  <Button size="sm" variant="ai" disabled={busy[id] || bulk} onClick={() => describe(id)}>
                    {busy[id] ? <Spinner /> : <Sparkles className="size-4" aria-hidden />}
                    {f.alt.trim() ? "Tulis ulang AI" : "Deskripsi AI"}
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => remove(id)} aria-label={`Hapus gambar ${i + 1}`}>
                  <Trash2 className="size-4" aria-hidden />
                  Hapus
                </Button>
              </div>
            </li>
          );
        })}
      </ul>

      {legacy.length > 0 && (
        <div className="space-y-2">
          <p className="text-[14px] font-bold">Gambar dari buku yang belum diunggah</p>
          {legacy.map((line) => (
            <div key={line} className="rounded-xl border border-dashed border-batas/60 bg-kertas p-3 text-[14px]">
              <p>{line.match(LEGACY)?.[2]}</p>
              <Button
                size="sm"
                variant="secondary"
                className="mt-2"
                disabled={uploading}
                onClick={() => {
                  setLegacyTarget(line);
                  legacyRef.current?.click();
                }}
              >
                <Upload className="size-4" aria-hidden />
                Unggah gambarnya
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
