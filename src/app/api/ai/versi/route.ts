import { z } from "zod";
import { fail, ok, readJson, withTeacher } from "@/lib/api";
import { makeRegionalVersion, makeSimpleVersion, makeSummaryVersion } from "@/lib/ai-tasks";
import { consumeAiQuota } from "@/lib/ai-quota";
import { getClass, getLesson } from "@/lib/data";
import { fingerprint } from "@/lib/text";
import { LANG_FOR_VERSION, type LessonVersion } from "@/lib/types";

export const maxDuration = 60;

const schema = z.object({
  lessonId: z.string().uuid(),
  jenis: z.enum(["mudah", "ringkasan", "jawa", "sunda"]),
  // isi editor terbaru (bisa belum tersimpan); bila kosong dipakai isi di database
  body: z.string().max(30_000).optional(),
});

/** Membuat DRAF versi dengan AI. Draf selalu checked=false sampai guru mengeceknya. */
export async function POST(req: Request) {
  return withTeacher(async (teacher) => {
    const input = await readJson(req, schema);
    const lesson = await getLesson(teacher.id, input.lessonId);
    if (!lesson) return fail("Materi tidak ditemukan.", 404);

    const body = (input.body ?? lesson.body).trim();
    if (body.length < 40) return fail("Materi asli terlalu pendek untuk dibuatkan versi.", 422);

    const cls = lesson.class_id ? await getClass(teacher.id, lesson.class_id) : null;
    const grade = cls?.grade || "siswa SD";
    await consumeAiQuota(teacher.id, "versi");

    let version: LessonVersion;
    let suggestedGlossary = undefined as LessonVersion["glossary"] | undefined;

    if (input.jenis === "mudah") {
      const result = await makeSimpleVersion({ body, grade, subject: lesson.subject });
      version = {
        text: result.text,
        glossary: [],
        origin: "ai",
        checked: false,
        basedOn: fingerprint(body),
        updatedAt: new Date().toISOString(),
      };
      suggestedGlossary = result.glossary;
    } else if (input.jenis === "ringkasan") {
      const result = await makeSummaryVersion({ body, grade, subject: lesson.subject });
      version = {
        text: result.text,
        glossary: [],
        origin: "ai",
        checked: false,
        basedOn: fingerprint(body),
        updatedAt: new Date().toISOString(),
      };
    } else {
      const result = await makeRegionalVersion({ body, grade, lang: LANG_FOR_VERSION[input.jenis], subject: lesson.subject });
      version = {
        text: result.text,
        glossary: result.glossary,
        origin: "ai",
        checked: false,
        basedOn: fingerprint(body),
        updatedAt: new Date().toISOString(),
      };
    }

    // Tidak disimpan di sini: editor memasukkan draf ke isinya lalu menyimpan lewat simpan otomatis,
    // supaya hanya ada satu jalur tulis ke materi (lihat deteksi konflik di PATCH /api/materi/:id).
    return ok({ version, suggestedGlossary });
  });
}
