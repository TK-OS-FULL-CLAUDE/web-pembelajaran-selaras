import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StudentApp, type StudentLesson } from "@/components/siswa/student-app";
import { getPublishedLesson } from "@/lib/data";

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
  const { mudah, daerah, ringkasan } = lesson.versions;
  if (mudah?.checked && mudah.text.trim()) versions.mudah = { text: mudah.text, glossary: mudah.glossary ?? [] };
  if (daerah?.checked && daerah.text.trim())
    versions.daerah = { text: daerah.text, glossary: daerah.glossary ?? [], lang: daerah.lang ?? "jw" };
  if (ringkasan?.checked && ringkasan.text.trim())
    versions.ringkasan = { text: ringkasan.text, glossary: ringkasan.glossary ?? [] };

  const data: StudentLesson = {
    code: lesson.share_code,
    title: lesson.title,
    subject: lesson.subject,
    className: lesson.class_name,
    teacherName: lesson.teacher_name.replace(/\s*\(.*\)$/, ""),
    body: lesson.body,
    glossary: lesson.glossary ?? [],
    versions,
    quiz: (lesson.quiz ?? []).filter((q) => q.q.trim() && q.options.filter((o) => o.trim()).length >= 2),
  };

  return <StudentApp lesson={data} />;
}
