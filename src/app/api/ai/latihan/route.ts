import { z } from "zod";
import { fail, ok, readJson, withTeacher } from "@/lib/api";
import { makePracticeBank } from "@/lib/ai-tasks";
import { consumeAiQuota } from "@/lib/ai-quota";
import { getClass, getLesson } from "@/lib/data";

export const maxDuration = 60;

const schema = z.object({
  lessonId: z.string().uuid(),
  body: z.string().max(30_000).optional(),
  /** Konsep yang dibuatkan latihan; kosong = semua konsep di kuis. "dugaan" = miskonsepsi dari analisis rekap. */
  concepts: z
    .array(z.object({ konsep: z.string().trim().min(1).max(100), dugaan: z.string().trim().max(400).optional() }))
    .max(6)
    .optional(),
  perConcept: z.number().int().min(1).max(3).default(2),
});

/**
 * Draf bank latihan adaptif (soal + petunjuk bertahap per konsep). Tidak disimpan di sini: guru meninjau
 * di tab Kuis, dan hanya soal yang ditandai sudah dicek yang dipakai di layar siswa.
 */
export async function POST(req: Request) {
  return withTeacher(async (teacher) => {
    const input = await readJson(req, schema);
    const lesson = await getLesson(teacher.id, input.lessonId);
    if (!lesson) return fail("Materi tidak ditemukan.", 404);
    const body = (input.body ?? lesson.body).trim();
    if (body.length < 40) return fail("Materi asli terlalu pendek untuk dibuatkan latihan.", 422);

    const byConcept = new Map<string, { konsep: string; contoh: string[]; dugaan?: string }>();
    for (const q of lesson.quiz) {
      const k = q.concept?.trim();
      if (!k) continue;
      const entry = byConcept.get(k.toLocaleLowerCase()) ?? { konsep: k, contoh: [] };
      if (entry.contoh.length < 3 && q.q.trim()) entry.contoh.push(q.q.trim().slice(0, 200));
      byConcept.set(k.toLocaleLowerCase(), entry);
    }
    const concepts = input.concepts?.length
      ? input.concepts.map((c) => ({
          ...(byConcept.get(c.konsep.toLocaleLowerCase()) ?? { konsep: c.konsep, contoh: [] }),
          dugaan: c.dugaan,
        }))
      : [...byConcept.values()].slice(0, 6);
    if (!concepts.length) {
      return fail('Isi "Konsep yang dinilai" pada soal kuis dulu, supaya latihan bisa dicocokkan dengan soal yang salah.', 422);
    }

    const cls = lesson.class_id ? await getClass(teacher.id, lesson.class_id) : null;
    await consumeAiQuota(teacher.id, "latihan");
    const result = await makePracticeBank({
      body,
      grade: cls?.grade || "siswa SD",
      subject: lesson.subject,
      concepts,
      perConcept: input.perConcept,
    });
    return ok({ questions: result.questions, math: result.math });
  });
}
