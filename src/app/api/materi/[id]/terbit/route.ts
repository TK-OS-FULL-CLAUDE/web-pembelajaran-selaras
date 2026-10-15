import { fail, ok, withTeacher } from "@/lib/api";
import { getLesson, publishLesson, unpublishLesson } from "@/lib/data";
import { figureIds } from "@/lib/text";

type Ctx = { params: Promise<{ id: string }> };

/** Terbitkan: hanya bila materi asli terisi, semua versi sudah dicek, dan semua gambar punya deskripsi yang sudah dicek. */
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
    const texts = [lesson.body, ...Object.values(lesson.versions).map((v) => (v?.checked ? v.text : ""))];
    const ids = [...new Set(texts.flatMap(figureIds))];
    const figures = lesson.figures ?? {};
    const missing = ids.filter((fid) => !figures[fid]?.alt?.trim() || !figures[fid]?.altChecked);
    if (missing.length) {
      return fail(
        `${missing.length} gambar belum punya deskripsi yang dicek guru. Deskripsi ini dibacakan untuk siswa tunanetra dan low vision; periksa di tab Materi → Gambar.`,
        422,
      );
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
