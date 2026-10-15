import { z } from "zod";
import { fail, ok, readJson, withTeacher } from "@/lib/api";
import { describeImage } from "@/lib/ai-tasks";
import { consumeAiQuota } from "@/lib/ai-quota";
import { getClass, getLesson, getOwnImage } from "@/lib/data";

export const maxDuration = 60;

const schema = z.object({
  lessonId: z.string().uuid(),
  imageId: z.string().uuid(),
  caption: z.string().max(300).optional(),
  /** Teks materi di sekitar gambar, supaya deskripsinya nyambung dengan pelajaran. */
  nearby: z.string().max(4000).optional(),
});

/** Draf deskripsi gambar (alt text) dari AI. Tidak disimpan di sini: guru mengecek dan menyetujuinya di editor. */
export async function POST(req: Request) {
  return withTeacher(async (teacher) => {
    const input = await readJson(req, schema);
    const lesson = await getLesson(teacher.id, input.lessonId);
    if (!lesson) return fail("Materi tidak ditemukan.", 404);
    const image = await getOwnImage(teacher.id, input.imageId);
    if (!image) return fail("Gambar tidak ditemukan.", 404);
    if (!["image/jpeg", "image/png", "image/webp"].includes(image.mime)) {
      return fail("Gambar ini tidak bisa dibaca AI. Tulis deskripsinya sendiri.", 422);
    }
    const cls = lesson.class_id ? await getClass(teacher.id, lesson.class_id) : null;
    await consumeAiQuota(teacher.id, "alt");
    const result = await describeImage(
      { mimeType: image.mime, base64: Buffer.from(image.data).toString("base64") },
      { caption: input.caption, title: lesson.title, nearby: input.nearby, grade: cls?.grade },
    );
    return ok({ alt: result.alt, caption: result.caption });
  });
}
