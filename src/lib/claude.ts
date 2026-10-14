import "server-only";
import {
  AiError,
  parseJson,
  sleep,
  type AiContent,
  type AiProvider,
  type GenerateOptions,
  type GenerateResult,
} from "./ai-common";
import { geminiEnabled, geminiGenerateJson } from "./gemini";

// Klien Claude API (Anthropic Messages API) memakai REST biasa, tanpa SDK, supaya mudah dibaca.
// Dokumentasi: https://platform.claude.com/docs/en/api/messages
// Output JSON terstruktur: https://platform.claude.com/docs/en/build-with-claude/structured-outputs
//
// generateJson() di bawah juga mengatur cadangan lintas penyedia: bila Claude gagal (kunci ditolak,
// kredit habis, sibuk, waktu habis), permintaan yang sama dikirim ke Gemini (gemini.ts), dan sebaliknya.

export { AiError };
export type ClaudeContent = AiContent;

const BASE_URL = (process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com").replace(/\/$/, "");
const API_VERSION = "2023-06-01";

// Haiku dulu (cepat & murah). Bila tidak tersedia atau sedang sibuk, app pindah ke Sonnet.
const DEFAULT_MODELS = ["claude-haiku-5-5", "claude-sonnet-5-5"];

const ATTEMPT_TIMEOUT_MS = 25_000;
const TOTAL_BUDGET_MS = 55_000; // di bawah batas 60 detik fungsi Vercel (maxDuration = 60)
const FALLBACK_RESERVE_MS = 18_000; // waktu yang disisakan untuk penyedia cadangan

export function claudeEnabled() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/** Fitur AI aktif bila minimal satu kunci (Claude atau Gemini) diisi. */
export function aiEnabled() {
  return claudeEnabled() || geminiEnabled();
}

/** Penyedia yang kuncinya terisi, untuk /api/status. */
export function aiProviders(): AiProvider[] {
  return [...(claudeEnabled() ? ["claude" as const] : []), ...(geminiEnabled() ? ["gemini" as const] : [])];
}

function modelList() {
  const custom = process.env.ANTHROPIC_MODEL?.trim();
  return [...new Set([...(custom ? [custom] : []), ...DEFAULT_MODELS])];
}

/** Variasi permintaan bila API menolak sebuah parameter (HTTP 400): makin ke bawah makin sederhana. */
const VARIANTS = [
  { schema: true, temperature: true },
  { schema: true, temperature: false },
  { schema: false, temperature: false },
] as const;

function extractText(payload: unknown): { text: string; stopReason?: string } {
  const p = payload as { content?: { type: string; text?: string }[]; stop_reason?: string };
  const text = (p.content ?? [])
    .filter((b) => b.type === "text")
    .map((b) => b.text ?? "")
    .join("");
  return { text, stopReason: p.stop_reason };
}

/**
 * Meminta JSON yang lolos validasi Zod dari penyedia AI yang tersedia.
 * Urutan: `prefer` dulu (default Claude), lalu penyedia lain sebagai cadangan bila kuncinya diisi.
 */
export async function generateJson<T>(opts: GenerateOptions<T>): Promise<GenerateResult<T>> {
  const order: AiProvider[] = opts.prefer === "gemini" ? ["gemini", "claude"] : ["claude", "gemini"];
  const ready = order.filter((p) => (p === "claude" ? claudeEnabled() : geminiEnabled()));
  if (!ready.length) {
    throw new AiError("Fitur AI belum aktif: isi ANTHROPIC_API_KEY atau GEMINI_API_KEY.", 503);
  }

  const deadline = Date.now() + TOTAL_BUDGET_MS;
  let lastError: AiError | null = null;

  for (const [i, provider] of ready.entries()) {
    const backup = ready[i + 1];
    const until = backup ? deadline - FALLBACK_RESERVE_MS : deadline;
    try {
      return provider === "claude" ? await claudeGenerateJson(opts, until) : await geminiGenerateJson(opts, until);
    } catch (err) {
      if (!(err instanceof AiError)) throw err;
      // Materi terlalu panjang: penyedia lain akan gagal dengan alasan yang sama.
      if (err.status === 422) throw err;
      lastError = err;
      if (backup) console.warn(`[ai] ${provider} gagal (${err.message}) → coba ${backup}`);
    }
  }
  throw lastError ?? new AiError("AI sedang tidak bisa dipakai. Coba lagi, atau tulis versi secara manual.", 502);
}

/**
 * Meminta Claude menghasilkan JSON yang lolos validasi Zod, paling lambat sampai `deadline` (epoch ms).
 * Cadangan: parameter ditolak → permintaan lebih sederhana; model sibuk/tidak ada → model berikutnya.
 */
export async function claudeGenerateJson<T>(opts: GenerateOptions<T>, deadline: number): Promise<GenerateResult<T>> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new AiError("Fitur AI belum aktif: ANTHROPIC_API_KEY belum diisi.", 503);
  }

  let lastError = "Tidak ada model yang bisa dipakai.";

  for (const model of modelList()) {
    for (const variant of VARIANTS) {
      const remaining = deadline - Date.now();
      if (remaining < 4_000) {
        throw new AiError("AI terlalu lama merespons. Coba lagi sebentar lagi.", 504);
      }

      const content: AiContent[] = variant.schema
        ? opts.content
        : [
            ...opts.content,
            {
              type: "text",
              text: `Jawab HANYA dengan satu objek JSON (tanpa teks lain) yang sesuai skema ini:\n${JSON.stringify(opts.schema)}`,
            },
          ];

      const body = {
        model,
        max_tokens: opts.maxTokens ?? 8192,
        system: opts.system,
        messages: [{ role: "user", content }],
        ...(variant.temperature && opts.temperature !== undefined ? { temperature: opts.temperature } : {}),
        ...(variant.schema ? { output_config: { format: { type: "json_schema", schema: opts.schema } } } : {}),
      };

      let res: Response;
      try {
        res = await fetch(`${BASE_URL}/v1/messages`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": API_VERSION,
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(Math.min(ATTEMPT_TIMEOUT_MS, remaining)),
        });
      } catch (err) {
        lastError = `${model}: ${(err as Error).name === "TimeoutError" ? "waktu habis" : "gagal terhubung"}`;
        break; // ke model berikutnya
      }

      if (res.ok) {
        try {
          const { text, stopReason } = extractText(await res.json());
          if (stopReason === "max_tokens") {
            throw new AiError("Materi terlalu panjang untuk diproses sekaligus. Bagi menjadi beberapa materi.", 422);
          }
          if (stopReason === "refusal") {
            lastError = `${model}: permintaan ditolak model`;
            break;
          }
          const parsed = opts.validator.safeParse(parseJson(text));
          if (parsed.success) return { data: parsed.data, model };
          lastError = `${model}: format jawaban tidak sesuai`;
        } catch (err) {
          if (err instanceof AiError) throw err;
          lastError = `${model}: jawaban bukan JSON`;
        }
        continue; // coba variasi berikutnya
      }

      const detail = await res.text().catch(() => "");
      if (res.status === 401 || res.status === 403) {
        throw new AiError("ANTHROPIC_API_KEY ditolak. Periksa kuncinya di Claude Console.", 503);
      }
      if (res.status === 400) {
        if (/credit balance/i.test(detail)) {
          throw new AiError("Saldo kredit Claude API habis. Isi kredit di Claude Console, atau tulis versi secara manual.", 402);
        }
        lastError = `${model}: HTTP 400 ${detail.slice(0, 200)}`;
        continue; // ulangi dengan permintaan yang lebih sederhana
      }
      lastError = `${model}: HTTP ${res.status}${detail ? ` ${detail.slice(0, 160)}` : ""}`;
      if (res.status === 429 || res.status === 529) await sleep(1_500);
      break; // 404 (model tidak ada), 429 (batas), 5xx/529 (sibuk) → model berikutnya
    }
  }

  console.error("[claude] semua percobaan gagal:", lastError);
  if (/HTTP 429/.test(lastError)) {
    throw new AiError("Batas pemakaian AI sedang tercapai. Coba lagi sebentar lagi, atau tulis versi secara manual.", 429);
  }
  throw new AiError("AI sedang tidak bisa dipakai. Coba lagi, atau tulis versi secara manual.", 502);
}
