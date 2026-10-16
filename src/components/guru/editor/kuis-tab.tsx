"use client";

// Peran 4: kuis dengan lima jenis soal. Draf AI opsional, selalu bisa disunting guru.

import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Calculator,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Lightbulb,
  Plus,
  Sigma,
  Sparkles,
  Target,
  Trash2,
  X,
} from "lucide-react";
import { useState } from "react";
import { api } from "@/lib/client";
import { hasMath, latexBatches, plainMathSpots } from "@/lib/latex";
import { checkCalc, mathMode } from "@/lib/matematika";
import { QUIZ_TONE, TONES } from "@/lib/modes";
import { blankQuestion, convertQuestion, questionProblem, quizType } from "@/lib/quiz";
import { QUIZ_TYPES, QUIZ_TYPE_LABEL, type QuizQuestion, type QuizType } from "@/lib/types";
import { InlineText } from "../../reader-text";
import { Badge, Button, EmptyState, Spinner, cx, inputClass } from "../../ui";
import { LipatSemuaBar, TombolLipat, useLipat, type LipatSemua } from "../../lipat";
import { useToast } from "../../toast";
import type { EditableLesson, UpdateLesson } from "./lesson-editor";

const LETTERS = ["A", "B", "C", "D", "E", "F"];

/** Kolom soal yang dilihat siswa (bukan kunci isian dan hitungan pemeriksa), dalam urutan tetap. */
function shownFields(q: QuizQuestion): string[] {
  const type = quizType(q);
  return [
    q.q,
    q.explain,
    ...(type === "pg" || type === "pgk" ? q.options : []),
    ...(q.hints ?? []),
    ...(type === "jodoh" ? (q.pairs ?? []).flatMap((p) => [p.kiri, p.kanan]) : []),
  ];
}

function withShownFields(q: QuizQuestion, f: string[]): QuizQuestion {
  const type = quizType(q);
  let k = 0;
  const next = () => f[k++];
  const out: QuizQuestion = { ...q, q: next(), explain: next() };
  if (type === "pg" || type === "pgk") out.options = q.options.map(() => next());
  if (q.hints) out.hints = q.hints.map(() => next());
  if (type === "jodoh" && q.pairs) out.pairs = q.pairs.map(() => ({ kiri: next(), kanan: next() }));
  return out;
}

/**
 * "Ubah rumus ke LaTeX" untuk soal kuis dan bank latihan yang ditulis sebelum ada LaTeX.
 * Hanya kolom yang memuat rumus tulisan biasa yang dikirim; kunci isian dan hitungan tidak diubah.
 */
