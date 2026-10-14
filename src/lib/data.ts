import "server-only";
import { randomInt } from "node:crypto";
import { getDb } from "./db";
import type {
  ClassNeeds,
  ClassRow,
  GlossaryItem,
  LessonRow,
  LessonVersions,
  QuizQuestion,
  StudentPrefs,
} from "./types";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Id dari URL bisa sembarang teks; tolak sebelum sampai ke database. */
export function isUuid(value: string | null | undefined): value is string {
  return !!value && UUID_RE.test(value);
}

// ---------- Kelas ----------

export async function listClasses(teacherId: string) {
  const sql = await getDb();
  return sql<(ClassRow & { lesson_count: number })[]>`
    select c.*, (select count(*)::int from lessons l where l.class_id = c.id) as lesson_count
    from classes c where c.teacher_id = ${teacherId}
    order by c.created_at asc`;
}

export async function getClass(teacherId: string, classId: string) {
  if (!isUuid(classId)) return null;
  const sql = await getDb();
  const rows = await sql<ClassRow[]>`
    select * from classes where id = ${classId} and teacher_id = ${teacherId}`;
  return rows[0] ?? null;
}

export async function createClass(teacherId: string, input: { name: string; grade: string; needs: ClassNeeds }) {
  const sql = await getDb();
  const [row] = await sql<ClassRow[]>`
    insert into classes (teacher_id, name, grade, needs)
    values (${teacherId}, ${input.name}, ${input.grade}, ${sql.json(input.needs)})
    returning *`;
  return row;
}

export async function updateClass(
  teacherId: string,
  classId: string,
  input: { name: string; grade: string; needs: ClassNeeds },
) {
  if (!isUuid(classId)) return null;
  const sql = await getDb();
  const rows = await sql<ClassRow[]>`
    update classes set name = ${input.name}, grade = ${input.grade}, needs = ${sql.json(input.needs)}
    where id = ${classId} and teacher_id = ${teacherId}
    returning *`;
  return rows[0] ?? null;
}

export async function deleteClass(teacherId: string, classId: string) {
  if (!isUuid(classId)) return false;
  const sql = await getDb();
  // Satu transaksi: materi dan kelas terhapus bersama, atau tidak sama sekali.
  // Materi dihapus lebih dulu: jika kelas dihapus duluan, class_id materi berubah jadi null (on delete set null).
  return sql.begin(async (tx) => {
    await tx`delete from lessons where class_id = ${classId} and teacher_id = ${teacherId}`;
    const rows = await tx`delete from classes where id = ${classId} and teacher_id = ${teacherId} returning id`;
    return rows.length > 0;
  });
}

// ---------- Materi ----------

export type LessonSummary = Pick<
  LessonRow,
  "id" | "title" | "subject" | "status" | "share_code" | "class_id" | "updated_at" | "versions"
> & { class_name: string | null; sessions: number };

export async function listLessons(teacherId: string, classId?: string) {
  const sql = await getDb();
  return sql<LessonSummary[]>`
    select l.id, l.title, l.subject, l.status, l.share_code, l.class_id, l.updated_at, l.versions,
      c.name as class_name,
      (select count(distinct e.session_id)::int from student_events e where e.lesson_id = l.id and e.kind = 'open') as sessions
    from lessons l
    left join classes c on c.id = l.class_id
    where l.teacher_id = ${teacherId}
      ${classId ? sql`and l.class_id = ${classId}` : sql``}
    order by l.updated_at desc`;
}

export async function getLesson(teacherId: string, lessonId: string) {
  if (!isUuid(lessonId)) return null;
  const sql = await getDb();
  const rows = await sql<LessonRow[]>`
    select * from lessons where id = ${lessonId} and teacher_id = ${teacherId}`;
  return rows[0] ?? null;
}

export async function createLesson(
  teacherId: string,
  input: { classId: string | null; title: string; subject: string; body: string },
) {
  const sql = await getDb();
  const [row] = await sql<LessonRow[]>`
    insert into lessons (teacher_id, class_id, title, subject, body)
    values (${teacherId}, ${input.classId}, ${input.title}, ${input.subject}, ${input.body})
    returning *`;
  return row;
}

export type LessonPatch = Partial<{
  title: string;
  subject: string;
  body: string;
  glossary: GlossaryItem[];
  versions: LessonVersions;
  quiz: QuizQuestion[];
}>;

export type UpdateResult =
  | { ok: true; lesson: LessonRow }
  | { ok: false; reason: "not_found" }
  | { ok: false; reason: "conflict"; lesson: LessonRow };

