import type { GlossaryItem, LessonFigures, LessonVersions, QuizQuestion } from "./types";
import { analyze, containsTerm } from "./readability";
import { figureIds } from "./text";
import { questionKey, questionProblem } from "./quiz";

export type AccessibilityIssue = { area: "materi" | "versi" | "kuis"; message: string };
export function auditLesson(lesson: { body: string; glossary: GlossaryItem[]; versions: LessonVersions; figures: LessonFigures; quiz: QuizQuestion[] }) {
  const issues: AccessibilityIssue[] = [];
  const texts = [{ name: "Materi asli", text: lesson.body, glossary: lesson.glossary, area: "materi" as const },
    ...Object.values(lesson.versions).filter((v) => v?.text.trim()).map((v) => ({ name: "Versi adaptif", text: v!.text, glossary: v!.glossary, area: "versi" as const }))];
  for (const { name, text, glossary, area } of texts) {
    const headings = [...text.matchAll(/^(#{1,4})\s+(.+)$/gm)];
    if (text.length > 600 && !headings.length) issues.push({ area, message: `${name}: tambahkan judul bagian untuk bacaan panjang.` });
    if (headings.some((h, i) => i > 0 && h[1].length > headings[i - 1][1].length + 1))
      issues.push({ area, message: `${name}: tingkatan judul melompat. Susun judul dan subjudul berurutan.` });
    const reading = analyze(text);
    if (reading.longSentences.length) issues.push({ area, message: `${name}: ${reading.longSentences.length} kalimat lebih dari 20 kata; pertimbangkan memecahnya.` });
    const marked = [...text.matchAll(/\*\*([^*\n]+)\*\*/g)].map((m) => m[1].trim()).filter((w) => w.split(/\s+/).length <= 4);
    const unexplained = [...new Set(marked)].filter((w) => !glossary.some((g) => g.kata.toLocaleLowerCase() === w.toLocaleLowerCase() && g.arti.trim()));
    if (unexplained.length) issues.push({ area, message: `${name}: periksa apakah istilah yang ditebalkan perlu arti di glosarium: ${unexplained.slice(0, 6).join(", ")}.` });
    for (const g of glossary) if (g.kata.trim() && containsTerm(text, g.kata) && !g.arti.trim())
      issues.push({ area, message: `${name}: arti “${g.kata}” masih kosong.` });
  }
  const ids = [...new Set(texts.flatMap((t) => figureIds(t.text)))];
  const missing = ids.filter((id) => !lesson.figures[id]?.alt.trim() || !lesson.figures[id]?.altChecked);
  if (missing.length) issues.push({ area: "materi", message: `${missing.length} gambar belum memiliki deskripsi yang diperiksa.` });
  lesson.quiz.forEach((q, i) => {
    const problem = questionProblem(q);
    if (problem) issues.push({ area: "kuis", message: `Soal ${i + 1}: ${problem}` });
    if (!q.explain.trim()) issues.push({ area: "kuis", message: `Soal ${i + 1}: tambahkan pembahasan tertulis.` });
    if (/\b(dengarkan|audio|suara)\b/i.test(q.q)) issues.push({ area: "kuis", message: `Soal ${i + 1}: pastikan instruksi berbasis suara memiliki alternatif tertulis.` });
    if (q.type === "pgk" && !/lebih dari satu|semua|beberapa/i.test(q.q)) issues.push({ area: "kuis", message: `Soal ${i + 1}: jelaskan bahwa jawaban bisa lebih dari satu.` });
  });
  return issues;
}

export type ConceptStat = { concept: string; questions: number; sessions: number; answers: number; correct: number; pct: number | null };
export function conceptStats(quiz: QuizQuestion[], attempts: { session_id: string; detail: { k: string; b: boolean }[] | null }[]): ConceptStat[] {
  const groups = new Map<string, { label: string; keys: Set<string>; sessions: Set<string>; answers: number; correct: number }>();
  for (const q of quiz) {
    if (!q.q.trim()) continue;
    const label = q.concept?.trim() || "Belum diberi konsep";
    const key = label.toLocaleLowerCase();
    const group = groups.get(key) ?? { label, keys: new Set<string>(), sessions: new Set<string>(), answers: 0, correct: 0 };
    group.keys.add(questionKey(q)); groups.set(key, group);
  }
  for (const a of attempts) for (const group of groups.values()) {
    const seen = new Set<string>();
    for (const d of Array.isArray(a.detail) ? a.detail : []) if (group.keys.has(d.k) && !seen.has(d.k)) {
      seen.add(d.k); group.answers++; if (d.b) group.correct++; group.sessions.add(a.session_id);
    }
  }
  return [...groups.values()].map((g) => ({ concept: g.label, questions: g.keys.size, sessions: g.sessions.size,
    answers: g.answers, correct: g.correct, pct: g.answers ? Math.round(g.correct / g.answers * 100) : null }));
}

/** Cegah formula spreadsheet dieksekusi dari nama/isi buatan pengguna. */
export function csvCell(value: unknown): string {
  const text = value == null ? "" : String(value);
  const safe = /^[\s]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}
export function csvFile(rows: unknown[][]): string { return "\uFEFF" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n"); }

/** Bandingkan urutan baris, termasuk penghapusan dan perpindahan. Batas matriks menjaga respons UI. */
export function comparisonTokens(text: string, other: string) {
  const a = text.split("\n"), b = other.split("\n");
  const same = new Set<number>();
  if (a.length * b.length <= 1_000_000) {
    const width = b.length + 1;
    const dp = new Uint32Array((a.length + 1) * width);
    for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--)
      dp[i * width + j] = a[i] === b[j] ? 1 + dp[(i + 1) * width + j + 1] : Math.max(dp[(i + 1) * width + j], dp[i * width + j + 1]);
    let i = 0, j = 0;
    while (i < a.length && j < b.length) {
      if (a[i] === b[j]) { same.add(i); i++; j++; }
      else if (dp[(i + 1) * width + j] >= dp[i * width + j + 1]) i++;
      else j++;
    }
  } else a.forEach((line, i) => { if (line === b[i]) same.add(i); });
  return a.map((line, i) => ({ text: line + (i < a.length - 1 ? "\n" : ""), changed: !!line.trim() && !same.has(i) }));
}
