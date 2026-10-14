import { z } from "zod";
import { fail, ok, readJson, withTeacher } from "@/lib/api";
import { makeQuizDraft } from "@/lib/ai-tasks";
import { getClass, getLesson } from "@/lib/data";

export const maxDuration = 60;

const schema = z.object({
  lessonId: z.string().uuid(),
  body: z.string().max(30_000).optional(),
  count: z.number().int().min(1).max(10).default(5),
});

/** Draf soal dari AI. Tidak langsung disimpan: guru meninjau di tab Kuis lalu tersimpan otomatis. */
export async function POST(req: Request) {
  return withTeacher(async (teacher) => {
    const input = await readJson(req, schema);
    const lesson = await getLesson(teacher.id, input.lessonId);
    if (!lesson) return fail("Materi tidak ditemukan.", 404);
    const body = (input.body ?? lesson.body).trim();
    if (body.length < 40) return fail("Materi asli terlalu pendek untuk dibuatkan kuis.", 422);
    const cls = lesson.class_id ? await getClass(teacher.id, lesson.class_id) : null;
    const result = await makeQuizDraft({ body, grade: cls?.grade || "siswa SD", count: input.count });
    return ok({ questions: result.questions });
  });
}
