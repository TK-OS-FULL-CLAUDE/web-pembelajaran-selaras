import { fail, ok, withTeacher } from "@/lib/api";
import { getDb, type Sql } from "@/lib/db";
import { seedDemo } from "@/lib/seed";

/** Mengembalikan data akun demo ke kondisi awal. Hanya untuk akun demo. */
export async function POST() {
  return withTeacher(async (teacher) => {
    if (!teacher.is_demo) return fail("Reset hanya tersedia untuk akun demo.", 403);
    const sql = await getDb();
    await sql.begin(async (tx) => {
      await tx`select pg_advisory_xact_lock(7311001)`;
      await seedDemo(tx as unknown as Sql, { reset: true });
    });
    return ok({ ok: true });
  });
}
