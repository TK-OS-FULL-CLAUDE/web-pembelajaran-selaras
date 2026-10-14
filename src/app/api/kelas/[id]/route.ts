import { classInput, fail, ok, readJson, withTeacher } from "@/lib/api";
import { deleteClass, updateClass } from "@/lib/data";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  return withTeacher(async (teacher) => {
    const { id } = await params;
    const input = await readJson(req, classInput);
    const row = await updateClass(teacher.id, id, input);
    if (!row) return fail("Kelas tidak ditemukan.", 404);
    return ok({ id: row.id });
  });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  return withTeacher(async (teacher) => {
    const { id } = await params;
    const removed = await deleteClass(teacher.id, id);
    if (!removed) return fail("Kelas tidak ditemukan.", 404);
    return ok({ ok: true });
  });
}
