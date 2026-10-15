import "server-only";
import { randomInt } from "node:crypto";
import { getDb } from "./db";
import { conceptStats, type ConceptStat } from "./teacher-tools";
import {
  JENJANG_KEYS,
  VERSION_KEYS,
  jenjangFor,
  normalizeNeeds,
  type JenjangKey,
  type ClassNeeds,
  type ClassRow,
  type GlossaryItem,
  type Jenjang,
  type KitItem,
  type LessonFigures,
  type LessonRow,
  type LessonVersions,
  type QuizQuestion,
  type StudentPrefs,
  type TeachingKit,
  type VersionKey,
} from "./types";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Id dari URL bisa sembarang teks; tolak sebelum sampai ke database. */
export function isUuid(value: string | null | undefined): value is string {
  return !!value && UUID_RE.test(value);
}

// ---------- Kelas ----------

export async function listClasses(teacherId: string) {
  const sql = await getDb();
  const rows = await sql<(ClassRow & { lesson_count: number })[]>`
    select c.*, (select count(*)::int from lessons l where l.class_id = c.id or exists
      (select 1 from lesson_audiences a where a.lesson_id = l.id and a.class_id = c.id and a.active)) as lesson_count
    from classes c where c.teacher_id = ${teacherId}
    order by c.created_at asc`;
  return rows.map((r) => ({ ...r, needs: normalizeNeeds(r.needs) }));
}

export async function getClass(teacherId: string, classId: string) {
  if (!isUuid(classId)) return null;
  const sql = await getDb();
  const rows = await sql<ClassRow[]>`
    select * from classes where id = ${classId} and teacher_id = ${teacherId}`;
  return rows[0] ? { ...rows[0], needs: normalizeNeeds(rows[0].needs) } : null;
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
  // Materi bersama dan hasil belajar dipertahankan ketika sebuah kelas dihapus.
  return sql.begin(async (tx) => {
    await tx`update lesson_audiences a set active = false from lessons l
      where a.lesson_id = l.id and a.class_id = ${classId} and l.teacher_id = ${teacherId}`;
    const rows = await tx`delete from classes where id = ${classId} and teacher_id = ${teacherId} returning id`;
    return rows.length > 0;
  });
}

// ---------- Materi ----------

export type LessonSummary = Pick<
  LessonRow,
  "id" | "title" | "subject" | "status" | "share_code" | "class_id" | "updated_at" | "versions"
> & { class_name: string | null; sessions: number; topic: string; target_grade: string; is_template: boolean; grade: string; audience_id: string | null; has_draft: boolean };

export async function listLessons(teacherId: string, classId?: string) {
  const sql = await getDb();
  return sql<LessonSummary[]>`
    select l.id, l.title, l.subject, l.status, l.share_code, l.class_id, l.updated_at, l.versions,
      coalesce((select string_agg(coalesce(ac.name, a.class_name), ', ' order by ac.name) from lesson_audiences a
        left join classes ac on ac.id = a.class_id where a.lesson_id = l.id and a.active), c.name) as class_name,
      l.topic, l.target_grade, l.is_template, coalesce(nullif(l.target_grade, ''), c.grade, '') as grade,
      l.status = 'published' and l.revision is distinct from l.published_revision as has_draft,
      (select a.id from lesson_audiences a where a.lesson_id = l.id and a.class_id = ${classId ?? null}) as audience_id,
      (select count(distinct (e.audience_id, e.session_id))::int from student_events e where e.lesson_id = l.id and e.kind in ('open', 'quiz', 'confused')
        ${classId ? sql`and e.audience_id in (select a.id from lesson_audiences a where a.lesson_id = l.id and a.class_id = ${classId})` : sql``}) as sessions
    from lessons l
    left join classes c on c.id = l.class_id
    where l.teacher_id = ${teacherId}
      ${classId ? sql`and (l.class_id = ${classId} or exists (select 1 from lesson_audiences a
        where a.lesson_id = l.id and a.class_id = ${classId} and a.active))` : sql``}
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
  input: { classId: string | null; title: string; subject: string; body: string; figures?: LessonFigures },
) {
  const sql = await getDb();
  const [row] = await sql<LessonRow[]>`
    insert into lessons (teacher_id, class_id, title, subject, body, figures)
    values (${teacherId}, ${input.classId}, ${input.title}, ${input.subject}, ${input.body},
      ${sql.json((input.figures ?? {}) as never)})
    returning *`;
  return row;
}

export type LessonPatch = Partial<{
  topic: string;
  target_grade: string;
  is_template: boolean;
  title: string;
  subject: string;
  body: string;
  glossary: GlossaryItem[];
  versions: LessonVersions;
  quiz: QuizQuestion[];
  figures: LessonFigures;
  teachingKit: TeachingKit;
  practice: QuizQuestion[];
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
      figures = coalesce(${json(patch.figures)}::jsonb, figures),
      topic = coalesce(${patch.topic ?? null}, topic),
      target_grade = coalesce(${patch.target_grade ?? null}, target_grade),
      is_template = coalesce(${patch.is_template ?? null}, is_template),
      teaching_kit = coalesce(${json(patch.teachingKit)}::jsonb, teaching_kit),
      practice = coalesce(${json(patch.practice)}::jsonb, practice),
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
    insert into lessons (teacher_id, class_id, title, subject, body, glossary, versions, quiz, figures, teaching_kit, practice, status, topic, target_grade)
    select teacher_id, ${classId}, title || ' (salinan)', subject, body, glossary, versions, quiz, figures, teaching_kit, practice, 'draft', topic, target_grade
    from lessons where id = ${lessonId} and teacher_id = ${teacherId}
    returning *`;
  return rows[0] ?? null;
}

