"use client";

// Ruang siswa (Peran 3). Tanpa login: siswa memilih cara belajar, membaca/mendengarkan, lalu kuis.
// Pilihan disimpan di HP siswa (localStorage) dan dicatat tanpa data pribadi untuk rekap guru.

import {
  ALargeSmall,
  BookA,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  Contrast,
  FileText,
  Languages,
  ListChecks,
  Pause,
  Printer,
  Ruler,
  ScrollText,
  Settings2,
  SpaceIcon,
  Volume2,
  X,
  type LucideIcon,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { clearLearnerPreferences, enqueueEvent, flushEvents, outboxState, OUTBOX_CHANGED } from "@/lib/student-outbox";
import { MODE_TONE, TONES, type ModeKey } from "@/lib/modes";
import {
  DEFAULT_PREFS,
  VERSION_HTML_LANG,
  VERSION_KEYS,
  VERSION_LABEL,
  VERSION_SPEECH_LANG,
  isRegionalVersion,
  type GlossaryItem,
  type Jenjang,
  type LessonFigures,
  type QuizQuestion,
  type StudentPrefs,
  type VersionKey,
} from "@/lib/types";
import type { QuestionResultPayload } from "./student-quiz";
import { StudentQuiz } from "./student-quiz";
import { InlineText, ReaderText, useReaderStructure } from "../reader-text";
import { AskTutor } from "./ask-tutor";
import { ReadingRuler } from "./reading-ruler";
import { useSpeech, type SpeechRate } from "../use-speech";
import { Logo, buttonClass, cx } from "../ui";
import { ReaderToolbar } from "./reader-toolbar";
import { ConfusionFeedback } from "./confusion-feedback";

export type StudentLesson = {
  revision?: number;
  code: string;
  title: string;
  subject: string;
  className: string | null;
  teacherName: string;
  schoolName?: string | null;
  body: string;
  glossary: GlossaryItem[];
  /** Hanya versi yang sudah dicek guru. */
  versions: Partial<Record<VersionKey, { text: string; glossary: GlossaryItem[] }>>;
  /** Deskripsi gambar yang sudah dicek guru. */
  figures: LessonFigures;
  /** Hanya soal yang lengkap (lihat playableQuestion). */
  quiz: QuizQuestion[];
  /** Bank latihan adaptif yang sudah dicek guru (per konsep). */
  practice?: QuizQuestion[];
  /** Tugas berjenjang (TaRL) yang sudah dicek guru. */
  jenjang?: Jenjang | null;
};

type Step = "mulai" | "pilih" | "baca" | "kuis";

function readStorage<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
function writeStorage(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

// Pilihan terakhir siswa, dipakai lagi saat membuka materi lain di HP yang sama.
const GLOBAL_PREFS_KEY = "selaras:prefs";
const RULER_KEY = "selaras:garis";

function newSessionId() {
  try {
    return crypto.randomUUID();
  } catch {
    return `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

const VERSION_ICON: Record<"asli" | VersionKey, LucideIcon> = {
  asli: FileText,
  mudah: BookOpen,
  ringkasan: ScrollText,
  jawa: Languages,
  sunda: Languages,
};

const VERSION_DESC: Record<"asli" | VersionKey, string> = {
  asli: "Materi seperti yang ditulis gurumu.",
  mudah: "Kalimat pendek dan kata sehari-hari.",
  ringkasan: "Poin-poin penting saja.",
  jawa: "Materi dalam Basa Jawa.",
  sunda: "Materi dalam Basa Sunda.",
};

export function StudentApp({ lesson }: { lesson: StudentLesson }) {
  const prefsKey = `selaras:prefs:${lesson.code}`;
  const sessionKey = `selaras:sesi:${lesson.code}`;

  const [ready, setReady] = useState(false);
  const [step, setStep] = useState<Step>("mulai");
  const [alias, setAlias] = useState("");
  const [prefs, setPrefs] = useState<StudentPrefs>(DEFAULT_PREFS);
  const [sessionId, setSessionId] = useState("");
  const [rate, setRate] = useState<SpeechRate>(1);
  const [device, setDevice] = useState<"personal" | "shared">("shared");
  const [delivery, setDelivery] = useState({ pending: 0, volatile: false });
  const [switchError, setSwitchError] = useState("");
  const [feedbackSent, setFeedbackSent] = useState<Record<string, string[]>>({});
  const speech = useSpeech();
  const lastLogged = useRef<string>("");

  // Muat pilihan tersimpan (siswa yang kembali langsung ke bacaan).
  useEffect(() => {
    const mode = readStorage<string>("selaras:perangkat") === "personal" ? "personal" : "shared";
    setDevice(mode);
    // Awal selalu menjelaskan tujuan materi dan siapa yang memakai perangkat.
    if (mode === "personal") {
      const saved = readStorage<StudentPrefs>(prefsKey) ?? readStorage<StudentPrefs>(GLOBAL_PREFS_KEY);
      if (saved) setPrefs(sanitize(saved, lesson));
      setAlias(readStorage<string>("selaras:nama") ?? "");
    }
    setReady(true);
  }, [prefsKey, sessionKey, lesson]);

  useEffect(() => {
    const refresh = () => setDelivery(outboxState());
    const retry = () => { void flushEvents(); };
    refresh(); retry();
    window.addEventListener(OUTBOX_CHANGED, refresh);
    window.addEventListener("storage", refresh);
    window.addEventListener("online", retry);
    const timer = setInterval(retry, 15000);
    const unload = (e: BeforeUnloadEvent) => { if (outboxState().volatile) e.preventDefault(); };
    window.addEventListener("beforeunload", unload);
    return () => {
      clearInterval(timer);
      window.removeEventListener(OUTBOX_CHANGED, refresh);
      window.removeEventListener("storage", refresh);
      window.removeEventListener("online", retry);
      window.removeEventListener("beforeunload", unload);
    };
  }, []);

  const log = useCallback(
    (
      kind: "open" | "quiz" | "confused",
      extra: { score?: number; total?: number; durasi?: number; detail?: QuestionResultPayload[]; feedback?: { section: string; revision: number } } = {},
    ) => {
      if (!sessionId) return;
      enqueueEvent({ eventId: newSessionId(), occurredAt: new Date().toISOString(), code: lesson.code,
        sessionId, kind, alias: alias.trim() || null, prefs, ...extra });
    },
    [sessionId, lesson.code, alias, prefs],
  );

  // Catat cara belajar yang dipakai (sekali per kombinasi) untuk rekap guru.
  useEffect(() => {
    if (step !== "baca" || !sessionId) return;
    const signature = JSON.stringify(prefs);
    if (signature === lastLogged.current) return;
    const first = lastLogged.current === "";
    const t = setTimeout(
      () => {
        lastLogged.current = signature;
        log("open");
      },
      first ? 0 : 1500,
    );
    return () => clearTimeout(t);
  }, [step, prefs, sessionId, log]);

  const updatePrefs = (patch: Partial<StudentPrefs>) => {
    setPrefs((p) => {
      const next = { ...p, ...patch };
      if (device === "personal") {
        writeStorage(prefsKey, next);
        writeStorage(GLOBAL_PREFS_KEY, next);
      }
      return next;
    });
  };

  const go = (next: Step) => {
    speech.stop();
    setStep(next);
    window.scrollTo({ top: 0 });
  };

  const resetLearner = (finished = false) => {
    if (outboxState().volatile) {
      setSwitchError("Hasil belum aman tersimpan. Sambungkan internet lalu tekan Kirim ulang sebelum berganti siswa.");
      return;
    }
    if (step === "kuis" && !finished && !window.confirm("Ganti siswa? Jawaban kuis yang belum diselesaikan akan dikosongkan.")) return;
    speech.stop();
    try { clearLearnerPreferences(localStorage); } catch { /* Preferensi di memori tetap direset. */ }
    setAlias(""); setPrefs(DEFAULT_PREFS); setRate(1); setSessionId("");
    setFeedbackSent({});
    lastLogged.current = ""; setSwitchError(""); setStep("mulai");
    window.scrollTo({ top: 0 });
  };

  const changeDevice = (mode: "personal" | "shared") => {
    setDevice(mode); writeStorage("selaras:perangkat", mode);
    setAlias(""); setPrefs(DEFAULT_PREFS);
    try { clearLearnerPreferences(localStorage); } catch { /* Tetap aman di memori. */ }
  };

  const shell = (children: React.ReactNode) => (
    <div className="reader min-h-dvh" data-besar={prefs.besar} data-kontras={prefs.kontras} data-spasi={prefs.spasi}>
      {ready && (
        <header className="papan-tulis ambalan no-print">
          <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-2.5">
            <div className="flex min-w-0 items-center gap-3">
              <Logo light compact />
              <div className="min-w-0 leading-snug">
                <p className="truncate font-bold">
                  {lesson.className || "Materi umum"} · {lesson.teacherName}
                </p>
                <p className="truncate text-[14px] text-papan-200">
                  {[lesson.schoolName, device === "shared" ? "Perangkat bersama" : "Perangkat pribadi", sessionId && alias ? alias : null]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
            </div>
            {sessionId && (
              <button type="button" onClick={() => resetLearner()} className={buttonClass("kapur", "md", "shrink-0")}>
                <Users className="size-4" aria-hidden />
                Ganti siswa
              </button>
            )}
          </div>
        </header>
      )}
      {ready && (
        <div
          className={cx(
            "no-print text-[15px] text-[var(--reader-ink)]",
            (delivery.pending > 0 || !!switchError) && "border-b border-[var(--reader-line)] bg-[var(--reader-bg)] px-4 py-2",
          )}
        >
          <div className="mx-auto max-w-4xl" role="status" aria-live="polite">
            {delivery.pending ? (
              <>
                <span>
                  {delivery.volatile
                    ? "Hasil belum tersimpan aman. Jangan tutup halaman."
                    : `${delivery.pending} catatan tersimpan di perangkat, menunggu dikirim. Jangan hapus data browser.`}
                </span>{" "}
                <button type="button" className="min-h-11 px-2 font-bold underline" onClick={() => void flushEvents()}>
                  Kirim ulang
                </button>
              </>
            ) : sessionId ? (
              <span className="sr-only">Semua catatan belajar yang selesai dikirim sudah tersimpan.</span>
            ) : null}
          </div>
          {switchError && <p role="alert" className="mx-auto max-w-4xl text-galat">{switchError}</p>}
        </div>
      )}
      {children}
    </div>
  );

  if (!ready) return shell(<div className="min-h-dvh" />);

  if (step === "mulai") {
    return shell(
      <><fieldset className="mx-auto mt-5 max-w-3xl px-5 text-tinta">
        <legend className="font-bold">Perangkat ini dipakai siapa?</legend>
        <div className="mt-2 flex flex-wrap gap-3">
          {(["shared", "personal"] as const).map((mode) => <label key={mode} className="flex min-h-12 items-center gap-2 rounded-xl border border-batas bg-white px-4">
            <input type="radio" name="perangkat" checked={device === mode} onChange={() => changeDevice(mode)} />
            {mode === "shared" ? "Bersama / bergantian" : "Pribadi"}
          </label>)}
        </div>
        <p className="mt-2 text-sm">{device === "shared" ? "Setiap siswa memulai sesi baru. Pilihan siswa sebelumnya tidak dipakai kembali." : "Pilihanmu diingat pada perangkat ini. Gunakan Ganti siswa jika orang lain akan belajar."}</p>
      </fieldset><Welcome
        lesson={lesson}
        alias={alias}
        setAlias={setAlias}
        onStart={() => {
          const sid = device === "personal" ? readStorage<string>(sessionKey) || newSessionId() : newSessionId();
          setSessionId(sid);
          if (device === "personal") { writeStorage("selaras:nama", alias.trim()); writeStorage(sessionKey, sid); }
          else { try { clearLearnerPreferences(localStorage); } catch {} }
          go("pilih");
        }}
      /></>,
    );
  }

  if (step === "pilih") {
    return shell(
      <ChooseMode
        lesson={lesson}
        prefs={prefs}
        speechSupported={speech.supported}
        onChange={updatePrefs}
        onDone={() => {
          if (device === "personal") {
            writeStorage(prefsKey, prefs);
            writeStorage(GLOBAL_PREFS_KEY, prefs);
          }
          go("baca");
        }}
      />,
    );
  }

  if (step === "kuis") {
    return shell(
      <StudentQuiz
        key={sessionId}
        onSwitchStudent={() => resetLearner(true)}
        questions={lesson.quiz}
        practice={lesson.practice ?? []}
        jenjang={lesson.jenjang ?? null}
        title={lesson.title}
        speech={speech}
        rate={rate}
        onFinish={(score, total, durasi, detail) => log("quiz", { score, total, durasi, detail })}
        onBack={() => go("baca")}
      />,
    );
  }

  return shell(
    <Reader
      feedbackSent={feedbackSent[prefs.versi] ?? []}
      onConfused={(section) => {
        log("confused", { feedback: { section, revision: lesson.revision ?? 1 } });
        setFeedbackSent((s) => ({ ...s, [prefs.versi]: [...(s[prefs.versi] ?? []), section] }));
      }}
      lesson={lesson}
      prefs={prefs}
      onChange={updatePrefs}
      speech={speech}
      rate={rate}
      setRate={setRate}
      onChangeMode={() => go("pilih")}
      onQuiz={() => go("kuis")}
    />,
  );
}

/** Pastikan pilihan tersimpan masih cocok dengan versi yang tersedia sekarang. */
function sanitize(p: StudentPrefs, lesson: StudentLesson): StudentPrefs {
  const versi =
    p.versi === "asli" || lesson.versions[p.versi] ? p.versi : "asli";
  return { ...DEFAULT_PREFS, ...p, versi };
}

// ---------------------------------------------------------------------------

function Welcome({
  lesson,
  alias,
  setAlias,
  onStart,
}: {
  lesson: StudentLesson;
  alias: string;
  setAlias: (v: string) => void;
  onStart: () => void;
}) {
  const modes: ModeKey[] = [...VERSION_KEYS.filter((k) => lesson.versions[k]), "dengar", "besar", "kontras", "spasi"];
  return (
    <main id="isi" className="latar-titik flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="muncul w-full max-w-xl overflow-hidden rounded-[1.75rem] border border-[var(--reader-line)] bg-[var(--reader-bg)] shadow-angkat">
        <div className="pita-warna" aria-hidden />
        <div className="p-6 sm:p-8">
          <p className="flex flex-wrap gap-2 text-[15px]">
            {[lesson.subject, lesson.className, lesson.teacherName].filter(Boolean).map((t) => (
              <span key={t} className="rounded-full bg-papan-50 px-3 py-1 font-bold text-papan">
                {t}
              </span>
            ))}
          </p>
          <h1 className="mt-4 font-display text-[2.1rem] font-extrabold leading-tight sm:text-[2.5rem]">
            {lesson.title}
          </h1>
          <p className="mt-3 text-[17px] text-[var(--reader-soft)]">
            Kamu bisa membaca materi ini dengan cara yang paling nyaman untukmu.
          </p>
          <ul className="mt-4 flex flex-wrap gap-2" aria-label="Cara belajar yang tersedia">
            {modes.map((m) => {
              const Icon = m in VERSION_ICON ? VERSION_ICON[m as VersionKey] : MODE_ICON[m as keyof typeof MODE_ICON];
              return (
                <li
                  key={m}
                  className={cx(
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[14px] font-bold",
                    TONES[MODE_TONE[m]].chip,
                  )}
                >
                  <Icon className="size-4" aria-hidden />
                  {m in VERSION_LABEL ? VERSION_LABEL[m as VersionKey] : MODE_LABEL[m as keyof typeof MODE_LABEL]}
                </li>
              );
            })}
          </ul>
          <form
            className="mt-8 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              onStart();
            }}
          >
            <label htmlFor="nama" className="block text-[18px] font-bold">
              Nama panggilanmu
            </label>
            <input
              id="nama"
              value={alias}
              onChange={(e) => setAlias(e.target.value.slice(0, 40))}
              autoComplete="nickname"
              placeholder="Contoh: Dimas"
              className="h-14 w-full rounded-2xl border-2 border-batas bg-white px-4 text-[19px] text-tinta focus:border-papan focus:outline-none focus:ring-4 focus:ring-papan/15"
            />
            <p className="pb-3 text-[15px] text-[var(--reader-soft)]">
              Boleh dikosongkan. Cukup nama panggilan, bukan nama lengkap.
            </p>
            <button
              type="submit"
              className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-papan text-[19px] font-bold text-white shadow-kartu hover:bg-papan-600"
            >
              Mulai belajar
              <ChevronRight className="size-5" aria-hidden />
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

// ---------------------------------------------------------------------------

const MODE_ICON = {
  dengar: Volume2,
  besar: ALargeSmall,
  kontras: Contrast,
  spasi: SpaceIcon,
  garis: Ruler,
} as const;

const MODE_LABEL = {
  dengar: "Dibacakan",
  besar: "Huruf besar",
  kontras: "Kontras tinggi",
  spasi: "Spasi lega",
  garis: "Garis bantu",
} as const;

function ChooseMode({
  lesson,
  prefs,
  speechSupported,
  onChange,
  onDone,
}: {
  lesson: StudentLesson;
  prefs: StudentPrefs;
  speechSupported: boolean;
  onChange: (p: Partial<StudentPrefs>) => void;
  onDone: () => void;
}) {
  const versions = (["asli", ...VERSION_KEYS] as const).filter((k) => k === "asli" || lesson.versions[k]);
  const extras: {
    key: "dengar" | "besar" | "kontras" | "spasi";
    desc: string;
    sample?: React.ReactNode;
    disabled?: boolean;
  }[] = [
    {
      key: "dengar",
      desc: speechSupported ? "Materi dibacakan suara, kalimatnya disorot." : "Browser ini belum bisa membacakan teks.",
      disabled: !speechSupported,
    },
    {
      key: "besar",
      desc: "Tulisan lebih besar dan jelas.",
      sample: <span className="font-display text-[26px] font-extrabold leading-none">Aa</span>,
    },
    {
      key: "kontras",
      desc: "Huruf hitam tebal di latar krem.",
      sample: (
        <span className="rounded bg-[#fffbe6] px-1.5 text-[18px] font-bold text-black ring-2 ring-black">Aa</span>
      ),
    },
    {
      key: "spasi",
      desc: "Jarak huruf dan baris lebih lebar.",
      sample: <span className="text-[15px] font-bold tracking-[0.2em]">abc</span>,
    },
  ];
  const plain = prefs.versi === "asli" && !prefs.besar && !prefs.kontras && !prefs.spasi && !prefs.dengar;

  return (
    <main id="isi" className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
      <p className="text-[15px] font-bold text-[var(--reader-soft)]">{lesson.title}</p>
      <h1 className="mt-1 font-display text-[1.9rem] font-extrabold leading-tight">
        Bagaimana kamu paling nyaman belajar?
      </h1>
      <p className="mt-2 text-[17px] text-[var(--reader-soft)]">Kamu bisa menggantinya kapan saja.</p>

      {versions.length > 1 && (
        <fieldset className="mt-7">
          <legend className="font-display text-[19px] font-extrabold">1. Pilih teks yang mau dibaca</legend>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {versions.map((k) => {
              const tone = TONES[MODE_TONE[k]];
              const on = prefs.versi === k;
              const Icon = VERSION_ICON[k];
              return (
                <label
                  key={k}
                  className={cx(
                    "flex min-h-20 cursor-pointer items-center gap-4 rounded-2xl border-2 bg-white p-4 text-tinta transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-aksen",
                    on ? cx(tone.border, tone.soft) : "border-[var(--reader-line)] hover:border-batas",
                  )}
                >
                  <input
                    type="radio"
                    name="versi"
                    className="sr-only"
                    checked={on}
                    onChange={() => onChange({ versi: k })}
                  />
                  <span
                    className={cx("flex size-12 shrink-0 items-center justify-center rounded-xl", tone.chip)}
                    aria-hidden
                  >
                    <Icon className="size-6" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[18px] font-bold">{VERSION_LABEL[k]}</span>
                    <span className="block text-[15px] text-tinta-2">{VERSION_DESC[k]}</span>
                  </span>
                  <span
                    className={cx(
                      "flex size-7 shrink-0 items-center justify-center rounded-full border-2",
                      on ? cx(tone.border, tone.solid) : "border-batas",
                    )}
                    aria-hidden
                  >
                    {on && <Check className="size-4" />}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
      )}

      <fieldset className="mt-8">
        <legend className="font-display text-[19px] font-extrabold">
          {versions.length > 1 ? "2. Tambahan (boleh pilih beberapa)" : "Pilih satu atau beberapa"}
        </legend>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {extras.map((t) => {
            const tone = TONES[MODE_TONE[t.key]];
            const on = prefs[t.key];
            const Icon = MODE_ICON[t.key];
            return (
              <button
                key={t.key}
                type="button"
                aria-pressed={on}
                disabled={t.disabled}
                onClick={() => onChange({ [t.key]: !on })}
                className={cx(
                  "flex min-h-20 w-full items-center gap-4 rounded-2xl border-2 bg-white p-4 text-left text-tinta transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                  on ? cx(tone.border, tone.soft) : "border-[var(--reader-line)] hover:border-batas",
                )}
              >
                <span
                  className={cx("flex size-12 shrink-0 items-center justify-center rounded-xl", tone.chip)}
                  aria-hidden
                >
                  {t.sample ?? <Icon className="size-6" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[18px] font-bold">{MODE_LABEL[t.key]}</span>
                  <span className="block text-[15px] text-tinta-2">{t.desc}</span>
                </span>
                <span
                  className={cx(
                    "flex size-7 shrink-0 items-center justify-center rounded-lg border-2",
                    on ? cx(tone.border, tone.solid) : "border-batas",
                  )}
                  aria-hidden
                >
                  {on && <Check className="size-4" />}
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <button
        type="button"
        onClick={onDone}
        className="mt-9 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-papan text-[19px] font-bold text-white shadow-kartu hover:bg-papan-600"
      >
        {plain ? "Pakai tampilan biasa" : "Lanjut membaca"}
        <ChevronRight className="size-5" aria-hidden />
      </button>
    </main>
  );
}

// ---------------------------------------------------------------------------

function Reader({
  feedbackSent, onConfused,
  lesson,
  prefs,
  onChange,
  speech,
  rate,
  setRate,
  onChangeMode,
  onQuiz,
}: {
  feedbackSent: string[];
  onConfused: (section: string) => void;
  lesson: StudentLesson;
  prefs: StudentPrefs;
  onChange: (p: Partial<StudentPrefs>) => void;
  speech: ReturnType<typeof useSpeech>;
  rate: SpeechRate;
  setRate: (r: SpeechRate) => void;
  onChangeMode: () => void;
  onQuiz: () => void;
}) {
  const version = prefs.versi === "asli" ? null : lesson.versions[prefs.versi];
  const text = version?.text ?? lesson.body;
  const glossary = useMemo(() => {
    // Glosarium bahasa daerah berdiri sendiri; versi berbahasa Indonesia ikut memakai glosarium materi asli.
    if (isRegionalVersion(prefs.versi)) return version?.glossary ?? [];
    return [...(version?.glossary ?? []), ...lesson.glossary];
  }, [prefs.versi, version, lesson]);
  const speechLang = VERSION_SPEECH_LANG[prefs.versi];
  const { sentences } = useReaderStructure(text, lesson.figures);
  const [term, setTerm] = useState<GlossaryItem | null>(null);
  const autoStarted = useRef(false);
  // Kalimat tempat bacaan dijeda, supaya "Lanjutkan" tidak mengulang dari awal.
  const [resumeAt, setResumeAt] = useState<number | null>(null);
  const [ruler, setRuler] = useState(false);
  const versionTone = TONES[MODE_TONE[prefs.versi]];
  // Yang sedang dibacakan adalah jawaban tutor, bukan teks materi (jangan menyorot kalimat materi).
  const [answerMode, setAnswerMode] = useState(false);

  useEffect(() => {
    setRuler(readStorage<boolean>(RULER_KEY) === true);
  }, []);
  useEffect(() => setResumeAt(null), [text]);

  const toggleRuler = () => {
    setRuler((r) => {
      writeStorage(RULER_KEY, !r);
      return !r;
    });
  };

  // Bila siswa memilih "Dibacakan", mulai membacakan sekali setelah masuk (dipicu oleh ketukan "Lanjut").
  useEffect(() => {
    if (prefs.dengar && speech.supported && !autoStarted.current) {
      autoStarted.current = true;
      speech.speak(sentences, { lang: speechLang, rate });
    }
  }, [prefs.dengar, speech, sentences, speechLang, rate]);

  // Gulir ke kalimat yang sedang dibacakan.
  useEffect(() => {
    if (speech.current < 0) return;
    const el = document.querySelector(`[data-sentence="${speech.current}"]`);
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [speech.current]);

  const versions = (["asli", ...VERSION_KEYS] as const).filter((k) => k === "asli" || lesson.versions[k]);


  const play = (startAt = 0) => {
    setAnswerMode(false);
    setResumeAt(null);
    speech.speak(sentences, { lang: speechLang, rate, startAt });
  };
  const speakAnswer = (answer: string) => {
    setAnswerMode(true);
    setResumeAt(null);
    speech.speak([answer.replace(/^-\s*/gm, "")], { lang: speechLang, rate });
  };
  /** Bacakan satu bagian saja (mis. deskripsi gambar) tanpa menyorot kalimat materi yang lain. */
  const speakOne = (part: string) => {
    setAnswerMode(true);
    setResumeAt(null);
    speech.speak([part], { lang: "id-ID", rate });
  };
  const pause = () => {
    setResumeAt(Math.max(0, speech.current));
    speech.stop();
  };

  const changeRate = (r: SpeechRate) => {
    setRate(r);
    if (speech.speaking)
      speech.speak(sentences, {
        lang: speechLang,
        rate: r,
        startAt: Math.max(0, speech.current),
      });
  };
  const selectVersion = (key: StudentPrefs["versi"]) => {
    speech.stop();
    onChange({ versi: key });
  };

  return (
    <div>
      {ruler && <ReadingRuler />}
      <ReaderToolbar
        versions={versions.map((k) => ({ key: k, label: VERSION_LABEL[k] }))}
        prefs={prefs}
        onChange={onChange}
        onSelectVersion={selectVersion}
        ruler={ruler}
        onToggleRuler={toggleRuler}
        speech={speech}
        rate={rate}
        onRateChange={changeRate}
        resumeAt={resumeAt}
        onPlay={play}
        onPause={pause}
      />

      <main id="isi" className="mx-auto max-w-4xl px-0 pb-40 pt-0 sm:px-4 sm:pt-6">
        <article className="bg-[var(--reader-bg)] px-5 py-6 sm:rounded-[1.75rem] sm:border sm:border-[var(--reader-line)] sm:px-10 sm:py-10 sm:shadow-kartu">
          <header className="mb-6 border-b border-[var(--reader-line)] pb-5">
            <div className="flex flex-wrap items-center gap-2 text-[15px]">
              {[lesson.subject, lesson.className].filter(Boolean).map((t) => (
                <span key={t} className="font-bold text-[var(--reader-soft)]">
                  {t}
                </span>
              ))}
              {prefs.versi !== "asli" && (
                <span className={cx("rounded-full px-2.5 py-0.5 text-[14px] font-bold", versionTone.chip)}>
                  {VERSION_LABEL[prefs.versi]}
                </span>
              )}
            </div>
            <h1 className="mt-2 font-display text-[calc(var(--reader-size)*1.6)] font-extrabold leading-tight">
              {lesson.title}
            </h1>
          </header>
          <div lang={VERSION_HTML_LANG[prefs.versi]}>
            <ReaderText
              text={text}
              glossary={glossary}
              figures={lesson.figures}
              activeSentence={answerMode ? -1 : speech.current}
              onTerm={setTerm}
              onSpeak={speech.supported ? speakOne : undefined}
            />
          </div>
          {glossary.length > 0 && (
            <p className="no-print mt-6 text-[15px] text-[var(--reader-soft)]">
              Kata bergaris titik-titik bisa diketuk untuk melihat artinya.
            </p>
          )}
          {glossary.length > 0 && <GlossaryList items={glossary} />}
          <ConfusionFeedback text={text} sent={feedbackSent} onSend={onConfused} />
        </article>

        <div className="mx-5 sm:mx-0">
          <AskTutor
            code={lesson.code}
            versi={prefs.versi}
            canSpeak={speech.supported}
            answerSpeaking={answerMode && speech.speaking}
            onSpeak={speakAnswer}
            onStopSpeak={() => speech.stop()}
          />
        </div>

        <div className="no-print mx-5 mt-8 sm:mx-0">
          {lesson.quiz.length > 0 && (
            <div className="flex flex-col items-start gap-4 rounded-[1.5rem] border border-papan/20 bg-papan-50 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-tinta">
                <p className="font-display text-[19px] font-extrabold">Sudah selesai membaca?</p>
                <p className="text-[16px] text-tinta-2">Coba {lesson.quiz.length} soal untuk mengecek pemahamanmu.</p>
              </div>
              <button
                type="button"
                onClick={onQuiz}
                className="flex h-14 w-full shrink-0 items-center justify-center gap-2 rounded-2xl bg-papan px-6 text-[18px] font-bold text-white shadow-kartu hover:bg-papan-600 sm:w-auto"
              >
                <ListChecks className="size-6" aria-hidden />
                Kerjakan kuis
              </button>
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onChangeMode}
              className="flex h-12 items-center justify-center gap-2 rounded-xl border-2 border-[var(--reader-line)] bg-white px-4 text-[16px] font-bold text-tinta hover:border-batas"
            >
              <Settings2 className="size-5" aria-hidden />
              Ganti cara belajar
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="flex h-12 items-center justify-center gap-2 rounded-xl px-4 text-[16px] font-bold text-[var(--reader-ink)] hover:bg-black/5"
            >
              <Printer className="size-5" aria-hidden />
              Cetak
            </button>
          </div>
        </div>
      </main>

      {speech.speaking && !term && (
        <div className="no-print fixed inset-x-0 bottom-0 z-40 p-3">
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 rounded-2xl bg-tinta px-4 py-3 text-white shadow-angkat">
            <span className="flex items-center gap-2 text-[16px] font-bold" role="status">
              <Volume2 className="size-5" aria-hidden />
              Sedang membacakan
            </span>
            <button
              type="button"
              onClick={answerMode ? () => speech.stop() : pause}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-4 text-[16px] font-bold text-tinta"
            >
              <Pause className="size-5" aria-hidden />
              {answerMode ? "Berhenti" : "Jeda"}
            </button>
          </div>
        </div>
      )}

      {term && (
        <div
          className="no-print fixed inset-x-0 bottom-0 z-40 p-3"
          role="dialog"
          aria-modal="false"
          aria-labelledby="arti-judul"
        >
          <div className="muncul mx-auto max-w-2xl rounded-[1.5rem] border-2 border-papan bg-white p-5 text-tinta shadow-angkat">
            <div className="flex items-start justify-between gap-3">
              <p id="arti-judul" className="flex items-center gap-2 font-display text-[22px] font-extrabold text-papan">
                <BookA className="size-6 shrink-0" aria-hidden />
                {term.kata}
              </p>
              <button
                type="button"
                onClick={() => setTerm(null)}
                autoFocus
                className="-mr-2 -mt-2 flex size-11 items-center justify-center rounded-full hover:bg-krem"
                aria-label="Tutup arti kata"
              >
                <X className="size-6" aria-hidden />
              </button>
            </div>
            <p className="mt-1 text-[19px] leading-relaxed">
              <InlineText text={term.arti} />
            </p>
            {speech.supported && (
              <button
                type="button"
                onClick={() => speech.speak([`${term.kata}.`, term.arti], { lang: speechLang, rate })}
                className="mt-3 inline-flex h-11 items-center gap-2 rounded-xl px-3 font-bold text-papan hover:bg-papan-50"
              >
                <Volume2 className="size-5" aria-hidden />
                Dengarkan artinya
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** Daftar kata penting di akhir bacaan (bisa dibuka-tutup). */
function GlossaryList({ items }: { items: GlossaryItem[] }) {
  const [open, setOpen] = useState(false);
  const unique = items.filter(
    (g, i) =>
      g.kata.trim() && g.arti.trim() && items.findIndex((x) => x.kata.toLowerCase() === g.kata.toLowerCase()) === i,
  );
  if (!unique.length) return null;
  return (
    <section className="mt-6 rounded-2xl border border-[var(--reader-line)]">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-14 w-full items-center justify-between gap-3 px-4 text-left font-display text-[calc(var(--reader-size)*0.95)] font-extrabold"
      >
        <span className="flex items-center gap-2">
          <BookA className="size-5 text-[var(--reader-accent)]" aria-hidden />
          Kata penting ({unique.length})
        </span>
        <ChevronDown className={cx("size-5 transition-transform", open && "rotate-180")} aria-hidden />
      </button>
      {open && (
        <dl className="grid gap-3 border-t border-[var(--reader-line)] p-4 sm:grid-cols-2">
          {unique.map((g) => (
            <div key={g.kata} className="rounded-xl bg-[color-mix(in_srgb,var(--reader-line)_30%,transparent)] p-3">
              <dt className="font-bold">{g.kata}</dt>
              <dd className="text-[0.95em]">
                <InlineText text={g.arti} />
              </dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
