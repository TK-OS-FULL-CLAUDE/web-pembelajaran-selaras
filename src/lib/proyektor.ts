// Mode proyektor: materi dipotong menjadi layar-layar (seperti slide) untuk ditampilkan ke satu kelas.
// Fungsi di sini murni (tanpa React/DOM) supaya bisa diuji: npm run test:format.

import { FIGURE_LINE, plainText, wordCount } from "./text";

export type ProjectorSlide =
  | { kind: "teks"; text: string }
  | { kind: "gambar"; id: string; caption: string }
  | { kind: "soal"; index: number };

/** Batas kata per layar supaya huruf tetap besar tanpa perlu menggulir. */
export const SLIDE_MAX_WORDS = 70;

const HEADING = /^#{2,3}\s+\S/;

function isLoneHeading(block: string) {
  return HEADING.test(block) && !block.includes("\n");
}

/** Bagian yang terlalu panjang dipecah di batas paragraf/blok (tabel dan daftar tidak pernah dipotong). */
function splitLong(chunk: string, maxWords: number): string[] {
  if (wordCount(plainText(chunk)) <= maxWords) return [chunk];
  const blocks = chunk
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean);
  const out: string[] = [];
  let cur: string[] = [];
  let words = 0;
  for (const block of blocks) {
    const w = wordCount(plainText(block));
    // Judul tidak pernah ditinggal sendirian di akhir layar: selalu ikut blok sesudahnya.
    const keepWithHeading = cur.length === 1 && isLoneHeading(cur[0]);
    if (cur.length && words + w > maxWords && !keepWithHeading) {
      out.push(cur.join("\n\n"));
      cur = [];
      words = 0;
    }
    cur.push(block);
    words += w;
  }
  if (cur.length) out.push(cur.join("\n\n"));
  return out;
}

/**
 * Memotong materi menjadi layar: layar baru di setiap judul (## atau ###), setiap gambar unggahan
 * mendapat layar sendiri, dan bagian yang panjang dipecah di batas paragraf.
 */
export function contentSlides(text: string, maxWords = SLIDE_MAX_WORDS): ProjectorSlide[] {
  const slides: ProjectorSlide[] = [];
  let buf: string[] = [];
  const flush = () => {
    const chunk = buf.join("\n").trim();
    buf = [];
    if (!chunk || !plainText(chunk).trim()) return; // mis. hanya garis pemisah
    for (const piece of splitLong(chunk, maxWords)) slides.push({ kind: "teks", text: piece });
  };
  for (const line of text.split("\n")) {
    const t = line.trim();
    const fig = t.match(FIGURE_LINE);
    if (fig) {
      flush();
      slides.push({ kind: "gambar", id: fig[2], caption: fig[1] });
      continue;
    }
    if (HEADING.test(t) && buf.some((l) => l.trim())) flush();
    buf.push(line);
  }
  flush();
  return slides;
}

/** Semua layar mode proyektor: isi materi, lalu satu layar per soal kuis. */
export function projectorSlides(text: string, quizCount: number, maxWords = SLIDE_MAX_WORDS): ProjectorSlide[] {
  return [
    ...contentSlides(text, maxWords),
    ...Array.from({ length: quizCount }, (_, index) => ({ kind: "soal" as const, index })),
  ];
}

/** Huruf pilihan jawaban: A, B, C, … */
export function optionLetter(i: number): string {
  return String.fromCharCode(65 + i);
}
