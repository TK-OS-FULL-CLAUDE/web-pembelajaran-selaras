"use client";

// Kuis siswa: satu soal per layar, lima jenis soal (pilihan ganda, pilihan ganda kompleks,
// benar/salah, isian singkat, menjodohkan), pembahasan langsung setelah menjawab.

import { BookOpen, Check, ChevronRight, RotateCcw, Trophy, Volume2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { QUIZ_TONE, TONES } from "@/lib/modes";
import {
  emptyResponse,
  isAnswered,
  isCorrect,
  questionKey,
  quizType,
  stableShuffle,
  type QuizResponse,
} from "@/lib/quiz";
import type { QuizQuestion, QuizType } from "@/lib/types";
import type { SpeechRate, useSpeech } from "../use-speech";
import { cx } from "../ui";

export type QuestionResultPayload = { k: string; b: boolean };

const LETTERS = ["A", "B", "C", "D", "E", "F"];

const INSTRUCTION: Record<QuizType, string> = {
  pg: "Pilih satu jawaban",
  pgk: "Pilih semua jawaban yang benar",
  bs: "Benar atau salah?",
  isian: "Tulis jawaban singkat",
  jodoh: "Pasangkan yang cocok",
};

/** Jawaban benar dalam kalimat, untuk pembahasan. */
function correctText(q: QuizQuestion): string {
  switch (quizType(q)) {
    case "pgk":
      return (q.answers ?? []).map((i) => q.options[i]).join("; ");
    case "isian":
      return (q.accepted ?? []).join(" / ");
    case "jodoh":
      return (q.pairs ?? []).map((p) => `${p.kiri} → ${p.kanan}`).join("; ");
    default:
      return q.options[q.answer] ?? "";
  }
}

function speechFor(q: QuizQuestion): string[] {
  const type = quizType(q);
  switch (type) {
    case "bs":
      return [`Pernyataan: ${q.q}`, "Benar atau salah?"];
    case "isian":
      return [q.q, "Tulis jawaban singkat."];
    case "jodoh":
      return [
        q.q,
        "Pasangkan setiap bagian berikut.",
        ...(q.pairs ?? []).map((p, i) => `${i + 1}. ${p.kiri}.`),
        "Pilihannya:",
        ...stableShuffle(
          (q.pairs ?? []).map((p) => p.kanan),
          q.q,
        ).map((t) => `${t}.`),
      ];
    default:
      return [
        q.q,
        ...(type === "pgk" ? ["Pilih semua jawaban yang benar."] : []),
        ...q.options.map((o, i) => `Pilihan ${LETTERS[i]}: ${o}.`),
      ];
  }
}

export function StudentQuiz({
  questions,
  title,
  speech,
  rate,
  onFinish,
  onBack,
  onSwitchStudent,
}: {
  questions: QuizQuestion[];
  title: string;
  speech: ReturnType<typeof useSpeech>;
  rate: SpeechRate;
  /** durasi = lama pengerjaan dalam detik, dari soal pertama sampai "Lihat hasil". */
  onFinish: (score: number, total: number, durasi: number, detail: QuestionResultPayload[]) => void;
  onBack: () => void;
  onSwitchStudent?: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [responses, setResponses] = useState<QuizResponse[]>(() => questions.map(emptyResponse));
  const [checked, setChecked] = useState<boolean[]>(() => questions.map(() => false));
  const [done, setDone] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const startedAt = useRef(0);

  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  useEffect(() => {
    headingRef.current?.focus();
  }, [index, done]);

  const results = useMemo(() => questions.map((q, i) => isCorrect(q, responses[i])), [questions, responses]);
  const score = results.filter((r, i) => r && checked[i]).length;

  const setResponse = (r: QuizResponse) => setResponses((all) => all.map((x, j) => (j === index ? r : x)));
  const check = () => {
    speech.stop();
    setChecked((c) => c.map((x, j) => (j === index ? true : x)));
    setTimeout(() => feedbackRef.current?.focus(), 30);
  };

  function finish() {
    setDone(true);
    const durasi = Math.min(10_800, Math.round((Date.now() - startedAt.current) / 1000));
    const detail = questions.map((q, i) => ({ k: questionKey(q), b: results[i] }));
    onFinish(results.filter(Boolean).length, questions.length, durasi, detail);
  }

  function restart() {
    setResponses(questions.map(emptyResponse));
    setChecked(questions.map(() => false));
    setIndex(0);
    setDone(false);
    startedAt.current = Date.now();
  }

  if (done) {
    const total = questions.length;
    const pct = Math.round((score / Math.max(1, total)) * 100);
    return (
      <main id="isi" className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
        <div className="muncul overflow-hidden rounded-[1.75rem] border border-[var(--reader-line)] bg-[var(--reader-bg)] shadow-kartu">
          <div className="pita-warna" aria-hidden />
          <div className="flex flex-col items-center gap-5 p-6 text-center sm:flex-row sm:text-left">
            <ScoreRing pct={pct} />
            <div>
              <h1
                ref={headingRef}
                tabIndex={-1}
                className="font-display text-[1.9rem] font-extrabold leading-tight outline-none"
              >
                {score === total ? "Hebat, semua benar!" : pct >= 60 ? "Bagus, terus berlatih!" : "Ayo coba lagi!"}
              </h1>
              <p className="mt-1 text-[18px] text-[var(--reader-soft)]">
                Kamu menjawab{" "}
                <strong className="text-[var(--reader-ink)]">
                  {score} dari {total}
                </strong>{" "}
                soal dengan benar.
              </p>
            </div>
          </div>
        </div>

        <h2 className="mt-8 font-display text-[19px] font-extrabold">Pembahasan</h2>
        <ol className="mt-3 space-y-3">
          {questions.map((q, i) => {
            const right = results[i];
            return (
              <li key={i} className="rounded-2xl border-2 border-[var(--reader-line)] bg-white p-4 text-tinta">
                <div className="flex items-start gap-3">
                  <span
                    className={cx(
                      "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full text-white",
                      right ? "bg-berhasil" : "bg-galat",
                    )}
                    aria-hidden
                  >
                    {right ? <Check className="size-5" /> : <X className="size-5" />}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[17px] font-bold">
                      <span className="sr-only">{right ? "Benar. " : "Belum tepat. "}</span>
                      {i + 1}. {q.q}
                    </p>
                    {!right && (
                      <p className="mt-1">
                        Jawaban yang benar: <strong>{correctText(q)}</strong>
                      </p>
                    )}
                    {q.explain && <p className="mt-1 text-tinta-2">{q.explain}</p>}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
        {onSwitchStudent && <button type="button" onClick={onSwitchStudent}
          className="mt-8 min-h-14 w-full rounded-2xl bg-papan px-5 py-3 text-lg font-bold text-white">Selesai — ganti siswa</button>}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onBack}
            className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-papan px-5 text-[18px] font-bold text-white shadow-kartu hover:bg-papan-600 sm:flex-1"
          >
            <BookOpen className="size-5" aria-hidden />
            Baca materi lagi
          </button>
          <button
            type="button"
            onClick={restart}
            className="flex h-14 items-center justify-center gap-2 rounded-2xl border-2 border-[var(--reader-line)] bg-white px-5 text-[17px] font-bold text-tinta hover:border-batas"
          >
            <RotateCcw className="size-5" aria-hidden />
            Ulangi kuis
          </button>
        </div>
      </main>
    );
  }

  const q = questions[index];
  const type = quizType(q);
  const tone = TONES[QUIZ_TONE[type]];
  const r = responses[index];
  const revealed = checked[index];
  const right = results[index];
  const last = index === questions.length - 1;

  return (
    <main id="isi" className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex h-11 items-center gap-1.5 rounded-xl px-2 font-bold text-[var(--reader-ink)] hover:bg-black/5"
        >
          <X className="size-5" aria-hidden />
          Kembali ke materi
        </button>
        <p className="text-[16px] font-bold text-[var(--reader-soft)]" aria-live="polite">
          Soal {index + 1} dari {questions.length}
        </p>
      </div>
      <ol className="mt-3 flex gap-1.5" aria-label="Kemajuan kuis">
        {questions.map((_, i) => (
          <li
            key={i}
            className={cx(
              "h-2.5 flex-1 rounded-full",
              checked[i] ? (results[i] ? "bg-berhasil" : "bg-galat") : i === index ? "bg-papan" : "bg-black/10",
            )}
          >
            <span className="sr-only">
              Soal {i + 1}:{" "}
              {checked[i] ? (results[i] ? "benar" : "belum tepat") : i === index ? "sekarang" : "belum dijawab"}
            </span>
          </li>
        ))}
      </ol>

      <section className="mt-6 rounded-[1.75rem] border border-[var(--reader-line)] bg-[var(--reader-bg)] p-5 shadow-kartu sm:p-7">
        <p className="text-[13px] font-bold uppercase tracking-wide text-[var(--reader-soft)]">{title}</p>
        <span className={cx("mt-2 inline-flex rounded-full px-3 py-1 text-[14px] font-bold", tone.chip)}>
          {INSTRUCTION[type]}
        </span>
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="reader-text mt-3 font-display font-extrabold outline-none"
          style={{ fontSize: "calc(var(--reader-size) * 1.15)" }}
        >
          {q.q}
        </h1>
        {speech.supported && (
          <button
            type="button"
            onClick={() => speech.speak(speechFor(q), { lang: "id-ID", rate })}
            className="mt-2 inline-flex h-11 items-center gap-2 rounded-xl px-2 font-bold text-jingga hover:bg-jingga-50"
          >
            <Volume2 className="size-5" aria-hidden />
            Dengarkan soal
          </button>
        )}

        <div className="mt-5">
          {(type === "pg" || type === "bs") && r.type !== "pgk" && r.type !== "isian" && r.type !== "jodoh" && (
            <SingleChoice
              q={q}
              index={index}
              choice={r.choice}
              revealed={revealed}
              boolean={type === "bs"}
              onChoose={(i) => {
                speech.stop();
                setResponse({ type: r.type, choice: i });
                check();
              }}
            />
          )}
          {type === "pgk" && r.type === "pgk" && (
            <MultiChoice
              q={q}
              choices={r.choices}
              revealed={revealed}
              onChange={(choices) => setResponse({ type: "pgk", choices })}
            />
          )}
          {type === "isian" && r.type === "isian" && (
            <ShortAnswer
              value={r.text}
              revealed={revealed}
              right={right}
              onChange={(text) => setResponse({ type: "isian", text })}
              onSubmit={() => isAnswered(r) && check()}
            />
          )}
          {type === "jodoh" && r.type === "jodoh" && (
            <Matching
              q={q}
              match={r.match}
              revealed={revealed}
              onChange={(match) => setResponse({ type: "jodoh", match })}
            />
          )}
        </div>

        {!revealed && type !== "pg" && type !== "bs" && (
          <button
            type="button"
            onClick={check}
            disabled={!isAnswered(r)}
            className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-papan text-[18px] font-bold text-white shadow-kartu hover:bg-papan-600 disabled:cursor-not-allowed disabled:bg-batas"
          >
            <Check className="size-5" aria-hidden />
            Periksa jawaban
          </button>
        )}
      </section>

      {revealed && (
        <div
          ref={feedbackRef}
          tabIndex={-1}
          className={cx(
            "muncul mt-5 rounded-[1.5rem] border-2 bg-white p-5 text-tinta outline-none",
            right ? "border-berhasil" : "border-galat",
          )}
          role="status"
        >
          <p className={cx("flex items-center gap-2 text-[20px] font-bold", right ? "text-berhasil" : "text-galat")}>
            {right ? <Check className="size-6" aria-hidden /> : <X className="size-6" aria-hidden />}
            {right ? "Benar!" : "Belum tepat."}
          </p>
          {!right && type !== "jodoh" && (
            <p className="mt-1 text-[17px]">
              Jawaban yang benar: <strong>{correctText(q)}</strong>
            </p>
          )}
          {!right && type === "jodoh" && <p className="mt-1 text-[17px]">Lihat pasangan yang benar di setiap baris.</p>}
          {q.explain && <p className="mt-1 text-[17px] text-tinta-2">{q.explain}</p>}
          <button
            type="button"
            onClick={() => (last ? finish() : setIndex(index + 1))}
            className="mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-papan text-[18px] font-bold text-white shadow-kartu hover:bg-papan-600"
          >
            {last ? "Lihat hasil" : "Soal berikutnya"}
            <ChevronRight className="size-5" aria-hidden />
          </button>
        </div>
      )}
    </main>
  );
}

function ScoreRing({ pct }: { pct: number }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const color = pct >= 80 ? "var(--color-berhasil)" : pct >= 60 ? "var(--color-papan)" : "var(--color-jingga)";
  return (
    <div className="relative size-32 shrink-0" aria-hidden>
      <svg viewBox="0 0 100 100" className="size-32 -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#e2e8f0" strokeWidth="10" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${(pct / 100) * c} ${c}`}
        />
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center">
        {pct === 100 ? <Trophy className="size-6 text-aksen" /> : null}
        <span className="font-display text-[1.7rem] font-extrabold leading-none text-tinta">{pct}</span>
        <span className="text-[12px] font-bold text-tinta-2">dari 100</span>
      </span>
    </div>
  );
}

// Latar putih hanya sebelum dijawab; setelah diperiksa diganti hijau/merah muda (kelas latar tidak boleh bertabrakan).
const optionBase =
  "flex min-h-16 w-full cursor-pointer items-center gap-4 rounded-2xl border-2 px-4 py-3 text-left text-tinta transition-colors";

function SingleChoice({
  q,
  index,
  choice,
  revealed,
  boolean,
  onChoose,
}: {
  q: QuizQuestion;
  index: number;
  choice: number | null;
  revealed: boolean;
  boolean: boolean;
  onChoose: (i: number) => void;
}) {
  return (
    <fieldset className={cx(boolean ? "grid grid-cols-2 gap-3" : "space-y-3")}>
      <legend className="sr-only">{INSTRUCTION[boolean ? "bs" : "pg"]}</legend>
      {q.options.map((opt, i) => {
        const isChosen = choice === i;
        const isAnswer = q.answer === i;
        return (
          <label
            key={i}
            className={cx(
              optionBase,
              boolean && "justify-center text-center",
              !revealed &&
                "border-[var(--reader-line)] bg-white hover:border-papan has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-aksen",
              revealed && isAnswer && "border-berhasil bg-hijau-50",
              revealed && isChosen && !isAnswer && "border-galat bg-red-50",
              revealed && !isChosen && !isAnswer && "border-[var(--reader-line)] bg-white opacity-70",
              revealed && "cursor-default",
            )}
          >
            <input
              type="radio"
              name={`soal-${index}`}
              className="sr-only"
              checked={isChosen}
              disabled={revealed}
              onChange={() => onChoose(i)}
            />
            <span
              className={cx(
                "flex size-10 shrink-0 items-center justify-center rounded-full border-2 text-[17px] font-bold",
                revealed && isAnswer
                  ? "border-berhasil bg-berhasil text-white"
                  : revealed && isChosen
                    ? "border-galat bg-galat text-white"
                    : boolean
                      ? i === 0
                        ? "border-berhasil/40 text-berhasil"
                        : "border-galat/40 text-galat"
                      : "border-batas",
              )}
              aria-hidden
            >
              {revealed && isAnswer ? (
                <Check className="size-5" />
              ) : revealed && isChosen ? (
                <X className="size-5" />
              ) : boolean ? (
                i === 0 ? (
                  <Check className="size-5" />
                ) : (
                  <X className="size-5" />
                )
              ) : (
                LETTERS[i]
              )}
            </span>
            <span className={cx("reader-text", boolean && "font-bold")} style={{ fontSize: "var(--reader-size)" }}>
              {opt}
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}

function MultiChoice({
  q,
  choices,
  revealed,
  onChange,
}: {
  q: QuizQuestion;
  choices: number[];
  revealed: boolean;
  onChange: (c: number[]) => void;
}) {
  const answers = q.answers ?? [];
  return (
    <fieldset className="space-y-3">
      <legend className="sr-only">Pilih semua jawaban yang benar</legend>
      {q.options.map((opt, i) => {
        const isChosen = choices.includes(i);
        const isAnswer = answers.includes(i);
        return (
          <label
            key={i}
            className={cx(
              optionBase,
              !revealed &&
                (isChosen
                  ? "border-biru bg-biru-50"
                  : "border-[var(--reader-line)] bg-white hover:border-biru has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-aksen"),
              revealed && isAnswer && "border-berhasil bg-hijau-50",
              revealed && isChosen && !isAnswer && "border-galat bg-red-50",
              revealed && !isChosen && !isAnswer && "border-[var(--reader-line)] bg-white opacity-70",
              revealed && "cursor-default",
            )}
          >
            <input
              type="checkbox"
              className="sr-only"
              checked={isChosen}
              disabled={revealed}
              onChange={() => onChange(isChosen ? choices.filter((c) => c !== i) : [...choices, i])}
            />
            <span
              className={cx(
                "flex size-9 shrink-0 items-center justify-center rounded-lg border-2",
                revealed && isAnswer
                  ? "border-berhasil bg-berhasil text-white"
                  : revealed && isChosen
                    ? "border-galat bg-galat text-white"
                    : isChosen
                      ? "border-biru bg-biru text-white"
                      : "border-batas",
              )}
              aria-hidden
            >
              {(revealed ? isAnswer || isChosen : isChosen) &&
                (revealed && !isAnswer ? <X className="size-5" /> : <Check className="size-5" />)}
            </span>
            <span className="reader-text" style={{ fontSize: "var(--reader-size)" }}>
              {opt}
              {revealed && isAnswer && !isChosen && (
                <span className="ml-2 text-[0.8em] font-bold text-berhasil">(juga benar)</span>
              )}
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}

function ShortAnswer({
  value,
  revealed,
  right,
  onChange,
  onSubmit,
}: {
  value: string;
  revealed: boolean;
  right: boolean;
  onChange: (v: string) => void;
  onSubmit: () => void;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <label htmlFor="isian" className="mb-2 block text-[17px] font-bold">
        Jawabanmu
      </label>
      <input
        id="isian"
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, 120))}
        disabled={revealed}
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        className={cx(
          "h-16 w-full rounded-2xl border-2 bg-white px-4 text-tinta focus:outline-none focus:ring-4 focus:ring-ungu/15",
          revealed
            ? right
              ? "border-berhasil bg-hijau-50"
              : "border-galat bg-red-50"
            : "border-batas focus:border-ungu",
        )}
        style={{ fontSize: "calc(var(--reader-size) * 1.05)" }}
      />
      {!revealed && <p className="mt-2 text-[15px] text-[var(--reader-soft)]">Huruf besar/kecil tidak berpengaruh.</p>}
    </form>
  );
}

function Matching({
  q,
  match,
  revealed,
  onChange,
}: {
  q: QuizQuestion;
  match: (number | null)[];
  revealed: boolean;
  onChange: (m: (number | null)[]) => void;
}) {
  const pairs = q.pairs ?? [];
  // Pilihan kanan diacak (tetap sama setiap kali soal dibuka).
  const order = useMemo(
    () =>
      stableShuffle(
        pairs.map((_, i) => i),
        q.q,
      ),
    [pairs, q.q],
  );
  return (
    <ol className="space-y-3">
      {pairs.map((p, i) => {
        const chosen = match[i];
        const ok = chosen !== null && pairs[chosen]?.kanan.toLowerCase() === p.kanan.toLowerCase();
        return (
          <li
            key={i}
            className={cx(
              "grid gap-2 rounded-2xl border-2 p-3 text-tinta sm:grid-cols-[1fr_1.2fr] sm:items-center",
              !revealed
                ? "border-[var(--reader-line)] bg-white"
                : ok
                  ? "border-berhasil bg-hijau-50"
                  : "border-galat bg-red-50",
            )}
          >
            <label
              htmlFor={`jodoh-${i}`}
              className="flex items-center gap-3 font-bold"
              style={{ fontSize: "var(--reader-size)" }}
            >
              <span
                className="flex size-8 shrink-0 items-center justify-center rounded-full bg-mawar-100 text-[15px] text-mawar"
                aria-hidden
              >
                {i + 1}
              </span>
              {p.kiri}
            </label>
            <div>
              <select
                id={`jodoh-${i}`}
                value={chosen ?? ""}
                disabled={revealed}
                onChange={(e) =>
                  onChange(match.map((m, j) => (j === i ? (e.target.value === "" ? null : Number(e.target.value)) : m)))
                }
                className="h-14 w-full rounded-xl border-2 border-batas bg-white px-3 text-tinta focus:border-mawar focus:outline-none focus:ring-4 focus:ring-mawar/15"
                style={{ fontSize: "var(--reader-size)" }}
              >
                <option value="">Pilih pasangan…</option>
                {order.map((j) => (
                  <option key={j} value={j}>
                    {pairs[j].kanan}
                  </option>
                ))}
              </select>
              {revealed && !ok && (
                <p className="mt-1 text-[15px]">
                  Benar: <strong>{p.kanan}</strong>
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
