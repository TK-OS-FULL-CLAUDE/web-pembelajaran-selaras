import { z } from "zod";
import { fail, ok, readJson, withTeacher } from "@/lib/api";
import { getDb } from "@/lib/db";

const schema = z.object({
  name: z.string().trim().min(2, "Nama minimal 2 huruf").max(100),
  school: z.string().trim().max(150).optional().default(""),
});

/** Ubah nama dan sekolah guru (tampil di halaman siswa dan identitas modul ajar). */
export async function PATCH(req: Request) {
  return withTeacher(async (teacher) => {
    // Akun demo dipakai bersama dan "Reset data demo" tidak mengembalikan profil, jadi tidak boleh diubah.
    if (teacher.is_demo) return fail("Profil akun demo bersama tidak bisa diubah.", 403);
    const input = await readJson(req, schema);
    const sql = await getDb();
    await sql`update teachers set name = ${input.name}, school = ${input.school || null} where id = ${teacher.id}`;
    return ok({ ok: true });
  });
}
