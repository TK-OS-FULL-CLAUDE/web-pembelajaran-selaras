// Rumus LaTeX yang ditampilkan dengan KaTeX. Pembaca layar dan suara "Dengarkan" sama-sama memakai bacaan
// Bahasa Indonesia dari latexToSpeech (src/lib/latex.ts) lewat aria-label.
// trust: false → perintah berbahaya (\href, \url, \htmlClass, …) tidak dijalankan. Rumus yang salah tulis
// tampil sebagai teks merah, tidak membuat halaman error.

import katex from "katex";
import { latexToSpeech } from "@/lib/latex";

const cache = new Map<string, string>();

export function texToHtml(tex: string, display = false): string {
  const key = `${display ? "D" : "I"}${tex}`;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;
  // Pecahan di dalam kalimat ditampilkan seukuran pecahan bersusun biasa (bukan versi kecil), supaya terbaca
  // oleh siswa SD dan siswa low vision.
  const source = !display && /\\[dt]?frac/.test(tex) ? `\\displaystyle ${tex}` : tex;
  const html = katex.renderToString(source, {
    displayMode: display,
    throwOnError: false,
    output: "htmlAndMathml",
    strict: "ignore",
    trust: false,
    maxSize: 20,
    maxExpand: 200,
  });
  if (cache.size > 800) cache.clear();
  cache.set(key, html);
  return html;
}

/**
 * Pembaca layar membaca bacaan Bahasa Indonesia yang sama dengan tombol "Dengarkan"
 * ("x kuadrat kurang 1"), bukan simbol satu per satu.
 */
export function Tex({ tex, display = false }: { tex: string; display?: boolean }) {
  return (
    <span
      className={display ? "rumus rumus-tampil" : "rumus"}
      role="img"
      aria-roledescription="rumus"
      aria-label={latexToSpeech(tex) || tex}
      // KaTeX meng-escape semua teks; dengan trust: false tidak ada HTML/URL dari pengguna yang lolos.
      dangerouslySetInnerHTML={{ __html: texToHtml(tex, display) }}
    />
  );
}
