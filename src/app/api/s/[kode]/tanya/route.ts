import { z } from "zod";
import { fail, handle, ok, readJson } from "@/lib/api";
import { answerFromLesson, type TutorStyle } from "@/lib/ai-tasks";
import { getPublishedLesson } from "@/lib/data";

export const maxDuration = 60;

type Ctx = { params: Promise<{ kode: string }> };

const schema = z.object({
  question: z.string().trim().min(3, "Tulis pertanyaanmu dulu.").max(300, "Pertanyaan terlalu panjang."),
  versi: z.enum(["asli", "mudah", "daerah", "ringkasan"]),
});

// Pembatas sederhana per alamat IP dan materi, supaya jalur tanpa login ini tidak menghabiskan kuota AI.
// Disimpan di memori server: cukup untuk mencegah penyalahgunaan ringan, bukan pembatas yang ketat.
const WINDOW_MS = 5 * 60_000;
// Longgar karena satu kelas sering berbagi satu IP (wifi sekolah). Batas 10 pertanyaan per siswa ada di perangkat siswa.
const MAX_PER_WINDOW = 60;
const hits = new Map<string, number[]>();

function tooMany(key: string) {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) {
    hits.set(key, recent);
    return true;
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((t) => now - t < WINDOW_MS)) hits.delete(k);
  return false;
}

const NOT_FOUND_TEXT = "Itu belum ada di materi ini. Coba tanyakan ke gurumu ya.";

/** Tutor siswa: menjawab pertanyaan hanya dari materi guru, dengan gaya sesuai cara belajar siswa. Tanpa login. */
export async function POST(req: Request, { params }: Ctx) {
  return handle(async () => {
    const { kode } = await params;
    const input = await readJson(req, schema);
    const lesson = await getPublishedLesson(kode);
    if (!lesson) return fail("Materi tidak ditemukan.", 404);

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "lokal";
    if (tooMany(`${ip}:${lesson.id}`)) return fail("Terlalu banyak pertanyaan. Tunggu sebentar lalu coba lagi.", 429);

    // Gaya mengikuti versi yang dipilih siswa, tetapi hanya bila guru sudah mengecek versi itu.
    let style: TutorStyle = "asli";
    const { mudah, daerah, ringkasan } = lesson.versions;
    if (input.versi === "mudah" && mudah?.checked) style = "mudah";
    else if (input.versi === "ringkasan" && ringkasan?.checked) style = "ringkasan";
    else if (input.versi === "daerah" && daerah?.checked) style = daerah.lang === "su" ? "su" : "jw";

    const result = await answerFromLesson({ body: lesson.body, question: input.question, style });
    return ok({ found: result.found, answer: result.found ? result.answer : NOT_FOUND_TEXT });
  });
}
