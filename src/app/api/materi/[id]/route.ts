import { z } from "zod";
import {
  figuresInput,
  fail,
  glossaryInput,
  ok,
  quizInput,
  readJson,
  teachingKitInput,
  versionsInput,
  withTeacher,
} from "@/lib/api";
import { deleteLesson, updateLesson } from "@/lib/data";

type Ctx = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  title: z.string().trim().min(1, "Judul wajib diisi").max(160).optional(),
  subject: z.string().trim().max(80).optional(),
  body: z.string().max(30_000).optional(),
  glossary: glossaryInput.optional(),
  versions: versionsInput.optional(),
  quiz: quizInput.optional(),
  figures: figuresInput.optional(),
  topic: z.string().trim().max(120).optional(),
  target_grade: z.string().trim().max(80).optional(),
  is_template: z.boolean().optional(),
  teachingKit: teachingKitInput.optional(),
  // Revisi yang dilihat editor; bila materi sudah diubah di tempat lain, simpan ditolak (409).
  baseRevision: z.number().int().min(1).optional(),
  // true = guru sengaja menimpa perubahan dari tempat lain.
  force: z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: Ctx) {
  return withTeacher(async (teacher) => {
    const { id } = await params;
    const { baseRevision, force, ...patch } = await readJson(req, patchSchema);
    const result = await updateLesson(teacher.id, id, patch, { baseRevision, force });
    if (result.ok) {
      return ok({ revision: result.lesson.revision, updatedAt: result.lesson.updated_at });
    }
    if (result.reason === "conflict") {
      return Response.json(
        {
          error: "Materi ini baru saja diubah di tab atau perangkat lain.",
          conflict: true,
          revision: result.lesson.revision,
        },
        { status: 409 },
      );
    }
    return fail("Materi tidak ditemukan.", 404);
  });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  return withTeacher(async (teacher) => {
    const { id } = await params;
    const removed = await deleteLesson(teacher.id, id);
    if (!removed) return fail("Materi tidak ditemukan.", 404);
    return ok({ ok: true });
  });
}