export async function countLessonsInClass(teacherId: string, classId: string) {
  if (!isUuid(classId)) return 0;
  const sql = await getDb();
  const [row] = await sql<{ n: number }[]>`
    select count(*)::int as n from lessons l where teacher_id = ${teacherId} and
      (class_id = ${classId} or exists (select 1 from lesson_audiences a where a.lesson_id = l.id and a.class_id = ${classId} and a.active))`;
  return row.n;
}

export async function deleteLesson(teacherId: string, lessonId: string) {
  if (!isUuid(lessonId)) return false;
  const sql = await getDb();
  const rows = await sql`delete from lessons where id = ${lessonId} and teacher_id = ${teacherId} returning id`;
  if (rows.length > 0) await cleanupImages(teacherId);
  return rows.length > 0;
}

// Tanpa huruf/angka yang mudah tertukar (0/O, 1/I/L), jadi kode tidak pernah bentrok dengan DEMO01.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function newShareCode() {
  let code = "";
  for (let i = 0; i < 6; i++) code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return code;
}

export async function publishLesson(teacherId: string, lessonId: string, baseRevision?: number) {
  const sql = await getDb();
  const lesson = await getLesson(teacherId, lessonId);
  if (!lesson) return null;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const rows = await sql<LessonRow[]>`
        with published as (
          update lessons l set status = 'published', share_code = coalesce(share_code, ${newShareCode()}),
            published_at = now(), published_content = to_jsonb(l) - 'published_content', published_revision = revision
          where id = ${lessonId} and teacher_id = ${teacherId} and revision = ${baseRevision ?? lesson.revision}
          returning l.*
        ), audience as (
          insert into lesson_audiences(lesson_id, class_id, class_name, share_code)
          select p.id, p.class_id, c.name, p.share_code from published p left join classes c on c.id = p.class_id
          where not exists (select 1 from lesson_audiences a where a.lesson_id = p.id and a.share_code = p.share_code)
          returning id
        ) select * from published`;
      return rows[0] ?? null;
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

export type LessonAudience = { id: string; class_id: string | null; class_name: string | null; share_code: string; active: boolean };

export async function listLessonAudiences(teacherId: string, lessonId: string) {
  if (!isUuid(lessonId)) return [];
  const sql = await getDb();
  return sql<LessonAudience[]>`select a.id, a.class_id, coalesce(c.name, a.class_name) as class_name, a.share_code, a.active
    from lesson_audiences a join lessons l on l.id = a.lesson_id left join classes c on c.id = a.class_id
    where l.id = ${lessonId} and l.teacher_id = ${teacherId} order by class_name nulls first, a.id`;
}

/** Satu kode per kelas; menonaktifkan link mempertahankan hasil yang sudah masuk. */
export async function setLessonAudience(teacherId: string, lessonId: string, classId: string, active: boolean) {
  if (!isUuid(lessonId) || !isUuid(classId)) return null;
  const sql = await getDb();
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const rows = await sql<LessonAudience[]>`
        insert into lesson_audiences(lesson_id, class_id, class_name, share_code, active)
        select l.id, c.id, c.name, ${newShareCode()}, ${active}
        from lessons l join classes c on c.teacher_id = l.teacher_id
        where l.id = ${lessonId} and l.teacher_id = ${teacherId} and c.id = ${classId}
          and l.share_code is not null and c.id is distinct from l.class_id
        on conflict (lesson_id, class_id) do update set active = excluded.active, class_name = excluded.class_name
        returning *`;
      return rows[0] ?? null;
    } catch (err) { if ((err as { code?: string }).code !== "23505") throw err; }
  }
  throw new Error("Gagal membuat kode kelas. Coba lagi.");
}

