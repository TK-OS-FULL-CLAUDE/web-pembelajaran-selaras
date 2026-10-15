// Utilitas perangkat ajar yang dipakai di server (route AI) dan di browser (tab Perangkat Ajar).

import type { Lkpd, ModulAjar, Rubrik } from "./types";
import { RUBRIK_LEVELS } from "./types";

/** "Bu Rina (akun demo)" → "Bu Rina", supaya label akun tidak ikut tercetak. */
export function displayName(name: string): string {
  return name.replace(/\s*\(.*\)$/, "").trim();
}

/** Angka kelas 1–12 dari teks kelas guru, misalnya "Kelas 4 SD" → 4, "Kelas 8 SMP" → 8, "Kelas 2 SMP" → 8. */
export function gradeNumber(grade: string): number | null {
  const g = grade.toLowerCase();
  const roman: Record<string, number> = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10, xi: 11, xii: 12 };
  const digit = g.match(/\b(1[0-2]|[1-9])\b/);
  const rom = g.match(/\b(xii|xi|x|ix|viii|vii|vi|v|iv|iii|ii|i)\b/);
  let n = digit ? Number(digit[1]) : rom ? roman[rom[1]] : null;
  if (n === null) return null;
  if (/\b(smp|mts)\b/.test(g) && n <= 3) n += 6;
  if (/\b(sma|smk|ma|mak)\b/.test(g) && n <= 3) n += 9;
  return n;
}

/** Fase Kurikulum Merdeka dari kelas: 1–2 A, 3–4 B, 5–6 C, 7–9 D, 10 E, 11–12 F. */
export function faseFromGrade(grade: string): string {
  const n = gradeNumber(grade);
  if (n === null) return "";
  if (n <= 2) return "A";
  if (n <= 4) return "B";
  if (n <= 6) return "C";
  if (n <= 9) return "D";
  if (n === 10) return "E";
  return "F";
}

/** Alokasi waktu awal: 2 JP. Satu JP = 35 menit (SD), 40 menit (SMP), 45 menit (SMA/SMK). */
export function defaultAlokasi(grade: string): { teks: string; menit: number } {
  const n = gradeNumber(grade);
  const jp = n === null || n <= 6 ? 35 : n <= 9 ? 40 : 45;
  return { teks: `2 JP (2 × ${jp} menit)`, menit: 2 * jp };
}

export type KitContext = {
  teacherName: string;
  school: string | null;
  subject: string;
  grade: string;
  className: string | null;
  title: string;
};

/** Identitas modul ajar yang diisi otomatis dari data guru, kelas, dan materi (bukan dari AI). */
export function modulIdentity(ctx: KitContext): ModulAjar["identitas"] {
  return {
    penyusun: displayName(ctx.teacherName),
    sekolah: ctx.school ?? "",
    mapel: ctx.subject,
    kelas: ctx.className && ctx.grade ? `${ctx.grade} (${ctx.className})` : ctx.grade || ctx.className || "",
    fase: faseFromGrade(ctx.grade),
    topik: ctx.title,
    alokasi: defaultAlokasi(ctx.grade).teks,
  };
}

export function emptyModul(ctx: KitContext): ModulAjar {
  const total = defaultAlokasi(ctx.grade).menit;
  const awal = Math.round(total * 0.15);
  const akhir = Math.round(total * 0.15);
  return {
    identitas: modulIdentity(ctx),
    tujuan: [""],
    sarana: [""],
    pendahuluan: { menit: awal, langkah: [""] },
    inti: { menit: total - awal - akhir, langkah: [""] },
    penutup: { menit: akhir, langkah: [""] },
    asesmen: [""],
    akomodasi: [],
  };
}

export function emptyLkpd(title: string): Lkpd {
  return {
    judul: title,
    tujuan: "",
    petunjuk: ["Tulis nama dan kelasmu.", "Baca setiap langkah dengan teliti."],
    aktivitas: [{ judul: "Aktivitas 1", langkah: [""], pertanyaan: [""] }],
  };
}

export function emptyRubrik(title: string): Rubrik {
  return {
    judul: `Rubrik penilaian: ${title}`,
    kriteria: [{ nama: "", level: RUBRIK_LEVELS.map(() => "") }],
  };
}

/** Rapikan satu daftar: buang penanda butir/nomor di awal dan baris kosong. */
export function cleanLines(items: string[]): string[] {
  return items
    .map((s) =>
      s
        .replace(/^\s*(?:[-•*]|\d+[.)]|[a-z][.)])\s+/i, "")
        .replace(/\*\*/g, "")
        .trim(),
    )
    .filter(Boolean);
}

/** Baris yang benar-benar berisi (untuk pratinjau dan cetak; saat mengetik baris kosong dibiarkan). */
export function filled(items: string[] | undefined): string[] {
  return (items ?? []).map((s) => s.trim()).filter(Boolean);
}
