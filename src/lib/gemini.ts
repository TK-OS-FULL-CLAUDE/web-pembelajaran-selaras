import "server-only";
import { AiError, parseJson, sleep, type AiContent, type GenerateOptions, type GenerateResult } from "./ai-common";

// Klien Gemini API (Google AI Studio) memakai REST biasa, tanpa SDK, sama seperti claude.ts.
// Dokumentasi: https://ai.google.dev/api/generate-content
// Output JSON terstruktur: https://ai.google.dev/gemini-api/docs/structured-output

const BASE_URL = (process.env.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com").replace(/\/$/, "");

// Flash dulu (seimbang, mendukung gambar), lalu Flash-Lite (paling hemat) sebagai cadangan.
const DEFAULT_MODELS = ["gemini-3.6-flash", "gemini-3.5-flash-lite"];

const ATTEMPT_TIMEOUT_MS = 25_000;

export function geminiEnabled() {
  return Boolean(process.env.GEMINI_API_KEY);
}

function modelList() {
  const custom = process.env.GEMINI_MODEL?.trim();
  return [...new Set([...(custom ? [custom] : []), ...DEFAULT_MODELS])];
}

type GeminiPart = { text: string } | { inlineData: { mimeType: string; data: string } };

function toParts(content: AiContent[]): GeminiPart[] {
  return content.map((c) =>
    c.type === "text" ? { text: c.text } : { inlineData: { mimeType: c.source.media_type, data: c.source.data } },
  );
}

const BLOCKED_FINISH = new Set(["SAFETY", "PROHIBITED_CONTENT", "RECITATION", "BLOCKLIST", "SPII", "IMAGE_SAFETY"]);

function extractText(payload: unknown): { text: string; finishReason?: string; blocked?: string } {
  const p = payload as {
    candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] }; finishReason?: string }[];
    promptFeedback?: { blockReason?: string };
  } | null;
  const candidate = p?.candidates?.[0];
  const finishReason = candidate?.finishReason;
  const blocked = p?.promptFeedback?.blockReason || (finishReason && BLOCKED_FINISH.has(finishReason) ? finishReason : undefined);
  const text = (candidate?.content?.parts ?? [])
    .filter((part) => !part.thought)
    .map((part) => part.text ?? "")
    .join("");
  return { text, finishReason, blocked };
}

/** Variasi permintaan bila API menolak sebuah parameter (HTTP 400): kedua tanpa skema JSON. */
const VARIANTS = [{ schema: true }, { schema: false }] as const;

/**
 * Meminta Gemini menghasilkan JSON yang lolos validasi Zod, paling lambat sampai `deadline` (epoch ms).
 * Cadangan: parameter ditolak → permintaan lebih sederhana; model sibuk/tidak ada → model berikutnya.
 */
export async function geminiGenerateJson<T>(opts: GenerateOptions<T>, deadline: number): Promise<GenerateResult<T>> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new AiError("GEMINI_API_KEY belum diisi.", 503);

  let lastError = "Tidak ada model Gemini yang bisa dipakai.";
  let lastStatus = 0;

  for (const model of modelList()) {
    for (const variant of VARIANTS) {
      const remaining = deadline - Date.now();
      if (remaining < 4_000) {
        throw new AiError("AI terlalu lama merespons. Coba lagi sebentar lagi.", 504);
      }

      const parts = toParts(opts.content);
      if (!variant.schema) {
        parts.push({
          text: `Jawab HANYA dengan satu objek JSON (tanpa teks lain) yang sesuai skema ini:\n${JSON.stringify(opts.schema)}`,
        });
      }
      const isGemini3 = model.startsWith("gemini-3");
      const body = {
        systemInstruction: { parts: [{ text: opts.system }] },
        contents: [{ role: "user", parts }],
        generationConfig: {
          responseMimeType: "application/json",
          ...(variant.schema ? { responseJsonSchema: opts.schema } : {}),
          maxOutputTokens: opts.maxTokens ?? 8192,
          // Gemini 3 disarankan memakai temperature bawaan; cukup berpikir sedikit supaya cepat.
          ...(isGemini3
            ? { thinkingConfig: { thinkingLevel: "LOW" } }
            : opts.temperature !== undefined
              ? { temperature: opts.temperature }
              : {}),
        },
      };

      let res: Response;
      try {
        res = await fetch(`${BASE_URL}/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
          method: "POST",
          headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(Math.min(ATTEMPT_TIMEOUT_MS, remaining)),
        });
      } catch (err) {
        lastError = `${model}: ${(err as Error).name === "TimeoutError" ? "waktu habis" : "gagal terhubung"}`;
        break; // ke model berikutnya
      }

      if (res.ok) {
        const { text, finishReason, blocked } = extractText(await res.json().catch(() => null));
        if (finishReason === "MAX_TOKENS") {
          throw new AiError("Materi terlalu panjang untuk diproses sekaligus. Bagi menjadi beberapa materi.", 422);
        }
        if (blocked) {
          lastError = `${model}: permintaan ditolak model (${blocked})`;
          break;
        }
        try {
          const parsed = opts.validator.safeParse(parseJson(text));
          if (parsed.success) return { data: parsed.data, model };
          lastError = `${model}: format jawaban tidak sesuai`;
        } catch {
          lastError = `${model}: jawaban bukan JSON`;
        }
        continue; // coba variasi berikutnya
      }

      const detail = await res.text().catch(() => "");
      if (res.status === 401 || res.status === 403 || (res.status === 400 && /API[_ ]?key/i.test(detail))) {
        throw new AiError("GEMINI_API_KEY ditolak. Periksa kuncinya di Google AI Studio.", 503);
      }
      if (res.status === 400) {
        lastError = `${model}: HTTP 400 ${detail.slice(0, 200)}`;
        continue; // ulangi dengan permintaan yang lebih sederhana
      }
      lastStatus = res.status;
      lastError = `${model}: HTTP ${res.status}${detail ? ` ${detail.slice(0, 160)}` : ""}`;
      if (res.status === 429 || res.status === 503) await sleep(1_500);
      break; // 404 (model tidak ada), 429 (kuota), 5xx (sibuk) → model berikutnya
    }
  }

  console.error("[gemini] semua percobaan gagal:", lastError);
  if (lastStatus === 429) {
    throw new AiError("Batas pemakaian AI sedang tercapai. Coba lagi sebentar lagi, atau tulis versi secara manual.", 429);
  }
  throw new AiError("AI sedang tidak bisa dipakai. Coba lagi, atau tulis versi secara manual.", 502);
}
