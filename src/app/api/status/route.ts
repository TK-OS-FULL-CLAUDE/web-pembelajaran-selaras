import { ok } from "@/lib/api";
import { databaseUrl, getDb } from "@/lib/db";
import { aiProviders } from "@/lib/claude";
import { aiLimitPerHour } from "@/lib/ai-quota";
import { googleEnabled } from "@/lib/google-auth";

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
    ai: aiProviders().length
      ? `aktif: ${aiProviders().join(" + ")}`
      : "nonaktif (ANTHROPIC_API_KEY dan GEMINI_API_KEY kosong)",
    aiBatasPerJam: aiLimitPerHour(),
    sessionSecret: process.env.SESSION_SECRET ? "diisi" : "memakai cadangan dari DATABASE_URL",
    masukGoogle: googleEnabled() ? "aktif" : "nonaktif (GOOGLE_CLIENT_ID dan GOOGLE_CLIENT_SECRET kosong)",
  });
}
