// Warna untuk setiap cara belajar, jenis soal, kebutuhan kelas, mata pelajaran, dan kelas.
// Satu sumber supaya guru dan siswa melihat warna yang sama.
// Palet "ruang kelas berwarna": hijau papan tulis sebagai warna utama, ditambah lima warna krayon dari
// perabot kelas (hijau, merah, kuning, biru, coklat). Setiap hal punya warna tetap dan selalu tampil
// bersama ikon dan namanya, jadi warna membantu mengenali tetapi bukan satu-satunya pembeda.
// Kelas Tailwind ditulis utuh di sini supaya ikut terbaca saat build.

import type { NeedKey, QuizType, VersionKey } from "./types";

export type ToneKey = "papan" | "hijau" | "biru" | "merah" | "kuning" | "coklat" | "abu" | "aksen";

export type Tone = {
  /** teks berwarna (≥ 4,5:1 di putih dan di latar -50/-100) */
  text: string;
  /** latar sangat muda */
  soft: string;
  /** latar muda untuk chip ikon */
  chip: string;
  /** latar penuh + teks yang terbaca */
  solid: string;
  border: string;
  ring: string;
  /** warna batang grafik dan garis hiasan */
  bar: string;
};

export const TONES: Record<ToneKey, Tone> = {
  papan: {
    text: "text-papan",
    soft: "bg-papan-50",
    chip: "bg-papan-100 text-papan",
    solid: "bg-papan text-white",
    border: "border-papan",
    ring: "ring-papan",
    bar: "bg-papan",
  },
  hijau: {
    text: "text-hijau",
    soft: "bg-hijau-50",
    chip: "bg-hijau-100 text-hijau",
    solid: "bg-hijau text-white",
    border: "border-hijau",
    ring: "ring-hijau",
    bar: "bg-krayon-hijau",
  },
  biru: {
    text: "text-biru",
    soft: "bg-biru-50",
    chip: "bg-biru-100 text-biru",
    solid: "bg-biru text-white",
    border: "border-biru",
    ring: "ring-biru",
    bar: "bg-krayon-biru",
  },
  merah: {
    text: "text-merah",
    soft: "bg-merah-50",
    chip: "bg-merah-100 text-merah",
    solid: "bg-merah-500 text-white",
    border: "border-merah",
    ring: "ring-merah",
    bar: "bg-krayon-merah",
  },
  kuning: {
    text: "text-kuning-700",
    soft: "bg-kuning-50",
    chip: "bg-kuning-100 text-kuning-700",
    solid: "bg-kuning text-tinta",
    border: "border-kuning-700",
    ring: "ring-kuning-700",
    bar: "bg-kuning",
  },
  coklat: {
    text: "text-coklat",
    soft: "bg-coklat-50",
    chip: "bg-coklat-100 text-coklat",
    solid: "bg-coklat text-white",
    border: "border-coklat",
    ring: "ring-coklat",
    bar: "bg-tan",
  },
  aksen: {
    text: "text-aksen",
    soft: "bg-aksen-50",
    chip: "bg-aksen-100 text-aksen",
    solid: "bg-aksen text-white",
    border: "border-aksen",
    ring: "ring-aksen",
    bar: "bg-aksen",
  },
  abu: {
    text: "text-tinta",
    soft: "bg-kertas",
    chip: "bg-krem text-tinta",
    solid: "bg-tinta text-white",
    border: "border-tinta",
    ring: "ring-tinta",
    bar: "bg-tinta-2",
  },
};

export type ModeKey = "asli" | VersionKey | "dengar" | "besar" | "kontras" | "spasi" | "garis";

/** Versi teks: mudah hijau, ringkasan kuning, Jawa merah, Sunda biru. Alat tampilan memakai warna lain. */
export const MODE_TONE: Record<ModeKey, ToneKey> = {
  asli: "abu",
  mudah: "hijau",
  ringkasan: "kuning",
  jawa: "merah",
  sunda: "biru",
  dengar: "biru",
  besar: "coklat",
  kontras: "abu",
  spasi: "kuning",
  garis: "hijau",
};

export const QUIZ_TONE: Record<QuizType, ToneKey> = {
  pg: "biru",
  pgk: "hijau",
  bs: "merah",
  isian: "kuning",
  jodoh: "coklat",
};

export const NEED_TONE: Record<NeedKey, ToneKey> = {
  lowVision: "biru",
  tuli: "merah",
  disleksia: "kuning",
  sulitFokus: "coklat",
  diskalkulia: "hijau",
  bahasaDaerah: "papan",
};

const KRAYON: ToneKey[] = ["biru", "merah", "hijau", "kuning", "coklat"];

/** Warna kelas ke-i di daftar kelas guru (bergiliran lima warna krayon). */
export function classTone(i: number): ToneKey {
  return KRAYON[((i % KRAYON.length) + KRAYON.length) % KRAYON.length];
}

const SUBJECT_TONE: [RegExp, ToneKey][] = [
  [/ipas|ipa\b|sains/, "hijau"],
  [/matematika|mtk/, "biru"],
  [/bahasa indonesia|b\. ?indonesia/, "merah"],
  [/ips|sejarah|geografi/, "coklat"],
  [/inggris|english|seni|sbdp/, "kuning"],
  [/pancasila|ppkn|pkn/, "merah"],
  [/pjok|olahraga/, "hijau"],
  [/jawa|sunda|daerah|agama/, "coklat"],
];

/** Warna mata pelajaran: tetap untuk mapel umum SD, mapel lain mendapat salah satu warna krayon. */
export function subjectTone(subject: string | null | undefined): ToneKey {
  const s = (subject ?? "").toLowerCase();
  if (!s.trim()) return "papan";
  for (const [re, tone] of SUBJECT_TONE) if (re.test(s)) return tone;
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return KRAYON[h % KRAYON.length];
}

export function modeTone(key: ModeKey): Tone {
  return TONES[MODE_TONE[key]];
}
