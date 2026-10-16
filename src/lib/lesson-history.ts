import "server-only";
import { getDb } from "./db";
import { isUuid, updateLesson, type LessonPatch } from "./data";
import type { LessonRow } from "./types";

export async function listRevisions(teacherId: string, lessonId: string) {
  if (!isUuid(lessonId)) return [];
  const sql = await getDb();
  return sql<{ revision: number; saved_at: string; title: string }[]>`
    select r.revision, r.saved_at, r.snapshot->>'title' as title
    from lesson_revisions r join lessons l on l.id = r.lesson_id
    where l.id = ${lessonId} and l.teacher_id = ${teacherId}
    order by r.revision desc limit 50`;
}

export async function getRevision(teacherId: string, lessonId: string, revision: number) {
  if (!isUuid(lessonId)) return null;
  const sql = await getDb();
  const rows = await sql<{ snapshot: LessonRow }[]>`
    select r.snapshot from lesson_revisions r join lessons l on l.id = r.lesson_id
    where l.id = ${lessonId} and l.teacher_id = ${teacherId} and r.revision = ${revision}`;
  return rows[0]?.snapshot ?? null;
}

export async function restoreRevision(teacherId: string, lessonId: string, revision: number, baseRevision: number) {
  const saved = await getRevision(teacherId, lessonId, revision);
  if (!saved) return null;
  const patch: LessonPatch = {
    title: saved.title, subject: saved.subject, body: saved.body, glossary: saved.glossary,
    quiz: saved.quiz, topic: saved.topic ?? "", target_grade: saved.target_grade ?? "",
    is_template: saved.is_template ?? false,
    versions: Object.fromEntries(Object.entries(saved.versions).map(([k, v]) => [k, { ...v, checked: false }])),
    figures: Object.fromEntries(Object.entries(saved.figures ?? {}).map(([k, v]) => [k, { ...v, altChecked: false }])),
  };
  return updateLesson(teacherId, lessonId, patch, { baseRevision });
}
