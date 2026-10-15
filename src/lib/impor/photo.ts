// Foto halaman buku → teks + gambar/diagram. AI membaca teks dan menandai letak gambar (kotak 0–1000);
// browser memotong gambar dari foto asli lalu mengunggahnya, jadi gambar dari buku ikut tampil.

import { api } from "../client";
import { canvasToUpload, cropToCanvas, drawScaled, uploadImage } from "../image";
import { figureLine } from "../text";
import type { LessonFigures } from "../types";
import type { ImportProgress, ImportResult } from "./types";

type AiFigure = { nomor: number; keterangan: string; deskripsi: string; kotak: number[] | null };

type Source = CanvasImageSource & { width: number; height: number };

export async function readPageWithAi(
  source: Source,
  opts: { lessonId?: string | null; onProgress?: ImportProgress },
): Promise<ImportResult> {
  const image = drawScaled(source, 1568).toDataURL("image/jpeg", 0.82);
  const res = await api<{ title: string; text: string; figures?: AiFigure[] }>("/api/ai/foto", {
    method: "POST",
    body: { image },
  });

  const figures: LessonFigures = {};
  const lines = new Map<number, string>();
  const notes: string[] = [];
  const withBox = (res.figures ?? []).filter((f) => f.kotak && f.kotak.length === 4);
  for (const [i, f] of withBox.entries()) {
    opts.onProgress?.(`Memotong gambar ${i + 1} dari ${withBox.length}…`);
    try {
      const [y0, x0, y1, x1] = f.kotak!;
      const W = source.width;
      const H = source.height;
      const padX = W * 0.012;
      const padY = H * 0.012;
      const canvas = cropToCanvas(source, {
        x: (x0 / 1000) * W - padX,
        y: (y0 / 1000) * H - padY,
        w: ((x1 - x0) / 1000) * W + padX * 2,
        h: ((y1 - y0) / 1000) * H + padY * 2,
      });
      if (canvas.width < 40 || canvas.height < 40) continue;
      const prepared = await canvasToUpload(canvas);
      const id = await uploadImage(prepared, opts.lessonId);
      figures[id] = {
        alt: f.deskripsi.trim(),
        altOrigin: "ai",
        altChecked: false,
        width: prepared.width,
        height: prepared.height,
      };
      lines.set(f.nomor, figureLine(id, f.keterangan || "Gambar"));
    } catch (err) {
      notes.push(`Gambar ${f.nomor} gagal diambil: ${(err as Error).message}`);
    }
  }
  const described = new Map((res.figures ?? []).map((f) => [f.nomor, f]));

  let text = res.text.replace(/\[\[\s*GAMBAR\s*(\d+)\s*\]\]/gi, (_, n: string) => {
    const nomor = Number(n);
    const line = lines.get(nomor);
    if (line) {
      lines.delete(nomor);
      return `\n\n${line}\n\n`;
    }
    const f = described.get(nomor);
    return f?.deskripsi ? `\n\n[Gambar: ${f.deskripsi.replace(/[\[\]]/g, "")}]\n\n` : "";
  });
  // Gambar yang punya kotak tapi lupa diberi penanda di teks: taruh di akhir.
  for (const line of lines.values()) text += `\n\n${line}`;
  text = text
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return { text, title: res.title?.trim() ?? "", figures, notes };
}

export async function importPhoto(
  file: File,
  opts: { lessonId?: string | null; onProgress?: ImportProgress },
): Promise<ImportResult> {
  opts.onProgress?.("Membaca halaman dengan AI… (±15 detik)");
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) throw new Error("File ini bukan foto yang bisa dibaca. Pakai JPG, PNG, atau WEBP.");
  // Potongan gambar diambil dari foto berukuran wajar (bukan 12 MP penuh) supaya hemat memori HP.
  const source = drawScaled(bitmap, 2400);
  bitmap.close();
  return readPageWithAi(source, opts);
}
