import { z } from "zod";
import { fail, handle, ok, prefsInput, readJson } from "@/lib/api";
import { getPublishedLesson, recordStudentEvent } from "@/lib/data";

type Ctx = { params: Promise<{ kode: string }> };

const schema = z
  .object({
    eventId: z.string().min(8).max(64).regex(/^[A-Za-z0-9-]+$/).optional(),
    occurredAt: z.iso.datetime().optional(),
    sessionId: z
      .string()
      .min(8)
      .max(64)
      .regex(/^[A-Za-z0-9-]+$/),
    kind: z.enum(["open", "quiz", "confused"]),
    feedback: z.object({ section: z.string().trim().min(1).max(200), revision: z.number().int().positive() }).optional(),
    alias: z.string().trim().max(40).nullable(),
    prefs: prefsInput,
    score: z.number().int().min(0).max(100).optional(),
    total: z.number().int().min(1).max(100).optional(),
    /** Lama pengerjaan kuis dalam detik (maks. 3 jam). */
    durasi: z.number().int().min(0).max(10_800).optional(),
    /** Benar/salah tiap soal; k = kunci soal. */
    detail: z
      .array(
        z.object({
          k: z.string().regex(/^[0-9a-f]{1,8}$/),
          b: z.boolean(),
          /** Jawaban siswa yang dipilih/ditulis (untuk melihat pengecoh yang sering dipilih). */
          j: z.string().max(120).optional(),
          /** Jumlah petunjuk yang dibuka. */
          h: z.number().int().min(0).max(3).optional(),
        }),
      )
      .max(40)
      .optional(),
  })
  .refine((v) => v.score === undefined || v.total === undefined || v.score <= v.total, "skor melebihi jumlah soal");

/** Mencatat sesi siswa (cara belajar yang dipilih, skor kuis) untuk tab Rekap guru. Tanpa login. */
export async function POST(req: Request, { params }: Ctx) {
  return handle(async () => {
    const { kode } = await params;
    const input = await readJson(req, schema);
    const lesson = await getPublishedLesson(kode);
    if (!lesson) return fail("Materi tidak ditemukan.", 404);
    if (input.kind === "confused" && !input.feedback) return fail("Pilih bagian yang belum dipahami.", 422);
    await recordStudentEvent({
      lessonId: lesson.id,
      audienceId: lesson.audience_id,
      feedback: input.kind === "confused" ? input.feedback : undefined,
      eventId: input.eventId,
      occurredAt: input.occurredAt,
      sessionId: input.sessionId,
      kind: input.kind,
      alias: input.alias || null,
      prefs: input.prefs,
      score: input.kind === "quiz" ? input.score : undefined,
      total: input.kind === "quiz" ? input.total : undefined,
      durationSec: input.kind === "quiz" ? input.durasi : undefined,
      detail: input.kind === "quiz" ? input.detail : undefined,
    });
    return ok({ ok: true });
  });
}
