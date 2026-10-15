"use client";

// Mode proyektor: guru menampilkan materi ke seluruh kelas lewat proyektor atau TV.
// Satu bagian per layar dengan huruf sangat besar, dibacakan dengan sorotan kalimat, gambar beserta
// deskripsinya, lalu kuis bersama (jawaban dibuka guru). Tidak ada yang dicatat ke rekap siswa.

import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BookA,
  Check,
  Contrast,
  Eye,
  EyeOff,
  ImageIcon,
  Lightbulb,
  Maximize2,
  Minimize2,
  Pause,
  Smartphone,
  Volume2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { QUIZ_TONE, TONES } from "@/lib/modes";
import { optionLetter, projectorSlides, type ProjectorSlide } from "@/lib/proyektor";
import { quizType, stableShuffle } from "@/lib/quiz";
import { figureSpeech, inlineSpeech, parseInline } from "@/lib/text";
import {
  QUIZ_TYPE_LABEL,
  VERSION_HTML_LANG,
  VERSION_KEYS,
  VERSION_LABEL,
  VERSION_SPEECH_LANG,
  isRegionalVersion,
  type GlossaryItem,
  type LessonFigures,
  type LessonVersions,
  type QuizQuestion,
  type VersionKey,
} from "@/lib/types";
import { buildStructure, InlineText, ReaderText } from "../reader-text";
import { useSpeech } from "../use-speech";
import { cx } from "../ui";

export type ProjectorLesson = {
  title: string;
  subject: string;
  className: string | null;
  body: string;
  glossary: GlossaryItem[];
  /** Hanya versi yang sudah dicek guru. */
  versions: LessonVersions;
  /** Hanya soal yang lengkap (playableQuestion). */
  quiz: QuizQuestion[];
  /** Deskripsi gambar yang belum dicek guru dikosongkan. */
  figures: LessonFigures;
  /** Kode materi bila sudah terbit, supaya siswa bisa ikut di HP. */
  shareCode: string | null;
};

type Versi = "asli" | VersionKey;

/** Ukuran huruf mengikuti lebar layar proyektor. */
const SIZES = ["max(24px, 2.3vw)", "max(28px, 2.8vw)", "max(32px, 3.3vw)", "max(36px, 3.9vw)"];

/** Teks soal untuk dibacakan: pangkat dan pecahan dibaca dengan benar (sama seperti di layar siswa). */
function say(text: string): string {
  return inlineSpeech(parseInline(text));
}

function speechFor(slide: ProjectorSlide, lesson: ProjectorLesson, text: string, reveal: boolean): string[] {
  if (slide.kind === "teks") return buildStructure(slide.text, lesson.figures).sentences;
  if (slide.kind === "gambar") return [figureSpeech(slide.caption, lesson.figures[slide.id]?.alt)];
  const q = lesson.quiz[slide.index];
  if (!q) return [text];
  const type = quizType(q);
  const out = [say(q.q)];
  if (type === "jodoh") {
    (q.pairs ?? []).forEach((p, i) => out.push(`${i + 1}. ${say(p.kiri)}.`));
    if (reveal) (q.pairs ?? []).forEach((p) => out.push(`${say(p.kiri)}: ${say(p.kanan)}.`));
  } else if (type !== "isian") {
    q.options.forEach((o, i) => out.push(`${optionLetter(i)}. ${say(o)}.`));
  }
  if (reveal) {
    if (type === "isian") out.push(`Jawaban: ${(q.accepted ?? []).map(say).join(", atau ")}.`);
    else if (type === "pgk") out.push(`Jawaban: ${(q.answers ?? []).map((a) => optionLetter(a)).join(", ")}.`);
    else if (type !== "jodoh") out.push(`Jawaban: ${optionLetter(q.answer)}. ${say(q.options[q.answer])}.`);
    if (q.explain) out.push(say(q.explain));
  }
  return out;
}

