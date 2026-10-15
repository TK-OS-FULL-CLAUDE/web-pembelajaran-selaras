"use client";

// Ruang siswa (Peran 3). Tanpa login: siswa memilih cara belajar, membaca/mendengarkan, lalu kuis.
// Pilihan disimpan di HP siswa (localStorage) dan dicatat tanpa data pribadi untuk rekap guru.

import {
  ALargeSmall,
  BookOpen,
  Check,
  ChevronRight,
  Contrast,
  Languages,
  ListChecks,
  Pause,
  Play,
  Printer,
  RotateCcw,
  Ruler,
  ScrollText,
  Settings2,
  SpaceIcon,
  Volume2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_PREFS,
  VERSION_HTML_LANG,
  VERSION_KEYS,
  VERSION_LABEL,
  VERSION_SPEECH_LANG,
  isRegionalVersion,
  type GlossaryItem,
  type QuizQuestion,
  type StudentPrefs,
  type VersionKey,
} from "@/lib/types";
import { ReaderText, useReaderStructure } from "../reader-text";
import { ReadingRuler } from "./reading-ruler";
import { useSpeech, type SpeechRate } from "../use-speech";
import { cx } from "../ui";

export type StudentLesson = {
  code: string;
  title: string;
  subject: string;
  className: string | null;
  teacherName: string;
  body: string;
  glossary: GlossaryItem[];
  /** Hanya versi yang sudah dicek guru. */
  versions: Partial<Record<VersionKey, { text: string; glossary: GlossaryItem[] }>>;
  quiz: QuizQuestion[];
};

type Step = "mulai" | "pilih" | "baca" | "kuis" | "hasil";

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

