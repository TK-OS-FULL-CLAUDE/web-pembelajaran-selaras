import { fail, ok, withTeacher } from "@/lib/api";
import { getLesson, publishLesson, unpublishLesson } from "@/lib/data";

type Ctx = { params: Promise<{ id: string }> };

/** Terbitkan: hanya bila materi asli terisi dan semua versi sudah dicek guru. */
export async function POST(_req: Request, { params }: Ctx) {
  return withTeacher(async (teacher) => {
    const { id } = await params;
    const lesson = await getLesson(teacher.id, id);
    if (!lesson) return fail("Materi tidak ditemukan.", 404);
    if (lesson.body.trim().length < 20) {
      return fail("Isi materi asli dulu sebelum menerbitkan.", 422);
    }
    const unchecked = Object.entries(lesson.versions).filter(([, v]) => v && v.text.trim() && !v.checked);
    if (unchecked.length) {
      return fail('Masih ada versi yang belum ditandai "Sudah dicek". Periksa tab Versi.', 422);
    }
    const row = await publishLesson(teacher.id, id);
    return ok({ status: row?.status, shareCode: row?.share_code });
  });
}

/** Tarik dari siswa: link berhenti bisa dibuka, kodenya tetap disimpan untuk diterbitkan lagi. */
export async function DELETE(_req: Request, { params }: Ctx) {
  return withTeacher(async (teacher) => {
    const { id } = await params;
    const row = await unpublishLesson(teacher.id, id);
    if (!row) return fail("Materi tidak ditemukan.", 404);
    return ok({ status: row.status });
  });
}
