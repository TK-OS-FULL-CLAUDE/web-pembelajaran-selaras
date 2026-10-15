// Uji bagian murni "Masuk dengan Google" (src/lib/google-token.ts). Tanpa database, tanpa jaringan.
//   npm run test:google
import assert from "node:assert/strict";
import {
  GOOGLE_ERRORS,
  GoogleLoginError,
  buildGoogleAuthUrl,
  pkceChallenge,
  profileFromIdToken,
  randomToken,
} from "../src/lib/google-token";

let passed = 0;
function test(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.log(`  ✗ ${name}`);
    throw err;
  }
}

const CLIENT = "123-abc.apps.googleusercontent.com";
const NOW = 1_800_000_000;
const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
const token = (claims: Record<string, unknown>) => `${b64({ alg: "RS256", typ: "JWT" })}.${b64(claims)}.tanda-tangan`;
const valid = {
  iss: "https://accounts.google.com",
  aud: CLIENT,
  sub: "1234567890",
  email: "Rina.Guru@Gmail.com",
  email_verified: true,
  name: "Rina Kartika",
  exp: NOW + 3600,
};
const code = (fn: () => unknown) => {
  try {
    fn();
  } catch (err) {
    return err instanceof GoogleLoginError ? err.code : "lain";
  }
  return "lolos";
};

console.log("Masuk dengan Google");

test("PKCE S256: base64url(SHA-256(verifier)) tanpa padding", () => {
  // Nilai pembanding dihitung terpisah dengan Python (hashlib + base64.urlsafe_b64encode).
  assert.equal(pkceChallenge("kode-verifikasi-contoh-untuk-uji-pkce-selaras-2026"), "0Fr2w3_YKsVEp3kOP41uLTR6tdiQaCuJy_dJ6l0JDSs");
  const a = randomToken(32);
  assert.match(a, /^[A-Za-z0-9_-]{43}$/);
  assert.notEqual(a, randomToken(32));
});

test("URL Google memuat client, redirect, scope, state, dan PKCE", () => {
  const url = new URL(
    buildGoogleAuthUrl({ clientId: CLIENT, redirectUri: "http://localhost:3000/api/auth/google/callback", state: "s1", codeChallenge: "c1" }),
  );
  assert.equal(url.origin + url.pathname, "https://accounts.google.com/o/oauth2/v2/auth");
  const p = url.searchParams;
  assert.equal(p.get("client_id"), CLIENT);
  assert.equal(p.get("redirect_uri"), "http://localhost:3000/api/auth/google/callback");
  assert.equal(p.get("response_type"), "code");
  assert.equal(p.get("scope"), "openid email profile");
  assert.equal(p.get("state"), "s1");
  assert.equal(p.get("code_challenge"), "c1");
  assert.equal(p.get("code_challenge_method"), "S256");
});

test("ID token yang benar menghasilkan profil (email huruf kecil)", () => {
  assert.deepEqual(profileFromIdToken(token(valid), CLIENT, NOW), {
    sub: "1234567890",
    email: "rina.guru@gmail.com",
    name: "Rina Kartika",
  });
  assert.equal(profileFromIdToken(token({ ...valid, iss: "accounts.google.com", aud: [CLIENT, "lain"] }), CLIENT, NOW).sub, "1234567890");
  assert.equal(profileFromIdToken(token({ ...valid, name: "" }), CLIENT, NOW).name, "rina.guru", "nama dari email");
});

test("ID token ditolak: penerbit lain, aplikasi lain, kedaluwarsa, email belum terverifikasi, format rusak", () => {
  assert.equal(code(() => profileFromIdToken(token({ ...valid, iss: "https://evil.example" }), CLIENT, NOW)), "google-gagal");
  assert.equal(code(() => profileFromIdToken(token({ ...valid, aud: "app-lain" }), CLIENT, NOW)), "google-gagal");
  assert.equal(code(() => profileFromIdToken(token({ ...valid, exp: NOW - 3600 }), CLIENT, NOW)), "google-kedaluwarsa");
  assert.equal(code(() => profileFromIdToken(token({ ...valid, email_verified: false }), CLIENT, NOW)), "google-email-belum-terverifikasi");
  assert.equal(code(() => profileFromIdToken(token({ ...valid, sub: "" }), CLIENT, NOW)), "google-gagal");
  assert.equal(code(() => profileFromIdToken("bukan.jwt", CLIENT, NOW)), "google-gagal");
  assert.equal(code(() => profileFromIdToken("a.!!!.c", CLIENT, NOW)), "google-gagal");
});

test("Setiap kode galat punya pesan untuk guru", () => {
  for (const [k, v] of Object.entries(GOOGLE_ERRORS)) assert.ok(v.length > 10, k);
});

console.log(`\n${passed} uji lulus`);
