import "server-only";
import { AiError } from "./ai-common";
import { getDb } from "./db";

// Batas pemakaian AI per akun guru, supaya kredit API tidak habis bila akun demo dipakai bersama
// (misalnya saat penjurian) atau tombol AI ditekan berulang-ulang.

const DEFAULT_LIMIT_PER_HOUR = 100;

export function aiLimitPerHour(): number {
  const n = Number(process.env.AI_LIMIT_PER_HOUR);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : DEFAULT_LIMIT_PER_HOUR;
}

/**
 * Catat satu permintaan AI untuk guru ini, atau tolak (HTTP 429) bila batas per jam sudah tercapai.
 * Panggil tepat sebelum memanggil AI, setelah input lolos validasi.
 */
export async function consumeAiQuota(teacherId: string, kind: "foto" | "versi" | "kuis" | "perangkat"): Promise<void> {
  const sql = await getDb();
  const limit = aiLimitPerHour();
  const [row] = await sql<{ used: number; oldest: Date | null }[]>`
    select count(*)::int as used, min(created_at) as oldest
    from ai_usage
    where teacher_id = ${teacherId} and created_at > now() - interval '1 hour'`;

  if (row.used >= limit) {
    const freeAt = row.oldest ? new Date(row.oldest).getTime() + 60 * 60_000 : Date.now() + 60 * 60_000;
    const minutes = Math.max(1, Math.ceil((freeAt - Date.now()) / 60_000));
    throw new AiError(
      `Batas pemakaian AI akun ini tercapai (${limit} permintaan per jam). Coba lagi dalam ${minutes} menit, atau tulis versinya secara manual.`,
      429,
    );
  }

  await sql`insert into ai_usage (teacher_id, kind) values (${teacherId}, ${kind})`;
  // Bersihkan catatan lama sesekali supaya tabel tetap kecil.
  if (Math.random() < 0.05) await sql`delete from ai_usage where created_at < now() - interval '1 day'`;
}
