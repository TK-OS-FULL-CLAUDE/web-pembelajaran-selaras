import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { databaseUrl, getDb } from "./db";
import type { TeacherRow } from "./types";

const COOKIE_NAME = "selaras_sesi";
const SESSION_DAYS = 14;

function secret(): string {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  // Cadangan bila SESSION_SECRET belum diisi: diturunkan dari DATABASE_URL (rahasia & stabil).
  const url = databaseUrl();
  if (!url) throw new Error("SESSION_SECRET dan DATABASE_URL belum diisi.");
  return createHash("sha256").update(`selaras-session:${url}`).digest("hex");
}

function sign(value: string): string {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

export function createSessionToken(teacherId: string): string {
  const exp = Math.floor(Date.now() / 1000) + SESSION_DAYS * 86400;
  const payload = `${teacherId}.${exp}`;
  return `${payload}.${sign(payload)}`;
}

function readSessionToken(token: string | undefined): string | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [teacherId, exp, sig] = parts;
  const expected = Buffer.from(sign(`${teacherId}.${exp}`));
  const actual = Buffer.from(sig);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  if (Number(exp) < Date.now() / 1000) return null;
  return teacherId;
}

/** Nama, isi, dan pengaturan cookie sesi (dipakai juga untuk respons redirect, mis. setelah masuk dengan Google). */
export function sessionCookie(teacherId: string) {
  return {
    name: COOKIE_NAME,
    value: createSessionToken(teacherId),
    options: {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_DAYS * 86400,
    },
  };
}

export async function setSessionCookie(teacherId: string) {
  const jar = await cookies();
  const c = sessionCookie(teacherId);
  jar.set(c.name, c.value, c.options);
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

/** Guru yang sedang masuk, atau null. */
export async function getCurrentTeacher(): Promise<TeacherRow | null> {
  const jar = await cookies();
  const teacherId = readSessionToken(jar.get(COOKIE_NAME)?.value);
  if (!teacherId) return null;
  const sql = await getDb();
  const rows = await sql<TeacherRow[]>`
    select id, email, name, school, is_demo from teachers where id = ${teacherId}`;
  return rows[0] ?? null;
}

/** Untuk halaman guru: arahkan ke halaman masuk bila belum login. */
export async function requireTeacher(): Promise<TeacherRow> {
  const teacher = await getCurrentTeacher();
  if (!teacher) redirect("/masuk");
  return teacher;
}

/** Cara masuk yang dimiliki akun guru: kata sandi, Google, atau keduanya. */
export async function getLoginMethods(teacherId: string): Promise<{ hasPassword: boolean; hasGoogle: boolean }> {
  const sql = await getDb();
  const [row] = await sql<{ has_password: boolean; has_google: boolean }[]>`
    select password_hash is not null as has_password, google_sub is not null as has_google
    from teachers where id = ${teacherId}`;
  return { hasPassword: row?.has_password ?? false, hasGoogle: row?.has_google ?? false };
}