// ---------- Sisi siswa ----------

export type PublicLesson = Pick<
  LessonRow,
  "id" | "title" | "subject" | "body" | "glossary" | "versions" | "quiz" | "figures" | "practice"
> & {
  audience_id: string;
  published_revision: number;
  /** Hanya tugas berjenjang dari perangkat ajar; bagian lain perangkat ajar tidak pernah dipilih. */
  jenjang: KitItem<Jenjang> | null;
  share_code: string;
  class_name: string | null;
  teacher_name: string;
  school_name: string | null;
};

export async function getPublishedLesson(code: string) {
  const sql = await getDb();
  const rows = await sql<PublicLesson[]>`
    select l.id, p.title, p.subject, p.body, p.glossary, p.versions, p.quiz, p.figures, p.practice,
      p.teaching_kit->'jenjang' as jenjang, a.share_code, a.id as audience_id, l.published_revision,
      coalesce(c.name, a.class_name) as class_name, t.name as teacher_name, t.school as school_name
    from lessons l
    join lesson_audiences a on a.lesson_id = l.id and a.active
    cross join lateral jsonb_populate_record(null::lessons, l.published_content) p
    join teachers t on t.id = l.teacher_id
    left join classes c on c.id = a.class_id
    where a.share_code = ${code.toUpperCase()} and l.status = 'published' and l.published_content is not null`;
  return rows[0] ?? null;
}

export async function recordStudentEvent(input: {
  audienceId?: string;
  feedback?: { section: string; revision: number };
  eventId?: string;
  occurredAt?: string;
  lessonId: string;
  sessionId: string;
  kind: "open" | "quiz" | "confused";
  alias: string | null;
  prefs: StudentPrefs;
  score?: number;
  total?: number;
  /** Lama pengerjaan kuis dalam detik. */
  durationSec?: number;
  /** Benar/salah tiap soal: k = kunci soal (questionKey), b = benar. */
  detail?: QuestionResult[];
}) {
  const sql = await getDb();
  await sql`
    insert into student_events (lesson_id, session_id, kind, student_alias, prefs, score, total, duration_sec, detail, event_id, occurred_at, audience_id, feedback)
    values (${input.lessonId}, ${input.sessionId}, ${input.kind}, ${input.alias}, ${sql.json(input.prefs)},
      ${input.score ?? null}, ${input.total ?? null}, ${input.durationSec ?? null},
      ${input.detail ? sql.json(input.detail as never) : null}, ${input.eventId ?? null},
      least(coalesce(${input.occurredAt ?? null}::timestamptz, now()), now()),
      coalesce(${input.audienceId ?? null}::uuid, (select a.id from lesson_audiences a join lessons l on l.id = a.lesson_id where l.id = ${input.lessonId} and a.share_code = l.share_code)),
      ${input.feedback ? sql.json(input.feedback) : null})
    on conflict (lesson_id, event_id) do nothing`;
}

/** Hasil satu soal: k = kunci soal, b = benar, j = jawaban siswa (ringkas), h = petunjuk yang dibuka. */
export type QuestionResult = { k: string; b: boolean; j?: string; h?: number };

// ---------- Rekap ----------

