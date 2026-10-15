import type { Sql } from "./db";
import {
  DAUR_AIR_BODY,
  DEMO_CLASS,
  DEMO_CLASS_6,
  DEMO_EMAIL,
  DEMO_PASSWORD,
  DEMO_SCHOOL,
  DEMO_SHARE_CODE,
  DEMO_SHARE_CODE_PROSEDUR,
  DEMO_SHARE_CODE_TUMBUHAN,
  DEMO_TEACHER_NAME,
  FOTOSINTESIS_BODY,
  FOTOSINTESIS_GLOSSARY,
  FOTOSINTESIS_JAWA,
  FOTOSINTESIS_JAWA_GLOSSARY,
  FOTOSINTESIS_MUDAH,
  FOTOSINTESIS_QUIZ,
  FOTOSINTESIS_RINGKASAN,
  FOTOSINTESIS_SUNDA,
  FOTOSINTESIS_SUNDA_GLOSSARY,
  PROSEDUR_BODY,
  PROSEDUR_GLOSSARY,
  PROSEDUR_JAWA,
  PROSEDUR_JAWA_GLOSSARY,
  PROSEDUR_MUDAH,
  PROSEDUR_QUIZ,
  PROSEDUR_RINGKASAN,
  PROSEDUR_SUNDA,
  PROSEDUR_SUNDA_GLOSSARY,
  TUMBUHAN_BODY,
  TUMBUHAN_GLOSSARY,
  TUMBUHAN_JAWA,
  TUMBUHAN_JAWA_GLOSSARY,
  TUMBUHAN_MUDAH,
  TUMBUHAN_QUIZ,
  TUMBUHAN_RINGKASAN,
  TUMBUHAN_SUNDA,
  TUMBUHAN_SUNDA_GLOSSARY,
} from "./demo-content";
import { hashPassword } from "./password";
import { fingerprint } from "./text";
import type { GlossaryItem, LessonVersions, QuizQuestion, StudentPrefs } from "./types";

// Data demo sesuai rencana build: 1 guru, 2 kelas, 3 materi terbit (masing-masing 4 versi yang sudah
// dicek + kuis 5 soal), 1 draf untuk mendemokan AI, dan ±60 hasil kuis di semua cara belajar.

type DemoLesson = {
  classKey: "4B" | "6A";
  title: string;
  subject: string;
  body: string;
  glossary: GlossaryItem[];
  texts: { mudah: string; ringkasan: string; jawa: string; sunda: string };
  regionalGlossary: { jawa: GlossaryItem[]; sunda: GlossaryItem[] };
  quiz: QuizQuestion[];
  shareCode: string;
  hoursAgo: number;
  sessions: number;
  /** Bahasa daerah yang paling banyak dipakai di kelas ini. */
  homeLang: "jawa" | "sunda";
};

const DEMO_LESSONS: DemoLesson[] = [
  {
    classKey: "4B",
    title: "Fotosintesis",
    subject: "IPAS",
    body: FOTOSINTESIS_BODY,
    glossary: FOTOSINTESIS_GLOSSARY,
    texts: {
      mudah: FOTOSINTESIS_MUDAH,
      ringkasan: FOTOSINTESIS_RINGKASAN,
      jawa: FOTOSINTESIS_JAWA,
      sunda: FOTOSINTESIS_SUNDA,
    },
    regionalGlossary: { jawa: FOTOSINTESIS_JAWA_GLOSSARY, sunda: FOTOSINTESIS_SUNDA_GLOSSARY },
    quiz: FOTOSINTESIS_QUIZ,
    shareCode: DEMO_SHARE_CODE,
    hoursAgo: 26,
    sessions: 24,
    homeLang: "jawa",
  },
  {
    classKey: "4B",
    title: "Bagian Tumbuhan dan Fungsinya",
    subject: "IPAS",
    body: TUMBUHAN_BODY,
    glossary: TUMBUHAN_GLOSSARY,
    texts: { mudah: TUMBUHAN_MUDAH, ringkasan: TUMBUHAN_RINGKASAN, jawa: TUMBUHAN_JAWA, sunda: TUMBUHAN_SUNDA },
    regionalGlossary: { jawa: TUMBUHAN_JAWA_GLOSSARY, sunda: TUMBUHAN_SUNDA_GLOSSARY },
    quiz: TUMBUHAN_QUIZ,
    shareCode: DEMO_SHARE_CODE_TUMBUHAN,
    hoursAgo: 5,
    sessions: 20,
    homeLang: "jawa",
  },
  {
    classKey: "6A",
    title: "Mengenal Teks Prosedur",
    subject: "Bahasa Indonesia",
    body: PROSEDUR_BODY,
    glossary: PROSEDUR_GLOSSARY,
    texts: { mudah: PROSEDUR_MUDAH, ringkasan: PROSEDUR_RINGKASAN, jawa: PROSEDUR_JAWA, sunda: PROSEDUR_SUNDA },
    regionalGlossary: { jawa: PROSEDUR_JAWA_GLOSSARY, sunda: PROSEDUR_SUNDA_GLOSSARY },
    quiz: PROSEDUR_QUIZ,
    shareCode: DEMO_SHARE_CODE_PROSEDUR,
    hoursAgo: 3,
    sessions: 22,
    homeLang: "sunda",
  },
];

