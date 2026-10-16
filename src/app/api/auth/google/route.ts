import { NextResponse, type NextRequest } from "next/server";
import {
  GOOGLE_COOKIE_PATH,
  GOOGLE_STATE_COOKIE,
  appOrigin,
  googleCallbackUrl,
  googleConfig,
} from "@/lib/google-auth";
import { buildGoogleAuthUrl, pkceChallenge, randomToken } from "@/lib/google-token";

export const dynamic = "force-dynamic";

/** Langkah 1 "Masuk dengan Google": arahkan guru ke halaman pilih akun Google. */
export async function GET(req: NextRequest) {
  const cfg = googleConfig();
  if (!cfg) return NextResponse.redirect(new URL("/masuk?galat=google-nonaktif", appOrigin(req)));

  // state mencegah CSRF; code_verifier (PKCE) memastikan kode hanya bisa ditukar oleh browser ini.
  const state = randomToken(24);
  const verifier = randomToken(48);
  const res = NextResponse.redirect(
    buildGoogleAuthUrl({
      clientId: cfg.clientId,
      redirectUri: googleCallbackUrl(req),
      state,
      codeChallenge: pkceChallenge(verifier),
      authUrl: cfg.authUrl,
    }),
  );
  res.cookies.set(GOOGLE_STATE_COOKIE, `${state}.${verifier}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: GOOGLE_COOKIE_PATH,
    maxAge: 600,
  });
  return res;
}