function QuizLatexBanner({
  lessonId,
  lesson,
  update,
  aiOn,
  math,
}: {
  lessonId: string;
  lesson: EditableLesson;
  update: UpdateLesson;
  aiOn: boolean;
  math: boolean;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const all = [...lesson.quiz, ...(lesson.practice ?? [])];
  const spots = all.reduce((n, q) => n + shownFields(q).reduce((m, f) => m + plainMathSpots(f), 0), 0);
  if (!spots || !(math || spots >= 3)) return null;

  async function convert() {
    const snapshot = [...lesson.quiz, ...(lesson.practice ?? [])];
    const slots: { qi: number; fi: number; text: string }[] = [];
    snapshot.forEach((q, qi) =>
      shownFields(q).forEach((text, fi) => {
        if (plainMathSpots(text) > 0) slots.push({ qi, fi, text });
      }),
    );
    setBusy(true);
    try {
      const fields = snapshot.map(shownFields);
      const texts = slots.map((x) => x.text);
      const res = { changed: 0, rejected: 0 };
      // Beberapa permintaan kecil (paling banyak 20 kolom per permintaan) supaya cepat dan tidak melewati batas.
      for (const batch of latexBatches(texts, texts.map((_, k) => k))) {
        const part = await api<{ texts: string[]; changed: number; rejected: number }>("/api/ai/latex", {
          method: "POST",
          body: { lessonId, texts: batch.map((k) => texts[k]) },
        });
        batch.forEach((k, j) => (fields[slots[k].qi][slots[k].fi] = part.texts[j] ?? texts[k]));
        res.changed += part.changed;
        res.rejected += part.rejected;
      }
      const replaced = new Map(snapshot.map((q, i) => [q, withShownFields(q, fields[i])]));
      // Soal yang disunting guru selama AI bekerja tidak ditimpa.
      update((l) => ({
        quiz: l.quiz.map((q) => replaced.get(q) ?? q),
        practice: (l.practice ?? []).map((q) => replaced.get(q) ?? q),
      }));
      if (res.changed) {
        toast.ok(
          `Rumus di ${res.changed} bagian soal sudah ditulis dengan LaTeX${res.rejected ? `; ${res.rejected} bagian dibiarkan karena hasil AI mengubah angka/kata` : ""}. Periksa pratinjau rumusnya.`,
        );
      } else {
        toast.error(
          res.rejected
            ? "AI ikut mengubah angka atau kata, jadi hasilnya tidak dipakai. Tekan lagi untuk mencoba ulang."
            : "Tidak ada rumus yang perlu diubah.",
        );
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-aksen/30 bg-aksen-50 px-3 py-2.5 text-[14px]"
      role="status"
    >
      <Sigma className="size-4 shrink-0 text-aksen" aria-hidden />
      <span className="min-w-0 flex-1">
        Ada {spots} rumus di soal yang masih ditulis biasa (mis. 3/4, x^2, sqrt(x)). Dengan LaTeX rumusnya tampil rapi
        di layar siswa dan dibacakan dengan benar.
      </span>
      {aiOn ? (
        <Button variant="secondary" size="sm" disabled={busy} onClick={convert}>
          {busy ? <Spinner /> : <Sparkles className="size-4" aria-hidden />}
          Ubah rumus soal ke LaTeX
        </Button>
      ) : (
        <span className="text-tinta-2">Tulis rumus di antara tanda $, misalnya $x^2$.</span>
      )}
    </div>
  );
}

const TYPE_HINT: Record<QuizType, string> = {
  pg: "Satu jawaban benar.",
  pgk: "Siswa memilih semua jawaban benar (bisa lebih dari satu).",
  bs: "Siswa menilai satu pernyataan: benar atau salah.",
  isian: "Siswa mengetik jawaban singkat. Huruf besar/kecil dan tanda baca diabaikan.",
  jodoh: "Siswa memasangkan kiri dengan kanan. Urutan kanan diacak otomatis.",
};

export function KuisTab({
  lessonId,
  lesson,
  update,
  aiOn,
}: {
  lessonId: string;
  lesson: EditableLesson;
  update: UpdateLesson;
  aiOn: boolean;
}) {
  const [semua, setSemua] = useState<LipatSemua>(null);
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [aiTypes, setAiTypes] = useState<QuizType[]>(["pg", "bs", "pgk", "isian", "jodoh"]);
  const [aiCount, setAiCount] = useState(5);
  const quiz = lesson.quiz;
  const math = mathMode(lesson.subject, lesson.body);

  const setQuiz = (fn: (q: QuizQuestion[]) => QuizQuestion[]) => update((l) => ({ quiz: fn(l.quiz) }));
  // Menyunting soal dari AI berarti guru sudah memeriksanya.
  const edit = (i: number, patch: Partial<QuizQuestion>) =>
    setQuiz((qs) => qs.map((q, j) => (j === i ? { ...q, ...patch, origin: "guru" } : q)));
  const move = (i: number, dir: -1 | 1) =>
    setQuiz((qs) => {
      const next = [...qs];
      const j = i + dir;
      if (j < 0 || j >= next.length) return qs;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  function add(type: QuizType) {
    setAddOpen(false);
    const index = quiz.length;
    setQuiz((qs) => [...qs, blankQuestion(type)]);
    setTimeout(() => document.getElementById(`soal-${index}`)?.focus(), 40);
  }

  async function draftWithAi() {
    setBusy(true);
    try {
      const res = await api<{ questions: QuizQuestion[]; math?: boolean }>("/api/ai/kuis", {
        method: "POST",
        body: { lessonId, body: lesson.body, count: aiCount, types: aiTypes },
      });
      setQuiz((qs) => [...qs, ...res.questions]);
      setAiOpen(false);
      const flagged = res.questions.filter((q) => checkCalc(q)?.ok === false).length;
      toast.ok(
        `${res.questions.length} draf soal ditambahkan. ${
          res.math
            ? `Hitungannya sudah dihitung ulang aplikasi${flagged ? `; ${flagged} soal bertanda "Periksa hitungan"` : ""}. `
            : ""
        }Periksa kunci jawabannya.`,
      );
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const addMenu = (
    <div className="relative">
      <Button variant="secondary" aria-expanded={addOpen} aria-haspopup="menu" onClick={() => setAddOpen((o) => !o)}>
        <Plus className="size-4" aria-hidden />
        Tambah soal
        <ChevronDown className="size-4" aria-hidden />
      </Button>
      {addOpen && (
        <div
          role="menu"
          aria-label="Jenis soal"
          className="muncul absolute left-0 z-30 mt-2 w-72 rounded-2xl surface-card p-1.5 shadow-angkat"
        >
          {QUIZ_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              role="menuitem"
              onClick={() => add(t)}
              className="flex w-full items-start gap-3 rounded-xl px-3 py-2 text-left hover:bg-kertas"
            >
              <span className={cx("mt-1 size-3 shrink-0 rounded-full", TONES[QUIZ_TONE[t]].bar)} aria-hidden />
              <span>
                <span className="block font-bold">{QUIZ_TYPE_LABEL[t]}</span>
                <span className="block text-[13px] text-tinta-2">{TYPE_HINT[t]}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const aiPanel = aiOn && aiOpen && (
    <div className="muncul rounded-2xl border border-aksen/30 bg-aksen-50 p-4">
      <p className="font-bold text-tinta">Buat draf soal dengan AI</p>
      <fieldset className="mt-3">
        <legend className="text-[14px] font-bold text-tinta-2">Jenis soal</legend>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {QUIZ_TYPES.map((t) => {
            const on = aiTypes.includes(t);
            return (
              <label
                key={t}
                className={cx(
                  "inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border-2 bg-white px-3 text-[14px] font-bold has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-aksen",
                  on ? TONES[QUIZ_TONE[t]].border : "border-garis text-tinta-2",
                )}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={on}
                  onChange={() => setAiTypes((ts) => (on ? ts.filter((x) => x !== t) : [...ts, t]))}
                />
                <span
                  className={cx(
                    "flex size-5 items-center justify-center rounded-md border-2",
                    on ? TONES[QUIZ_TONE[t]].solid + " border-transparent" : "border-batas",
                  )}
                  aria-hidden
                >
                  {on && <Check className="size-3.5" />}
                </span>
                {QUIZ_TYPE_LABEL[t]}
              </label>
            );
          })}
        </div>
      </fieldset>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-[14px] font-bold text-tinta-2">
          Jumlah soal
          <select
            value={aiCount}
            onChange={(e) => setAiCount(Number(e.target.value))}
            className="h-10 rounded-xl border border-batas bg-white px-3 text-[15px] font-normal text-tinta"
          >
            {[3, 5, 8, 10].map((n) => (
              <option key={n} value={n}>
                {n} soal
              </option>
            ))}
          </select>
        </label>
        <Button
          variant="ai"
          disabled={busy || aiTypes.length === 0 || lesson.body.trim().length < 40}
          onClick={draftWithAi}
        >
          {busy ? <Spinner /> : <Sparkles className="size-4" aria-hidden />}
          {busy ? "Menyusun soal…" : "Buat draf"}
        </Button>
        <Button variant="ghost" onClick={() => setAiOpen(false)}>
          Batal
        </Button>
      </div>
      {lesson.body.trim().length < 40 && (
        <p className="mt-2 text-[14px] text-aksen">Tulis materi asli dulu di tab Materi.</p>
      )}
    </div>
  );

  const aiButton = aiOn ? (
    <Button variant="ai" onClick={() => setAiOpen((o) => !o)} aria-expanded={aiOpen}>
      <Sparkles className="size-4" aria-hidden />
      Draf soal dengan AI
    </Button>
  ) : null;

  if (quiz.length === 0) {
    return (
      <div className="space-y-4">
        <EmptyState
          title="Belum ada soal"
          icon={Sparkles}
          tone="papan"
          action={
            <div className="flex flex-wrap justify-center gap-2">
              {addMenu}
              {aiButton}
            </div>
          }
        >
          Lima jenis soal: pilihan ganda, pilihan ganda kompleks, benar/salah, isian singkat, dan menjodohkan. Siswa
          mengerjakan satu soal per layar setelah membaca; hasilnya masuk ke tab Rekap.
        </EmptyState>
        {aiPanel}
      </div>
    );
  }

  const counts = QUIZ_TYPES.map((t) => [t, quiz.filter((q) => quizType(q) === t).length] as const).filter(([, n]) => n);
  const setAll = (open: boolean) => setSemua((s) => ({ open, n: (s?.n ?? 0) + 1 }));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-display text-lg font-extrabold">{quiz.length} soal</p>
          {counts.map(([t, n]) => (
            <Badge key={t} tone={QUIZ_TONE[t]}>
              {QUIZ_TYPE_LABEL[t]} · {n}
            </Badge>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {addMenu}
          {aiButton}
        </div>
      </div>
      {aiPanel}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[14px] text-tinta-2">
          Soal ditampilkan dalam Bahasa Indonesia untuk semua siswa dan bisa dibacakan suara.
          {math && " Rumus ditulis dengan LaTeX di antara tanda $, misalnya $x^2 - 1$ atau $\\frac{3}{4}$."}
        </p>
        <LipatSemuaBar label="soal" onSet={setAll} />
      </div>
      <QuizLatexBanner lessonId={lessonId} lesson={lesson} update={update} aiOn={aiOn} math={math} />

      <ol className="space-y-3">
        {quiz.map((q, i) => (
          <QuestionCard
            key={i}
            q={q}
            i={i}
            semua={semua}
            math={math}
            total={quiz.length}
            edit={(patch) => edit(i, patch)}
            replace={(next) => setQuiz((qs) => qs.map((x, j) => (j === i ? next : x)))}
            move={(dir) => move(i, dir)}
            remove={() => setQuiz((qs) => qs.filter((_, j) => j !== i))}
          />
        ))}
      </ol>
      <div className="flex flex-wrap gap-2">
        {addMenu}
        {aiButton}
      </div>

      <PracticeBank lessonId={lessonId} lesson={lesson} update={update} aiOn={aiOn} math={math} />
    </div>
  );
}

function QuestionCard({
  q,
  i,
  total,
  math = false,
  idPrefix = "",
  noun = "Soal",
  semua = null,
  edit,
  replace,
  move,
  remove,
}: {
  q: QuizQuestion;
  i: number;
  total: number;
  /** Sinyal "Buka semua / Ciutkan semua" dari daftar. */
  semua?: LipatSemua;
  /** Materi Matematika: tampilkan kolom hitungan pemeriksa kunci. */
  math?: boolean;
  /** Awalan id supaya kartu kuis dan kartu bank latihan bisa tampil di halaman yang sama. */
  idPrefix?: string;
  noun?: string;
  edit: (patch: Partial<QuizQuestion>) => void;
  replace: (q: QuizQuestion) => void;
  move: (dir: -1 | 1) => void;
  remove: () => void;
}) {
  const type = quizType(q);
  const tone = TONES[QUIZ_TONE[type]];
  const problem = questionProblem(q);
  const calc = checkCalc(q);
  const uid = `${idPrefix}${i}`;
  const hints = [0, 1, 2].map((k) => q.hints?.[k] ?? "");
  // Soal yang sudah lengkap diciutkan; soal baru, draf AI, atau yang bermasalah dibuka.
  const [open, setOpen] = useLipat(!!problem || q.origin === "ai" || (!!calc && !calc.ok), semua);

  return (
    <li
      className={cx(
        "overflow-hidden rounded-2xl surface-card",
        problem ? "bg-aksen-50" : "border-garis",
      )}
    >
      <div className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-display text-lg font-extrabold">
              {noun} {i + 1}
            </span>
            <label htmlFor={`jenis-${uid}`} className="sr-only">
              Jenis {noun.toLowerCase()} {i + 1}
            </label>
            <select
              id={`jenis-${uid}`}
              value={type}
              onChange={(e) => replace(convertQuestion(q, e.target.value as QuizType))}
              className={cx("h-9 rounded-full border-0 px-3 pr-8 text-[13px] font-bold", tone.chip)}
            >
              {QUIZ_TYPES.map((t) => (
                <option key={t} value={t}>
                  {QUIZ_TYPE_LABEL[t]}
                </option>
              ))}
            </select>
            {q.origin === "ai" && <Badge tone="ai">Draf AI, periksa kuncinya</Badge>}
            {calc && !calc.ok && (
              <Badge tone="aksen">
                <Calculator className="size-3.5" aria-hidden />
                Periksa hitungan
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap gap-1">
            <TombolLipat open={open} onToggle={() => setOpen((o) => !o)} controls={`isi-${uid}`} name={`${noun} ${i + 1}`} />
            <IconButton label={`Naikkan ${noun.toLowerCase()} ${i + 1}`} disabled={i === 0} onClick={() => move(-1)}>
              <ArrowUp className="size-4" aria-hidden />
            </IconButton>
            <IconButton label={`Turunkan ${noun.toLowerCase()} ${i + 1}`} disabled={i === total - 1} onClick={() => move(1)}>
              <ArrowDown className="size-4" aria-hidden />
            </IconButton>
            <IconButton label={`Hapus ${noun.toLowerCase()} ${i + 1}`} danger onClick={remove}>
              <Trash2 className="size-4" aria-hidden />
            </IconButton>
          </div>
        </div>
        {!open && (
          <p className="mt-2 line-clamp-2 text-[15px] text-tinta">
            {q.q.trim() || <span className="text-tinta-2">Pertanyaan belum diisi.</span>}
            {q.concept?.trim() && <span className="text-tinta-2"> · Konsep: {q.concept}</span>}
          </p>
        )}
        <div id={`isi-${uid}`} hidden={!open}>
        <p className="mt-1 text-[13px] text-tinta-2">{TYPE_HINT[type]}</p>
        <label htmlFor={`konsep-${uid}`} className="mt-3 block text-sm font-bold">
          Konsep yang dinilai
        </label>
        <input id={`konsep-${uid}`} className={`${inputClass} mt-1 h-11`} maxLength={100}
          value={q.concept ?? ""} onChange={(e) => edit({ concept: e.target.value })}
          placeholder="Contoh: Penyebut dan pembilang" />
        <p className="mt-1 text-sm text-tinta-2">Gunakan nama konsep yang sama untuk soal terkait agar hasilnya dikelompokkan di rekap.</p>

        <label htmlFor={`soal-${uid}`} className="mt-3 block text-[14px] font-bold">
          {type === "bs" ? "Pernyataan" : type === "jodoh" ? "Perintah" : "Pertanyaan"}
        </label>
        <textarea
          id={`soal-${uid}`}
          rows={2}
          className={`${inputClass} mt-1`}
          placeholder={
            type === "bs"
              ? "Contoh: Fotosintesis terjadi terutama di akar."
              : type === "jodoh"
                ? "Contoh: Pasangkan bagian tumbuhan dengan fungsinya."
                : "Tulis pertanyaan"
          }
          value={q.q}
          onChange={(e) => edit({ q: e.target.value })}
        />

        <div className="mt-3">
          {(type === "pg" || type === "pgk") && <OptionsEditor q={q} i={i} uid={uid} noun={noun} multi={type === "pgk"} edit={edit} />}
          {type === "bs" && (
            <fieldset>
              <legend className="mb-1.5 text-[14px] font-bold">Kunci jawaban</legend>
              <div className="flex gap-2">
                {["Benar", "Salah"].map((label, k) => (
                  <button
                    key={label}
                    type="button"
                    aria-pressed={q.answer === k}
                    onClick={() => edit({ answer: k, options: ["Benar", "Salah"] })}
                    className={cx(
                      "inline-flex h-11 items-center gap-2 rounded-xl border-2 px-4 font-bold",
                      q.answer === k
                        ? k === 0
                          ? "border-berhasil bg-hijau-50 text-berhasil"
                          : "border-galat bg-red-50 text-galat"
                        : "border-garis text-tinta-2 hover:border-batas",
                    )}
                  >
                    {k === 0 ? <Check className="size-4" aria-hidden /> : <X className="size-4" aria-hidden />}
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>
          )}
          {type === "isian" && <AcceptedEditor q={q} i={i} noun={noun} math={math} edit={edit} />}
          {type === "jodoh" && <PairsEditor q={q} i={i} noun={noun} edit={edit} />}
        </div>

        <label htmlFor={`bahas-${uid}`} className="mt-4 block text-[14px] font-bold">
          Pembahasan
        </label>
        <input
          id={`bahas-${uid}`}
          className={`${inputClass} mt-1 h-11`}
          placeholder="Kenapa jawaban itu benar (ditampilkan setelah siswa menjawab)"
          value={q.explain}
          onChange={(e) => edit({ explain: e.target.value })}
        />
        <fieldset className="mt-4">
          <legend className="flex items-center gap-1.5 text-[14px] font-bold">
            <Lightbulb className="size-4 text-aksen" aria-hidden />
            Petunjuk bertahap (opsional)
          </legend>
          <p className="text-[13px] text-tinta-2">
            Siswa membukanya satu per satu sebelum menjawab. Jangan tulis jawabannya di sini.
          </p>
          <div className="mt-1.5 grid gap-2 md:grid-cols-3">
            {hints.map((h, k) => (
              <input
                key={k}
                aria-label={`Petunjuk ${k + 1} ${noun.toLowerCase()} ${i + 1}`}
                className={`${inputClass} h-11`}
                maxLength={400}
                placeholder={["Ingatkan bagian materi", "Langkah berpikir", "Hampir sampai jawaban"][k]}
                value={h}
                onChange={(e) => {
                  const next = hints.map((x, j) => (j === k ? e.target.value : x));
                  while (next.length && !next[next.length - 1].trim()) next.pop();
                  edit({ hints: next });
                }}
              />
            ))}
          </div>
        </fieldset>

        <MathPreview q={q} />

        {(math || q.calc) && (type === "pg" || type === "isian") && (
          <div className="mt-4">
            <label htmlFor={`hitung-${uid}`} className="flex items-center gap-1.5 text-[14px] font-bold">
              <Calculator className="size-4 text-tinta-2" aria-hidden />
              Hitungan untuk memeriksa kunci (Matematika)
            </label>
            <input
              id={`hitung-${uid}`}
              className={`${inputClass} mt-1 h-11 font-mono`}
              maxLength={200}
              placeholder="Contoh: 3/4 - 1/8"
              value={q.calc ?? ""}
              onChange={(e) => edit({ calc: e.target.value })}
              aria-describedby={`hitung-hasil-${uid}`}
            />
            <p
              id={`hitung-hasil-${uid}`}
              className={cx(
                "mt-1 flex items-center gap-1.5 text-[14px]",
                !calc ? "text-tinta-2" : calc.ok ? "text-berhasil" : "font-bold text-aksen",
              )}
            >
              {calc ? (
                calc.ok ? (
                  <CheckCircle2 className="size-4" aria-hidden />
                ) : (
                  <CircleAlert className="size-4" aria-hidden />
                )
              ) : null}
              {calc
                ? calc.message
                : "Opsional. Aplikasi menghitung ulang ekspresi ini dan membandingkannya dengan kunci jawaban."}
            </p>
          </div>
        )}

        {problem && (
          <p className="mt-3 flex items-center gap-1.5 text-[14px] font-bold text-aksen">
            <CircleAlert className="size-4" aria-hidden />
            {problem} {noun === "Soal" ? "Soal ini belum ditampilkan ke siswa." : "Latihan ini belum dipakai."}
          </p>
        )}
        {q.origin === "ai" && (
          <div className="mt-4 border-t border-garis pt-3">
            <Button size="sm" onClick={() => edit({})}>
              <Check className="size-4" aria-hidden />
              Tandai sudah dicek
            </Button>
          </div>
        )}
        </div>
      </div>
    </li>
  );
}

function OptionsEditor({
  q,
  i,
  uid,
  noun,
  multi,
  edit,
}: {
  q: QuizQuestion;
  i: number;
  uid: string;
  noun: string;
  multi: boolean;
  edit: (patch: Partial<QuizQuestion>) => void;
}) {
  const answers = multi ? (q.answers ?? []) : [q.answer];
  const toggle = (oi: number) => {
    if (!multi) return edit({ answer: oi });
    const next = answers.includes(oi) ? answers.filter((a) => a !== oi) : [...answers, oi].sort((a, b) => a - b);
    edit({ answers: next, answer: next[0] ?? 0 });
  };
  const removeOption = (oi: number) => {
    const options = q.options.filter((_, k) => k !== oi);
    const shift = (a: number) => (a > oi ? a - 1 : a);
    if (multi) {
      const next = answers.filter((a) => a !== oi).map(shift);
      edit({ options, answers: next, answer: next[0] ?? 0 });
    } else edit({ options, answer: q.answer === oi ? 0 : shift(q.answer) });
  };
  return (
    <fieldset className="space-y-2">
      <legend className="mb-1 text-[14px] text-tinta-2">
        {multi
          ? "Pilihan jawaban. Centang SEMUA jawaban yang benar."
          : "Pilihan jawaban. Pilih bulatan pada jawaban yang benar."}
      </legend>
      {q.options.map((opt, oi) => {
        const right = answers.includes(oi);
        return (
          <div key={oi} className="flex items-center gap-2">
            <input
              type={multi ? "checkbox" : "radio"}
              name={`benar-${uid}`}
              checked={right}
              onChange={() => toggle(oi)}
              className="size-5 shrink-0 accent-[#2E7D32]"
              aria-label={`Jawaban ${LETTERS[oi]} benar`}
            />
            <span className="w-5 font-bold text-tinta-2" aria-hidden>
              {LETTERS[oi]}
            </span>
            <input
              aria-label={`Pilihan ${LETTERS[oi]} ${noun.toLowerCase()} ${i + 1}`}
              className={cx(inputClass, "h-11", right && "border-berhasil bg-hijau-50/60")}
              value={opt}
              onChange={(e) => edit({ options: q.options.map((o, k) => (k === oi ? e.target.value : o)) })}
            />
            <IconButton
              label={`Hapus pilihan ${LETTERS[oi]}`}
              disabled={q.options.length <= 2}
              onClick={() => removeOption(oi)}
              danger
            >
              <X className="size-4" aria-hidden />
            </IconButton>
          </div>
        );
      })}
      {q.options.length < 6 && (
        <Button variant="ghost" size="sm" onClick={() => edit({ options: [...q.options, ""] })}>
          <Plus className="size-4" aria-hidden />
          Tambah pilihan
        </Button>
      )}
    </fieldset>
  );
}

/** Tampilan rumus LaTeX seperti yang dilihat siswa, muncul bila soal memuat $...$. */
function MathPreview({ q }: { q: QuizQuestion }) {
  const type = quizType(q);
  const options = type === "pg" || type === "pgk" ? q.options.filter((o) => o.trim()) : [];
  const parts = [q.q, ...options, q.explain, ...(q.hints ?? [])];
  if (!parts.some((t) => t && hasMath(t))) return null;
  return (
    <div className="mt-4 rounded-xl surface-card bg-kertas p-4" role="group" aria-label="Pratinjau rumus untuk siswa">
      <p className="text-[13px] font-bold uppercase tracking-wide text-tinta-2">Pratinjau rumus (tampilan siswa)</p>
      <p className="mt-1.5 font-bold leading-relaxed">
        <InlineText text={q.q} />
      </p>
      {options.length > 0 && (
        <ul className="mt-2 space-y-1">
          {options.map((o, k) => (
            <li key={k} className="flex gap-2">
              <span className="font-bold text-tinta-2">{LETTERS[k]}.</span>
              <span>
                <InlineText text={o} />
              </span>
            </li>
          ))}
        </ul>
      )}
      {q.explain.trim() && (
        <p className="mt-2 text-[14px] text-tinta-2">
          <strong>Pembahasan:</strong> <InlineText text={q.explain} />
        </p>
      )}
    </div>
  );
}

function AcceptedEditor({
  q,
  i,
  noun,
  math,
  edit,
}: {
  q: QuizQuestion;
  i: number;
  noun: string;
  math?: boolean;
  edit: (patch: Partial<QuizQuestion>) => void;
}) {
  const accepted = q.accepted?.length ? q.accepted : [""];
  return (
    <fieldset className="space-y-2">
      <legend className="mb-1 text-[14px] text-tinta-2">
        Jawaban yang diterima. Tambahkan bentuk lain yang juga benar (mis. sinonim atau ejaan lain).
        {math && " Rumus ditulis biasa (sqrt(x+2), x^2, 3/4) atau LaTeX; spasi dan √/sqrt dianggap sama."}
      </legend>
      {accepted.map((a, k) => (
        <div key={k} className="flex items-center gap-2">
          <input
            aria-label={`Jawaban diterima ${k + 1} ${noun.toLowerCase()} ${i + 1}`}
            className={cx(inputClass, "h-11")}
            value={a}
            placeholder={k === 0 ? (math ? "Contoh: sqrt(x+2)" : "Contoh: penguapan") : "Bentuk lain"}
            onChange={(e) => edit({ accepted: accepted.map((x, j) => (j === k ? e.target.value : x)) })}
          />
          <IconButton
            label={`Hapus jawaban ${k + 1}`}
            disabled={accepted.length <= 1}
            danger
            onClick={() => edit({ accepted: accepted.filter((_, j) => j !== k) })}
          >
            <X className="size-4" aria-hidden />
          </IconButton>
        </div>
      ))}
      {accepted.length < 8 && (
        <Button variant="ghost" size="sm" onClick={() => edit({ accepted: [...accepted, ""] })}>
          <Plus className="size-4" aria-hidden />
          Tambah jawaban lain
        </Button>
      )}
      {(math || q.setara) && (
        <label className="flex items-start gap-2 text-[14px]">
          <input
            type="checkbox"
            className="mt-1 size-4 accent-papan"
            checked={!!q.setara}
            onChange={(e) => edit({ setara: e.target.checked || undefined })}
          />
          <span>
            Terima bentuk aljabar lain yang setara, mis. <code>2(x+1)</code> untuk <code>2x+2</code>.{" "}
            <span className="text-tinta-2">Jangan dicentang untuk soal &quot;sederhanakan&quot; atau &quot;faktorkan&quot;.</span>
          </span>
        </label>
      )}
    </fieldset>
  );
}

function PairsEditor({
  q,
  i,
  noun,
  edit,
}: {
  q: QuizQuestion;
  i: number;
  noun: string;
  edit: (patch: Partial<QuizQuestion>) => void;
}) {
  const pairs = q.pairs ?? [];
  const set = (k: number, side: "kiri" | "kanan", v: string) =>
    edit({ pairs: pairs.map((p, j) => (j === k ? { ...p, [side]: v } : p)) });
  return (
    <fieldset className="space-y-2">
      <legend className="mb-1 text-[14px] text-tinta-2">Pasangan yang benar (kiri ↔ kanan).</legend>
      {pairs.map((p, k) => (
        <div key={k} className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2">
          <input
            aria-label={`Kiri pasangan ${k + 1} ${noun.toLowerCase()} ${i + 1}`}
            className={cx(inputClass, "h-11")}
            value={p.kiri}
            placeholder="Contoh: Akar"
            onChange={(e) => set(k, "kiri", e.target.value)}
          />
          <ArrowRight className="size-4 text-merah" aria-hidden />
          <input
            aria-label={`Kanan pasangan ${k + 1} ${noun.toLowerCase()} ${i + 1}`}
            className={cx(inputClass, "h-11")}
            value={p.kanan}
            placeholder="Contoh: Menyerap air"
            onChange={(e) => set(k, "kanan", e.target.value)}
          />
          <IconButton
            label={`Hapus pasangan ${k + 1}`}
            disabled={pairs.length <= 2}
            danger
            onClick={() => edit({ pairs: pairs.filter((_, j) => j !== k) })}
          >
            <X className="size-4" aria-hidden />
          </IconButton>
        </div>
      ))}
      {pairs.length < 8 && (
        <Button variant="ghost" size="sm" onClick={() => edit({ pairs: [...pairs, { kiri: "", kanan: "" }] })}>
          <Plus className="size-4" aria-hidden />
          Tambah pasangan
        </Button>
      )}
    </fieldset>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`flex size-10 shrink-0 items-center justify-center rounded-xl text-tinta-2 disabled:opacity-30 ${
        danger ? "hover:bg-red-50 hover:text-galat" : "hover:bg-papan-50 hover:text-papan"
      }`}
    >
      {children}
    </button>
  );
}

/**
 * Bank latihan adaptif: soal tambahan per konsep. Setelah kuis, siswa yang salah pada sebuah konsep
 * mendapat latihan dari bank ini (hanya soal yang sudah dicek guru), lengkap dengan petunjuk bertahap.
 */
function PracticeBank({
  lessonId,
  lesson,
  update,
  aiOn,
  math,
}: {
  lessonId: string;
  lesson: EditableLesson;
  update: UpdateLesson;
  aiOn: boolean;
  math: boolean;
}) {
  const [semuaBank, setSemuaBank] = useState<LipatSemua>(null);
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const bank = lesson.practice ?? [];
  const setBank = (fn: (b: QuizQuestion[]) => QuizQuestion[]) => update((l) => ({ practice: fn(l.practice ?? []) }));
  const edit = (i: number, patch: Partial<QuizQuestion>) =>
    setBank((b) => b.map((q, j) => (j === i ? { ...q, ...patch, origin: "guru" } : q)));
  const move = (i: number, dir: -1 | 1) =>
    setBank((b) => {
      const next = [...b];
      const j = i + dir;
      if (j < 0 || j >= next.length) return b;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  // Konsep di kuis dan berapa soal latihan yang sudah dicek untuk tiap konsep.
  const concepts = [...new Map(lesson.quiz.filter((q) => q.concept?.trim()).map((q) => [q.concept!.trim().toLocaleLowerCase(), q.concept!.trim()])).values()];
  const readyFor = (c: string) =>
    bank.filter((q) => q.origin === "guru" && q.concept?.trim().toLocaleLowerCase() === c.toLocaleLowerCase()).length;
  const unchecked = bank.filter((q) => q.origin === "ai").length;

  async function generate() {
    setBusy(true);
    try {
      const empty = concepts.filter((c) => !bank.some((q) => q.concept?.trim().toLocaleLowerCase() === c.toLocaleLowerCase()));
      const res = await api<{ questions: QuizQuestion[] }>("/api/ai/latihan", {
        method: "POST",
        body: {
          lessonId,
          body: lesson.body,
          concepts: (empty.length ? empty : concepts).slice(0, 6).map((konsep) => ({ konsep })),
          perConcept: 2,
        },
      });
      setBank((b) => [...b, ...res.questions].slice(0, 40));
      toast.ok(`${res.questions.length} draf soal latihan ditambahkan. Cek dulu sebelum dipakai siswa.`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="bank-latihan" className="rounded-2xl surface-card p-5 shadow-kartu">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-2xl">
          <h2 id="bank-latihan" className="flex items-center gap-2 font-display text-lg font-extrabold">
            <Target className="size-5 text-papan" aria-hidden />
            Latihan adaptif
          </h2>
          <p className="mt-1 text-[14px] text-tinta-2">
            Setelah kuis, siswa yang salah pada sebuah konsep langsung mendapat latihan untuk konsep itu, lengkap
            dengan petunjuk bertahap. Hanya soal latihan yang sudah Anda tandai dicek yang dipakai. Hasil latihan tidak
            mengubah nilai kuis.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {aiOn && (
            <Button
              variant="ai"
              disabled={busy || !concepts.length || lesson.body.trim().length < 40}
              onClick={generate}
            >
              {busy ? <Spinner /> : <Sparkles className="size-4" aria-hidden />}
              {busy ? "Menyusun latihan…" : "Buat soal latihan dengan AI"}
            </Button>
          )}
          <Button
            variant="secondary"
            onClick={() =>
              setBank((b) => [...b, { ...blankQuestion("pg"), concept: concepts[0] ?? "" }].slice(0, 40))
            }
          >
            <Plus className="size-4" aria-hidden />
            Tambah soal latihan
          </Button>
        </div>
      </div>

      {concepts.length ? (
        <ul className="mt-4 flex flex-wrap gap-2" aria-label="Kesiapan latihan per konsep">
          {concepts.map((c) => {
            const n = readyFor(c);
            return (
              <li key={c}>
                <Badge tone={n ? "ok" : "neutral"}>
                  {n ? <Check className="size-3.5" aria-hidden /> : null}
                  {c}: {n} latihan siap
                </Badge>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-4 rounded-xl bg-aksen-50 px-3 py-2 text-[14px] text-aksen">
          Isi &ldquo;Konsep yang dinilai&rdquo; pada soal kuis di atas dulu. Latihan dicocokkan dengan soal yang salah
          lewat nama konsep.
        </p>
      )}
      {unchecked > 0 && (
        <p className="mt-2 text-[14px] font-bold text-aksen">{unchecked} soal latihan masih draf AI dan belum dipakai.</p>
      )}

      {bank.length > 0 && (
        <LipatSemuaBar label="latihan" className="mt-3" onSet={(open) => setSemuaBank((s) => ({ open, n: (s?.n ?? 0) + 1 }))} />
      )}
      {bank.length > 0 && (
        <ol className="mt-2 space-y-3">
          {bank.map((q, i) => (
            <QuestionCard
              key={i}
              q={q}
              i={i}
              semua={semuaBank}
              total={bank.length}
              math={math}
              idPrefix="latihan-"
              noun="Latihan"
              edit={(patch) => edit(i, patch)}
              replace={(next) => setBank((b) => b.map((x, j) => (j === i ? next : x)))}
              move={(dir) => move(i, dir)}
              remove={() => setBank((b) => b.filter((_, j) => j !== i))}
            />
          ))}
        </ol>
      )}
    </section>
  );
}
