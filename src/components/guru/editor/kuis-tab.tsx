"use client";

// Peran 4: kuis pilihan ganda. Draf AI opsional, selalu bisa disunting guru.

import { ArrowDown, ArrowUp, Plus, Sparkles, Trash2 } from "lucide-react";
import { useState } from "react";
import { api } from "@/lib/client";
import type { QuizQuestion } from "@/lib/types";
import { Badge, Button, EmptyState, Spinner, inputClass } from "../../ui";
import { useToast } from "../../toast";
import type { EditableLesson, UpdateLesson } from "./lesson-editor";

const LETTERS = ["A", "B", "C", "D", "E", "F"];

const blankQuestion = (): QuizQuestion => ({
  q: "",
  options: ["", "", "", ""],
  answer: 0,
  explain: "",
  origin: "guru",
});

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

  async function draftWithAi() {
    setBusy(true);
    try {
      const res = await api<{ questions: QuizQuestion[] }>("/api/ai/kuis", {
        method: "POST",
        body: { lessonId, body: lesson.body, count: 5 },
      });
      setQuiz((qs) => [...qs, ...res.questions]);
      toast.ok(`${res.questions.length} draf soal ditambahkan. Periksa kunci jawabannya.`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const addButton = (
    <Button
      variant="secondary"
      onClick={() => {
        setQuiz((qs) => [...qs, blankQuestion()]);
        setTimeout(() => document.getElementById(`soal-${quiz.length}`)?.focus(), 40);
      }}
    >
      <Plus className="size-4" aria-hidden />
      Tambah soal
    </Button>
  );
  const aiButton = aiOn ? (
    <Button variant="ai" disabled={busy || lesson.body.trim().length < 40} onClick={draftWithAi}>
      {busy ? <Spinner /> : <Sparkles className="size-4" aria-hidden />}
      {busy ? "Menyusun soal…" : "Buat draf 5 soal dengan AI"}
    </Button>
  ) : null;

  if (quiz.length === 0) {
    return (
      <EmptyState
        title="Belum ada soal"
        action={
          <div className="flex flex-wrap justify-center gap-2">
            {addButton}
            {aiButton}
          </div>
        }
      >
        Siswa mengerjakan kuis satu soal per layar setelah membaca, dan skornya masuk ke tab Rekap.
      </EmptyState>
    );
  }

  return (
    <div className="space-y-5">
      <p className="text-tinta-2">
        {quiz.length} soal. Soal ditampilkan dalam Bahasa Indonesia untuk semua siswa; bisa dibacakan suara.
      </p>
      <ol className="space-y-4">
        {quiz.map((q, i) => (
          <li key={i} className="rounded-2xl border border-garis bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-display text-lg font-bold">Soal {i + 1}</span>
                {q.origin === "ai" && <Badge tone="ai">Draf AI, periksa kuncinya</Badge>}
              </div>
              <div className="flex gap-1">
                <IconButton label={`Naikkan soal ${i + 1}`} disabled={i === 0} onClick={() => move(i, -1)}>
                  <ArrowUp className="size-4" aria-hidden />
                </IconButton>
                <IconButton
                  label={`Turunkan soal ${i + 1}`}
                  disabled={i === quiz.length - 1}
                  onClick={() => move(i, 1)}
                >
                  <ArrowDown className="size-4" aria-hidden />
                </IconButton>
                <IconButton
                  label={`Hapus soal ${i + 1}`}
                  danger
                  onClick={() => setQuiz((qs) => qs.filter((_, j) => j !== i))}
                >
                  <Trash2 className="size-4" aria-hidden />
                </IconButton>
              </div>
            </div>

            <label htmlFor={`soal-${i}`} className="sr-only">
              Pertanyaan soal {i + 1}
            </label>
            <textarea
              id={`soal-${i}`}
              rows={2}
              className={`${inputClass} mt-3`}
              placeholder="Tulis pertanyaan"
              value={q.q}
              onChange={(e) => edit(i, { q: e.target.value })}
            />

            <fieldset className="mt-3 space-y-2">
              <legend className="mb-1 text-[14px] text-tinta-2">
                Pilihan jawaban. Pilih bulatan pada jawaban yang benar.
              </legend>
              {q.options.map((opt, oi) => (
                <div key={oi} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`benar-${i}`}
                    checked={q.answer === oi}
                    onChange={() => edit(i, { answer: oi })}
                    className="size-5 shrink-0 accent-[#15803D]"
                    aria-label={`Jawaban ${LETTERS[oi]} benar`}
                  />
                  <span className="w-5 font-bold text-tinta-2" aria-hidden>
                    {LETTERS[oi]}
                  </span>
                  <input
                    aria-label={`Pilihan ${LETTERS[oi]} soal ${i + 1}`}
                    className={`${inputClass} h-11 ${q.answer === oi ? "border-berhasil bg-green-50/60" : ""}`}
                    value={opt}
                    onChange={(e) => edit(i, { options: q.options.map((o, k) => (k === oi ? e.target.value : o)) })}
                  />
                </div>
              ))}
            </fieldset>

            <label htmlFor={`bahas-${i}`} className="mt-3 block text-[14px] font-bold">
              Pembahasan
            </label>
            <input
              id={`bahas-${i}`}
              className={`${inputClass} mt-1 h-11`}
              placeholder="Kenapa jawaban itu benar (ditampilkan setelah siswa menjawab)"
              value={q.explain}
              onChange={(e) => edit(i, { explain: e.target.value })}
            />
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap gap-2">
        {addButton}
        {aiButton}
      </div>
    </div>
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
      className={`flex size-10 items-center justify-center rounded-lg text-tinta-2 disabled:opacity-30 ${
        danger ? "hover:bg-red-50 hover:text-galat" : "hover:bg-papan-50 hover:text-papan"
      }`}
    >
      {children}
    </button>
  );
}
