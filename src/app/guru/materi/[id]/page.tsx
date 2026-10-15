import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LessonEditor, type TabKey } from "@/components/guru/editor/lesson-editor";
import { requireTeacher } from "@/lib/auth";
import { getClass, getLesson, getLessonStats, listClasses } from "@/lib/data";
import { aiEnabled } from "@/lib/claude";

export const metadata: Metadata = { title: "Materi" };

const TAB_KEYS: TabKey[] = ["materi", "versi", "perangkat", "kuis", "bagikan", "rekap"];

export default async function LessonPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const [{ id }, { tab }] = await Promise.all([params, searchParams]);
  const teacher = await requireTeacher();
  const lesson = await getLesson(teacher.id, id);
  if (!lesson) notFound();
  const [cls, stats, classes] = await Promise.all([
    lesson.class_id ? getClass(teacher.id, lesson.class_id) : Promise.resolve(null),
    getLessonStats(lesson.id),
    listClasses(teacher.id),
  ]);
  const initialTab = TAB_KEYS.includes(tab as TabKey) ? (tab as TabKey) : "materi";

  return (
    <LessonEditor
      key={lesson.id}
      lessonId={lesson.id}
      initial={{
        title: lesson.title,
        subject: lesson.subject,
        body: lesson.body,
        glossary: lesson.glossary,
        versions: lesson.versions,
        quiz: lesson.quiz,
        teachingKit: lesson.teaching_kit ?? {},
      }}
      revision={lesson.revision}
      status={lesson.status}
      shareCode={lesson.share_code}
      cls={cls ? { id: cls.id, name: cls.name, grade: cls.grade, needs: cls.needs } : null}
      classes={classes.map((c) => ({ id: c.id, name: c.name }))}
      teacher={{ name: teacher.name, school: teacher.school }}
      aiOn={aiEnabled()}
      stats={stats}
      initialTab={initialTab}
    />
  );
}
