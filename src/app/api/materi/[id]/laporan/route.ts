import { fail, withTeacher } from "@/lib/api";
import { getLesson, getLessonStats, listLessonAudiences } from "@/lib/data";
import { csvFile } from "@/lib/teacher-tools";
import { VERSION_LABEL } from "@/lib/types";
import { questionKey } from "@/lib/quiz";
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withTeacher(async (teacher) => {
    const { id } = await params;
    const lesson = await getLesson(teacher.id, id);
    if (!lesson) return fail("Materi tidak ditemukan.", 404);
    const audienceId = new URL(req.url).searchParams.get("kelas") || undefined;
    const audiences = await listLessonAudiences(teacher.id, id);
    const audience = audiences.find((a) => a.id === audienceId);
    if (audienceId && !audience) return fail("Kelas tidak ditemukan.", 404);
    const stats = await getLessonStats(id, { allRecent: true, audienceId });
    const content = lesson.published_content ?? lesson;
    const rows: unknown[][] = [
      ["Materi", content.title], ["Mata pelajaran", content.subject], ["Kelas", audience ? audience.class_name || "Materi umum" : "Semua kelas"],
      ["Catatan", "Sesi bukan identitas siswa. Rekap memakai hasil terakhir tiap sesi; percobaan ulang dihitung terpisah."],
      ["Sesi belajar", stats.sessions], ["Sesi menyelesaikan kuis", stats.quizAttempts],
      ["Seluruh percobaan kuis", stats.totalQuizAttempts], ["Rata-rata skor (0–100)", stats.avgScorePct], [],
      ["Konsep", "Jumlah soal", "Sesi menjawab", "Jawaban dinilai", "Jawaban benar", "Persen benar"],
      ...stats.byConcept.map((c) => [c.concept, c.questions, c.sessions, c.answers, c.correct, c.pct]), [],
      ["Soal", "Konsep", "Sesi menjawab", "Jawaban benar"],
      ...(content.quiz ?? []).map((q) => [q.q, q.concept || "Belum diberi konsep", stats.byQuestion[questionKey(q)]?.attempts ?? 0, stats.byQuestion[questionKey(q)]?.correct ?? 0]), [],
      ["Bagian belum dipahami", "Versi", "Revisi terbit", "Sesi melaporkan"],
      ...stats.confusion.map((f) => [f.section, VERSION_LABEL[f.versi as keyof typeof VERSION_LABEL] || f.versi, f.revision, f.sessions]), [],
      ["Versi teks", "Sesi kuis", "Rata-rata skor", "Rata-rata waktu (detik)"],
      ...stats.byVersion.map((v) => [VERSION_LABEL[v.versi], v.attempts, v.avgPct, v.avgDurationSec]), [],
      ["Nama panggilan (tidak terverifikasi)", "Versi", "Skor", "Jumlah soal", "Durasi (detik)", "Waktu WIB"],
      ...stats.recent.map((r) => [r.alias || "Tanpa nama", VERSION_LABEL[r.versi as keyof typeof VERSION_LABEL] || r.versi, r.score, r.total, r.durationSec,
        new Date(r.at).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })]),
    ];
    return new Response(csvFile(rows), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="rekap-${id}.csv"`, "Cache-Control": "no-store" } });
  });
}
