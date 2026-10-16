import "server-only";
import { getDb } from "./db";
import {
  GOOGLE_TOKEN_URL,
  GoogleLoginError,
  profileFromIdToken,
  type GoogleErrorCode,
  type GoogleProfile,
} from "./google-token";

// "Masuk dengan Google" untuk guru. Aktif hanya bila GOOGLE_CLIENT_ID dan GOOGLE_CLIENT_SECRET diisi.
// Siswa tetap tanpa akun.

export const GOOGLE_STATE_COOKIE = "selaras_google";
export const GOOGLE_COOKIE_PATH = "/api/auth/google";

export function googleConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;
  return {
    clientId,
    clientSecret,
    // Hanya untuk pengujian dengan server Google palsu; di produksi biarkan kosong.
    authUrl: process.env.GOOGLE_AUTH_URL?.trim() || undefined,
    tokenUrl: process.env.GOOGLE_TOKEN_URL?.trim() || GOOGLE_TOKEN_URL,
  };
}

export function googleEnabled(): boolean {
  return googleConfig() !== null;
}

/** Alamat app. APP_URL dipakai bila diisi supaya redirect URI selalu sama dengan yang didaftarkan di Google. */
export function appOrigin(req: { nextUrl: { origin: string } }): string {
  return process.env.APP_URL?.trim().replace(/\/+$/, "") || req.nextUrl.origin;
}

export function googleCallbackUrl(req: { nextUrl: { origin: string } }): string {
  return `${appOrigin(req)}${GOOGLE_COOKIE_PATH}/callback`;
}

/** Menukar kode dari Google dengan ID token, lalu membaca profil guru dari token itu. */
export async function googleProfileFromCode(code: string, verifier: string, redirectUri: string): Promise<GoogleProfile> {
  const cfg = googleConfig();
  if (!cfg) throw new GoogleLoginError("google-nonaktif", "Google belum dikonfigurasi.");
  const res = await fetch(cfg.tokenUrl, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
      code_verifier: verifier,
    }),
    signal: AbortSignal.timeout(10_000),
    cache: "no-store",
  });
  const data = (await res.json().catch(() => null)) as { id_token?: string; error?: string } | null;
  if (!res.ok || !data?.id_token) {
    throw new GoogleLoginError("google-gagal", `Penukaran kode Google gagal: HTTP ${res.status} ${data?.error ?? ""}`);
  }
  return profileFromIdToken(data.id_token, cfg.clientId);
}

/**
 * Cari atau buat akun guru untuk profil Google ini.
 * Email yang sudah terdaftar dengan kata sandi TIDAK ditautkan otomatis: alamat itu didaftarkan tanpa verifikasi,
 * jadi menautkannya bisa membuka akun orang lain yang sengaja memakai email kita lebih dulu.
 */
export async function signInWithGoogle(
  profile: GoogleProfile,
): Promise<{ teacherId: string; isNew: boolean } | { error: GoogleErrorCode }> {
  const sql = await getDb();
  const bySub = await sql<{ id: string }[]>`select id from teachers where google_sub = ${profile.sub}`;
  if (bySub[0]) return { teacherId: bySub[0].id, isNew: false };

  const byEmail = await sql<{ id: string; password_hash: string | null; is_demo: boolean }[]>`
    select id, password_hash, is_demo from teachers where email = ${profile.email}`;
  const existing = byEmail[0];
  if (existing) {
    if (existing.is_demo) return { error: "google-demo" };
    if (existing.password_hash) return { error: "google-email-sandi" };
    // Akun Google lama dengan email yang sama (mis. akun Google dibuat ulang): perbarui pengenalnya.
    await sql`update teachers set google_sub = ${profile.sub} where id = ${existing.id}`;
    return { teacherId: existing.id, isNew: false };
  }

  const [row] = await sql<{ id: string }[]>`
    insert into teachers (email, name, school, password_hash, google_sub)
    values (${profile.email}, ${profile.name}, null, null, ${profile.sub})
    on conflict do nothing
    returning id`;
  if (!row) return { error: "google-gagal" };
  return { teacherId: row.id, isNew: true };
}
