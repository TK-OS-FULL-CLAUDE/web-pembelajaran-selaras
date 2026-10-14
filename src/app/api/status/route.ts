import { ok } from "@/lib/api";
import { databaseUrl, getDb } from "@/lib/db";
import { aiEnabled } from "@/lib/claude";

export const dynamic = "force-dynamic";

/** Cek cepat setelah deploy: buka /api/status di browser. */
export async function GET() {
  let database: "ok" | "belum diisi" | "gagal terhubung" = "ok";
  let detail: string | undefined;
  if (!databaseUrl()) {
    database = "belum diisi";
  } else {
    try {
      const sql = await getDb();
      await sql`select 1`;
    } catch (err) {
      database = "gagal terhubung";
      detail = (err as Error).message.slice(0, 200);
    }
  }
  return ok({
    database,
    detail,
    ai: aiEnabled() ? "aktif" : "nonaktif (ANTHROPIC_API_KEY kosong)",
    sessionSecret: process.env.SESSION_SECRET ? "diisi" : "memakai cadangan dari DATABASE_URL",
  });
}