export type LessonStats = {
  confusion: { section: string; versi: string; revision: number; sessions: number }[];
  byConcept: ConceptStat[];
  totalQuizAttempts: number;
  sessions: number;
  adaptiveSessions: number;
  prefCounts: Record<VersionKey | "besar" | "kontras" | "spasi" | "dengar", number>;
  /** Versi yang ada di materi ini (sudah dicek), untuk menyembunyikan baris versi yang tidak tersedia. */
  availableVersions: VersionKey[];
  quizAttempts: number;
  avgScorePct: number | null;
  /** Rata-rata lama pengerjaan kuis (detik), dari siswa yang durasinya tercatat. */
  avgDurationSec: number | null;
  byVersion: { versi: StudentPrefs["versi"]; attempts: number; avgPct: number | null; avgDurationSec: number | null }[];
  /**
   * Hasil per soal (kunci = questionKey), dari hasil terakhir tiap sesi: jumlah benar, jawaban salah yang
   * paling sering (pengecoh), dan berapa sesi membuka petunjuk.
   */
  byQuestion: Record<string, { attempts: number; correct: number; wrong: { text: string; n: number }[]; hints: number }>;
  /** Kelompok kesiapan (TaRL) dari skor kuis terakhir tiap sesi: nama panggilan per kelompok. */
  groups: Record<JenjangKey, string[]>;
  recent: {
    alias: string | null;
    versi: string;
    prefs: StudentPrefs;
    score: number | null;
    total: number | null;
    durationSec: number | null;
    at: string;
  }[];
};

