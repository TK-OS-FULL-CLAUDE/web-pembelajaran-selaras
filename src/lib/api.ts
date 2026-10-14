import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentTeacher } from "./auth";
import { MissingDatabaseError } from "./db";
import { AiError } from "./claude";
import type { TeacherRow } from "./types";

export function ok<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export class BadRequest extends Error {}

export async function readJson<T>(req: Request, schema: z.ZodType<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new BadRequest("Data yang dikirim tidak valid.");
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    throw new BadRequest(
      first ? `Isian tidak valid: ${first.path.join(".") || "data"} — ${first.message}` : "Isian tidak valid.",
    );
  }
  return parsed.data;
}

/** Membungkus route handler: menerjemahkan error menjadi pesan yang jelas untuk pengguna. */
export async function handle(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof BadRequest) return fail(err.message, 400);
    if (err instanceof AiError) return fail(err.message, err.status);
    if (err instanceof MissingDatabaseError) return fail(err.message, 503);
    console.error(err);
    return fail("Terjadi kesalahan di server. Coba lagi.", 500);
  }
}

/** Route handler yang hanya boleh diakses guru yang sudah masuk. */
export async function withTeacher(fn: (teacher: TeacherRow) => Promise<Response>): Promise<Response> {
  return handle(async () => {
    const teacher = await getCurrentTeacher();
    if (!teacher) return fail("Sesi berakhir. Silakan masuk lagi.", 401);
    return fn(teacher);
  });
}

// ---------- Skema validasi bersama ----------

export const glossaryInput = z
  .array(z.object({ kata: z.string().trim().max(80), arti: z.string().trim().max(400) }))
  .max(40);

export const needsInput = z.object({
  totalSiswa: z.coerce.number().int().min(0).max(200),
  lowVision: z.coerce.number().int().min(0).max(200),
  tuli: z.coerce.number().int().min(0).max(200),
  disleksia: z.coerce.number().int().min(0).max(200),
  sulitFokus: z.coerce.number().int().min(0).max(200),
  bahasaDaerah: z.coerce.number().int().min(0).max(200),
  bahasa: z.enum(["jw", "su"]).nullable(),
});

export const classInput = z.object({
  name: z.string().trim().min(1, "Nama kelas wajib diisi").max(80),
  grade: z.string().trim().max(80).default(""),
  needs: needsInput,
});

const versionInput = z.object({
  text: z.string().max(30_000),
  glossary: glossaryInput,
  origin: z.enum(["ai", "guru"]),
  checked: z.boolean(),
  lang: z.enum(["jw", "su"]).optional(),
  basedOn: z.string().max(40).optional(),
  updatedAt: z.string().max(40),
});

export const versionsInput = z.object({
  mudah: versionInput.optional(),
  daerah: versionInput.optional(),
});

export const quizInput = z
  .array(
    z.object({
      q: z.string().max(500),
      options: z.array(z.string().max(300)).min(2).max(6),
      answer: z.number().int().min(0).max(5),
      explain: z.string().max(800),
      origin: z.enum(["ai", "guru"]).optional(),
    }),
  )
  .max(30);

export const prefsInput = z.object({
  versi: z.enum(["asli", "mudah", "daerah"]),
  besar: z.boolean(),
  kontras: z.boolean(),
  spasi: z.boolean(),
  dengar: z.boolean(),
});
