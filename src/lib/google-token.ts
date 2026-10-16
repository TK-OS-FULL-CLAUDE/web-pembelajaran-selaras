// Bagian murni dari "Masuk dengan Google" (OAuth 2.0 + OpenID Connect, dengan PKCE).
// Tanpa database dan tanpa jaringan supaya bisa diuji: npm run test:google.

import { createHash, randomBytes } from "node:crypto";

export const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
export const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_ISSUERS = new Set(["https://accounts.google.com", "accounts.google.com"]);

/** Kode galat yang ditampilkan di halaman masuk (lihat GOOGLE_ERRORS). */
export type GoogleErrorCode =
  | "google-nonaktif"
  | "google-batal"
  | "google-kedaluwarsa"
  | "google-gagal"
  | "google-email-sandi"
  | "google-email-belum-terverifikasi"
  | "google-demo";

export const GOOGLE_ERRORS: Record<GoogleErrorCode, string> = {
  "google-nonaktif":
    "Masuk dengan Google belum diaktifkan di server ini (GOOGLE_CLIENT_ID dan GOOGLE_CLIENT_SECRET belum diisi).",
  "google-batal": "Masuk dengan Google dibatalkan.",
  "google-kedaluwarsa": "Sesi masuk dengan Google sudah kedaluwarsa. Silakan coba lagi.",
  "google-gagal": "Masuk dengan Google gagal. Coba lagi, atau masuk memakai email.",
  "google-email-sandi":
    "Email ini sudah terdaftar dengan kata sandi. Masuk memakai email dan kata sandi di bawah.",
  "google-email-belum-terverifikasi": "Email akun Google ini belum terverifikasi oleh Google.",
  "google-demo": "Email ini dipakai akun demo. Gunakan tombol Masuk sebagai guru demo.",
};

export class GoogleLoginError extends Error {
  constructor(
    public code: GoogleErrorCode,
    message: string,
  ) {
    super(message);
  }
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

/** code_challenge PKCE metode S256 (RFC 7636). */
export function pkceChallenge(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

export function buildGoogleAuthUrl(opts: {
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
  authUrl?: string;
}): string {
  const url = new URL(opts.authUrl || GOOGLE_AUTH_URL);
  url.search = new URLSearchParams({
    client_id: opts.clientId,
    redirect_uri: opts.redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state: opts.state,
    code_challenge: opts.codeChallenge,
    code_challenge_method: "S256",
    prompt: "select_account",
  }).toString();
  return url.toString();
}

export type GoogleProfile = { sub: string; email: string; name: string };

function decodeJwtPayload(token: string): Record<string, unknown> {
  const parts = token.split(".");
  if (parts.length !== 3) throw new GoogleLoginError("google-gagal", "ID token tidak berformat JWT.");
  try {
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    if (!payload || typeof payload !== "object") throw new Error("bukan objek");
    return payload as Record<string, unknown>;
  } catch {
    throw new GoogleLoginError("google-gagal", "Isi ID token tidak bisa dibaca.");
  }
}

/**
 * Membaca dan memeriksa klaim ID token dari Google.
 * Tanda tangan token tidak diperiksa ulang karena token diterima langsung dari endpoint token Google
 * lewat HTTPS dengan client secret (OpenID Connect Core 1.0, bagian 3.1.3.7, poin 6).
 */
export function profileFromIdToken(idToken: string, clientId: string, nowSec = Date.now() / 1000): GoogleProfile {
  const c = decodeJwtPayload(idToken);
  if (typeof c.iss !== "string" || !GOOGLE_ISSUERS.has(c.iss)) {
    throw new GoogleLoginError("google-gagal", "Penerbit ID token bukan Google.");
  }
  const aud = Array.isArray(c.aud) ? c.aud : [c.aud];
  if (!aud.includes(clientId)) throw new GoogleLoginError("google-gagal", "ID token bukan untuk aplikasi ini.");
  if (typeof c.exp !== "number" || c.exp < nowSec - 60) {
    throw new GoogleLoginError("google-kedaluwarsa", "ID token sudah kedaluwarsa.");
  }
  if (typeof c.sub !== "string" || !c.sub) throw new GoogleLoginError("google-gagal", "ID token tanpa sub.");
  const email = typeof c.email === "string" ? c.email.trim().toLowerCase() : "";
  if (!email) throw new GoogleLoginError("google-gagal", "Akun Google tidak memberikan email.");
  if (c.email_verified !== true && c.email_verified !== "true") {
    throw new GoogleLoginError("google-email-belum-terverifikasi", "Email belum terverifikasi.");
  }
  const rawName = typeof c.name === "string" ? c.name.trim() : "";
  const name = (rawName.length >= 2 ? rawName : email.split("@")[0]).slice(0, 100);
  return { sub: c.sub, email, name };
}
