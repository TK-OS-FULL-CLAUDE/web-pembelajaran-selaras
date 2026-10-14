import type { Sql } from "./db";
import {
  DAUR_AIR_BODY,
  DEMO_CLASS,
  DEMO_EMAIL,
  DEMO_PASSWORD,
  DEMO_SCHOOL,
  DEMO_SHARE_CODE,
  DEMO_TEACHER_NAME,
  FOTOSINTESIS_BODY,
  FOTOSINTESIS_GLOSSARY,
  FOTOSINTESIS_JAWA,
  FOTOSINTESIS_JAWA_GLOSSARY,
  FOTOSINTESIS_MUDAH,
  FOTOSINTESIS_QUIZ,
} from "./demo-content";
import { hashPassword } from "./password";
import { fingerprint } from "./text";
import type { LessonVersions, StudentPrefs } from "./types";

type DemoSession = {
  alias: string;
  prefs: StudentPrefs;
  score: number | null;
  minutesAgo: number;
};

const p = (versi: StudentPrefs["versi"], opts: Partial<Omit<StudentPrefs, "versi">> = {}): StudentPrefs => ({
  versi,
  besar: false,
  kontras: false,
  spasi: false,
  dengar: false,
  ...opts,
});

// Sesi siswa fiktif supaya tab Rekap tidak kosong saat demo.
const DEMO_SESSIONS: DemoSession[] = [
  { alias: "Dimas", prefs: p("asli", { besar: true, kontras: true, dengar: true }), score: 4, minutesAgo: 95 },
  { alias: "Sari", prefs: p("mudah", { spasi: true, dengar: true }), score: 4, minutesAgo: 93 },
  { alias: "Bayu", prefs: p("daerah"), score: 3, minutesAgo: 92 },
  { alias: "Nadia", prefs: p("asli"), score: 5, minutesAgo: 90 },
  { alias: "Raka", prefs: p("asli"), score: 3, minutesAgo: 88 },
  { alias: "Putri", prefs: p("mudah"), score: 4, minutesAgo: 87 },
  { alias: "Ayu", prefs: p("daerah", { dengar: true }), score: 4, minutesAgo: 85 },
  { alias: "Fajar", prefs: p("asli"), score: 4, minutesAgo: 84 },
  { alias: "Lina", prefs: p("mudah", { spasi: true }), score: 3, minutesAgo: 82 },
  { alias: "Joko", prefs: p("daerah"), score: 5, minutesAgo: 80 },
  { alias: "Wulan", prefs: p("asli", { besar: true }), score: 4, minutesAgo: 79 },
  { alias: "Tegar", prefs: p("asli"), score: null, minutesAgo: 77 },
  { alias: "Mega", prefs: p("mudah"), score: null, minutesAgo: 75 },
  { alias: "Hana", prefs: p("asli"), score: 5, minutesAgo: 74 },
];

/**
 * Mengisi akun guru demo beserta kelas 4B dan materinya.
 * reset=false: hanya mengisi saat akun demo belum ada (pertama kali app jalan).
 * reset=true: mengembalikan data demo ke kondisi awal (tombol "Reset data demo").
 */
export async function seedDemo(sql: Sql, { reset }: { reset: boolean }) {
  const existing = await sql<{ id: string }[]>`select id from teachers where email = ${DEMO_EMAIL}`;
  let teacherId: string;

  if (existing.length === 0) {
    const [row] = await sql<{ id: string }[]>`
      insert into teachers (email, name, school, password_hash, is_demo)
      values (${DEMO_EMAIL}, ${DEMO_TEACHER_NAME}, ${DEMO_SCHOOL}, ${hashPassword(DEMO_PASSWORD)}, true)
      returning id`;
    teacherId = row.id;
  } else {
    if (!reset) return;
    teacherId = existing[0].id;
    await sql`delete from lessons where teacher_id = ${teacherId}`;
    await sql`delete from classes where teacher_id = ${teacherId}`;
  }

  const [cls] = await sql<{ id: string }[]>`
    insert into classes (teacher_id, name, grade, needs)
    values (${teacherId}, ${DEMO_CLASS.name}, ${DEMO_CLASS.grade}, ${sql.json(DEMO_CLASS.needs)})
    returning id`;

  const now = new Date().toISOString();
  const basedOn = fingerprint(FOTOSINTESIS_BODY);
  const versions: LessonVersions = {
    mudah: {
      text: FOTOSINTESIS_MUDAH,
      glossary: [],
      origin: "ai",
      checked: true,
      basedOn,
      updatedAt: now,
    },
    daerah: {
      text: FOTOSINTESIS_JAWA,
      glossary: FOTOSINTESIS_JAWA_GLOSSARY,
      origin: "ai",
      checked: true,
      lang: "jw",
      basedOn,
      updatedAt: now,
    },
  };

  const [lesson] = await sql<{ id: string }[]>`
    insert into lessons (teacher_id, class_id, title, subject, body, glossary, versions, quiz, status, share_code, published_at, updated_at)
    values (
      ${teacherId}, ${cls.id}, ${"Fotosintesis"}, ${"IPAS"}, ${FOTOSINTESIS_BODY},
      ${sql.json(FOTOSINTESIS_GLOSSARY)}, ${sql.json(versions as never)}, ${sql.json(FOTOSINTESIS_QUIZ as never)},
      'published', ${DEMO_SHARE_CODE}, now() - interval '2 hours', now() - interval '2 hours'
    )
    returning id`;

  await sql`
    insert into lessons (teacher_id, class_id, title, subject, body, status, updated_at)
    values (${teacherId}, ${cls.id}, ${"Daur Air"}, ${"IPAS"}, ${DAUR_AIR_BODY}, 'draft', now() - interval '1 hour')`;

  for (const [i, s] of DEMO_SESSIONS.entries()) {
    const sessionId = `demo-${i + 1}`;
    const openedAt = new Date(Date.now() - s.minutesAgo * 60_000);
    await sql`
      insert into student_events (lesson_id, session_id, kind, student_alias, prefs, created_at)
      values (${lesson.id}, ${sessionId}, 'open', ${s.alias}, ${sql.json(s.prefs)}, ${openedAt})`;
    if (s.score !== null) {
      const doneAt = new Date(openedAt.getTime() + 9 * 60_000);
      await sql`
        insert into student_events (lesson_id, session_id, kind, student_alias, prefs, score, total, created_at)
        values (${lesson.id}, ${sessionId}, 'quiz', ${s.alias}, ${sql.json(s.prefs)}, ${s.score}, ${FOTOSINTESIS_QUIZ.length}, ${doneAt})`;
    }
  }
}
