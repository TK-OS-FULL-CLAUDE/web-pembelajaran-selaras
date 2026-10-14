import { z } from "zod";
import { fail, ok, readJson, withTeacher } from "@/lib/api";
import { duplicateLesson, getClass } from "@/lib/data";

type Ctx = { params: Promise<{ id: string }> };

const schema = z.object({ classId: z.string().uuid().nullable() });

/** Salin materi ke kelas mana pun milik guru (mis. kelas paralel). Salinan berstatus draf. */
export async function POST(req: Request, { params }: Ctx) {
  return withTeacher(async (teacher) => {
    const { id } = await params;
    const { classId } = await readJson(req, schema);
    if (classId && !(await getClass(teacher.id, classId))) return fail("Kelas tidak ditemukan.", 404);
    const copy = await duplicateLesson(teacher.id, id, classId);
    if (!copy) return fail("Materi tidak ditemukan.", 404);
    return ok({ id: copy.id }, 201);
  });
}
