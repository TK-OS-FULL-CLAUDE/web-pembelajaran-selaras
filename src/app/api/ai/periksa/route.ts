import { z } from "zod";
import { fail, ok, readJson, withTeacher } from "@/lib/api";
import { checkFaithfulness } from "@/lib/ai-kelas";
import { consumeAiQuota } from "@/lib/ai-quota";
import { getLesson } from "@/lib/data";

export const maxDuration = 60;

const LABEL = {
  mudah: "versi teks mudah",
  ringkasan: "ringkasan",
  jawa: "versi Basa Jawa (terjemahan)",
  sunda: "versi Basa Sunda (terjemahan)",
  modul: "modul ajar",
  lkpd: "LKPD",
  lkpdMudah: "LKPD versi sederhana",
  rubrik: "rubrik penilaian",
  jenjang: "tugas berjenjang",
} as const;

const schema = z.object({
  lessonId: z.string().uuid(),
  target: z.enum(Object.keys(LABEL) as [keyof typeof LABEL, ...(keyof typeof LABEL)[]]),
  draft: z.string().min(20).max(30_000),
  /** Teks sumber terbaru di editor (bisa belum tersimpan). Untuk LKPD sederhana: versi teks mudah. */
  source: z.string().max(30_000).optional(),
});

/** AI kedua memeriksa apakah draf (versi/perangkat) setia pada materi asli. Hasilnya hanya saran untuk guru. */
export async function POST(req: Request) {
  return withTeacher(async (teacher) => {
    const input = await readJson(req, schema);
    const lesson = await getLesson(teacher.id, input.lessonId);
    if (!lesson) return fail("Materi tidak ditemukan.", 404);
    const source = (input.source ?? (input.target === "lkpdMudah" ? lesson.versions.mudah?.text : lesson.body) ?? "").trim();
    if (source.length < 40) return fail("Teks sumber terlalu pendek untuk dibandingkan.", 422);
    await consumeAiQuota(teacher.id, "periksa");
    const isKit = !["mudah", "ringkasan", "jawa", "sunda"].includes(input.target);
    const { findings } = await checkFaithfulness({
      source,
      draft: input.draft,
      label: LABEL[input.target],
      allowActivities: isKit,
    });
    return ok({ findings });
  });
}
