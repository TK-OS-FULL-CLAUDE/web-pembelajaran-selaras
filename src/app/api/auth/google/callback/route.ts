import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { sessionCookie } from "@/lib/auth";
import {
  GOOGLE_COOKIE_PATH,
  GOOGLE_STATE_COOKIE,
  appOrigin,
  googleCallbackUrl,
  googleConfig,
  googleProfileFromCode,
  signInWithGoogle,
} from "@/lib/google-auth";
import { GoogleLoginError, type GoogleErrorCode } from "@/lib/google-token";

export const dynamic = "force-dynamic";

function sameText(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Langkah 2 "Masuk dengan Google": Google mengembalikan guru ke sini dengan kode sekali pakai. */
export async function GET(req: NextRequest) {
  const origin = appOrigin(req);
  const finish = (res: NextResponse) => {
    res.cookies.set(GOOGLE_STATE_COOKIE, "", { path: GOOGLE_COOKIE_PATH, maxAge: 0 });
    return res;
  };
  const fail = (code: GoogleErrorCode) => finish(NextResponse.redirect(new URL(`/masuk?galat=${code}`, origin)));

  if (!googleConfig()) return fail("google-nonaktif");
  const params = req.nextUrl.searchParams;
  const googleError = params.get("error");
  if (googleError) return fail(googleError === "access_denied" ? "google-batal" : "google-gagal");

  const [state, verifier] = (req.cookies.get(GOOGLE_STATE_COOKIE)?.value ?? "").split(".");
  const returnedState = params.get("state") ?? "";
  const code = params.get("code") ?? "";
  if (!state || !verifier || !code || !sameText(state, returnedState)) return fail("google-kedaluwarsa");

  try {
    const profile = await googleProfileFromCode(code, verifier, googleCallbackUrl(req));
    const result = await signInWithGoogle(profile);
    if ("error" in result) return fail(result.error);
    const res = NextResponse.redirect(new URL(result.isNew ? "/guru/profil?baru=1" : "/guru", origin));
    const c = sessionCookie(result.teacherId);
    res.cookies.set(c.name, c.value, c.options);
    return finish(res);
  } catch (err) {
    if (err instanceof GoogleLoginError) {
      console.warn("[google]", err.message);
      return fail(err.code);
    }
    console.error(err);
    return fail("google-gagal");
  }
}
