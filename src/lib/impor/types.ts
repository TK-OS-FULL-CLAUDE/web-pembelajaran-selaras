import type { LessonFigures } from "../types";

/** Hasil impor dari foto, PDF, atau Word: teks berformat Selaras + gambar yang sudah diunggah. */
export type ImportResult = {
  text: string;
  title: string;
  figures: LessonFigures;
  /** Catatan untuk guru (mis. halaman yang dilewati). */
  notes: string[];
};

export type ImportProgress = (message: string, fraction?: number) => void;
