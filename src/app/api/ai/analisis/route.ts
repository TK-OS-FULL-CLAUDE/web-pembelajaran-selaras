import { z } from "zod";
import { fail, ok, readJson, withTeacher } from "@/lib/api";
import { analyzeClass, type ClassData } from "@/lib/ai-kelas";
import { needsForPrompt } from "@/lib/ai-perangkat";
import { consumeAiQuota } from "@/lib/ai-quota";
import { getClass, getLesson, getLessonStats } from "@/lib/data";
import { questionKey, quizType } from "@/lib/quiz";
import { QUIZ_TYPE_LABEL, VERSION_LABEL, type QuizQuestion } from "@/lib/types";

export const maxDuration = 60;

const schema = z.object({ lessonId: z.string().uuid() });

/** Kunci jawaban dalam kalimat, untuk konteks AI. */
function keyText(q: QuizQuestion): string {
  switch (quizType(q)) {
    case "pgk":
      return (q.answers ?? []).map((i) => q.options[i]).join("; ");
    case "isian":
      return (q.accepted ?? []).join(" / ");
    case "jodoh":
      return (q.pairs ?? []).map((p) => `${p.kiri} → ${p.kanan}`).join("; ");
    default:
      return q.options[q.answer] ?? "";
  }
}

/**
 * Analisis AI atas hasil kuis kelas: dugaan miskonsepsi dan tindak lanjut. Angka dihitung aplikasi
 * (getLessonStats); AI hanya menafsirkan. Tidak ada nama siswa yang dikirim ke AI.
 */
export async function POST(req: Request) {
  return withTeacher(async (teacher) => {
    const input = await readJson(req, schema);
    const lesson = await getLesson(teacher.id, input.lessonId);
    if (!lesson) return fail("Materi tidak ditemukan.", 404);
    const stats = await getLessonStats(lesson.id);
    if (stats.quizAttempts < 3) {
      return fail("Analisis butuh minimal 3 sesi yang menyelesaikan kuis. Bagikan materi ke siswa dulu.", 422);
    }
    const cls = lesson.class_id ? await getClass(teacher.id, lesson.class_id) : null;
    const quiz = lesson.quiz.filter((q) => q.q.trim());
    const data: ClassData = {
      kelas: cls?.grade ?? "",
      mapel: lesson.subject,
      judul: lesson.title,
      profilKelas: needsForPrompt(cls?.needs ?? null).replace(/\n/g, " "),
      sesiKuis: stats.quizAttempts,
      rataSkor: stats.avgScorePct,
      perCaraBelajar: stats.byVersion.map((v) => ({ cara: VERSION_LABEL[v.versi], sesi: v.attempts, rata: v.avgPct })),
      soal: quiz.map((q, i) => {
        const s = stats.byQuestion[questionKey(q)];
        return {
          no: i + 1,
          konsep: q.concept?.trim() ?? "",
          jenis: QUIZ_TYPE_LABEL[quizType(q)],
          soal: q.q.trim().slice(0, 300),
          kunci: keyText(q).slice(0, 200),
          sesi: s?.attempts ?? 0,
          benarPersen: s?.attempts ? Math.round((s.correct / s.attempts) * 100) : null,
          jawabanSalah: (s?.wrong ?? []).map((w) => ({ teks: w.text, n: w.n })),
          petunjukDibuka: s?.hints ?? 0,
        };
      }),
    };
    await consumeAiQuota(teacher.id, "analisis");
    const { analysis } = await analyzeClass({ data, body: lesson.body });
    return ok({ analysis, basedOn: stats.quizAttempts });
  });
}
