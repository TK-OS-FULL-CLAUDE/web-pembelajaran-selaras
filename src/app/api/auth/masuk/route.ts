import { z } from "zod";
import { setSessionCookie } from "@/lib/auth";
import { fail, handle, ok, readJson } from "@/lib/api";
import { getDb } from "@/lib/db";
import { verifyPassword } from "@/lib/password";

const schema = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  password: z.string().min(1).max(200),
});

const MAX_FAILS = 5;
const WINDOW = "15 minutes";

export async function POST(req: Request) {
  return handle(async () => {
    const { email, password } = await readJson(req, schema);
    const sql = await getDb();

    // Batasi tebak-tebakan kata sandi: maksimal 5 gagal per email dalam 15 menit.
    const [{ fails }] = await sql<{ fails: number }[]>`
      select count(*)::int as fails from auth_attempts
      where email = ${email} and ok = false and created_at > now() - ${WINDOW}::interval`;
    if (fails >= MAX_FAILS) {
      return fail("Terlalu banyak percobaan masuk yang gagal. Coba lagi 15 menit lagi.", 429);
    }

    const rows = await sql<{ id: string; password_hash: string | null }[]>`
      select id, password_hash from teachers where email = ${email}`;
    const teacher = rows[0];
    if (teacher && !teacher.password_hash) {
      // Akun ini dibuat lewat "Masuk dengan Google" dan tidak punya kata sandi.
      return fail(
        "Akun ini dibuat dengan Google dan belum punya kata sandi. Masuk dengan Google, lalu buat kata sandi di halaman Profil.",
        401,
      );
    }
    const success = !!teacher?.password_hash && verifyPassword(password, teacher.password_hash);

    await sql`insert into auth_attempts (email, ok) values (${email}, ${success})`;
    // Bersihkan catatan lama supaya tabel tetap kecil.
    await sql`delete from auth_attempts where created_at < now() - interval '1 day'`;

    if (!success) {
      const left = MAX_FAILS - fails - 1;
      return fail(
        left > 0 ? `Email atau kata sandi salah. Sisa ${left} percobaan.` : "Email atau kata sandi salah.",
        401,
      );
    }
    await sql`delete from auth_attempts where email = ${email} and ok = false`;
    await setSessionCookie(teacher.id);
    return ok({ ok: true });
  });
}
