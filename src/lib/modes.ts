// Warna kategori untuk setiap cara belajar dan jenis soal. Satu sumber supaya guru dan siswa
// melihat warna yang sama untuk hal yang sama (mis. Basa Jawa selalu ungu).
// Kelas Tailwind ditulis utuh di sini supaya ikut terbaca saat build.

import type { QuizType, VersionKey } from "./types";

export type ToneKey = "papan" | "biru" | "ungu" | "mawar" | "jingga" | "nila" | "sian" | "hijau" | "abu" | "aksen";

export type Tone = {
  /** teks berwarna (≥ 4,5:1 di putih dan di latar -50/-100) */
  text: string;
  /** latar sangat muda */
  soft: string;
  /** latar muda untuk chip ikon */
  chip: string;
  /** latar penuh + teks putih */
  solid: string;
  border: string;
  ring: string;
  /** warna batang grafik */
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
  biru: {
    text: "text-biru",
    soft: "bg-biru-50",
    chip: "bg-biru-100 text-biru",
    solid: "bg-biru text-white",
    border: "border-biru",
    ring: "ring-biru",
    bar: "bg-biru",
  },
  ungu: {
    text: "text-ungu",
    soft: "bg-ungu-50",
    chip: "bg-ungu-100 text-ungu",
    solid: "bg-ungu text-white",
    border: "border-ungu",
    ring: "ring-ungu",
    bar: "bg-ungu",
  },
  mawar: {
    text: "text-mawar",
    soft: "bg-mawar-50",
    chip: "bg-mawar-100 text-mawar",
    solid: "bg-mawar text-white",
    border: "border-mawar",
    ring: "ring-mawar",
    bar: "bg-mawar",
  },
  jingga: {
    text: "text-jingga",
    soft: "bg-jingga-50",
    chip: "bg-jingga-100 text-jingga",
    solid: "bg-jingga text-white",
    border: "border-jingga",
    ring: "ring-jingga",
    bar: "bg-jingga",
  },
  nila: {
    text: "text-nila",
    soft: "bg-nila-50",
    chip: "bg-nila-100 text-nila",
    solid: "bg-nila text-white",
    border: "border-nila",
    ring: "ring-nila",
    bar: "bg-nila",
  },
  sian: {
    text: "text-sian",
    soft: "bg-sian-50",
    chip: "bg-sian-100 text-sian",
    solid: "bg-sian text-white",
    border: "border-sian",
    ring: "ring-sian",
    bar: "bg-sian",
  },
  hijau: {
    text: "text-hijau",
    soft: "bg-hijau-50",
    chip: "bg-hijau-100 text-hijau",
    solid: "bg-hijau text-white",
    border: "border-hijau",
    ring: "ring-hijau",
    bar: "bg-hijau",
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
    soft: "bg-slate-50",
    chip: "bg-slate-100 text-tinta",
    solid: "bg-tinta text-white",
    border: "border-tinta",
    ring: "ring-tinta",
    bar: "bg-slate-500",
  },
};

export type ModeKey = "asli" | VersionKey | "dengar" | "besar" | "kontras" | "spasi" | "garis";

export const MODE_TONE: Record<ModeKey, ToneKey> = {
  asli: "abu",
  mudah: "papan",
  ringkasan: "biru",
  jawa: "ungu",
  sunda: "mawar",
  dengar: "jingga",
  besar: "nila",
  kontras: "abu",
  spasi: "sian",
  garis: "hijau",
};

export const QUIZ_TONE: Record<QuizType, ToneKey> = {
  pg: "papan",
  pgk: "biru",
  bs: "jingga",
  isian: "ungu",
  jodoh: "mawar",
};

export function modeTone(key: ModeKey): Tone {
  return TONES[MODE_TONE[key]];
}
