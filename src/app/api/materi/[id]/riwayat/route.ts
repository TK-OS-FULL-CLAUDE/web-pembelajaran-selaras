import { z } from "zod";
import { fail, ok, readJson, withTeacher } from "@/lib/api";
import { getLesson } from "@/lib/data";
import { getRevision, listRevisions, restoreRevision } from "@/lib/lesson-history";
type Context = { params: Promise<{ id: string }> };
export async function GET(req: Request, { params }: Context) {
  return withTeacher(async (teacher) => {
    const { id } = await params;
    if (!await getLesson(teacher.id, id)) return fail("Materi tidak ditemukan.", 404);
    const revision = new URL(req.url).searchParams.get("revision");
    if (revision !== null) {
      if (!/^\d{1,9}$/.test(revision)) return fail("Nomor revisi tidak valid.");
      const snapshot = await getRevision(teacher.id, id, Number(revision));
      return snapshot ? ok({ snapshot }) : fail("Revisi tidak ditemukan.", 404);
    }
    return ok({ revisions: await listRevisions(teacher.id, id) });
  });
}
export async function POST(req: Request, { params }: Context) {
  return withTeacher(async (teacher) => {
    const { id } = await params;
    const input = await readJson(req, z.object({ revision: z.number().int().positive(), baseRevision: z.number().int().positive() }));
    const result = await restoreRevision(teacher.id, id, input.revision, input.baseRevision);
    if (!result || (!result.ok && result.reason === "not_found")) return fail("Revisi tidak ditemukan.", 404);
    if (!result.ok) return fail("Materi berubah di tempat lain. Muat ulang sebelum memulihkan revisi.", 409);
    return ok({ revision: result.lesson.revision });
  });
}
