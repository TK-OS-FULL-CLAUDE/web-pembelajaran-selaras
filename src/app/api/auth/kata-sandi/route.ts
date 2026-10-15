import { z } from "zod";
import { fail, ok, readJson, withTeacher } from "@/lib/api";
import { getDb } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";

const schema = z.object({
  current: z.string().max(200).optional().default(""),
  password: z.string().min(8, "Kata sandi minimal 8 karakter").max(200),
});

/**
 * Buat atau ganti kata sandi. Akun yang dibuat dengan Google boleh membuat kata sandi tanpa kata sandi lama,
 * supaya bisa masuk juga dengan email dan kata sandi. Akun yang sudah punya kata sandi wajib memasukkan yang lama.
 */
export async function POST(req: Request) {
  return withTeacher(async (teacher) => {
    if (teacher.is_demo) return fail("Kata sandi akun demo bersama tidak bisa diubah.", 403);
    const input = await readJson(req, schema);
    const sql = await getDb();
    const [row] = await sql<{ password_hash: string | null }[]>`select password_hash from teachers where id = ${teacher.id}`;
    if (row?.password_hash && !verifyPassword(input.current, row.password_hash)) {
      return fail("Kata sandi lama salah.", 400);
    }
    await sql`update teachers set password_hash = ${hashPassword(input.password)} where id = ${teacher.id}`;
    return ok({ ok: true, created: !row?.password_hash });
  });
}
