"use client";

// Rekap yang ditindaklanjuti: (1) analisis AI atas hasil kuis kelas → dugaan miskonsepsi, saran, penjelasan ulang,
// dan draf soal latihan untuk konsep yang lemah; (2) kelompok kesiapan (TaRL) dari skor kuis.
// Angka di layar ini dihitung aplikasi; AI hanya menafsirkan dan menyiapkan draf yang tetap dicek guru.

import { BrainCircuit, ClipboardCopy, FilePlus2, ListChecks, Sparkles, Target, Users } from "lucide-react";
import { useState } from "react";
import type { ClassAnalysis } from "@/lib/ai-kelas";
import { api } from "@/lib/client";
import type { LessonStats } from "@/lib/data";
import { questionKey } from "@/lib/quiz";
import { JENJANG_INFO, JENJANG_KEYS, type QuizQuestion } from "@/lib/types";
import { InlineText } from "../../reader-text";
import { Badge, Button, Card, Spinner } from "../../ui";
import { useToast } from "../../toast";
import type { EditableLesson, TabKey, UpdateLesson } from "./lesson-editor";

export function AnalysisCard({
  lessonId,
  stats,
  lesson,
  update,
  aiOn,
  goTo,
}: {
  lessonId: string;
  stats: LessonStats;
  lesson: EditableLesson;
  update: UpdateLesson;
  aiOn: boolean;
  goTo: (tab: TabKey) => void;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [practiceBusy, setPracticeBusy] = useState<string | null>(null);
  const [result, setResult] = useState<{ analysis: ClassAnalysis; basedOn: number } | null>(null);
  const quiz = lesson.quiz.filter((q) => q.q.trim());
  const enough = stats.quizAttempts >= 3;

  async function analyze() {
    setBusy(true);
    try {
      setResult(await api<{ analysis: ClassAnalysis; basedOn: number }>("/api/ai/analisis", { method: "POST", body: { lessonId } }));
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function makePractice(konsep: string, dugaan: string) {
    setPracticeBusy(konsep);
    try {
      const res = await api<{ questions: QuizQuestion[] }>("/api/ai/latihan", {
        method: "POST",
        body: { lessonId, body: lesson.body, concepts: [{ konsep, dugaan }], perConcept: 2 },
      });
      update((l) => ({ practice: [...(l.practice ?? []), ...res.questions].slice(0, 40) }));
      toast.ok(`${res.questions.length} draf soal latihan "${konsep}" ditambahkan di tab Kuis. Cek dulu sebelum dipakai siswa.`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setPracticeBusy(null);
    }
  }

  function addExplanation(text: string) {
    if (!window.confirm("Tambahkan penjelasan ini di akhir materi asli sebagai kotak \"Ingat\"? Versi teks lain perlu diperbarui di tab Versi.")) return;
    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    const box = [`> Ingat: ${lines[0] ?? ""}`, ...lines.slice(1).map((l) => `> ${l}`)].join("\n");
    update((l) => ({ body: `${l.body.trimEnd()}\n\n${box}` }));
    toast.ok("Penjelasan ditambahkan di akhir materi.");
  }

  const evidence = (nos: number[]) =>
    nos
      .map((n) => {
        const q = quiz[n - 1];
        if (!q) return null;
        const s = stats.byQuestion[questionKey(q)];
        if (!s?.attempts) return `Soal ${n}: belum ada jawaban`;
        const pct = Math.round((s.correct / s.attempts) * 100);
        const wrong = s.wrong[0] ? `; jawaban salah terbanyak "${s.wrong[0].text}" (${s.wrong[0].n} sesi)` : "";
        return `Soal ${n}: ${pct}% benar dari ${s.attempts} sesi${wrong}`;
      })
      .filter(Boolean)
      .join(". ");

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-2xl">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold">
            <BrainCircuit className="size-5 text-ungu" aria-hidden />
            Analisis kelas dengan AI
          </h2>
          <p className="mt-1 text-[14px] text-tinta-2">
            AI membaca hasil kuis kelas ini (jawaban salah yang sering dipilih, petunjuk yang dibuka, skor per cara
            belajar, dan profil kebutuhan kelas), lalu menduga miskonsepsi dan menyarankan tindak lanjut. Tidak ada nama
            siswa yang dikirim ke AI. Angka bukti di bawah dihitung aplikasi.
          </p>
        </div>
        {aiOn && (
          <Button variant="ai" onClick={analyze} disabled={busy || !enough}>
            {busy ? <Spinner /> : <Sparkles className="size-4" aria-hidden />}
            {busy ? "Menganalisis…" : result ? "Analisis ulang" : "Analisis hasil kelas"}
          </Button>
        )}
      </div>
      {!enough && <p className="mt-3 text-[14px] text-tinta-2">Butuh minimal 3 sesi yang menyelesaikan kuis.</p>}
      {!aiOn && <p className="mt-3 text-[14px] text-tinta-2">Fitur AI belum aktif di server ini.</p>}

      {result && (
        <div className="mt-4 space-y-4" role="status">
          <Badge tone="ai">Saran AI — keputusan tetap di tangan guru</Badge>
          <p className="text-[16px]">
            <InlineText text={result.analysis.ringkasan} />
          </p>
          {result.analysis.temuan.length > 0 && (
            <ol className="space-y-3">
              {result.analysis.temuan.map((t, i) => (
                <li key={i} className="rounded-xl border border-garis p-4">
                  <p className="flex flex-wrap items-center gap-2 font-bold">
                    <Target className="size-4 text-aksen" aria-hidden />
                    {t.konsep || `Temuan ${i + 1}`}
                    {t.soal.length > 0 && <span className="font-normal text-tinta-2">(soal {t.soal.join(", ")})</span>}
                  </p>
                  {t.soal.length > 0 && (
                    <p className="mt-1 text-[14px] text-tinta-2">
                      <InlineText text={`${evidence(t.soal)}.`} />
                    </p>
                  )}
                  <p className="mt-2">
                    <strong>Dugaan:</strong> <InlineText text={t.dugaan} />
                  </p>
                  <p className="mt-1">
                    <strong>Saran:</strong> <InlineText text={t.saran} />
                  </p>
                  {aiOn && t.konsep && (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="mt-3"
                      disabled={practiceBusy !== null}
                      onClick={() => makePractice(t.konsep, t.dugaan)}
                    >
                      {practiceBusy === t.konsep ? <Spinner /> : <Target className="size-4" aria-hidden />}
                      Buat draf latihan untuk konsep ini
                    </Button>
                  )}
                </li>
              ))}
            </ol>
          )}
          {result.analysis.caraBelajar && (
            <p className="text-[15px]">
              <strong>Cara belajar:</strong> <InlineText text={result.analysis.caraBelajar} />
            </p>
          )}
          {result.analysis.penjelasan && (
            <div className="rounded-xl bg-papan-50 p-4">
              <p className="font-bold">Draf penjelasan ulang untuk siswa</p>
              <p className="mt-1 whitespace-pre-line">
                <InlineText text={result.analysis.penjelasan} />
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    void navigator.clipboard?.writeText(result.analysis.penjelasan);
                    toast.ok("Penjelasan disalin.");
                  }}
                >
                  <ClipboardCopy className="size-4" aria-hidden />
                  Salin
                </Button>
                <Button variant="secondary" size="sm" onClick={() => addExplanation(result.analysis.penjelasan)}>
                  <FilePlus2 className="size-4" aria-hidden />
                  Tambahkan ke materi
                </Button>
                <Button variant="ghost" size="sm" onClick={() => goTo("kuis")}>
                  Lihat latihan di tab Kuis
                </Button>
              </div>
            </div>
          )}
          <p className="text-[13px] text-tinta-2">Berdasarkan {result.basedOn} sesi kuis.</p>
        </div>
      )}
    </Card>
  );
}

export function GroupsCard({
  stats,
  lesson,
  goTo,
}: {
  stats: LessonStats;
  lesson: EditableLesson;
  goTo: (tab: TabKey) => void;
}) {
  const kit = lesson.teachingKit?.jenjang;
  const total = JENJANG_KEYS.reduce((n, k) => n + stats.groups[k].length, 0);
  if (!total) return null;
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-2xl">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold">
            <Users className="size-5 text-papan" aria-hidden />
            Kelompok kesiapan (TaRL)
          </h2>
          <p className="mt-1 text-[14px] text-tinta-2">
            Dikelompokkan dari skor kuis terakhir tiap sesi, untuk pembelajaran berdiferensiasi. Kelompok bisa berubah
            setelah siswa mengulang kuis.
          </p>
        </div>
        {!kit ? (
          <Button variant="secondary" size="sm" onClick={() => goTo("perangkat")}>
            <ListChecks className="size-4" aria-hidden />
            Siapkan tugas berjenjang
          </Button>
        ) : !kit.checked ? (
          <Badge tone="ai">Tugas berjenjang belum dicek, siswa belum melihatnya</Badge>
        ) : (
          <Badge tone="ok">Siswa melihat tugas sesuai kelompoknya</Badge>
        )}
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {JENJANG_KEYS.map((k) => (
          <section key={k} aria-labelledby={`kelompok-${k}`} className="rounded-xl border border-garis p-4">
            <h3 id={`kelompok-${k}`} className="font-bold">
              {JENJANG_INFO[k].label} · {stats.groups[k].length} sesi
            </h3>
            <p className="text-[13px] text-tinta-2">{JENJANG_INFO[k].range}</p>
            {kit?.data[k]?.judul && <p className="mt-1 text-[14px] font-bold text-papan">Tugas: {kit.data[k].judul}</p>}
            <p className="mt-2 text-[15px]">{stats.groups[k].length ? stats.groups[k].join(", ") : "—"}</p>
          </section>
        ))}
      </div>
    </Card>
  );
}
