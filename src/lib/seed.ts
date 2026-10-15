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
import {
  DEMO_SHARE_CODE_PECAHAN,
  FOTOSINTESIS_EXTRA,
  FOTOSINTESIS_JENJANG,
  FOTOSINTESIS_PRACTICE,
  PECAHAN_BODY,
  PECAHAN_EXTRA,
  PECAHAN_GLOSSARY,
  PECAHAN_MUDAH,
  PECAHAN_PRACTICE,
  PECAHAN_QUIZ,
  PECAHAN_RINGKASAN,
  PROSEDUR_EXTRA,
  TUMBUHAN_EXTRA,
  type QuizExtra,
} from "./demo-adaptif";
import { DEMO_IMAGES } from "./demo-images";
import { hashPassword } from "./password";
import { questionKey } from "./quiz";
import { figureIds, fingerprint } from "./text";
import type { GlossaryItem, Jenjang, LessonFigures, LessonVersions, QuizQuestion, StudentPrefs, TeachingKit } from "./types";

// Data demo sesuai rencana build: 1 guru, 2 kelas, 3 materi terbit (masing-masing 4 versi yang sudah
// dicek + kuis 5 soal), 1 draf untuk mendemokan AI, dan ±60 hasil kuis di semua cara belajar.
// Ditambah (demo-adaptif.ts): konsep & petunjuk per soal, jawaban salah yang khas untuk analisis rekap,
// bank latihan adaptif dan tugas berjenjang (Fotosintesis), serta materi Matematika "Pecahan Senilai" (DEMO04).

