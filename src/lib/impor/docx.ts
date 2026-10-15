// Word (.docx) → teks berformat Selaras + gambar, di browser guru.
// mammoth mengubah dokumen menjadi HTML bersih (judul, daftar, tabel, tebal/miring, gambar);
// HTML itu lalu diubah ke format Selaras dan setiap gambar diunggah.

import { canvasToUpload, drawScaled, uploadImage } from "../image";
import { figureLine } from "../text";
import type { LessonFigures } from "../types";
import type { ImportProgress, ImportResult } from "./types";

type Mammoth = typeof import("mammoth");

async function loadMammoth(): Promise<Mammoth> {
  // Versi siap-pakai untuk browser (tanpa modul Node). Dimuat hanya saat guru mengimpor Word.
  const mod = (await import("mammoth/mammoth.browser.js")) as unknown as { default?: Mammoth } & Mammoth;
  return mod.default ?? (mod as Mammoth);
}

const SUPPORTED = new Set(["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp", "image/bmp"]);

/** Escape karakter yang punya arti di format Selaras. */
function esc(s: string) {
  return s.replace(/\\/g, "\\\\").replace(/\*/g, "\\*").replace(/==/g, "\\=\\=");
}

/** Isi sebuah elemen sebagai teks satu baris dengan **tebal** dan *miring*. */
function inline(node: Node): string {
  let out = "";
  node.childNodes.forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) {
      out += esc(child.textContent ?? "");
      return;
    }
    if (!(child instanceof HTMLElement)) return;
    const tag = child.tagName.toLowerCase();
    if (tag === "br") {
      out += " ";
      return;
    }
    if (tag === "img") return; // gambar ditangani terpisah
    const inner = inline(child);
    if (!inner.trim()) {
      out += inner;
      return;
    }
    const lead = inner.match(/^\s*/)![0];
    const trail = inner.match(/\s*$/)![0];
    const core = inner.trim();
    if (tag === "strong" || tag === "b") out += `${lead}**${core}**${trail}`;
    else if (tag === "em" || tag === "i") out += `${lead}*${core}*${trail}`;
    else out += inner;
  });
  return out.replace(/\s+/g, " ");
}

function imagesIn(el: Element): HTMLImageElement[] {
  return Array.from(el.querySelectorAll("img"));
}

function figureFromImg(img: HTMLImageElement): string | null {
  const src = img.getAttribute("src") ?? "";
  const m = src.match(/^gambar:(.+)$/);
  if (!m) return null;
  return figureLine(m[1], img.getAttribute("data-caption") || "Gambar");
}

function htmlToSelaras(html: string): { text: string; title: string } {
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, "text/html");
  const out: string[] = [];
  let title = "";

  const walk = (el: Element) => {
    for (const child of Array.from(el.children)) {
      const tag = child.tagName.toLowerCase();
      if (/^h[1-6]$/.test(tag)) {
        const text = inline(child).replace(/\*\*/g, "").trim();
        if (text) {
          if (!title && (tag === "h1" || tag === "h2")) title = text.replace(/\\/g, "");
          out.push(`${Number(tag[1]) <= 2 ? "##" : "###"} ${text}`);
        }
        imagesIn(child).forEach((img) => {
          const f = figureFromImg(img);
          if (f) out.push(f);
        });
      } else if (tag === "p") {
        const text = inline(child).trim();
        if (text) out.push(text);
        imagesIn(child).forEach((img) => {
          const f = figureFromImg(img);
          if (f) out.push(f);
        });
      } else if (tag === "ul" || tag === "ol") {
        const items: string[] = [];
        const figs: string[] = [];
        const collect = (list: Element, depth: number) => {
          let n = 1;
          for (const li of Array.from(list.children)) {
            if (li.tagName.toLowerCase() !== "li") continue;
            const clone = li.cloneNode(true) as Element;
            clone.querySelectorAll("ul,ol").forEach((x) => x.remove());
            const text = inline(clone).trim();
            if (text) items.push(list.tagName.toLowerCase() === "ol" && depth === 0 ? `${n++}. ${text}` : `- ${text}`);
            imagesIn(clone).forEach((img) => {
              const f = figureFromImg(img);
              if (f) figs.push(f);
            });
            for (const sub of Array.from(li.children)) {
              const t = sub.tagName.toLowerCase();
              if (t === "ul" || t === "ol") collect(sub, depth + 1);
            }
          }
        };
        collect(child, 0);
        if (items.length) out.push(items.join("\n"));
        out.push(...figs);
      } else if (tag === "table") {
        const rows = Array.from(child.querySelectorAll("tr")).map((tr) =>
          Array.from(tr.children).map((cell) => inline(cell).replace(/\|/g, "\\|").trim()),
        );
        const width = Math.max(0, ...rows.map((r) => r.length));
        if (rows.length && width) {
          const pad = (r: string[]) => [...r, ...Array(width - r.length).fill("")];
          const lines = rows.map((r) => `| ${pad(r).join(" | ")} |`);
          lines.splice(1, 0, `|${Array(width).fill("---").join("|")}|`);
          out.push(lines.join("\n"));
        }
        imagesIn(child).forEach((img) => {
          const f = figureFromImg(img);
          if (f) out.push(f);
        });
      } else if (tag === "img") {
        const f = figureFromImg(child as HTMLImageElement);
        if (f) out.push(f);
      } else {
        walk(child);
      }
    }
  };
  walk(doc.body);
  return {
    text: out
      .join("\n\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim(),
    title,
  };
}

