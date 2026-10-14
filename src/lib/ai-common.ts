import "server-only";
import type { z } from "zod";

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

/** Ambil JSON dari jawaban model, termasuk bila dibungkus ```json ... ``` atau diberi kalimat pembuka. */
export function parseJson(text: string): unknown {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```$/, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
    throw err;
  }
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
