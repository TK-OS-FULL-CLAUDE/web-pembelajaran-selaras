import { z } from "zod";
import { fail, ok, readJson, withTeacher } from "@/lib/api";
import { createLesson, getClass } from "@/lib/data";

const schema = z.object({
  classId: z.string().uuid().nullable(),
  title: z.string().trim().min(1, "Judul wajib diisi").max(160),
  subject: z.string().trim().max(80).default(""),
  body: z.string().max(30_000).default(""),
});

export async function POST(req: Request) {
  return withTeacher(async (teacher) => {
    const input = await readJson(req, schema);
    if (input.classId && !(await getClass(teacher.id, input.classId))) {
      return fail("Kelas tidak ditemukan.", 404);
    }
    const row = await createLesson(teacher.id, input);
    return ok({ id: row.id }, 201);
  });
}
