// PDF → teks berformat Selaras + gambar, seluruhnya di browser guru (file tidak dikirim utuh ke server).
// - Halaman berteks: teks diambil dari lapisan teks PDF (cepat, tanpa AI), judul dikenali dari ukuran huruf,
//   gambar di halaman dipotong dari hasil render lalu diunggah di posisinya.
// - Halaman hasil pindai (tanpa lapisan teks): dibaca AI seperti foto halaman buku.

import { canvasToUpload, cropToCanvas, uploadImage } from "../image";
import { figureLine } from "../text";
import type { LessonFigures } from "../types";
import { readPageWithAi } from "./photo";
import type { ImportProgress, ImportResult } from "./types";

// Build "legacy" pdf.js: sudah membawa polyfill (mis. Map.getOrInsertComputed, Promise.withResolvers),
// jadi tetap jalan di Chrome/Safari yang belum terbaru, yang umum di laptop dan HP sekolah.
type PdfJs = typeof import("pdfjs-dist/legacy/build/pdf.mjs");

let loader: Promise<PdfJs> | null = null;

function loadPdfJs(): Promise<PdfJs> {
  loader ??= (async () => {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
      import.meta.url,
    ).toString();
    return pdfjs;
  })().catch((err) => {
    loader = null;
    throw err;
  });
  return loader;
}

export const MAX_PDF_PAGES = 30;

type Line = { text: string; top: number; bottom: number; left: number; size: number };
type Fig = { top: number; bottom: number; box: { x: number; y: number; w: number; h: number } };
type PageData = {
  number: number;
  lines: Line[];
  figures: Fig[];
  canvas: HTMLCanvasElement;
  scanned: boolean;
};

const BULLET = /^[•●▪◦‣∙·○■□➢►✓✔\-–—]\s*/;

/** Jumlah halaman PDF (untuk memilih rentang halaman sebelum impor). */
export async function pdfPageCount(file: File): Promise<number> {
  const pdfjs = await loadPdfJs();
  const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
  const doc = await task.promise;
  const n = doc.numPages;
  await task.destroy();
  return n;
}

