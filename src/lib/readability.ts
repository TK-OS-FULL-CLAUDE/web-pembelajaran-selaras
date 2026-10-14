// Cek keterbacaan sederhana untuk guru (tanpa AI): kalimat dan paragraf yang terlalu panjang.
// Ambang batas memakai panduan umum bahasa sederhana untuk anak; guru bebas menyesuaikan.

export const LONG_SENTENCE_WORDS = 20;
export const TARGET_AVG_WORDS = 15;
export const LONG_PARAGRAPH_SENTENCES = 5;

export type SentenceInfo = {
  text: string;
  words: number;
  /** posisi awal & akhir di teks asli, untuk menyorot kalimat di editor */
  start: number;
  end: number;
};

export type Readability = {
  words: number;
  sentences: number;
  paragraphs: number;
  avgWords: number;
  longSentences: SentenceInfo[];
  longParagraphs: number;
};

const countWords = (s: string) => s.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;

export function analyze(body: string): Readability {
  const sentences: SentenceInfo[] = [];
  const paragraphSizes: number[] = [];
  let currentParagraph = 0;
  let offset = 0;

  for (const line of body.split("\n")) {
    const lineStart = offset;
    offset += line.length + 1;
    const trimmed = line.trim();

    if (!trimmed) {
      if (currentParagraph) paragraphSizes.push(currentParagraph);
      currentParagraph = 0;
      continue;
    }
    if (/^#{1,3}\s/.test(trimmed)) continue; // judul bagian tidak dihitung sebagai kalimat

    const prefix = line.match(/^\s*(?:[-•*]\s+)?/)?.[0].length ?? 0;
    const content = line.slice(prefix);
    for (const m of content.matchAll(/[^.!?]+[.!?]*/g)) {
      const raw = m[0];
      const text = raw.trim();
      const words = countWords(text);
      if (!words || m.index === undefined) continue;
      const lead = raw.length - raw.trimStart().length;
      const start = lineStart + prefix + m.index + lead;
      sentences.push({ text, words, start, end: start + text.length });
      currentParagraph++;
    }
  }
  if (currentParagraph) paragraphSizes.push(currentParagraph);

  const words = sentences.reduce((n, s) => n + s.words, 0);
  return {
    words,
    sentences: sentences.length,
    paragraphs: paragraphSizes.length,
    avgWords: sentences.length ? Math.round((words / sentences.length) * 10) / 10 : 0,
    longSentences: sentences.filter((s) => s.words > LONG_SENTENCE_WORDS),
    longParagraphs: paragraphSizes.filter((n) => n > LONG_PARAGRAPH_SENTENCES).length,
  };
}

/** Apakah sebuah kata/istilah muncul di teks sebagai kata utuh (tidak peka huruf besar/kecil). */
export function containsTerm(text: string, term: string): boolean {
  const t = term.trim();
  if (!t) return false;
  const escaped = t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, "iu").test(text);
}