type DemoLesson = {
  classKey: "4B" | "6A";
  title: string;
  subject: string;
  body: string;
  glossary: GlossaryItem[];
  texts: { mudah: string; ringkasan: string; jawa?: string; sunda?: string };
  regionalGlossary?: { jawa: GlossaryItem[]; sunda: GlossaryItem[] };
  quiz: QuizQuestion[];
  /** Konsep, petunjuk, dan jawaban salah yang sering dipilih per soal (demo-adaptif.ts). */
  extra: QuizExtra[];
  /** Bank latihan adaptif yang sudah dicek guru. */
  practice?: QuizQuestion[];
  /** Tugas berjenjang (TaRL) yang sudah dicek guru. */
  jenjang?: Jenjang;
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
    extra: FOTOSINTESIS_EXTRA,
    practice: FOTOSINTESIS_PRACTICE,
    jenjang: FOTOSINTESIS_JENJANG,
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
    extra: TUMBUHAN_EXTRA,
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
    extra: PROSEDUR_EXTRA,
    shareCode: DEMO_SHARE_CODE_PROSEDUR,
    hoursAgo: 3,
    sessions: 22,
    homeLang: "sunda",
  },
  {
    classKey: "4B",
    title: "Pecahan Senilai",
    subject: "Matematika",
    body: PECAHAN_BODY,
    glossary: PECAHAN_GLOSSARY,
    texts: { mudah: PECAHAN_MUDAH, ringkasan: PECAHAN_RINGKASAN },
    quiz: PECAHAN_QUIZ,
    extra: PECAHAN_EXTRA,
    practice: PECAHAN_PRACTICE,
    shareCode: DEMO_SHARE_CODE_PECAHAN,
    hoursAgo: 2,
    sessions: 22,
    homeLang: "jawa",
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

type DemoSession = {
  alias: string;
  prefs: StudentPrefs;
  score: number | null;
  detail: { k: string; b: boolean; j?: string; h?: number }[] | null;
  seconds: number;
  minutesAgo: number;
};

/** Peluang menjawab benar per soal: soal ke-3 dan ke-5 sengaja lebih sulit supaya rekap per soal menarik. */
const DIFFICULTY = [0.88, 0.8, 0.52, 0.72, 0.46];

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
    // Siswa yang memakai versi teks lain sedikit lebih sering benar (sesuai tujuan Selaras; data fiktif).
    const boost = versi === "asli" ? 0 : 0.06;
    // Jawaban salah memakai pengecoh yang khas (yang pertama paling sering), supaya analisis rekap punya bahan.
    const detail = finished
      ? lesson.quiz.map((q, qi) => {
          const b = rand() < DIFFICULTY[qi % DIFFICULTY.length] + boost;
          const wrong = lesson.extra[qi]?.wrong ?? [];
          const r = rand();
          const hint = rand();
          return {
            k: questionKey(q),
            b,
            ...(!b && wrong.length ? { j: wrong[r < 0.62 ? 0 : r < 0.88 ? Math.min(1, wrong.length - 1) : wrong.length - 1] } : {}),
            ...((q.hints?.length || lesson.extra[qi]?.hints.length) && hint < (b ? 0.12 : 0.35) ? { h: hint < 0.1 ? 2 : 1 } : {}),
          };
        })
      : null;
    const score = detail ? detail.filter((d) => d.b).length : null;
    return {
      alias: ALIASES[(i + seed) % ALIASES.length],
      prefs,
      score,
      detail,
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
    // Gambar yang diunggah pengunjung akun demo ikut dibersihkan (diagram demo diisi ulang di bawah).
    await sql`delete from lesson_images where teacher_id = ${teacherId} and id <> all(${DEMO_IMAGES.map((i) => i.id)}::uuid[])`;
  }

  // Diagram demo (SVG buatan tim) dengan ID tetap, supaya teks materi demo bisa merujuknya.
  for (const img of DEMO_IMAGES) {
    const data = Buffer.from(img.svg, "utf8");
    await sql`
      insert into lesson_images (id, teacher_id, lesson_id, mime, data, width, height, bytes)
      values (${img.id}, ${teacherId}, null, 'image/svg+xml', ${data}, ${img.figure.width ?? null},
        ${img.figure.height ?? null}, ${data.length})
      on conflict (id) do update set data = excluded.data, teacher_id = excluded.teacher_id, bytes = excluded.bytes`;
  }
  const demoFigures = (text: string): LessonFigures =>
    Object.fromEntries(
      DEMO_IMAGES.filter((img) => figureIds(text).includes(img.id)).map((img) => [img.id, img.figure]),
    );

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
      ...(demo.texts.jawa ? { jawa: version(demo.texts.jawa, demo.regionalGlossary?.jawa) } : {}),
      ...(demo.texts.sunda ? { sunda: version(demo.texts.sunda, demo.regionalGlossary?.sunda) } : {}),
    };
    // Soal kuis demo diberi konsep dan petunjuk bertahap (latihan adaptif & rekap konsep).
    const quiz = demo.quiz.map((q, i) => ({
      ...q,
      concept: q.concept ?? demo.extra[i]?.concept,
      ...(q.hints?.length || demo.extra[i]?.hints.length ? { hints: q.hints ?? demo.extra[i].hints } : {}),
    }));
    const teachingKit: TeachingKit = demo.jenjang
      ? { jenjang: { data: demo.jenjang, origin: "ai", checked: true, basedOn, updatedAt: at.toISOString() } }
      : {};

    const [lesson] = await sql<{ id: string }[]>`
      insert into lessons (teacher_id, class_id, title, subject, body, glossary, versions, quiz, practice, teaching_kit, figures, status, share_code, published_at, created_at, updated_at)
      values (
        ${teacherId}, ${classIds[demo.classKey]}, ${demo.title}, ${demo.subject}, ${demo.body},
        ${sql.json(demo.glossary)}, ${sql.json(versions as never)}, ${sql.json(quiz as never)},
        ${sql.json((demo.practice ?? []) as never)}, ${sql.json(teachingKit as never)},
        ${sql.json(demoFigures([demo.body, ...Object.values(demo.texts)].join("\n")) as never)},
        'published', ${demo.shareCode}, ${at}, ${at}, ${at}
      )
      returning id`;

    const events: Record<string, unknown>[] = [];
    for (const [i, s] of demoSessions({ ...demo, quiz }, 7 + n * 31).entries()) {
      const openedAt = new Date(Date.now() - s.minutesAgo * 60_000);
      const base = { lesson_id: lesson.id, session_id: `demo-${n + 1}-${i + 1}`, student_alias: s.alias };
      events.push({
        ...base,
        kind: "open",
        prefs: s.prefs,
        score: null,
        total: null,
        duration_sec: null,
        detail: null,
        created_at: openedAt,
      });
      if (s.score !== null) {
        events.push({
          ...base,
          kind: "quiz",
          prefs: s.prefs,
          score: s.score,
          total: demo.quiz.length,
          duration_sec: s.seconds,
          detail: s.detail,
          created_at: new Date(openedAt.getTime() + (4 * 60 + s.seconds) * 1000),
        });
      }
    }
    await sql`
      insert into student_events ${sql(
        events.map((e) => ({
          ...e,
          prefs: sql.json(e.prefs as StudentPrefs),
          detail: e.detail ? sql.json(e.detail as never) : null,
        })) as never,
        "lesson_id",
        "session_id",
        "kind",
        "student_alias",
        "prefs",
        "score",
        "total",
        "duration_sec",
        "detail",
        "created_at",
      )}`;
  }

  // Draf tanpa versi, untuk mendemokan "Buat draf semua versi dengan AI".
  await sql`
    insert into lessons (teacher_id, class_id, title, subject, body, status, updated_at)
    values (${teacherId}, ${classIds["4B"]}, ${"Daur Air"}, ${"IPAS"}, ${DAUR_AIR_BODY}, 'draft', now() - interval '1 hour')`;
}