export function StudentApp({ lesson }: { lesson: StudentLesson }) {
  const prefsKey = `selaras:prefs:${lesson.code}`;
  const sessionKey = `selaras:sesi:${lesson.code}`;

  const [ready, setReady] = useState(false);
  const [step, setStep] = useState<Step>("mulai");
  const [alias, setAlias] = useState("");
  const [prefs, setPrefs] = useState<StudentPrefs>(DEFAULT_PREFS);
  const [sessionId, setSessionId] = useState("");
  const [rate, setRate] = useState<SpeechRate>(1);
  const speech = useSpeech();
  const lastLogged = useRef<string>("");

  // Muat pilihan tersimpan (siswa yang kembali langsung ke bacaan).
  useEffect(() => {
    const saved = readStorage<StudentPrefs>(prefsKey) ?? readStorage<StudentPrefs>(GLOBAL_PREFS_KEY);
    const savedAlias = readStorage<string>("selaras:nama");
    let sid = readStorage<string>(sessionKey);
    if (!sid) {
      sid = newSessionId();
      writeStorage(sessionKey, sid);
    }
    setSessionId(sid);
    if (savedAlias) setAlias(savedAlias);
    if (saved) {
      setPrefs(sanitize(saved, lesson));
      setStep("baca");
    }
    setReady(true);
  }, [prefsKey, sessionKey, lesson]);

  const log = useCallback(
    (kind: "open" | "quiz", extra: { score?: number; total?: number; durasi?: number } = {}) => {
      if (!sessionId) return;
      fetch(`/api/s/${lesson.code}/catat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId, kind, alias: alias.trim() || null, prefs, ...extra }),
        keepalive: true,
      }).catch(() => {});
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
      writeStorage(prefsKey, next);
      writeStorage(GLOBAL_PREFS_KEY, next);
      return next;
    });
  };

  const shell = (children: React.ReactNode) => (
    <div className="reader min-h-dvh" data-besar={prefs.besar} data-kontras={prefs.kontras} data-spasi={prefs.spasi}>
      {children}
    </div>
  );

  if (!ready) return shell(<div className="min-h-dvh" />);

  if (step === "mulai") {
    return shell(
      <main id="isi" className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-5 py-10">
        <p className="text-[16px] text-[var(--reader-soft)]">
          {[lesson.subject, lesson.className, lesson.teacherName].filter(Boolean).join(", ")}
        </p>
        <h1 className="mt-2 font-display text-[2.2rem] font-extrabold leading-tight">{lesson.title}</h1>
        <form
          className="mt-8 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            writeStorage("selaras:nama", alias.trim());
            setStep("pilih");
            window.scrollTo({ top: 0 });
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
            className="h-14 w-full rounded-xl border-2 border-batas bg-white px-4 text-[19px] text-tinta"
          />
          <p className="text-[15px] text-[var(--reader-soft)]">
            Boleh dikosongkan. Cukup nama panggilan, bukan nama lengkap.
          </p>
          <button
            type="submit"
            className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-papan text-[19px] font-bold text-white hover:bg-papan-600"
          >
            Mulai belajar
            <ChevronRight className="size-5" aria-hidden />
          </button>
        </form>
      </main>,
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
          writeStorage(prefsKey, prefs);
          writeStorage(GLOBAL_PREFS_KEY, prefs);
          setStep("baca");
          window.scrollTo({ top: 0 });
        }}
      />,
    );
  }

  if (step === "kuis" || step === "hasil") {
    return shell(
      <Quiz
        lesson={lesson}
        speech={speech}
        rate={rate}
        onFinish={(score, total, durasi) => {
          log("quiz", { score, total, durasi });
        }}
        onBack={() => {
          speech.stop();
          setStep("baca");
          window.scrollTo({ top: 0 });
        }}
      />,
    );
  }

  return shell(
    <Reader
      lesson={lesson}
      prefs={prefs}
      onChange={updatePrefs}
      speech={speech}
      rate={rate}
      setRate={setRate}
      onChangeMode={() => {
        speech.stop();
        setStep("pilih");
        window.scrollTo({ top: 0 });
      }}
      onQuiz={() => {
        speech.stop();
        setStep("kuis");
        window.scrollTo({ top: 0 });
      }}
    />,
  );
}

/** Pastikan pilihan tersimpan masih cocok dengan versi yang tersedia sekarang. */
function sanitize(p: StudentPrefs, lesson: StudentLesson): StudentPrefs {
  const versi = p.versi === "asli" || lesson.versions[p.versi] ? p.versi : "asli";
  return { ...DEFAULT_PREFS, ...p, versi };
}

// ---------------------------------------------------------------------------

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
  const tiles: {
    id: string;
    title: string;
    desc: string;
    on: boolean;
    toggle: () => void;
    sample: React.ReactNode;
    show: boolean;
  }[] = [
    {
      id: "mudah",
      title: "Kalimat lebih mudah",
      desc: "Kalimat pendek dan kata sehari-hari.",
      on: prefs.versi === "mudah",
      toggle: () => onChange({ versi: prefs.versi === "mudah" ? "asli" : "mudah" }),
      sample: <BookOpen className="size-7" aria-hidden />,
      show: !!lesson.versions.mudah,
    },
    {
      id: "ringkasan",
      title: "Poin penting saja",
      desc: "Ringkasan singkat isi materi.",
      on: prefs.versi === "ringkasan",
      toggle: () => onChange({ versi: prefs.versi === "ringkasan" ? "asli" : "ringkasan" }),
      sample: <ScrollText className="size-7" aria-hidden />,
      show: !!lesson.versions.ringkasan,
    },
    ...(["jawa", "sunda"] as const).map((key) => ({
      id: key,
      title: `Pakai ${VERSION_LABEL[key]}`,
      desc: "Materi dalam bahasa rumahmu.",
      on: prefs.versi === key,
      toggle: () => onChange({ versi: prefs.versi === key ? "asli" : key }),
      sample: <Languages className="size-7" aria-hidden />,
      show: !!lesson.versions[key],
    })),
    {
      id: "dengar",
      title: "Dibacakan",
      desc: speechSupported ? "Materi dibacakan suara, kalimatnya disorot." : "Browser ini belum bisa membacakan teks.",
      on: prefs.dengar,
      toggle: () => onChange({ dengar: !prefs.dengar }),
      sample: <Volume2 className="size-7" aria-hidden />,
      show: true,
    },
    {
      id: "besar",
      title: "Huruf besar",
      desc: "Tulisan lebih besar dan jelas.",
      on: prefs.besar,
      toggle: () => onChange({ besar: !prefs.besar }),
      sample: <span className="font-display text-[30px] font-extrabold leading-none">Aa</span>,
      show: true,
    },
    {
      id: "kontras",
      title: "Kontras tinggi",
      desc: "Huruf hitam di latar krem.",
      on: prefs.kontras,
      toggle: () => onChange({ kontras: !prefs.kontras }),
      sample: (
        <span className="rounded bg-[#fffbe6] px-2 py-0.5 text-[20px] font-bold text-black ring-2 ring-black">Aa</span>
      ),
      show: true,
    },
    {
      id: "spasi",
      title: "Spasi lega",
      desc: "Jarak huruf dan baris lebih lebar.",
      on: prefs.spasi,
      toggle: () => onChange({ spasi: !prefs.spasi }),
      sample: <span className="whitespace-nowrap text-[17px] font-bold tracking-[0.18em]">abc</span>,
      show: true,
    },
  ];

  return (
    <main id="isi" className="mx-auto max-w-2xl px-5 py-10">
      <h1 className="font-display text-[1.9rem] font-extrabold leading-tight">Bagaimana kamu paling nyaman belajar?</h1>
      <p className="mt-2 text-[17px] text-[var(--reader-soft)]">
        Pilih satu atau beberapa. Kamu bisa menggantinya kapan saja.
      </p>
      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
        {tiles
          .filter((t) => t.show)
          .map((t) => (
            <li key={t.id}>
              <button
                type="button"
                aria-pressed={t.on}
                onClick={t.toggle}
                className={cx(
                  "flex min-h-24 w-full items-center gap-4 rounded-2xl border-2 bg-white p-4 text-left text-tinta transition-colors",
                  t.on
                    ? "border-papan bg-papan-50 ring-2 ring-papan"
                    : "border-[var(--reader-line)] hover:border-papan",
                )}
              >
                <span className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-papan-50 text-papan">
                  {t.sample}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[18px] font-bold">{t.title}</span>
                  <span className="block text-[15px] text-tinta-2">{t.desc}</span>
                </span>
                <span
                  className={cx(
                    "flex size-7 shrink-0 items-center justify-center rounded-full border-2",
                    t.on ? "border-papan bg-papan text-white" : "border-batas",
                  )}
                  aria-hidden
                >
                  {t.on && <Check className="size-4" />}
                </span>
              </button>
            </li>
          ))}
      </ul>
      <button
        type="button"
        onClick={onDone}
        className="mt-8 flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-papan text-[19px] font-bold text-white hover:bg-papan-600"
      >
        {prefs.versi === "asli" && !prefs.besar && !prefs.kontras && !prefs.spasi && !prefs.dengar
          ? "Pakai tampilan biasa"
          : "Lanjut membaca"}
        <ChevronRight className="size-5" aria-hidden />
      </button>
    </main>
  );
}

// ---------------------------------------------------------------------------

function Reader({
  lesson,
  prefs,
  onChange,
  speech,
  rate,
  setRate,
  onChangeMode,
  onQuiz,
}: {
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
  const { sentences } = useReaderStructure(text);
  const [term, setTerm] = useState<GlossaryItem | null>(null);
  const autoStarted = useRef(false);
  // Kalimat tempat bacaan dijeda, supaya "Lanjutkan" tidak mengulang dari awal.
  const [resumeAt, setResumeAt] = useState<number | null>(null);
  const [ruler, setRuler] = useState(false);

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

  const versions: { key: StudentPrefs["versi"]; label: string }[] = [
    { key: "asli", label: VERSION_LABEL.asli },
    ...VERSION_KEYS.filter((k) => lesson.versions[k]).map((k) => ({ key: k, label: VERSION_LABEL[k] })),
  ];

  const toggles = [
    { key: "besar" as const, label: "Huruf besar", icon: ALargeSmall },
    { key: "kontras" as const, label: "Kontras", icon: Contrast },
    { key: "spasi" as const, label: "Spasi lega", icon: SpaceIcon },
  ];

  const play = (startAt = 0) => {
    setResumeAt(null);
    speech.speak(sentences, { lang: speechLang, rate, startAt });
  };
  const pause = () => {
    setResumeAt(Math.max(0, speech.current));
    speech.stop();
  };

  return (
    <div>
      {ruler && <ReadingRuler />}
      <div className="no-print border-b border-[var(--reader-line)] bg-[var(--reader-bg)]">
        <div className="mx-auto max-w-3xl space-y-2 px-4 py-2.5">
          {versions.length > 1 && (
            <div
              className={cx(
                "gap-1 rounded-xl bg-black/5 p-1",
                versions.length >= 5 ? "grid grid-cols-3 sm:flex" : versions.length === 4 ? "grid grid-cols-2 sm:flex" : "flex",
              )}
              role="group"
              aria-label="Versi teks"
            >
              {versions.map((v) => (
                <button
                  key={v.key}
                  type="button"
                  aria-pressed={prefs.versi === v.key}
                  onClick={() => {
                    speech.stop();
                    onChange({ versi: v.key });
                  }}
                  className={cx(
                    "h-11 flex-1 rounded-lg px-2 text-[16px] font-bold",
                    prefs.versi === v.key ? "bg-papan text-white" : "text-[var(--reader-ink)] hover:bg-black/5",
                  )}
                >
                  {v.label}
                </button>
              ))}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-1.5">
            {toggles.map((t) => (
              <button
                key={t.key}
                type="button"
                aria-pressed={prefs[t.key]}
                onClick={() => onChange({ [t.key]: !prefs[t.key] })}
                className={cx(
                  "inline-flex h-11 items-center gap-1.5 rounded-lg border-2 px-3 text-[15px] font-bold",
                  prefs[t.key]
                    ? "border-papan bg-papan text-white"
                    : "border-[var(--reader-line)] bg-white text-tinta hover:border-papan",
                )}
              >
                <t.icon className="size-5" aria-hidden />
                {t.label}
              </button>
            ))}
            <button
              type="button"
              aria-pressed={ruler}
              onClick={toggleRuler}
              className={cx(
                "inline-flex h-11 items-center gap-1.5 rounded-lg border-2 px-3 text-[15px] font-bold",
                ruler ? "border-papan bg-papan text-white" : "border-[var(--reader-line)] bg-white text-tinta hover:border-papan",
              )}
            >
              <Ruler className="size-5" aria-hidden />
              Garis bantu
            </button>
            {speech.supported && (
              <div className="ml-auto flex items-center gap-1.5">
                <label htmlFor="kecepatan" className="sr-only">
                  Kecepatan suara
                </label>
                <select
                  id="kecepatan"
                  value={rate}
                  onChange={(e) => {
                    const r = Number(e.target.value) as SpeechRate;
                    setRate(r);
                    if (speech.speaking)
                      speech.speak(sentences, { lang: speechLang, rate: r, startAt: Math.max(0, speech.current) });
                  }}
                  className="h-11 rounded-lg border-2 border-[var(--reader-line)] bg-white px-2 text-[15px] font-bold text-tinta"
                >
                  <option value={0.8}>Pelan</option>
                  <option value={1}>Biasa</option>
                  <option value={1.2}>Cepat</option>
                </select>
                {!speech.speaking && resumeAt !== null && (
                  <button
                    type="button"
                    onClick={() => play(0)}
                    className="inline-flex h-11 items-center gap-1.5 rounded-lg border-2 border-[var(--reader-line)] bg-white px-3 text-[15px] font-bold text-tinta hover:border-papan"
                  >
                    <RotateCcw className="size-5" aria-hidden />
                    Dari awal
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => (speech.speaking ? pause() : play(resumeAt ?? 0))}
                  className="inline-flex h-11 items-center gap-2 rounded-lg bg-aksen px-4 text-[16px] font-bold text-white hover:brightness-110"
                >
                  {speech.speaking ? <Pause className="size-5" aria-hidden /> : <Play className="size-5" aria-hidden />}
                  {speech.speaking ? "Jeda" : resumeAt !== null ? "Lanjutkan" : "Dengarkan"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <main id="isi" className="mx-auto max-w-3xl px-5 pb-40 pt-6">
        <p className="text-[15px] text-[var(--reader-soft)]">
          {[lesson.subject, lesson.className].filter(Boolean).join(", ")}
        </p>
        <div
          className="mt-3"
          lang={VERSION_HTML_LANG[prefs.versi]}
        >
          <ReaderText text={text} glossary={glossary} activeSentence={speech.current} onTerm={setTerm} />
        </div>
        {glossary.length > 0 && (
          <p className="no-print mt-2 text-[15px] text-[var(--reader-soft)]">
            Kata bergaris titik-titik bisa diketuk untuk melihat artinya.
          </p>
        )}

        <div className="no-print mt-10 flex flex-col gap-3 sm:flex-row">
          {lesson.quiz.length > 0 && (
            <button
              type="button"
              onClick={onQuiz}
              className="flex h-14 items-center justify-center gap-2 rounded-xl bg-papan px-5 text-[18px] font-bold text-white hover:bg-papan-600 sm:flex-1"
            >
              <ListChecks className="size-6" aria-hidden />
              Kerjakan kuis ({lesson.quiz.length} soal)
            </button>
          )}
          <button
            type="button"
            onClick={onChangeMode}
            className="flex h-14 items-center justify-center gap-2 rounded-xl border-2 border-[var(--reader-line)] bg-white px-5 text-[17px] font-bold text-tinta hover:border-papan"
          >
            <Settings2 className="size-5" aria-hidden />
            Ganti cara belajar
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="flex h-14 items-center justify-center gap-2 rounded-xl px-5 text-[17px] font-bold text-[var(--reader-ink)] hover:bg-black/5"
          >
            <Printer className="size-5" aria-hidden />
            Cetak
          </button>
        </div>
      </main>

      {speech.speaking && !term && (
        <div className="no-print fixed inset-x-0 bottom-0 z-40 p-3">
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 rounded-2xl bg-tinta px-4 py-3 text-white shadow-2xl">
            <span className="flex items-center gap-2 text-[16px] font-bold" role="status">
              <Volume2 className="size-5" aria-hidden />
              Sedang membacakan
            </span>
            <button
              type="button"
              onClick={pause}
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-white px-4 text-[16px] font-bold text-tinta"
            >
              <Pause className="size-5" aria-hidden />
              Jeda
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
          <div className="mx-auto max-w-2xl rounded-2xl border-2 border-papan bg-white p-5 text-tinta shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <p id="arti-judul" className="font-display text-[22px] font-extrabold text-papan">
                {term.kata}
              </p>
              <button
                type="button"
                onClick={() => setTerm(null)}
                autoFocus
                className="-mr-2 -mt-2 flex size-11 items-center justify-center rounded-full hover:bg-slate-100"
                aria-label="Tutup arti kata"
              >
                <X className="size-6" aria-hidden />
              </button>
            </div>
            <p className="mt-1 text-[19px] leading-relaxed">{term.arti}</p>
            {speech.supported && (
              <button
                type="button"
                onClick={() => speech.speak([`${term.kata}.`, term.arti], { lang: speechLang, rate })}
                className="mt-3 inline-flex h-11 items-center gap-2 rounded-lg px-3 font-bold text-papan hover:bg-papan-50"
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

// ---------------------------------------------------------------------------

const LETTERS = ["A", "B", "C", "D", "E", "F"];

function Quiz({
  lesson,
  speech,
  rate,
  onFinish,
  onBack,
}: {
  lesson: StudentLesson;
  speech: ReturnType<typeof useSpeech>;
  rate: SpeechRate;
  /** durasi = lama pengerjaan dalam detik, dari soal pertama sampai "Lihat hasil". */
  onFinish: (score: number, total: number, durasi: number) => void;
  onBack: () => void;
}) {
  const questions = lesson.quiz;
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(() => questions.map(() => null));
  const [done, setDone] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const startedAt = useRef(0);

  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  useEffect(() => {
    headingRef.current?.focus();
  }, [index, done]);

  const score = answers.filter((a, i) => a === questions[i].answer).length;

  if (done) {
    return (
      <main id="isi" className="mx-auto max-w-2xl px-5 py-10">
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="font-display text-[2rem] font-extrabold leading-tight outline-none"
        >
          {score === questions.length
            ? "Hebat, semua benar!"
            : `Kamu menjawab ${score} dari ${questions.length} soal dengan benar.`}
        </h1>
        <p className="mt-2 text-[18px] text-[var(--reader-soft)]">
          {score === questions.length
            ? `${score} dari ${questions.length} soal benar.`
            : "Lihat pembahasan di bawah, lalu coba lagi kalau mau."}
        </p>
        <ol className="mt-8 space-y-4">
          {questions.map((q, i) => {
            const right = answers[i] === q.answer;
            return (
              <li key={i} className="rounded-2xl border-2 border-[var(--reader-line)] bg-white p-4 text-tinta">
                <p className="text-[17px] font-bold">
                  {i + 1}. {q.q}
                </p>
                <p className={cx("mt-2 flex items-center gap-2 font-bold", right ? "text-berhasil" : "text-galat")}>
                  {right ? <Check className="size-5" aria-hidden /> : <X className="size-5" aria-hidden />}
                  {right ? "Benar" : `Jawabanmu: ${answers[i] === null ? "kosong" : q.options[answers[i]!]}`}
                </p>
                {!right && (
                  <p className="mt-1">
                    Jawaban yang benar: <strong>{q.options[q.answer]}</strong>
                  </p>
                )}
                {q.explain && <p className="mt-1 text-tinta-2">{q.explain}</p>}
              </li>
            );
          })}
        </ol>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onBack}
            className="flex h-14 items-center justify-center gap-2 rounded-xl bg-papan px-5 text-[18px] font-bold text-white hover:bg-papan-600 sm:flex-1"
          >
            <BookOpen className="size-5" aria-hidden />
            Baca materi lagi
          </button>
          <button
            type="button"
            onClick={() => {
              setAnswers(questions.map(() => null));
              setIndex(0);
              setDone(false);
              startedAt.current = Date.now();
            }}
            className="flex h-14 items-center justify-center gap-2 rounded-xl border-2 border-[var(--reader-line)] bg-white px-5 text-[17px] font-bold text-tinta hover:border-papan"
          >
            <RotateCcw className="size-5" aria-hidden />
            Ulangi kuis
          </button>
        </div>
      </main>
    );
  }

  const q = questions[index];
  const chosen = answers[index];
  const revealed = chosen !== null;
  const last = index === questions.length - 1;

  return (
    <main id="isi" className="mx-auto max-w-2xl px-5 py-8">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex h-11 items-center gap-1 rounded-lg px-2 font-bold text-[var(--reader-ink)] hover:bg-black/5"
        >
          <X className="size-5" aria-hidden />
          Kembali ke materi
        </button>
        <p className="text-[16px] font-bold text-[var(--reader-soft)]" aria-live="polite">
          Soal {index + 1} dari {questions.length}
        </p>
      </div>
      <div className="mt-3 h-2 rounded-full bg-black/10" aria-hidden>
        <div
          className="h-2 rounded-full bg-papan transition-all"
          style={{ width: `${((index + (revealed ? 1 : 0)) / questions.length) * 100}%` }}
        />
      </div>

      <fieldset className="mt-8">
        <legend>
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="reader-text font-display font-extrabold outline-none"
            style={{ fontSize: "calc(var(--reader-size) * 1.15)" }}
          >
            {q.q}
          </h1>
        </legend>
        {speech.supported && (
          <button
            type="button"
            onClick={() =>
              speech.speak([q.q, ...q.options.map((o, i) => `Pilihan ${LETTERS[i]}: ${o}.`)], { lang: "id-ID", rate })
            }
            className="mt-2 inline-flex h-11 items-center gap-2 rounded-lg px-2 font-bold text-[var(--reader-ink)] hover:bg-black/5"
          >
            <Volume2 className="size-5" aria-hidden />
            Dengarkan soal
          </button>
        )}
        <div className="mt-5 space-y-3">
          {q.options.map((opt, i) => {
            const isChosen = chosen === i;
            const isAnswer = q.answer === i;
            return (
              <label
                key={i}
                className={cx(
                  "flex min-h-16 cursor-pointer items-center gap-4 rounded-2xl border-2 bg-white px-4 py-3 text-tinta transition-colors",
                  !revealed && "border-[var(--reader-line)] hover:border-papan",
                  revealed && isAnswer && "border-berhasil bg-green-50",
                  revealed && isChosen && !isAnswer && "border-galat bg-red-50",
                  revealed && !isChosen && !isAnswer && "border-[var(--reader-line)] opacity-70",
                )}
              >
                <input
                  type="radio"
                  name={`soal-${index}`}
                  className="sr-only"
                  checked={isChosen}
                  disabled={revealed}
                  onChange={() => {
                    speech.stop();
                    setAnswers((a) => a.map((x, j) => (j === index ? i : x)));
                  }}
                />
                <span
                  className={cx(
                    "flex size-10 shrink-0 items-center justify-center rounded-full border-2 text-[17px] font-bold",
                    revealed && isAnswer
                      ? "border-berhasil bg-berhasil text-white"
                      : revealed && isChosen
                        ? "border-galat bg-galat text-white"
                        : "border-batas",
                  )}
                  aria-hidden
                >
                  {revealed && isAnswer ? (
                    <Check className="size-5" />
                  ) : revealed && isChosen ? (
                    <X className="size-5" />
                  ) : (
                    LETTERS[i]
                  )}
                </span>
                <span className="reader-text" style={{ fontSize: "var(--reader-size)" }}>
                  {opt}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {revealed && (
        <div className="mt-6 rounded-2xl border-2 border-[var(--reader-line)] bg-white p-4 text-tinta" role="status">
          <p
            className={cx(
              "flex items-center gap-2 text-[19px] font-bold",
              chosen === q.answer ? "text-berhasil" : "text-galat",
            )}
          >
            {chosen === q.answer ? <Check className="size-6" aria-hidden /> : <X className="size-6" aria-hidden />}
            {chosen === q.answer ? "Benar!" : `Belum tepat. Jawabannya ${LETTERS[q.answer]}: ${q.options[q.answer]}.`}
          </p>
          {q.explain && <p className="mt-1 text-[17px]">{q.explain}</p>}
          <button
            type="button"
            onClick={() => {
              if (last) {
                setDone(true);
                const durasi = Math.min(10_800, Math.round((Date.now() - startedAt.current) / 1000));
                onFinish(answers.filter((a, i) => a === questions[i].answer).length, questions.length, durasi);
              } else {
                setIndex(index + 1);
              }
            }}
            className="mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-papan text-[18px] font-bold text-white hover:bg-papan-600"
          >
            {last ? "Lihat hasil" : "Soal berikutnya"}
            <ChevronRight className="size-5" aria-hidden />
          </button>
        </div>
      )}
    </main>
  );
}