const ALIASES = [
  "Dimas", "Sari", "Bayu", "Nadia", "Raka", "Putri", "Ayu", "Fajar", "Lina", "Joko", "Wulan", "Tegar",
  "Mega", "Hana", "Rizki", "Nisa", "Asep", "Neng", "Ujang", "Dewi", "Bima", "Citra", "Eka", "Gilang",
];

/** Pembangkit angka acak sederhana dengan benih tetap, supaya data demo selalu sama setiap reset. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

type DemoSession = { alias: string; prefs: StudentPrefs; score: number | null; seconds: number; minutesAgo: number };

function demoSessions(lesson: DemoLesson, seed: number): DemoSession[] {
  const rand = rng(seed);
  const other = lesson.homeLang === "jawa" ? "sunda" : "jawa";
  // Kira-kira separuh siswa memakai versi teks selain teks asli; bahasa ibu kelas lebih sering dipilih.
  const pickVersi = (): StudentPrefs["versi"] => {
    const r = rand();
    if (r < 0.42) return "asli";
    if (r < 0.62) return "mudah";
    if (r < 0.76) return "ringkasan";
    if (r < 0.93) return lesson.homeLang;
    return other;
  };
  const total = lesson.quiz.length;
  return Array.from({ length: lesson.sessions }, (_, i) => {
    const versi = pickVersi();
    const prefs: StudentPrefs = {
      versi,
      besar: rand() < 0.18,
      kontras: rand() < 0.1,
      spasi: rand() < 0.16,
      dengar: rand() < 0.28,
    };
    const finished = rand() < 0.88;
    const score = finished ? Math.min(total, 2 + Math.floor(rand() * (total - 1))) : null;
    return {
      alias: ALIASES[(i + seed) % ALIASES.length],
      prefs,
      score,
      seconds: 80 + Math.floor(rand() * 260),
      minutesAgo: Math.max(5, lesson.hoursAgo * 60 - 20 - i * 6),
    };
  });
}

/**
 * Mengisi akun guru demo beserta kelas dan materinya.
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

  const classIds: Record<DemoLesson["classKey"], string> = { "4B": "", "6A": "" };
  for (const [key, cls] of [
    ["4B", DEMO_CLASS],
    ["6A", DEMO_CLASS_6],
  ] as const) {
    const [row] = await sql<{ id: string }[]>`
      insert into classes (teacher_id, name, grade, needs)
      values (${teacherId}, ${cls.name}, ${cls.grade}, ${sql.json(cls.needs)})
      returning id`;
    classIds[key] = row.id;
  }

  for (const [n, demo] of DEMO_LESSONS.entries()) {
    const at = new Date(Date.now() - demo.hoursAgo * 60 * 60_000);
    const basedOn = fingerprint(demo.body);
    const version = (text: string, glossary: GlossaryItem[] = []) => ({
      text,
      glossary,
      origin: "ai" as const,
      checked: true,
      basedOn,
      updatedAt: at.toISOString(),
    });
    const versions: LessonVersions = {
      mudah: version(demo.texts.mudah),
      ringkasan: version(demo.texts.ringkasan),
      jawa: version(demo.texts.jawa, demo.regionalGlossary.jawa),
      sunda: version(demo.texts.sunda, demo.regionalGlossary.sunda),
    };

    const [lesson] = await sql<{ id: string }[]>`
      insert into lessons (teacher_id, class_id, title, subject, body, glossary, versions, quiz, status, share_code, published_at, created_at, updated_at)
      values (
        ${teacherId}, ${classIds[demo.classKey]}, ${demo.title}, ${demo.subject}, ${demo.body},
        ${sql.json(demo.glossary)}, ${sql.json(versions as never)}, ${sql.json(demo.quiz as never)},
        'published', ${demo.shareCode}, ${at}, ${at}, ${at}
      )
      returning id`;

    const events: Record<string, unknown>[] = [];
    for (const [i, s] of demoSessions(demo, 7 + n * 31).entries()) {
      const openedAt = new Date(Date.now() - s.minutesAgo * 60_000);
      const base = { lesson_id: lesson.id, session_id: `demo-${n + 1}-${i + 1}`, student_alias: s.alias };
      events.push({ ...base, kind: "open", prefs: s.prefs, score: null, total: null, duration_sec: null, created_at: openedAt });
      if (s.score !== null) {
        events.push({
          ...base,
          kind: "quiz",
          prefs: s.prefs,
          score: s.score,
          total: demo.quiz.length,
          duration_sec: s.seconds,
          created_at: new Date(openedAt.getTime() + (4 * 60 + s.seconds) * 1000),
        });
      }
    }
    await sql`
      insert into student_events ${sql(
        events.map((e) => ({ ...e, prefs: sql.json(e.prefs as StudentPrefs) })) as never,
        "lesson_id",
        "session_id",
        "kind",
        "student_alias",
        "prefs",
        "score",
        "total",
        "duration_sec",
        "created_at",
      )}`;
  }

  // Draf tanpa versi, untuk mendemokan "Buat draf semua versi dengan AI".
  await sql`
    insert into lessons (teacher_id, class_id, title, subject, body, status, updated_at)
    values (${teacherId}, ${classIds["4B"]}, ${"Daur Air"}, ${"IPAS"}, ${DAUR_AIR_BODY}, 'draft', now() - interval '1 hour')`;
}