export async function getLessonStats(lessonId: string, { allRecent = false, audienceId }: { allRecent?: boolean; audienceId?: string } = {}): Promise<LessonStats> {
  const sql = await getDb();
  const scope = audienceId ? sql`and audience_id = ${audienceId}` : sql``;
  const confusion = await sql<LessonStats["confusion"]>`
    select feedback->>'section' as section, prefs->>'versi' as versi,
      (feedback->>'revision')::int as revision, count(distinct (audience_id, session_id))::int as sessions
    from student_events where lesson_id = ${lessonId} and kind = 'confused' and feedback is not null ${scope}
    group by feedback->>'section', prefs->>'versi', feedback->>'revision'
    order by sessions desc, section`;
  // Termasuk kuis: kiriman hasil dapat tiba sebelum catatan buka saat jaringan terputus.
  const opens = await sql<{ session_id: string; prefs: StudentPrefs }[]>`
    select distinct on (audience_id, student_events.session_id) concat(audience_id, ':', session_id) as session_id, prefs
    from student_events where lesson_id = ${lessonId} and kind in ('open', 'quiz', 'confused') ${scope}
    order by audience_id, student_events.session_id, coalesce(occurred_at, created_at) desc, id desc`;
  const quizzes = await sql<
    {
      session_id: string;
      student_alias: string | null;
      prefs: StudentPrefs;
      score: number;
      total: number;
      duration_sec: number | null;
      detail: QuestionResult[] | null;
      created_at: string;
    }[]
  >`
    select distinct on (audience_id, student_events.session_id) concat(audience_id, ':', session_id) as session_id, student_alias, prefs, score, total, duration_sec, detail,
      coalesce(occurred_at, created_at) as created_at
    from student_events where lesson_id = ${lessonId} and kind = 'quiz' and total > 0 ${scope}
    order by audience_id, student_events.session_id, coalesce(occurred_at, created_at) desc, id desc`;
  const [lessonRow] = await sql<{ versions: LessonVersions; quiz: QuizQuestion[] }[]>`
    select coalesce(published_content->'versions', versions) as versions, coalesce(published_content->'quiz', quiz) as quiz from lessons where id = ${lessonId}`;
  const [attemptCount] = await sql<{ n: number }[]>`select count(*)::int as n from student_events where lesson_id = ${lessonId} and kind = 'quiz' and total > 0 ${scope}`;
  const availableVersions = VERSION_KEYS.filter((k) => {
    const v = lessonRow?.versions?.[k];
    return !!v?.checked && !!v.text?.trim();
  });

  const prefCounts: LessonStats["prefCounts"] = {
    mudah: 0,
    ringkasan: 0,
    jawa: 0,
    sunda: 0,
    besar: 0,
    kontras: 0,
    spasi: 0,
    dengar: 0,
  };
  let adaptive = 0;
  for (const { prefs } of opens) {
    const isAdaptive = prefs.versi !== "asli" || prefs.besar || prefs.kontras || prefs.spasi || prefs.dengar;
    if (isAdaptive) adaptive++;
    if (prefs.versi in prefCounts && prefs.versi !== "asli") prefCounts[prefs.versi]++;
    if (prefs.besar) prefCounts.besar++;
    if (prefs.kontras) prefCounts.kontras++;
    if (prefs.spasi) prefCounts.spasi++;
    if (prefs.dengar) prefCounts.dengar++;
  }

  const pct = (s: number, t: number) => (t > 0 ? (s / t) * 100 : 0);
  const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null);

  const durations = (items: readonly { duration_sec: number | null }[]) =>
    items.map((q) => q.duration_sec).filter((d): d is number => typeof d === "number" && d > 0);

  // Baris "Teks asli" selalu tampil; versi lain tampil bila tersedia atau pernah dipakai.
  const byVersion = (["asli", ...VERSION_KEYS] as const)
    .map((versi) => {
      const items = quizzes.filter((q) => (q.prefs?.versi ?? "asli") === versi);
      return {
        versi,
        attempts: items.length,
        avgPct: avg(items.map((q) => pct(q.score, q.total))),
        avgDurationSec: avg(durations(items)),
      };
    })
    .filter((v) => v.versi === "asli" || v.attempts > 0 || availableVersions.includes(v.versi));

  const byQuestion: LessonStats["byQuestion"] = {};
  const wrongCounts: Record<string, Map<string, { text: string; n: number }>> = {};
  for (const q of quizzes) {
    for (const d of Array.isArray(q.detail) ? q.detail : []) {
      if (!d || typeof d.k !== "string") continue;
      const row = (byQuestion[d.k] ??= { attempts: 0, correct: 0, wrong: [], hints: 0 });
      row.attempts++;
      if (d.b) row.correct++;
      if (typeof d.h === "number" && d.h > 0) row.hints++;
      if (!d.b && typeof d.j === "string" && d.j.trim()) {
        const text = d.j.trim().slice(0, 80);
        const map = (wrongCounts[d.k] ??= new Map());
        const key = text.toLocaleLowerCase();
        const cur = map.get(key) ?? { text, n: 0 };
        cur.n++;
        map.set(key, cur);
      }
    }
  }
  for (const [k, map] of Object.entries(wrongCounts)) {
    if (byQuestion[k]) byQuestion[k].wrong = [...map.values()].sort((a, b) => b.n - a.n).slice(0, 3);
  }

  const groups: LessonStats["groups"] = { dasar: [], inti: [], tantangan: [] };
  for (const q of quizzes) {
    groups[jenjangFor(pct(q.score, q.total))].push(q.student_alias?.trim() || "Tanpa nama");
  }
  for (const k of JENJANG_KEYS) groups[k].sort((a, b) => a.localeCompare(b, "id"));

  const recent = [...quizzes]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, allRecent ? undefined : 12)
    .map((q) => ({
      alias: q.student_alias,
      versi: q.prefs?.versi ?? "asli",
      prefs: q.prefs,
      score: q.score,
      total: q.total,
      durationSec: q.duration_sec,
      at: new Date(q.created_at).toISOString(),
    }));

  return {
    byConcept: conceptStats(lessonRow?.quiz ?? [], quizzes),
    confusion,
    totalQuizAttempts: attemptCount.n,
    sessions: opens.length,
    adaptiveSessions: adaptive,
    prefCounts,
    availableVersions,
    quizAttempts: quizzes.length,
    avgScorePct: avg(quizzes.map((q) => pct(q.score, q.total))),
    avgDurationSec: avg(durations(quizzes)),
    byVersion,
    byQuestion,
    groups,
    recent,
  };
}

