import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StudentApp, type StudentLesson } from "@/components/siswa/student-app";
import { getPublishedLesson } from "@/lib/data";
import { playableQuestion } from "@/lib/quiz";
import { figureIds } from "@/lib/text";
import { VERSION_KEYS, type LessonFigures, type QuizQuestion } from "@/lib/types";

type Props = { params: Promise<{ kode: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { kode } = await params;
  const lesson = /^[A-Za-z0-9]{4,12}$/.test(kode) ? await getPublishedLesson(kode) : null;
  return { title: lesson ? lesson.title : "Materi tidak ditemukan", robots: { index: false } };
}

export default async function StudentPage({ params }: Props) {
  const { kode } = await params;
  if (!/^[A-Za-z0-9]{4,12}$/.test(kode)) notFound();
  const lesson = await getPublishedLesson(kode);
  if (!lesson) notFound();

  // Hanya versi yang sudah dicek guru yang dikirim ke browser siswa.
  const versions: StudentLesson["versions"] = {};
  for (const key of VERSION_KEYS) {
    const v = lesson.versions[key];
    if (v?.checked && v.text.trim()) versions[key] = { text: v.text, glossary: v.glossary ?? [] };
  }

  // Deskripsi gambar hanya untuk gambar yang dipakai di teks yang dikirim.
  const usedIds = new Set([lesson.body, ...Object.values(versions).map((v) => v!.text)].flatMap(figureIds));
  const figures: LessonFigures = {};
  for (const id of usedIds) {
    const f = lesson.figures?.[id];
    figures[id] = {
      alt: f?.altChecked ? f.alt : "",
      altOrigin: "guru",
      altChecked: !!f?.altChecked,
      width: f?.width,
      height: f?.height,
    };
  }

  const data: StudentLesson = {
    code: lesson.share_code,
    title: lesson.title,
    subject: lesson.subject,
    className: lesson.class_name,
    teacherName: lesson.teacher_name.replace(/\s*\(.*\)$/, ""),
    schoolName: lesson.school_name,
    body: lesson.body,
    glossary: lesson.glossary ?? [],
    versions,
    figures,
    // Soal yang belum lengkap tidak ditampilkan; pilihan kosong dibuang dan kunci jawabannya disesuaikan.
    quiz: (lesson.quiz ?? []).map(playableQuestion).filter((q): q is QuizQuestion => q !== null),
  };

  return <StudentApp lesson={data} />;
}