export async function importDocx(
  file: File,
  opts: { lessonId?: string | null; onProgress?: ImportProgress },
): Promise<ImportResult> {
  if (/\.doc$/i.test(file.name)) {
    throw new Error('File .doc (Word lama) belum didukung. Buka di Word, lalu "Simpan sebagai" .docx.');
  }
  opts.onProgress?.("Membuka dokumen Word…", 0);
  const mammoth = await loadMammoth();
  const figures: LessonFigures = {};
  const notes: string[] = [];
  let count = 0;

  const result = await mammoth
    .convertToHtml(
      { arrayBuffer: await file.arrayBuffer() },
      {
        convertImage: mammoth.images.imgElement(async (image) => {
          count++;
          opts.onProgress?.(`Mengunggah gambar ${count}…`);
          const type = (image.contentType || "").toLowerCase();
          if (!SUPPORTED.has(type)) {
            notes.push(`Satu gambar berformat ${type || "tidak dikenal"} dilewati (hanya JPG, PNG, GIF, WEBP).`);
            return { src: "" };
          }
          try {
            const buffer = await image.readAsArrayBuffer();
            const blob = new Blob([buffer], { type: type === "image/jpg" ? "image/jpeg" : type });
            const bitmap = await createImageBitmap(blob);
            if (bitmap.width < 24 || bitmap.height < 24) {
              bitmap.close();
              return { src: "" }; // ikon/garis kecil
            }
            const prepared = await canvasToUpload(drawScaled(bitmap, 1600));
            bitmap.close();
            const id = await uploadImage(prepared, opts.lessonId);
            // Teks alternatif dari dokumen (bila ada) dipakai sebagai draf; tetap wajib dicek guru.
            const alt = ((image as { altText?: string }).altText ?? "").trim();
            figures[id] = {
              alt: /^(gambar|picture|image|a picture containing)/i.test(alt) && alt.length < 30 ? "" : alt,
              altOrigin: "guru",
              altChecked: false,
              width: prepared.width,
              height: prepared.height,
            };
            return { src: `gambar:${id}` };
          } catch (err) {
            notes.push(`Satu gambar gagal diunggah: ${(err as Error).message}`);
            return { src: "" };
          }
        }),
      },
    )
    .catch(() => {
      throw new Error("File ini bukan dokumen Word (.docx) yang bisa dibaca.");
    });

  opts.onProgress?.("Merapikan format…", 0.9);
  const { text, title } = htmlToSelaras(result.value);
  if (!text) throw new Error("Dokumen ini kosong atau tidak berisi teks.");
  const n = Object.keys(figures).length;
  if (n) notes.unshift(`${n} gambar ikut diambil. Periksa deskripsi tiap gambar di panel Gambar.`);
  return { text, title, figures, notes };
}
