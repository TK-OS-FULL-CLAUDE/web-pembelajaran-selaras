import "server-only";
import type { z } from "zod";
import { repairLatexEscapes } from "./latex";

// Bagian bersama untuk klien Claude (claude.ts) dan Gemini (gemini.ts).

export class AiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "AiError";
  }
}

export type AiProvider = "claude" | "gemini";

/** Isi pesan pengguna. Formatnya mengikuti Claude; gemini.ts mengubahnya ke format Gemini. */
export type AiContent =
  | { type: "text"; text: string }
  | { type: "image"; source: { type: "base64"; media_type: string; data: string } };

export type GenerateOptions<T> = {
  system: string;
  /** Isi pesan pengguna. Gambar sebaiknya diletakkan sebelum teks. */
  content: AiContent[];
  /** JSON Schema untuk output terstruktur (setiap object wajib additionalProperties: false). */
  schema: Record<string, unknown>;
  validator: z.ZodType<T>;
  temperature?: number;
  maxTokens?: number;
  /** Penyedia yang dicoba lebih dulu. Default "claude"; yang lain menjadi cadangan bila kuncinya diisi. */
  prefer?: AiProvider;
};

export type GenerateResult<T> = { data: T; model: string };

/**
 * Aturan rumus untuk semua prompt yang menulis isi pelajaran. Layar siswa menampilkan $...$ dengan KaTeX
 * (src/lib/latex.ts, src/components/tex.tsx) dan membacakannya sebagai kata.
 */
export const LATEX_RULE = `- Rumus dan lambang matematika ditulis dengan LaTeX. Di dalam kalimat diapit satu tanda dolar, misalnya $\\frac{3}{4}$, $x^2 - x - 2 = 0$, $\\sqrt{x+2}$, $3 \\times 4 = 12$, $90^\\circ$. Rumus penting boleh ditulis di baris sendiri diapit $$ ... $$. Tanda dolar pembuka tidak diikuti spasi dan penutup tidak didahului spasi.
- Di dalam LaTeX: kali \\times, bagi \\div atau :, kurang dari atau sama dengan \\le, desimal 3{,}5, satuan \\text{ cm}. Angka biasa di kalimat (misalnya "ada 24 siswa"), tanggal, dan harga ("Rp5.000") tidak perlu LaTeX.
- Bila sumber menulis rumus secara biasa (3/4, x^2, sqrt(x+2), √x, 3 x 4), tulis ulang dengan LaTeX tanpa mengubah nilainya.`;

/** Ganti setiap string di hasil JSON (rekursif). */
function mapStrings(v: unknown, fn: (s: string) => string): unknown {
  if (typeof v === "string") return fn(v);
  if (Array.isArray(v)) return v.map((x) => mapStrings(x, fn));
  if (v && typeof v === "object") {
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, mapStrings(x, fn)]));
  }
  return v;
}

/** Garis miring yang bukan escape JSON yang sah (\sqrt, \cdot, \left) digandakan supaya JSON tetap terbaca. */
function escapeStrayBackslashes(s: string): string {
  return s.replace(/\\(?:["\\/bfnrt]|u[0-9a-fA-F]{4})|\\/g, (m) => (m.length > 1 ? m : "\\\\"));
}

function parseLoose(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch (err) {
    // Model kadang menulis LaTeX tanpa garis miring ganda di dalam JSON.
    try {
      return JSON.parse(escapeStrayBackslashes(text));
    } catch {
      throw err;
    }
  }
}

/** Ambil JSON dari jawaban model, termasuk bila dibungkus ```json ... ``` atau diberi kalimat pembuka. */
export function parseJson(text: string): unknown {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```$/, "")
    .trim();
  let parsed: unknown;
  try {
    parsed = parseLoose(cleaned);
  } catch (err) {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (!(start >= 0 && end > start)) throw err;
    parsed = parseLoose(cleaned.slice(start, end + 1));
  }
  // "\frac" yang ditulis tanpa escape terbaca sebagai form feed + "rac": kembalikan menjadi perintah LaTeX.
  // Sebaliknya "\\frac" (escape dua kali) terbaca sebagai ganti baris KaTeX: jadikan satu garis miring.
  return mapStrings(parsed, (s) => repairLatexEscapes(s).replace(/\\\\(?=[A-Za-z])/g, "\\"));
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