async function readPage(doc: Awaited<ReturnType<PdfJs["getDocument"]>["promise"]>, n: number): Promise<PageData> {
  const page = await doc.getPage(n);
  const base = page.getViewport({ scale: 1 });
  const scale = Math.min(2.2, 1900 / Math.max(base.width, base.height));
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);

  const task = page.render({ canvas, viewport, recordImages: true, background: "#ffffff" });
  await task.promise;
  // pdf.js 6 menyimpan letak gambar di objek halaman (page.imageCoordinates); getter di RenderTask kosong.
  type WithCoords = { imageCoordinates?: ArrayLike<number> | null };
  const coords =
    (page as unknown as WithCoords).imageCoordinates ?? (task as unknown as WithCoords).imageCoordinates ?? null;

  // --- Gambar
  const raw: { x0: number; y0: number; x1: number; y1: number }[] = [];
  if (coords) {
    for (let i = 0; i + 5 < coords.length; i += 6) {
      const [ax, ay, bx, by, cx, cy] = Array.from(coords).slice(i, i + 6);
      const dx = bx + cx - ax;
      const dy = by + cy - ay;
      const xs = [ax, bx, cx, dx];
      const ys = [ay, by, cy, dy];
      raw.push({ x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) });
    }
  }
  // Gabungkan potongan gambar yang bersentuhan (sebagian PDF memecah satu gambar menjadi beberapa ubin).
  const merged: typeof raw = [];
  for (const r of raw.sort((a, b) => a.y0 - b.y0)) {
    const near = merged.find(
      (m) => r.x0 <= m.x1 + 0.01 && r.x1 >= m.x0 - 0.01 && r.y0 <= m.y1 + 0.01 && r.y1 >= m.y0 - 0.01,
    );
    if (near) {
      near.x0 = Math.min(near.x0, r.x0);
      near.y0 = Math.min(near.y0, r.y0);
      near.x1 = Math.max(near.x1, r.x1);
      near.y1 = Math.max(near.y1, r.y1);
    } else merged.push({ ...r });
  }
  const clamp = (v: number) => Math.min(1, Math.max(0, v));
  const fullPage = merged.some((m) => m.x1 - m.x0 > 0.85 && m.y1 - m.y0 > 0.8);
  const figures: Fig[] = merged
    .map((m) => ({ x0: clamp(m.x0), y0: clamp(m.y0), x1: clamp(m.x1), y1: clamp(m.y1) }))
    // Abaikan ikon kecil dan garis hiasan (± < 2 cm), serta latar halaman penuh.
    .filter((m) => (m.x1 - m.x0) * base.width >= 56 && (m.y1 - m.y0) * base.height >= 40)
    .filter((m) => !(m.x1 - m.x0 > 0.85 && m.y1 - m.y0 > 0.8))
    .slice(0, 10)
    .map((m) => ({
      top: m.y0,
      bottom: m.y1,
      box: {
        x: m.x0 * canvas.width - 6,
        y: m.y0 * canvas.height - 6,
        w: (m.x1 - m.x0) * canvas.width + 12,
        h: (m.y1 - m.y0) * canvas.height + 12,
      },
    }));

  // --- Teks
  const content = await page.getTextContent();
  type Item = { str: string; x: number; top: number; size: number; width: number };
  const items: Item[] = [];
  for (const it of content.items) {
    if (!("str" in it) || !it.str) continue;
    const [, , c, d, e, f] = it.transform as number[];
    const size = Math.hypot(c, d) || it.height || 10;
    const [vx, vy] = viewport.convertToViewportPoint(e, f);
    items.push({
      str: it.str,
      x: vx / viewport.width,
      top: (vy - size * scale) / viewport.height,
      size,
      width: (it.width * scale) / viewport.width,
    });
  }
  const charCount = items.reduce((nn, it) => nn + it.str.trim().length, 0);

  items.sort((a, b) => a.top - b.top || a.x - b.x);
  const lines: Line[] = [];
  let cur: Item[] = [];
  const flush = () => {
    if (!cur.length) return;
    cur.sort((a, b) => a.x - b.x);
    let text = "";
    let prevEnd = -1;
    for (const it of cur) {
      const gap = it.x - prevEnd;
      const needSpace =
        prevEnd >= 0 &&
        gap > (it.size * scale * 0.18) / viewport.width &&
        !text.endsWith(" ") &&
        !it.str.startsWith(" ");
      text += (needSpace ? " " : "") + it.str;
      prevEnd = it.x + it.width;
    }
    const size = Math.max(...cur.map((c) => c.size));
    const top = Math.min(...cur.map((c) => c.top));
    text = text.replace(/\s+/g, " ").trim();
    if (text) lines.push({ text, top, bottom: top + (size * scale) / viewport.height, left: cur[0].x, size });
    cur = [];
  };
  for (const it of items) {
    if (!it.str.trim() && !cur.length) continue;
    const ref = cur[0];
    if (ref && Math.abs(it.top - ref.top) > ((Math.min(ref.size, it.size) * scale) / viewport.height) * 0.55) flush();
    cur.push(it);
  }
  flush();

  page.cleanup();
  return {
    number: n,
    lines,
    figures,
    canvas,
    scanned: charCount < 40 && (fullPage || merged.length > 0 || charCount === 0),
  };
}

/** Ukuran huruf isi = median tertimbang jumlah huruf. */
function bodySize(pages: PageData[]): number {
  const sizes: [number, number][] = [];
  for (const p of pages) for (const l of p.lines) sizes.push([Math.round(l.size * 2) / 2, l.text.length]);
  sizes.sort((a, b) => a[0] - b[0]);
  const total = sizes.reduce((n, s) => n + s[1], 0);
  let acc = 0;
  for (const [size, w] of sizes) {
    acc += w;
    if (acc >= total / 2) return size;
  }
  return 11;
}

/** Baris kepala/kaki halaman (nomor halaman, judul buku yang berulang) dibuang. */
function marginNoise(pages: PageData[]): Set<string> {
  const counts = new Map<string, number>();
  for (const p of pages) {
    const seen = new Set<string>();
    for (const l of p.lines) {
      if (l.top > 0.08 && l.top < 0.92) continue;
      const key = l.text.toLowerCase().replace(/\d+/g, "#");
      if (!seen.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1);
      seen.add(key);
    }
  }
  const min = Math.max(2, Math.ceil(pages.length * 0.5));
  return new Set([...counts].filter(([, c]) => pages.length > 1 && c >= min).map(([k]) => k));
}

