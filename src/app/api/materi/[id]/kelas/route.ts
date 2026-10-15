import { z } from "zod";
import { fail, ok, readJson, withTeacher } from "@/lib/api";
import { getLesson, listLessonAudiences, setLessonAudience } from "@/lib/data";

type Ctx = { params: Promise<{ id: string }> };
export async function GET(_req: Request, { params }: Ctx) {
  return withTeacher(async (teacher) => {
    const { id } = await params;
    if (!await getLesson(teacher.id, id)) return fail("Materi tidak ditemukan.", 404);
    return ok({ audiences: await listLessonAudiences(teacher.id, id) });
  });
}
export async function POST(req: Request, { params }: Ctx) {
  return withTeacher(async (teacher) => {
    const { id } = await params;
    const input = await readJson(req, z.object({ classId: z.uuid(), active: z.boolean() }));
    const row = await setLessonAudience(teacher.id, id, input.classId, input.active);
    if (!row) return fail("Kelas tidak ditemukan, merupakan kelas asal, atau materi belum pernah diterbitkan.", 422);
    return ok({ audiences: await listLessonAudiences(teacher.id, id) });
  });
}
