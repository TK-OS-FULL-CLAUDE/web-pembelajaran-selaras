import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProjectorView } from "@/components/guru/proyektor";
import { requireTeacher } from "@/lib/auth";
import { getClass, getLesson } from "@/lib/data";
import { playableQuestion } from "@/lib/quiz";
import type { LessonFigures, LessonVersions, QuizQuestion } from "@/lib/types";

export const metadata: Metadata = { title: "Mode proyektor" };

const BACK_TABS = ["materi", "versi", "perangkat", "kuis", "bagikan", "rekap"];

/**
 * Mode proyektor (khusus guru): menampilkan materi ke seluruh kelas.
 * Tidak memakai route siswa, jadi tidak ada sesi atau hasil yang tercatat di rekap.
 */
export default async function ProjectorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ dari?: string }>;
}) {
  const [{ id }, { dari }] = await Promise.all([params, searchParams]);
  const teacher = await requireTeacher();
  const lesson = await getLesson(teacher.id, id);
  if (!lesson) notFound();
  const cls = lesson.class_id ? await getClass(teacher.id, lesson.class_id) : null;

  // Sama seperti untuk siswa: hanya versi dan deskripsi gambar yang sudah dicek guru yang ditampilkan.
  const versions: LessonVersions = {};
  for (const [key, v] of Object.entries(lesson.versions) as [keyof LessonVersions, LessonVersions[keyof LessonVersions]][]) {
    if (v?.checked && v.text.trim()) versions[key] = v;
  }
  const figures: LessonFigures = {};
  for (const [key, f] of Object.entries(lesson.figures ?? {})) {
    figures[key] = f.altChecked ? f : { ...f, alt: "" };
  }
  const quiz = lesson.quiz.map(playableQuestion).filter((q): q is QuizQuestion => q !== null);
  const tab = BACK_TABS.includes(dari ?? "") ? dari : "materi";

  return (
    <ProjectorView
      backHref={`/guru/materi/${lesson.id}?tab=${tab}`}
      lesson={{
        title: lesson.title || "Tanpa judul",
        subject: lesson.subject,
        className: cls?.name ?? null,
        body: lesson.body,
        glossary: lesson.glossary,
        versions,
        quiz,
        figures,
        shareCode: lesson.status === "published" ? lesson.share_code : null,
      }}
    />
  );
}