export function ProjectorView({ lesson, backHref }: { lesson: ProjectorLesson; backHref: string }) {
  const speech = useSpeech();
  const [versi, setVersi] = useState<Versi>("asli");
  const [index, setIndex] = useState(0);
  const [size, setSize] = useState(1);
  const [kontras, setKontras] = useState(false);
  const [reveal, setReveal] = useState(false);
  const [term, setTerm] = useState<GlossaryItem | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  // Layar yang sedang dibacakan (bacaan berhenti saat pindah layar).
  const [speakingAt, setSpeakingAt] = useState<number | null>(null);

  const versions = (["asli", ...VERSION_KEYS] as const).filter((k) => k === "asli" || lesson.versions[k]);
  const version = versi === "asli" ? null : lesson.versions[versi];
  const text = version?.text ?? lesson.body;
  const glossary = useMemo(() => {
    if (isRegionalVersion(versi)) return version?.glossary ?? [];
    return [...(version?.glossary ?? []), ...lesson.glossary];
  }, [versi, version, lesson.glossary]);
  const speechLang = VERSION_SPEECH_LANG[versi];

  const slides = useMemo(() => projectorSlides(text, lesson.quiz.length), [text, lesson.quiz.length]);
  const total = slides.length;
  const current = Math.min(index, Math.max(0, total - 1));
  const slide = slides[current] as ProjectorSlide | undefined;
  const contentCount = slides.filter((s) => s.kind !== "soal").length;
  const speaking = speech.speaking && speakingAt === current;

  const stopSpeech = speech.stop;
  const go = useCallback(
    (to: number) => {
      stopSpeech();
      setSpeakingAt(null);
      setReveal(false);
      setTerm(null);
      setIndex(Math.min(Math.max(0, to), Math.max(0, total - 1)));
    },
    [stopSpeech, total],
  );

  const toggleSpeech = useCallback(() => {
    if (!slide || !speech.supported) return;
    if (speaking) {
      speech.stop();
      setSpeakingAt(null);
      return;
    }
    setTerm(null);
    setSpeakingAt(current);
    speech.speak(speechFor(slide, lesson, text, reveal), { lang: slide.kind === "teks" ? speechLang : "id-ID" });
  }, [slide, speech, speaking, current, lesson, text, reveal, speechLang]);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen?.().catch(() => {});
  }, []);

  useEffect(() => {
    const onChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // Pintasan keyboard. Clicker presentasi biasanya mengirim PageDown/PageUp atau panah.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "SELECT" || tag === "INPUT" || tag === "TEXTAREA") return;
      const k = e.key;
      if (k === "ArrowRight" || k === "PageDown") {
        e.preventDefault();
        go(current + 1);
      } else if (k === "ArrowLeft" || k === "PageUp") {
        e.preventDefault();
        go(current - 1);
      } else if (k === "b" || k === "B") {
        toggleSpeech();
      } else if ((k === "j" || k === "J") && slide?.kind === "soal") {
        setReveal((r) => !r);
      } else if (k === "f" || k === "F") {
        toggleFullscreen();
      } else if (k === "Escape") {
        setTerm(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, go, toggleSpeech, toggleFullscreen, slide]);

  useEffect(() => () => stopSpeech(), [stopSpeech]);

  const label =
    slide?.kind === "soal"
      ? `Soal ${slide.index + 1} dari ${lesson.quiz.length}`
      : `Bagian ${current + 1} dari ${contentCount}`;

  const control =
    "inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-4 text-[17px] font-bold transition-colors disabled:opacity-40";
  const plain = cx(
    control,
    "border-2 border-[var(--reader-line)] bg-[var(--reader-bg)] text-[var(--reader-ink)] hover:border-[var(--reader-accent)]",
  );

  return (
    <div
      className="reader flex h-dvh flex-col overflow-hidden"
      data-kontras={kontras}
      data-proyektor="true"
      style={{ "--reader-size": SIZES[size], "--reader-leading": "1.5" } as React.CSSProperties}
    >
      <header className="flex flex-wrap items-center justify-between gap-x-8 gap-y-3 px-[4vw] pt-[2.4vh]">
        <div className="flex min-w-0 items-center gap-4">
          <svg viewBox="0 0 36 36" className="size-12 shrink-0" aria-hidden>
            <rect width="36" height="36" rx="10" fill="#0F766E" />
            <g strokeLinecap="round" strokeWidth="3.4">
              <path d="M10 12.5h16" stroke="#ffffff" />
              <path d="M10 18h10" stroke="#99F6E4" />
              <path d="M10 23.5h13" stroke="#FDE68A" />
            </g>
          </svg>
          <div className="min-w-0">
            <p className="text-[clamp(15px,1.15vw,22px)] text-[var(--reader-soft)]">
              {[lesson.subject, lesson.className].filter(Boolean).join(" · ") || "Materi"}
              {versi !== "asli" && <> · {VERSION_LABEL[versi]}</>}
            </p>
            <h1 className="font-display text-[clamp(20px,1.6vw,32px)] font-extrabold leading-tight">{lesson.title}</h1>
          </div>
        </div>
        {lesson.shareCode && (
          <div className="flex items-center gap-3 rounded-2xl border-2 border-[var(--reader-line)] bg-[var(--reader-bg)] px-4 py-2">
            <Smartphone className="size-7 text-[var(--reader-accent)]" aria-hidden />
            <div>
              <p className="text-[clamp(13px,0.95vw,18px)] text-[var(--reader-soft)]">Ikut di HP, kode materi</p>
              <p className="font-display text-[clamp(20px,1.6vw,32px)] font-extrabold tracking-[0.14em] text-[var(--reader-accent)]">
                {lesson.shareCode}
              </p>
            </div>
          </div>
        )}
      </header>

      <div className="flex items-center gap-4 px-[4vw] pt-[2vh]">
        <p className="shrink-0 text-[clamp(15px,1.1vw,21px)] font-bold text-[var(--reader-soft)]" aria-live="polite">
          {total ? label : "Belum ada isi"}
        </p>
        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[var(--reader-line)]" aria-hidden>
          <div
            className="h-full rounded-full bg-[var(--reader-accent)] transition-[width]"
            style={{ width: total ? `${((current + 1) / total) * 100}%` : "0%" }}
          />
        </div>
      </div>

      <main
        id="isi"
        tabIndex={0}
        aria-label="Isi layar"
        className="min-h-0 flex-1 overflow-y-auto px-[4vw] py-[3vh] focus-visible:outline-offset-[-4px]"
      >
        <div lang={slide?.kind === "teks" ? VERSION_HTML_LANG[versi] : "id"}>
          {!slide && (
            <p className="text-[var(--reader-soft)]" style={{ fontSize: "var(--reader-size)" }}>
              Materi ini belum berisi teks atau soal. Tulis materinya dulu di editor.
            </p>
          )}
          {slide?.kind === "teks" && (
            <ReaderText
              key={`${versi}-${current}`}
              text={slide.text}
              glossary={glossary}
              figures={lesson.figures}
              activeSentence={speaking ? speech.current : -1}
              onTerm={setTerm}
            />
          )}
          {slide?.kind === "gambar" && (
            <FigureSlide
              id={slide.id}
              caption={slide.caption}
              alt={lesson.figures[slide.id]?.alt ?? ""}
              active={speaking}
            />
          )}
          {slide?.kind === "soal" && lesson.quiz[slide.index] && (
            <QuizSlide q={lesson.quiz[slide.index]} reveal={reveal} />
          )}
        </div>
      </main>

      {term && (
        <div
          className="fixed bottom-[calc(7rem+3vh)] right-[4vw] z-40 w-[min(40rem,90vw)]"
          role="dialog"
          aria-modal="false"
          aria-labelledby="proyektor-arti"
        >
          <div className="muncul rounded-[1.75rem] border-[3px] border-[var(--reader-accent)] bg-[var(--reader-bg)] p-6 text-[var(--reader-ink)] shadow-angkat">
            <div className="flex items-start justify-between gap-4">
              <p
                id="proyektor-arti"
                className="flex items-center gap-3 font-display text-[clamp(26px,2.4vw,44px)] font-extrabold text-[var(--reader-accent)]"
              >
                <BookA className="size-[1em] shrink-0" aria-hidden />
                {term.kata}
              </p>
              <button
                type="button"
                onClick={() => setTerm(null)}
                autoFocus
                className="flex size-14 shrink-0 items-center justify-center rounded-full hover:bg-black/5"
                aria-label="Tutup arti kata"
              >
                <X className="size-7" aria-hidden />
              </button>
            </div>
            <p className="mt-2 text-[clamp(22px,1.9vw,36px)] leading-snug">{term.arti}</p>
            {speech.supported && (
              <button
                type="button"
                onClick={() => speech.speak([`${term.kata}.`, term.arti], { lang: speechLang })}
                className="mt-3 inline-flex min-h-12 items-center gap-2 rounded-xl px-3 text-[18px] font-bold text-[var(--reader-accent)] hover:bg-black/5"
              >
                <Volume2 className="size-6" aria-hidden />
                Bacakan artinya
              </button>
            )}
          </div>
        </div>
      )}

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-[var(--reader-line)] bg-[var(--reader-page)] px-[4vw] py-3">
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={plain} onClick={() => go(current - 1)} disabled={current <= 0}>
            <ArrowLeft className="size-6" aria-hidden />
            Sebelumnya
          </button>
          {speech.supported && slide && (
            <button
              type="button"
              className={cx(control, "bg-jingga text-white hover:brightness-110")}
              onClick={toggleSpeech}
              aria-pressed={speaking}
            >
              {speaking ? <Pause className="size-6" aria-hidden /> : <Volume2 className="size-6" aria-hidden />}
              {speaking ? "Jeda" : "Bacakan"}
            </button>
          )}
          {slide?.kind === "soal" && (
            <button
              type="button"
              className={cx(control, "bg-aksen text-white hover:brightness-110")}
              onClick={() => setReveal((r) => !r)}
              aria-pressed={reveal}
            >
              {reveal ? <EyeOff className="size-6" aria-hidden /> : <Eye className="size-6" aria-hidden />}
              {reveal ? "Tutup jawaban" : "Buka jawaban"}
            </button>
          )}
          <button
            type="button"
            className={cx(control, "bg-papan text-white hover:bg-papan-600")}
            onClick={() => go(current + 1)}
            disabled={current >= total - 1}
          >
            {slide && slides[current + 1]?.kind === "soal" && slide.kind !== "soal" ? "Ke kuis" : "Berikutnya"}
            <ArrowRight className="size-6" aria-hidden />
          </button>
        </div>

        <p className="hidden text-[15px] text-[var(--reader-soft)] 2xl:block">
          ← → atau clicker: pindah · B: bacakan · J: jawaban · F: layar penuh
        </p>

        <div className="flex flex-wrap items-center gap-2">
          {versions.length > 1 && (
            <>
              <label htmlFor="proyektor-versi" className="sr-only">
                Versi teks
              </label>
              <select
                id="proyektor-versi"
                value={versi}
                onChange={(e) => {
                  speech.stop();
                  setSpeakingAt(null);
                  setTerm(null);
                  setVersi(e.target.value as Versi);
                }}
                className="min-h-12 rounded-2xl border-2 border-[var(--reader-line)] bg-[var(--reader-bg)] px-3 text-[17px] font-bold text-[var(--reader-ink)]"
              >
                {versions.map((k) => (
                  <option key={k} value={k}>
                    {VERSION_LABEL[k]}
                  </option>
                ))}
              </select>
            </>
          )}
          <button
            type="button"
            className={cx(plain, "w-12 px-0 font-display text-[19px]")}
            onClick={() => setSize((s) => Math.max(0, s - 1))}
            disabled={size <= 0}
            aria-label="Perkecil huruf"
          >
            A−
          </button>
          <button
            type="button"
            className={cx(plain, "w-12 px-0 font-display text-[23px]")}
            onClick={() => setSize((s) => Math.min(SIZES.length - 1, s + 1))}
            disabled={size >= SIZES.length - 1}
            aria-label="Perbesar huruf"
          >
            A+
          </button>
          <button type="button" className={plain} onClick={() => setKontras((k) => !k)} aria-pressed={kontras}>
            <Contrast className="size-6" aria-hidden />
            Kontras
          </button>
          <button
            type="button"
            className={cx(plain, "w-12 px-0 2xl:w-auto 2xl:px-4")}
            onClick={toggleFullscreen}
            aria-label={fullscreen ? "Keluar dari layar penuh" : "Layar penuh"}
            title={fullscreen ? "Keluar dari layar penuh (F)" : "Layar penuh (F)"}
          >
            {fullscreen ? <Minimize2 className="size-6" aria-hidden /> : <Maximize2 className="size-6" aria-hidden />}
            <span className="hidden 2xl:inline" aria-hidden>
              {fullscreen ? "Keluar layar penuh" : "Layar penuh"}
            </span>
          </button>
          <Link href={backHref} className={plain}>
            <X className="size-6" aria-hidden />
            Tutup
          </Link>
        </div>
      </footer>
    </div>
  );
}

function FigureSlide({ id, caption, alt, active }: { id: string; caption: string; alt: string; active: boolean }) {
  const [failed, setFailed] = useState(false);
  const cleanCaption = caption.replace(/[*=_]/g, "").trim();
  return (
    <figure className="grid items-start gap-[3vw] lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
      <div
        className={cx(
          "flex items-center justify-center rounded-[1.75rem] border-2 border-[var(--reader-line)] bg-white p-4",
          active && "outline outline-4 outline-offset-2 outline-[var(--reader-mark)]",
        )}
      >
        {failed ? (
          <p className="flex items-center gap-3 p-10 text-[var(--reader-soft)]">
            <ImageIcon className="size-8" aria-hidden />
            Gambar tidak bisa dimuat.
          </p>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/gambar/${id}`}
            alt={alt.trim() || cleanCaption || "Gambar materi"}
            onError={() => setFailed(true)}
            className="max-h-[52vh] w-full object-contain"
          />
        )}
      </div>
      <figcaption className="leading-[1.45]" style={{ fontSize: "var(--reader-size)" }}>
        {cleanCaption && <p className="font-display text-[0.95em] font-extrabold leading-tight">{cleanCaption}</p>}
        {alt.trim() ? (
          <>
            <p className="mt-[0.8em] text-[0.48em] font-bold uppercase tracking-wider text-[var(--reader-soft)]">
              Deskripsi gambar
            </p>
            <p className="mt-[0.2em] text-[0.64em]">{alt}</p>
          </>
        ) : (
          <p className="mt-[0.8em] text-[0.55em] text-[var(--reader-soft)]">Deskripsi gambar belum dicek guru.</p>
        )}
      </figcaption>
    </figure>
  );
}

function QuizSlide({ q, reveal }: { q: QuizQuestion; reveal: boolean }) {
  const type = quizType(q);
  const tone = TONES[QUIZ_TONE[type]];
  const correct = new Set(type === "pgk" ? (q.answers ?? []) : [q.answer]);
  const pairs = q.pairs ?? [];
  const shuffled = useMemo(() => stableShuffle(pairs.map((_, i) => i), q.q), [pairs, q.q]);

  const optionBox = (ok: boolean) =>
    cx(
      "flex items-center gap-[0.6em] rounded-[0.7em] border-[3px] px-[0.6em] py-[0.4em] leading-snug",
      reveal && ok
        ? "border-berhasil bg-hijau-50 text-tinta"
        : "border-[var(--reader-line)] bg-[var(--reader-bg)]",
      reveal && !ok && "text-[var(--reader-soft)]",
    );
  const letterBox = (ok: boolean) =>
    cx(
      "flex size-[1.6em] shrink-0 items-center justify-center rounded-[0.45em] font-display font-extrabold",
      reveal && ok ? "bg-berhasil text-white" : reveal ? "bg-slate-100 text-tinta-2" : tone.chip,
    );

  return (
    <div style={{ fontSize: "var(--reader-size)" }}>
      <span className={cx("inline-flex rounded-full px-[0.7em] py-[0.2em] text-[0.55em] font-bold", tone.chip)}>
        {QUIZ_TYPE_LABEL[type]}
      </span>
      <h2 className="mt-[0.4em] font-display text-[1.1em] font-extrabold leading-tight">
        <InlineText text={q.q} />
      </h2>

      {(type === "pg" || type === "pgk" || type === "bs") && (
        <ul
          className={cx(
            "mt-[0.7em] grid gap-[0.4em] text-[0.82em]",
            q.options.length > 4 ? "lg:grid-cols-3" : "lg:grid-cols-2",
          )}
        >
          {q.options.map((o, i) => (
            <li key={i} className={optionBox(correct.has(i))}>
              <span className={letterBox(correct.has(i))} aria-hidden>
                {optionLetter(i)}
              </span>
              <span className="flex-1">
                <span className="sr-only">{optionLetter(i)}. </span>
                <InlineText text={o} />
              </span>
              {reveal && correct.has(i) && (
                <Check className="size-[1.2em] shrink-0 text-berhasil" strokeWidth={3} aria-label="Jawaban benar" />
              )}
            </li>
          ))}
        </ul>
      )}

      {type === "isian" && (
        <div
          className={cx(
            "mt-[0.7em] flex flex-wrap items-center gap-[0.5em] rounded-[0.7em] border-[3px] border-dashed px-[0.7em] py-[0.5em] text-[0.9em]",
            reveal ? "border-berhasil bg-hijau-50 text-tinta" : "border-[var(--reader-line)]",
          )}
        >
          <span className={reveal ? "text-tinta-2" : "text-[var(--reader-soft)]"}>Jawaban:</span>
          <strong className="font-display">{reveal ? <InlineText text={(q.accepted ?? []).join(" / ")} /> : "…"}</strong>
        </div>
      )}

      {type === "jodoh" &&
        (reveal ? (
          <ul className="mt-[0.7em] grid gap-[0.35em] text-[0.8em]">
            {pairs.map((p, i) => (
              <li key={i} className={optionBox(true)}>
                <span className="font-bold">
                  <InlineText text={p.kiri} />
                </span>
                <ArrowRight className="size-[1em] shrink-0 text-berhasil" aria-label="pasangannya" />
                <span className="flex-1">
                  <InlineText text={p.kanan} />
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-[0.7em] grid gap-[0.8em] text-[0.8em] lg:grid-cols-2">
            <ol className="grid gap-[0.35em]">
              {pairs.map((p, i) => (
                <li key={i} className={optionBox(false)}>
                  <span className={letterBox(false)} aria-hidden>
                    {i + 1}
                  </span>
                  <InlineText text={p.kiri} />
                </li>
              ))}
            </ol>
            <ul className="grid gap-[0.35em]" aria-label="Pilihan pasangan">
              {shuffled.map((j, i) => (
                <li key={j} className={optionBox(false)}>
                  <span className={letterBox(false)} aria-hidden>
                    {optionLetter(i)}
                  </span>
                  <InlineText text={pairs[j].kanan} />
                </li>
              ))}
            </ul>
          </div>
        ))}

      {reveal && q.explain && (
        <div className="mt-[0.7em] flex items-start gap-[0.5em] rounded-[0.7em] border-2 border-papan-200 bg-papan-50 px-[0.7em] py-[0.5em] text-[0.7em] leading-snug text-tinta">
          <Lightbulb className="mt-[0.15em] size-[1.1em] shrink-0 text-papan" aria-hidden />
          <p>
            <InlineText text={q.explain} />
          </p>
        </div>
      )}
    </div>
  );
}
