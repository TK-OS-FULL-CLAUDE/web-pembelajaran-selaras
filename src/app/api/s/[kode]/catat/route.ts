import { z } from "zod";
import { fail, handle, ok, prefsInput, readJson } from "@/lib/api";
import { getPublishedLesson, recordStudentEvent } from "@/lib/data";

type Ctx = { params: Promise<{ kode: string }> };

const schema = z.object({
  sessionId: z
    .string()
    .min(8)
    .max(64)
    .regex(/^[A-Za-z0-9-]+$/),
  kind: z.enum(["open", "quiz"]),
  alias: z.string().trim().max(40).nullable(),
  prefs: prefsInput,
  score: z.number().int().min(0).max(100).optional(),
  total: z.number().int().min(1).max(100).optional(),
  /** Lama pengerjaan kuis dalam detik (maks. 3 jam). */
  durasi: z.number().int().min(0).max(10_800).optional(),
});

/** Mencatat sesi siswa (cara belajar yang dipilih, skor kuis) untuk tab Rekap guru. Tanpa login. */
export async function POST(req: Request, { params }: Ctx) {
  return handle(async () => {
    const { kode } = await params;
    const input = await readJson(req, schema);
    const lesson = await getPublishedLesson(kode);
    if (!lesson) return fail("Materi tidak ditemukan.", 404);
    await recordStudentEvent({
      lessonId: lesson.id,
      sessionId: input.sessionId,
      kind: input.kind,
      alias: input.alias || null,
      prefs: input.prefs,
      score: input.kind === "quiz" ? input.score : undefined,
      total: input.kind === "quiz" ? input.total : undefined,
      durationSec: input.kind === "quiz" ? input.durasi : undefined,
    });
    return ok({ ok: true });
  });
}
