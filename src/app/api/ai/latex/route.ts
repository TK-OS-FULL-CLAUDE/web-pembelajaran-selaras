import { z } from "zod";
import { fail, ok, readJson, withTeacher } from "@/lib/api";
import { AiError } from "@/lib/ai-common";
import { consumeAiQuota } from "@/lib/ai-quota";
import { convertToLatex, restoreFigureLines } from "@/lib/ai-tasks";
import { getLesson } from "@/lib/data";
import { fixDoubledBackslashes } from "@/lib/latex";
import { latexConversionProblem, mergeLatexLines } from "@/lib/matematika";

export const maxDuration = 60;

const MAX_TOTAL = 24_000;

const schema = z.object({
  lessonId: z.string().uuid(),
  /** Paragraf materi atau kolom-kolom soal kuis. Urutan hasil sama dengan urutan ini. */
  texts: z.array(z.string().max(MAX_TOTAL)).min(1).max(80),
});

type Checked = { text: string; changed: boolean; problem: string | null };

/**
 * Periksa satu hasil AI tanpa AI: baris gambar dikembalikan, bagian yang angka atau katanya berubah tidak dipakai.
 * Bila satu bagian ditolak, barisnya diperiksa satu per satu supaya baris yang aman tetap terpakai.
 */
function check(source: string, output: string | undefined): Checked {
  const raw = fixDoubledBackslashes(source, output?.trim() ?? "");
  if (!raw) return { text: source, changed: false, problem: null };
  const result = source.includes("](gambar:") ? restoreFigureLines(source, raw) : raw;
  if (result === source) return { text: source, changed: false, problem: null };
  const problem = latexConversionProblem(source, result);
  if (!problem) return { text: result, changed: true, problem: null };
  const merged = mergeLatexLines(source, result);
  return merged?.changed ? { text: merged.text, changed: true, problem } : { text: source, changed: false, problem };
}

/**
 * "Ubah rumus ke LaTeX": AI menulis ulang rumus tulisan biasa (3/4, x^2, sqrt(x+2)) menjadi LaTeX.
 * Editor mengirim materi per paragraf (hanya yang berisi rumus), kuis per kolom. Bagian yang ditolak pemeriksa
 * dicoba sekali lagi oleh AI; bila masih ditolak, teks aslinya dipertahankan.
 */
export async function POST(req: Request) {
  return withTeacher(async (teacher) => {
    const input = await readJson(req, schema);
    const total = input.texts.reduce((n, t) => n + t.length, 0);
    if (total > MAX_TOTAL) return fail("Teksnya terlalu panjang untuk sekali ubah. Pisahkan materinya dulu.", 413);
    const lesson = await getLesson(teacher.id, input.lessonId);
    if (!lesson) return fail("Materi tidak ditemukan.", 404);

    const todo = input.texts.flatMap((t, i) => (t.trim() ? [i] : []));
    if (!todo.length) return ok({ texts: input.texts, changed: 0, rejected: 0 });
    await consumeAiQuota(teacher.id, "latex");
    const sources = todo.map((i) => input.texts[i].trim());
    const first = await convertToLatex({ texts: sources });
    const results = sources.map((s, k) => check(s, first.texts[k]));

    // Coba sekali lagi untuk bagian yang ditolak (AI kadang ikut merapikan kata atau angka).
    const retry = results.flatMap((r, k) => (r.problem ? [k] : []));
    if (retry.length) {
      try {
        await consumeAiQuota(teacher.id, "latex");
        const second = await convertToLatex({ texts: retry.map((k) => sources[k]) });
        retry.forEach((k, j) => {
          const again = check(sources[k], second.texts[j]);
          // Pakai hasil kedua bila lolos penuh, atau bila lebih banyak baris yang terpakai daripada percobaan pertama.
          if (!again.problem || (again.changed && !results[k].changed)) results[k] = again;
        });
      } catch (err) {
        // Batas pemakaian AI tercapai atau AI sibuk: hasil percobaan pertama tetap dipakai.
        if (!(err instanceof AiError)) throw err;
      }
    }

    const texts = [...input.texts];
    let changed = 0;
    let rejected = 0;
    const reasons: string[] = [];
    results.forEach((r, k) => {
      if (r.changed) {
        texts[todo[k]] = r.text;
        changed++;
      }
      if (r.problem) {
        rejected++;
        if (reasons.length < 3) reasons.push(r.problem);
      }
    });
    // Alasan singkat penolakan dicatat di log server supaya tim bisa melihat pola kesalahan AI.
    if (rejected) console.info(`[ai latex] ${rejected} bagian dibiarkan: ${reasons.join("; ")}`);
    return ok({ texts, changed, rejected, model: first.model });
  });
}