/**
 * Simpan perubahan materi dalam SATU perintah SQL (atomik).
 * baseRevision = nomor revisi yang dilihat editor. Bila materi sudah diubah di tab/perangkat lain
 * (revisi di database lebih baru), perubahan ditolak sebagai konflik supaya tidak saling menimpa,
 * kecuali force = true (guru memilih "Simpan versi saya").
 */
export async function updateLesson(
  teacherId: string,
  lessonId: string,
  patch: LessonPatch,
  opts: { baseRevision?: number; force?: boolean } = {},
): Promise<UpdateResult> {
  if (!isUuid(lessonId)) return { ok: false, reason: "not_found" };
  const sql = await getDb();
  const json = (value: unknown) => (value === undefined ? null : sql.json(value as never));
  const checkRevision = opts.baseRevision !== undefined && !opts.force;
  const rows = await sql<LessonRow[]>`
    update lessons set
      title = coalesce(${patch.title ?? null}, title),
      subject = coalesce(${patch.subject ?? null}, subject),
      body = coalesce(${patch.body ?? null}, body),
      glossary = coalesce(${json(patch.glossary)}::jsonb, glossary),
      versions = coalesce(${json(patch.versions)}::jsonb, versions),
      quiz = coalesce(${json(patch.quiz)}::jsonb, quiz),
      revision = revision + 1,
      updated_at = now()
    where id = ${lessonId} and teacher_id = ${teacherId}
      ${checkRevision ? sql`and revision = ${opts.baseRevision!}` : sql``}
    returning *`;
  if (rows[0]) return { ok: true, lesson: rows[0] };
  const current = await getLesson(teacherId, lessonId);
  return current ? { ok: false, reason: "conflict", lesson: current } : { ok: false, reason: "not_found" };
}

/** Salin materi (misalnya ke kelas lain). Salinan selalu berstatus draf dan tanpa kode/link. */
export async function duplicateLesson(teacherId: string, lessonId: string, classId: string | null) {
  if (!isUuid(lessonId)) return null;
  const sql = await getDb();
  const rows = await sql<LessonRow[]>`
    insert into lessons (teacher_id, class_id, title, subject, body, glossary, versions, quiz, status)
    select teacher_id, ${classId}, title || ' (salinan)', subject, body, glossary, versions, quiz, 'draft'
    from lessons where id = ${lessonId} and teacher_id = ${teacherId}
    returning *`;
  return rows[0] ?? null;
}

export async function countLessonsInClass(teacherId: string, classId: string) {
  if (!isUuid(classId)) return 0;
  const sql = await getDb();
  const [row] = await sql<{ n: number }[]>`
    select count(*)::int as n from lessons where class_id = ${classId} and teacher_id = ${teacherId}`;
  return row.n;
}

export async function deleteLesson(teacherId: string, lessonId: string) {
  if (!isUuid(lessonId)) return false;
  const sql = await getDb();
  const rows = await sql`delete from lessons where id = ${lessonId} and teacher_id = ${teacherId} returning id`;
  return rows.length > 0;
}

// Tanpa huruf/angka yang mudah tertukar (0/O, 1/I/L), jadi kode tidak pernah bentrok dengan DEMO01.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function newShareCode() {
  let code = "";
  for (let i = 0; i < 6; i++) code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return code;
}

export async function publishLesson(teacherId: string, lessonId: string) {
  const sql = await getDb();
  const lesson = await getLesson(teacherId, lessonId);
  if (!lesson) return null;
  if (lesson.share_code) {
    const rows = await sql<LessonRow[]>`
      update lessons set status = 'published', published_at = coalesce(published_at, now())
      where id = ${lessonId} and teacher_id = ${teacherId} returning *`;
    return rows[0];
  }
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const rows = await sql<LessonRow[]>`
        update lessons set status = 'published', share_code = ${newShareCode()}, published_at = now()
        where id = ${lessonId} and teacher_id = ${teacherId} returning *`;
      return rows[0];
    } catch (err) {
      if ((err as { code?: string }).code !== "23505") throw err; // kode kembar, coba lagi
    }
  }
  throw new Error("Gagal membuat kode materi.");
}

export async function unpublishLesson(teacherId: string, lessonId: string) {
  if (!isUuid(lessonId)) return null;
  const sql = await getDb();
  const rows = await sql<LessonRow[]>`
    update lessons set status = 'draft' where id = ${lessonId} and teacher_id = ${teacherId} returning *`;
  return rows[0] ?? null;
}

// ---------- Sisi siswa ----------

export type PublicLesson = Pick<LessonRow, "id" | "title" | "subject" | "body" | "glossary" | "versions" | "quiz"> & {
  share_code: string;
  class_name: string | null;
  teacher_name: string;
};

