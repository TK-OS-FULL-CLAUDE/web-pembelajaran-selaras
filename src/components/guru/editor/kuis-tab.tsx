"use client";

// Peran 4: kuis dengan lima jenis soal. Draf AI opsional, selalu bisa disunting guru.

import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Check,
  ChevronDown,
  CircleAlert,
  Plus,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useState } from "react";
import { api } from "@/lib/client";
import { QUIZ_TONE, TONES } from "@/lib/modes";
import { blankQuestion, convertQuestion, questionProblem, quizType } from "@/lib/quiz";
import { QUIZ_TYPES, QUIZ_TYPE_LABEL, type QuizQuestion, type QuizType } from "@/lib/types";
import { Badge, Button, EmptyState, Spinner, cx, inputClass } from "../../ui";
import { useToast } from "../../toast";
import type { EditableLesson, UpdateLesson } from "./lesson-editor";

const LETTERS = ["A", "B", "C", "D", "E", "F"];

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
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [aiTypes, setAiTypes] = useState<QuizType[]>(["pg", "bs", "pgk", "isian", "jodoh"]);
  const [aiCount, setAiCount] = useState(5);
  const quiz = lesson.quiz;

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
      const res = await api<{ questions: QuizQuestion[] }>("/api/ai/kuis", {
        method: "POST",
        body: { lessonId, body: lesson.body, count: aiCount, types: aiTypes },
      });
      setQuiz((qs) => [...qs, ...res.questions]);
      setAiOpen(false);
      toast.ok(`${res.questions.length} draf soal ditambahkan. Periksa kunci jawabannya.`);
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
          className="muncul absolute left-0 z-30 mt-2 w-72 rounded-2xl border border-garis bg-white p-1.5 shadow-angkat"
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
          tone="jingga"
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
      <p className="text-[14px] text-tinta-2">
        Soal ditampilkan dalam Bahasa Indonesia untuk semua siswa dan bisa dibacakan suara.
      </p>

      <ol className="space-y-4">
        {quiz.map((q, i) => (
          <QuestionCard
            key={i}
            q={q}
            i={i}
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
    </div>
  );
}

function QuestionCard({
  q,
  i,
  total,
  edit,
  replace,
  move,
  remove,
}: {
  q: QuizQuestion;
  i: number;
  total: number;
  edit: (patch: Partial<QuizQuestion>) => void;
  replace: (q: QuizQuestion) => void;
  move: (dir: -1 | 1) => void;
  remove: () => void;
}) {
  const type = quizType(q);
  const tone = TONES[QUIZ_TONE[type]];
  const problem = questionProblem(q);

  return (
    <li
      className={cx(
        "overflow-hidden rounded-2xl border bg-white shadow-kartu",
        problem ? "border-aksen/50" : "border-garis",
      )}
    >
      <div className={cx("h-1.5", tone.bar)} aria-hidden />
      <div className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-display text-lg font-extrabold">Soal {i + 1}</span>
            <label htmlFor={`jenis-${i}`} className="sr-only">
              Jenis soal {i + 1}
            </label>
            <select
              id={`jenis-${i}`}
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
          </div>
          <div className="flex gap-1">
            <IconButton label={`Naikkan soal ${i + 1}`} disabled={i === 0} onClick={() => move(-1)}>
              <ArrowUp className="size-4" aria-hidden />
            </IconButton>
            <IconButton label={`Turunkan soal ${i + 1}`} disabled={i === total - 1} onClick={() => move(1)}>
              <ArrowDown className="size-4" aria-hidden />
            </IconButton>
            <IconButton label={`Hapus soal ${i + 1}`} danger onClick={remove}>
              <Trash2 className="size-4" aria-hidden />
            </IconButton>
          </div>
        </div>
        <p className="mt-1 text-[13px] text-tinta-2">{TYPE_HINT[type]}</p>
        <label htmlFor={`konsep-${i}`} className="mt-3 block text-sm font-bold">Konsep yang dinilai</label>
        <input id={`konsep-${i}`} className={`${inputClass} mt-1 h-11`} maxLength={100}
          value={q.concept ?? ""} onChange={(e) => edit({ concept: e.target.value })}
          placeholder="Contoh: Penyebut dan pembilang" />
        <p className="mt-1 text-sm text-tinta-2">Gunakan nama konsep yang sama untuk soal terkait agar hasilnya dikelompokkan di rekap.</p>

        <label htmlFor={`soal-${i}`} className="mt-3 block text-[14px] font-bold">
          {type === "bs" ? "Pernyataan" : type === "jodoh" ? "Perintah" : "Pertanyaan"}
        </label>
        <textarea
          id={`soal-${i}`}
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
          {(type === "pg" || type === "pgk") && <OptionsEditor q={q} i={i} multi={type === "pgk"} edit={edit} />}
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
          {type === "isian" && <AcceptedEditor q={q} i={i} edit={edit} />}
          {type === "jodoh" && <PairsEditor q={q} i={i} edit={edit} />}
        </div>

        <label htmlFor={`bahas-${i}`} className="mt-4 block text-[14px] font-bold">
          Pembahasan
        </label>
        <input
          id={`bahas-${i}`}
          className={`${inputClass} mt-1 h-11`}
          placeholder="Kenapa jawaban itu benar (ditampilkan setelah siswa menjawab)"
          value={q.explain}
          onChange={(e) => edit({ explain: e.target.value })}
        />
        {problem && (
          <p className="mt-3 flex items-center gap-1.5 text-[14px] font-bold text-aksen">
            <CircleAlert className="size-4" aria-hidden />
            {problem} Soal ini belum ditampilkan ke siswa.
          </p>
        )}
      </div>
    </li>
  );
}

function OptionsEditor({
  q,
  i,
  multi,
  edit,
}: {
  q: QuizQuestion;
  i: number;
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
              name={`benar-${i}`}
              checked={right}
              onChange={() => toggle(oi)}
              className="size-5 shrink-0 accent-[#15803D]"
              aria-label={`Jawaban ${LETTERS[oi]} benar`}
            />
            <span className="w-5 font-bold text-tinta-2" aria-hidden>
              {LETTERS[oi]}
            </span>
            <input
              aria-label={`Pilihan ${LETTERS[oi]} soal ${i + 1}`}
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

function AcceptedEditor({ q, i, edit }: { q: QuizQuestion; i: number; edit: (patch: Partial<QuizQuestion>) => void }) {
  const accepted = q.accepted?.length ? q.accepted : [""];
  return (
    <fieldset className="space-y-2">
      <legend className="mb-1 text-[14px] text-tinta-2">
        Jawaban yang diterima. Tambahkan bentuk lain yang juga benar (mis. sinonim atau ejaan lain).
      </legend>
      {accepted.map((a, k) => (
        <div key={k} className="flex items-center gap-2">
          <input
            aria-label={`Jawaban diterima ${k + 1} soal ${i + 1}`}
            className={cx(inputClass, "h-11")}
            value={a}
            placeholder={k === 0 ? "Contoh: penguapan" : "Bentuk lain"}
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
    </fieldset>
  );
}

function PairsEditor({ q, i, edit }: { q: QuizQuestion; i: number; edit: (patch: Partial<QuizQuestion>) => void }) {
  const pairs = q.pairs ?? [];
  const set = (k: number, side: "kiri" | "kanan", v: string) =>
    edit({ pairs: pairs.map((p, j) => (j === k ? { ...p, [side]: v } : p)) });
  return (
    <fieldset className="space-y-2">
      <legend className="mb-1 text-[14px] text-tinta-2">Pasangan yang benar (kiri ↔ kanan).</legend>
      {pairs.map((p, k) => (
        <div key={k} className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2">
          <input
            aria-label={`Kiri pasangan ${k + 1} soal ${i + 1}`}
            className={cx(inputClass, "h-11")}
            value={p.kiri}
            placeholder="Contoh: Akar"
            onChange={(e) => set(k, "kiri", e.target.value)}
          />
          <ArrowRight className="size-4 text-mawar" aria-hidden />
          <input
            aria-label={`Kanan pasangan ${k + 1} soal ${i + 1}`}
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