function linesToMarkdown(page: PageData, body: number, noise: Set<string>, figureLines: Map<Fig, string>): string {
  const out: string[] = [];
  let para: string[] = [];
  let lastBottom = -1;
  let lastKind: "para" | "heading" | "bullet" | "none" = "none";
  let lastHeadingSize = 0;
  let lastBulletLeft = 0;

  const flushPara = () => {
    if (para.length) out.push(joinLines(para));
    para = [];
  };

  const figs = [...page.figures].sort((a, b) => a.top - b.top);
  const placeFiguresBefore = (top: number) => {
    while (figs.length && figs[0].top <= top) {
      const f = figs.shift()!;
      const line = figureLines.get(f);
      if (line) {
        flushPara();
        out.push(line);
        lastKind = "none";
      }
    }
  };

  for (const l of page.lines) {
    const text = l.text;
    const key = text.toLowerCase().replace(/\d+/g, "#");
    const inMargin = l.top < 0.08 || l.top > 0.92;
    if (inMargin && (noise.has(key) || /^(hal(aman|\.)?\s*)?\d{1,4}$/i.test(text))) continue;
    // Teks di dalam area gambar (label diagram) dilewati: isinya masuk ke deskripsi gambar.
    if (page.figures.some((f) => l.top >= f.top - 0.002 && l.bottom <= f.bottom + 0.002 && figureLines.has(f)))
      continue;

    placeFiguresBefore(l.top);
    const lineHeight = l.bottom - l.top;
    const gap = lastBottom < 0 ? 0 : l.top - lastBottom;
    const bigGap = gap > lineHeight * 0.9;

    if (l.size >= body * 1.18 && text.length <= 110) {
      flushPara();
      const level = l.size >= body * 1.5 ? "##" : "###";
      if (lastKind === "heading" && Math.abs(lastHeadingSize - l.size) < 0.6 && !bigGap) {
        out[out.length - 1] += ` ${text}`;
      } else {
        out.push(`${level} ${text}`);
      }
      lastKind = "heading";
      lastHeadingSize = l.size;
    } else if (BULLET.test(text) || /^\d{1,2}[.)]\s+/.test(text)) {
      flushPara();
      const item = BULLET.test(text) ? `- ${text.replace(BULLET, "")}` : text.replace(/^(\d{1,2})\)\s+/, "$1. ");
      // Butir berurutan masuk ke daftar yang sama (dipisah baris baru, bukan baris kosong).
      if (lastKind === "bullet" && !bigGap) out[out.length - 1] += `\n${item}`;
      else out.push(item);
      lastKind = "bullet";
      lastBulletLeft = l.left;
    } else if (lastKind === "bullet" && !bigGap && l.left > lastBulletLeft + 0.01) {
      // Lanjutan butir yang terpotong ke baris berikutnya.
      out[out.length - 1] = joinLines([out[out.length - 1], text]);
    } else {
      if (bigGap || lastKind !== "para") flushPara();
      para.push(text);
      lastKind = "para";
    }
    lastBottom = l.bottom;
  }
  flushPara();
  for (const f of figs) {
    const line = figureLines.get(f);
    if (line) out.push(line);
  }
  return out.join("\n\n");
}

/** Gabungkan baris: kata yang terpotong tanda hubung di akhir baris disambung lagi. */
function joinLines(lines: string[]): string {
  return lines.reduce((acc, line) => {
    if (!acc) return line;
    if (/[\p{L}]-$/u.test(acc) && /^[\p{Ll}]/u.test(line)) return acc.slice(0, -1) + line;
    return `${acc} ${line}`;
  }, "");
}

