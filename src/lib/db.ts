import "server-only";
import postgres from "postgres";
import { SCHEMA_STATEMENTS } from "./schema";
import { seedDemo } from "./seed";

export type Sql = postgres.Sql;

declare global {
  var __selarasSql: Sql | undefined;
  var __selarasReady: Promise<void> | undefined;
}

export class MissingDatabaseError extends Error {
  constructor() {
    super("DATABASE_URL belum diisi. Tambahkan connection string Postgres (mis. Supabase) di environment variables.");
    this.name = "MissingDatabaseError";
  }
}

/** Menerima DATABASE_URL (Supabase/Neon manual) atau POSTGRES_URL (integrasi Vercel Marketplace). */
export function databaseUrl(): string | undefined {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || undefined;
}

/**
 * Buang parameter query (mis. ?sslmode=require, ?pgbouncer=true, ?supa=...) dari URL.
 * postgres.js meneruskan parameter asing ke server dan bisa ditolak; SSL diatur lewat opsi di bawah.
 */
function cleanUrl(raw: string): string {
  try {
    const url = new URL(raw);
    url.search = "";
    return url.toString();
  } catch {
    return raw;
  }
}

function createClient(): Sql {
  const raw = databaseUrl();
  if (!raw) throw new MissingDatabaseError();
  const url = cleanUrl(raw);
  const isLocal = /@(localhost|127\.0\.0\.1)(:|\/)/.test(url);
  const sslDisabled = process.env.DATABASE_SSL === "disable" || isLocal;
  return postgres(url, {
    // Pooler mode transaksi (Supabase port 6543) tidak mendukung prepared statement.
    prepare: false,
    max: 3,
    idle_timeout: 20,
    connect_timeout: 15,
    ssl: sslDisabled ? false : "require",
    onnotice: () => {},
  });
}

async function migrateAndSeed(sql: Sql) {
  await sql.begin(async (tx) => {
    // Kunci transaksi supaya dua server yang menyala bersamaan tidak membuat tabel dua kali.
    await tx`select pg_advisory_xact_lock(7311001)`;
    for (const statement of SCHEMA_STATEMENTS) {
      await tx.unsafe(statement);
    }
    await seedDemo(tx as unknown as Sql, { reset: false });
  });
}

/** Mengembalikan klien database yang tabel dan data demonya sudah siap. */
export async function getDb(): Promise<Sql> {
  const sql = (globalThis.__selarasSql ??= createClient());
  if (!globalThis.__selarasReady) {
    globalThis.__selarasReady = migrateAndSeed(sql).catch((err) => {
      globalThis.__selarasReady = undefined;
      throw err;
    });
  }
  await globalThis.__selarasReady;
  return sql;
}
