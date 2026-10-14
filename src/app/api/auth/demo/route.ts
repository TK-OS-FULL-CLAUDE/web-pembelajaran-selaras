import { setSessionCookie } from "@/lib/auth";
import { fail, handle, ok } from "@/lib/api";
import { getDb } from "@/lib/db";
import { DEMO_EMAIL } from "@/lib/demo-content";

/** Masuk sebagai guru demo dengan sekali klik (untuk juri dan latihan presentasi). */
export async function POST() {
  return handle(async () => {
    const sql = await getDb();
    const rows = await sql<{ id: string }[]>`select id from teachers where email = ${DEMO_EMAIL}`;
    if (!rows[0]) return fail("Akun demo belum tersedia.", 500);
    await setSessionCookie(rows[0].id);
    return ok({ ok: true });
  });
}
