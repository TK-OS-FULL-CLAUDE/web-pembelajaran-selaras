import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentTeacher } from "./auth";
import { MissingDatabaseError } from "./db";
import { AiError } from "./claude";
import { ImageQuotaError } from "./data";
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
    if (err instanceof ImageQuotaError) return fail(err.message, 413);
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
  basedOn: z.string().max(40).optional(),
  updatedAt: z.string().max(40),
});

export const versionsInput = z.object({
  mudah: versionInput.optional(),
  ringkasan: versionInput.optional(),
  jawa: versionInput.optional(),
  sunda: versionInput.optional(),
});

export const quizInput = z
  .array(
    z.object({
      type: z.enum(["pg", "pgk", "bs", "isian", "jodoh"]).optional(),
      concept: z.string().trim().max(100).optional(),
      q: z.string().max(600),
      options: z.array(z.string().max(300)).max(6),
      answer: z.number().int().min(0).max(5),
      answers: z.array(z.number().int().min(0).max(5)).max(6).optional(),
      accepted: z.array(z.string().max(120)).max(8).optional(),
      pairs: z
        .array(z.object({ kiri: z.string().max(200), kanan: z.string().max(200) }))
        .max(8)
        .optional(),
      explain: z.string().max(800),
      origin: z.enum(["ai", "guru"]).optional(),
    }),
  )
  .max(40);

export const figuresInput = z
  .record(
    z.string().regex(/^[A-Za-z0-9-]{8,64}$/),
    z.object({
      alt: z.string().max(1200),
      altOrigin: z.enum(["ai", "guru"]),
      altChecked: z.boolean(),
      width: z.number().int().min(1).max(20_000).optional(),
      height: z.number().int().min(1).max(20_000).optional(),
    }),
  )
  .refine((r) => Object.keys(r).length <= 120, "Terlalu banyak gambar dalam satu materi.");

// Perangkat ajar. Batas jumlah baris dibuat longgar karena baris kosong ikut tersimpan saat guru mengetik.
const kitText = (max: number) => z.string().max(max);
const kitLines = z.array(kitText(800)).max(40);
const tahapInput = z.object({ menit: z.number().int().min(0).max(600), langkah: kitLines });

const modulInput = z.object({
  identitas: z.object({
    penyusun: kitText(160),
    sekolah: kitText(160),
    mapel: kitText(120),
    kelas: kitText(160),
    fase: kitText(20),
    topik: kitText(200),
    alokasi: kitText(120),
  }),
  tujuan: kitLines,
  sarana: kitLines,
  pendahuluan: tahapInput,
  inti: tahapInput,
  penutup: tahapInput,
  asesmen: kitLines,
  akomodasi: kitLines,
});

const lkpdInput = z.object({
  judul: kitText(200),
  tujuan: kitText(600),
  petunjuk: kitLines,
  aktivitas: z.array(z.object({ judul: kitText(200), langkah: kitLines, pertanyaan: kitLines })).max(10),
});

const rubrikInput = z.object({
  judul: kitText(200),
  kriteria: z.array(z.object({ nama: kitText(200), level: z.array(kitText(800)).length(4) })).max(12),
});

const kitItem = <T extends z.ZodType>(data: T) =>
  z.object({
    data,
    origin: z.enum(["ai", "guru"]),
    checked: z.boolean(),
    basedOn: z.string().max(40).optional(),
    updatedAt: z.string().max(40),
  });

export const teachingKitInput = z.object({
  modul: kitItem(modulInput).optional(),
  lkpd: kitItem(lkpdInput).optional(),
  lkpdMudah: kitItem(lkpdInput).optional(),
  rubrik: kitItem(rubrikInput).optional(),
});

export const prefsInput = z.object({
  // "daerah" = nilai lama sebelum Jawa & Sunda dipisah; diterima supaya HP siswa yang masih
  // menyimpan pilihan lama tidak gagal mencatat, lalu dibaca sebagai teks asli.
  versi: z
    .enum(["asli", "mudah", "ringkasan", "jawa", "sunda", "daerah"])
    .transform((v) => (v === "daerah" ? "asli" : v)),
  besar: z.boolean(),
  kontras: z.boolean(),
  spasi: z.boolean(),
  dengar: z.boolean(),
});