export async function getPublishedLesson(code: string) {
  const sql = await getDb();
  const rows = await sql<PublicLesson[]>`
    select l.id, l.title, l.subject, l.body, l.glossary, l.versions, l.quiz, l.share_code,
      c.name as class_name, t.name as teacher_name
    from lessons l
    join teachers t on t.id = l.teacher_id
    left join classes c on c.id = l.class_id
    where upper(l.share_code) = ${code.toUpperCase()} and l.status = 'published'`;
  return rows[0] ?? null;
}

export async function recordStudentEvent(input: {
  lessonId: string;
  sessionId: string;
  kind: "open" | "quiz";
  alias: string | null;
  prefs: StudentPrefs;
  score?: number;
  total?: number;
}) {
  const sql = await getDb();
  await sql`
    insert into student_events (lesson_id, session_id, kind, student_alias, prefs, score, total)
    values (${input.lessonId}, ${input.sessionId}, ${input.kind}, ${input.alias}, ${sql.json(input.prefs)},
      ${input.score ?? null}, ${input.total ?? null})`;
}

// ---------- Rekap ----------

export type LessonStats = {
  sessions: number;
  adaptiveSessions: number;
  prefCounts: {
    mudah: number;
    daerah: number;
    ringkasan: number;
    besar: number;
    kontras: number;
    spasi: number;
    dengar: number;
  };
  quizAttempts: number;
  avgScorePct: number | null;
  byVersion: { versi: StudentPrefs["versi"]; attempts: number; avgPct: number | null }[];
  recent: {
    alias: string | null;
    versi: string;
    prefs: StudentPrefs;
    score: number | null;
    total: number | null;
    at: string;
  }[];
};

export async function getLessonStats(lessonId: string): Promise<LessonStats> {
  const sql = await getDb();
  // Pilihan terakhir tiap sesi (siswa bisa mengganti cara belajar di tengah jalan).
  const opens = await sql<{ session_id: string; prefs: StudentPrefs }[]>`
    select distinct on (session_id) session_id, prefs
    from student_events where lesson_id = ${lessonId} and kind = 'open'
    order by session_id, created_at desc`;
  const quizzes = await sql<
    {
      session_id: string;
      student_alias: string | null;
      prefs: StudentPrefs;
      score: number;
      total: number;
      created_at: string;
    }[]
  >`
    select distinct on (session_id) session_id, student_alias, prefs, score, total, created_at
    from student_events where lesson_id = ${lessonId} and kind = 'quiz' and total > 0
    order by session_id, created_at desc`;

  const prefCounts = { mudah: 0, daerah: 0, ringkasan: 0, besar: 0, kontras: 0, spasi: 0, dengar: 0 };
  let adaptive = 0;
  for (const { prefs } of opens) {
    const isAdaptive = prefs.versi !== "asli" || prefs.besar || prefs.kontras || prefs.spasi || prefs.dengar;
    if (isAdaptive) adaptive++;
    if (prefs.versi === "mudah") prefCounts.mudah++;
    if (prefs.versi === "daerah") prefCounts.daerah++;
    if (prefs.versi === "ringkasan") prefCounts.ringkasan++;
    if (prefs.besar) prefCounts.besar++;
    if (prefs.kontras) prefCounts.kontras++;
    if (prefs.spasi) prefCounts.spasi++;
    if (prefs.dengar) prefCounts.dengar++;
  }

  const pct = (s: number, t: number) => (t > 0 ? (s / t) * 100 : 0);
  const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null);

  const byVersion = (["asli", "mudah", "daerah", "ringkasan"] as const).map((versi) => {
    const items = quizzes.filter((q) => (q.prefs?.versi ?? "asli") === versi);
    return { versi, attempts: items.length, avgPct: avg(items.map((q) => pct(q.score, q.total))) };
  });

  const recent = [...quizzes]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 12)
    .map((q) => ({
      alias: q.student_alias,
      versi: q.prefs?.versi ?? "asli",
      prefs: q.prefs,
      score: q.score,
      total: q.total,
      at: new Date(q.created_at).toISOString(),
    }));

  return {
    sessions: opens.length,
    adaptiveSessions: adaptive,
    prefCounts,
    quizAttempts: quizzes.length,
    avgScorePct: avg(quizzes.map((q) => pct(q.score, q.total))),
    byVersion,
    recent,
  };
}

export async function getTeacherOverview(teacherId: string) {
  const sql = await getDb();
  const [row] = await sql<{ published: number; drafts: number; sessions: number }[]>`
    select
      (select count(*)::int from lessons where teacher_id = ${teacherId} and status = 'published') as published,
      (select count(*)::int from lessons where teacher_id = ${teacherId} and status = 'draft') as drafts,
      (select count(distinct e.session_id)::int from student_events e join lessons l on l.id = e.lesson_id
        where l.teacher_id = ${teacherId} and e.kind = 'open') as sessions`;
  return row;
}