export async function importPdf(
  file: File,
  opts: { lessonId?: string | null; from: number; to: number; aiOn: boolean; onProgress?: ImportProgress },
): Promise<ImportResult> {
  opts.onProgress?.("Membuka PDF…", 0);
  const pdfjs = await loadPdfJs();
  const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
  let doc;
  try {
    doc = await task.promise;
  } catch (err) {
    if ((err as Error).name === "PasswordException") throw new Error("PDF ini dikunci kata sandi. Buka kuncinya dulu.");
    throw new Error("File ini bukan PDF yang bisa dibaca.");
  }
  const from = Math.max(1, Math.min(opts.from, doc.numPages));
  const to = Math.max(from, Math.min(opts.to, doc.numPages, from + MAX_PDF_PAGES - 1));
  const notes: string[] = [];
  const figures: LessonFigures = {};
  const pages: PageData[] = [];
  const parts: string[] = [];
  let title = "";

  try {
    for (let n = from; n <= to; n++) {
      opts.onProgress?.(`Membaca halaman ${n} dari ${to}…`, (n - from) / (to - from + 1));
      pages.push(await readPage(doc, n));
    }

    const body = bodySize(pages.filter((p) => !p.scanned));
    const noise = marginNoise(pages.filter((p) => !p.scanned));
    try {
      const meta = await doc.getMetadata();
      const t = (meta.info as { Title?: string } | undefined)?.Title?.trim();
      if (t && t.length < 120 && !/\.(pdf|docx?)$/i.test(t) && !/^untitled|^microsoft/i.test(t)) title = t;
    } catch {}

    for (const [i, page] of pages.entries()) {
      opts.onProgress?.(`Menyusun halaman ${page.number}…`, (i + 0.5) / pages.length);
      if (page.scanned) {
        if (opts.aiOn) {
          opts.onProgress?.(
            `Halaman ${page.number} berupa hasil pindai, dibaca AI… (±15 detik)`,
            (i + 0.5) / pages.length,
          );
          try {
            const r = await readPageWithAi(page.canvas, { lessonId: opts.lessonId });
            Object.assign(figures, r.figures);
            parts.push(r.text);
            notes.push(...r.notes);
            if (!title && r.title) title = r.title;
            continue;
          } catch (err) {
            notes.push(
              `Halaman ${page.number} gagal dibaca AI (${(err as Error).message}); halaman disimpan sebagai gambar.`,
            );
          }
        } else {
          notes.push(
            `Halaman ${page.number} berupa hasil pindai; disimpan sebagai gambar. Aktifkan AI untuk mengambil teksnya.`,
          );
        }
        const prepared = await canvasToUpload(page.canvas, 1800);
        const id = await uploadImage(prepared, opts.lessonId);
        figures[id] = { alt: "", altOrigin: "guru", altChecked: false, width: prepared.width, height: prepared.height };
        parts.push(figureLine(id, `Halaman ${page.number}`));
        continue;
      }

      const figureLines = new Map<Fig, string>();
      for (const [fi, f] of page.figures.entries()) {
        opts.onProgress?.(`Mengambil gambar ${fi + 1} di halaman ${page.number}…`, (i + 0.7) / pages.length);
        try {
          const prepared = await canvasToUpload(cropToCanvas(page.canvas, f.box));
          const id = await uploadImage(prepared, opts.lessonId);
          figures[id] = {
            alt: "",
            altOrigin: "guru",
            altChecked: false,
            width: prepared.width,
            height: prepared.height,
          };
          figureLines.set(f, figureLine(id, `Gambar halaman ${page.number}`));
        } catch (err) {
          notes.push(`Gambar di halaman ${page.number} gagal diunggah: ${(err as Error).message}`);
        }
      }
      const md = linesToMarkdown(page, body, noise, figureLines);
      if (!title) title = md.match(/^#{2,3} (.+)$/m)?.[1] ?? "";
      parts.push(md);
    }
  } finally {
    await task.destroy();
  }

  const text = parts
    .filter(Boolean)
    .join("\n\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (!text) throw new Error("Tidak ada teks yang bisa diambil dari PDF ini.");
  const count = Object.keys(figures).length;
  if (count) notes.unshift(`${count} gambar ikut diambil. Periksa deskripsi tiap gambar di panel Gambar.`);
  return { text, title: title.replace(/^#+\s*/, ""), figures, notes };
}