export async function getTeacherOverview(teacherId: string) {
  const sql = await getDb();
  const [row] = await sql<{ published: number; drafts: number; sessions: number }[]>`
    select
      (select count(*)::int from lessons where teacher_id = ${teacherId} and status = 'published') as published,
      (select count(*)::int from lessons where teacher_id = ${teacherId} and status = 'draft') as drafts,
      (select count(distinct (e.lesson_id, e.audience_id, e.session_id))::int from student_events e join lessons l on l.id = e.lesson_id
        where l.teacher_id = ${teacherId} and e.kind in ('open', 'quiz', 'confused')) as sessions`;
  return row;
}

// ---------- Gambar materi ----------

export const IMAGE_MIME = ["image/jpeg", "image/png", "image/webp"] as const;
export type ImageMime = (typeof IMAGE_MIME)[number] | "image/svg+xml";

/** Batas penyimpanan gambar per akun guru, supaya database gratis tidak cepat penuh. */
const MAX_IMAGES_PER_TEACHER = 400;
const MAX_BYTES_PER_TEACHER = 60 * 1024 * 1024;

export class ImageQuotaError extends Error {}

export async function insertImage(input: {
  teacherId: string;
  lessonId: string | null;
  mime: ImageMime;
  data: Buffer;
  width: number | null;
  height: number | null;
}) {
  const sql = await getDb();
  const [usage] = await sql<{ n: number; bytes: number }[]>`
    select count(*)::int as n, coalesce(sum(bytes), 0)::bigint::float8 as bytes
    from lesson_images where teacher_id = ${input.teacherId}`;
  if (usage.n >= MAX_IMAGES_PER_TEACHER || usage.bytes + input.data.length > MAX_BYTES_PER_TEACHER) {
    await cleanupImages(input.teacherId, { minAgeMinutes: 60 });
    const [again] = await sql<{ n: number; bytes: number }[]>`
      select count(*)::int as n, coalesce(sum(bytes), 0)::bigint::float8 as bytes
      from lesson_images where teacher_id = ${input.teacherId}`;
    if (again.n >= MAX_IMAGES_PER_TEACHER || again.bytes + input.data.length > MAX_BYTES_PER_TEACHER) {
      throw new ImageQuotaError("Ruang gambar akun ini sudah penuh. Hapus materi lama yang tidak dipakai.");
    }
  }
  const [row] = await sql<{ id: string }[]>`
    insert into lesson_images (teacher_id, lesson_id, mime, data, width, height, bytes)
    values (${input.teacherId}, ${isUuid(input.lessonId) ? input.lessonId : null}, ${input.mime}, ${input.data},
      ${input.width}, ${input.height}, ${input.data.length})
    returning id`;
  return row.id;
}

/** Gambar untuk ditampilkan. Tidak butuh login: siswa membukanya lewat link materi (ID acak, tidak bisa ditebak). */
export async function getImage(id: string) {
  if (!isUuid(id)) return null;
  const sql = await getDb();
  const rows = await sql<{ mime: string; data: Buffer; teacher_id: string }[]>`
    select mime, data, teacher_id from lesson_images where id = ${id}`;
  return rows[0] ?? null;
}

/** Gambar milik guru tertentu (untuk dikirim ke AI). */
export async function getOwnImage(teacherId: string, id: string) {
  const img = await getImage(id);
  return img && img.teacher_id === teacherId ? img : null;
}

/**
 * Hapus gambar yang tidak lagi dipakai di materi mana pun milik guru ini.
 * Gambar yang baru diunggah (belum sempat tersimpan di materi) dibiarkan dulu.
 */
export async function cleanupImages(teacherId: string, { minAgeMinutes = 120 } = {}) {
  const sql = await getDb();
  await sql`
    delete from lesson_images i
    where i.teacher_id = ${teacherId}
      and i.created_at < now() - make_interval(mins => ${minAgeMinutes})
      and not exists (
        select 1 from lessons l
        where l.teacher_id = i.teacher_id
          and (strpos(l.body, i.id::text) > 0 or strpos(l.versions::text, i.id::text) > 0
            or strpos(l.published_content::text, i.id::text) > 0)
      )
      and not exists (
        select 1 from lesson_revisions r join lessons l on l.id = r.lesson_id
        where l.teacher_id = i.teacher_id and strpos(r.snapshot::text, i.id::text) > 0
      )`;
}
