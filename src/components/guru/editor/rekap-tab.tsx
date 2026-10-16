"use client";

// Peran 4: rekap per materi — cara belajar yang dipilih siswa, skor kuis per versi teks,
// dan soal mana yang paling sulit.

import { Clock, ListChecks, RefreshCw, Sparkles, Target, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { LessonStats } from "@/lib/data";
import { MODE_TONE, QUIZ_TONE, TONES, type ModeKey } from "@/lib/modes";
import { KartuLipatMandiri, LipatSemuaBar, type LipatSemua } from "../../lipat";
import { questionKey, quizType } from "@/lib/quiz";
import { QUIZ_TYPE_LABEL, VERSION_LABEL, isRegionalVersion, type QuizQuestion, type VersionKey } from "@/lib/types";
import { Badge, Button, EmptyState, Spinner, StatCard, cx } from "../../ui";
import type { EditableLesson, TabKey, UpdateLesson } from "./lesson-editor";
import { AnalysisCard, GroupsCard } from "./rekap-ai";

const MODE_LABEL: Record<keyof LessonStats["prefCounts"], string> = {
  mudah: VERSION_LABEL.mudah,
  ringkasan: VERSION_LABEL.ringkasan,
  jawa: VERSION_LABEL.jawa,
  sunda: VERSION_LABEL.sunda,
  dengar: "Dibacakan",
  besar: "Huruf besar",
  kontras: "Kontras tinggi",
  spasi: "Spasi lega",
};

const VERSI_LABEL = VERSION_LABEL;

/** 75 → "1 mnt 15 dtk" */
function formatDuration(sec: number | null | undefined): string {
  if (!sec || sec <= 0) return "—";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m} mnt${s ? ` ${s} dtk` : ""}` : `${s} dtk`;
}

function describePrefs(p: LessonStats["recent"][number]["prefs"]) {
  const parts: string[] = [VERSI_LABEL[p?.versi ?? "asli"] ?? VERSI_LABEL.asli];
  if (p?.dengar) parts.push("dibacakan");
  if (p?.besar) parts.push("huruf besar");
  if (p?.kontras) parts.push("kontras");
  if (p?.spasi) parts.push("spasi lega");
  return parts.join(", ");
}

/** Satu baris batang horizontal: label, batang tipis berwarna kategori, angka. */
function BarRow({
  label,
  value,
  max,
  display,
  title,
  tone,
}: {
  label: string;
  value: number;
  max: number;
  display: string;
  title: string;
  tone: ModeKey;
}) {
  const pct = max > 0 ? Math.max(value > 0 ? 2 : 0, (value / max) * 100) : 0;
  return (
    <li
      className="grid grid-cols-[7.5rem_1fr_4.5rem] items-center gap-3 py-1.5 sm:grid-cols-[8.5rem_1fr_4.5rem]"
      title={title}
    >
      <span className="flex items-center gap-2 text-[15px]">
        <span className={cx("size-2.5 shrink-0 rounded-full", TONES[MODE_TONE[tone]].bar)} aria-hidden />
        {label}
      </span>
      <span className="h-3 rounded-full bg-krem" aria-hidden>
        <span className={cx("block h-3 rounded-full", TONES[MODE_TONE[tone]].bar)} style={{ width: `${pct}%` }} />
      </span>
      <span className="text-right text-[15px] font-bold tabular-nums">{display}</span>
    </li>
  );
}

export function RekapTab({
  audienceId,
  lessonId,
  stats,
  published,
  quiz,
  lesson,
  update,
  aiOn,
  goTo,
}: {
  audienceId?: string;
  lessonId: string;
  stats: LessonStats;
  published: boolean;
  quiz: QuizQuestion[];
  lesson: EditableLesson;
  update: UpdateLesson;
  aiOn: boolean;
  goTo: (tab: TabKey) => void;
}) {
  const [semua, setSemua] = useState<LipatSemua>(null);
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const refresh = (
    <Button variant="secondary" size="sm" onClick={() => startTransition(() => router.refresh())} disabled={pending}>
      {pending ? <Spinner /> : <RefreshCw className="size-4" aria-hidden />}
      Perbarui
    </Button>
  );

  if (stats.sessions === 0) {
    return (
      <EmptyState title="Belum ada sesi belajar pada materi ini" icon={Users} action={refresh}>
        {published
          ? "Bagikan link atau QR dari tab Bagikan. Rekap muncul di sini begitu siswa membukanya."
          : "Terbitkan materi dulu dari tab Bagikan."}
      </EmptyState>
    );
  }

  const adaptivePct = Math.round((stats.adaptiveSessions / stats.sessions) * 100);
  // Versi teks yang tidak ada di materi ini (dan tidak pernah dipilih) tidak perlu ditampilkan.
  const isVersion = (k: string): k is VersionKey => k === "mudah" || k === "ringkasan" || isRegionalVersion(k);
  const modes = (Object.keys(MODE_LABEL) as (keyof LessonStats["prefCounts"])[])
    .filter((k) => !isVersion(k) || stats.availableVersions.includes(k) || stats.prefCounts[k] > 0)
    .map((k) => ({ key: k, label: MODE_LABEL[k], value: stats.prefCounts[k] }))
    .sort((a, b) => b.value - a.value);

  // Soal mana yang paling sulit: dicocokkan lewat kunci soal, jadi tetap benar walau urutan soal diubah.
  const questions = quiz
    .map((q, i) => {
      const s = stats.byQuestion[questionKey(q)];
      return {
        q,
        i,
        attempts: s?.attempts ?? 0,
        pct: s && s.attempts ? Math.round((s.correct / s.attempts) * 100) : null,
        wrong: s?.wrong ?? [],
        hints: s?.hints ?? 0,
      };
    })
    .filter((x) => x.q.q.trim());
  const withData = questions.filter((x) => x.pct !== null);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-[16px] text-tinta-2">
          Rekap berdasarkan sesi belajar, bukan jumlah siswa terverifikasi. Percobaan ulang dalam sesi yang sama memakai hasil terakhir. Gunakan Ganti siswa pada perangkat bersama.
        </p>
        <div className="flex items-center gap-3">{refresh}<a href={`/api/materi/${lessonId}/laporan${audienceId ? `?kelas=${audienceId}` : ""}`} className="rounded-xl border border-papan px-4 py-3 font-bold text-papan">Unduh laporan CSV</a></div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Users} tone="papan" label="Sesi belajar" value={stats.sessions} />
        <StatCard
          icon={Sparkles}
          tone="papan"
          label="Memakai cara belajar lain"
          value={`${adaptivePct}%`}
          hint={`${stats.adaptiveSessions} sesi`}
        />
        <StatCard
          icon={Target}
          tone="papan"
          label="Rata-rata skor kuis"
          value={stats.avgScorePct ?? "—"}
          hint={stats.quizAttempts ? `dari 100 · ${stats.quizAttempts} sesi kuis` : "belum ada"}
        />
        <StatCard
          icon={Clock}
          tone="aksen"
          label="Rata-rata waktu kuis"
          value={formatDuration(stats.avgDurationSec)}
        />
      </div>

      <div className="flex justify-end">
        <LipatSemuaBar label="kartu rekap" onSet={(open) => setSemua((s) => ({ open, n: (s?.n ?? 0) + 1 }))} />
      </div>
      <KartuLipatMandiri
        id="rekap-paham"
        heading="Bagian yang belum dipahami"
        semua={semua}
        defaultOpen={stats.confusion.length > 0}
        summary={stats.confusion.length ? `${stats.confusion.length} bagian dilaporkan siswa.` : "Belum ada laporan dari siswa."}
      >
        <p className="text-sm text-tinta-2">Masukan dari tombol “Aku belum paham”. Ketukan berulang pada bagian dan versi yang sama dihitung satu kali per sesi. Bahas ulang bagian dengan laporan terbanyak.</p>
        {!stats.confusion.length ? <p className="mt-3">Belum ada laporan dari siswa.</p> : <ul className="mt-3 space-y-3">
          {stats.confusion.map((f, i) => <li key={i} className="rounded-xl border border-garis p-3">
            <strong>{f.section}</strong><p>{f.sessions} sesi · {VERSION_LABEL[f.versi as keyof typeof VERSION_LABEL] || f.versi} · Revisi terbit {f.revision}</p>
          </li>)}
        </ul>}
      </KartuLipatMandiri>
      <AnalysisCard audienceId={audienceId} lessonId={lessonId} stats={stats} lesson={{ ...lesson, quiz }} update={update} aiOn={aiOn} goTo={goTo} />

      <GroupsCard stats={stats} lesson={lesson} goTo={goTo} />

      <KartuLipatMandiri
        id="rekap-konsep"
        heading="Konsep yang perlu dibahas ulang"
        semua={semua}
        defaultOpen
        summary={`${stats.byConcept.length} konsep · ${stats.quizAttempts} sesi menyelesaikan kuis.`}
      >
        <p className="text-sm text-tinta-2">{stats.quizAttempts} sesi menyelesaikan kuis · {stats.totalQuizAttempts} percobaan seluruhnya. Persentase dihitung dari jawaban pada hasil terakhir setiap sesi, bukan persentase anak yang menguasai konsep.</p>
        <p className="mt-2 text-sm text-tinta-2">Rekap konsep mengikuti kuis terakhir yang diterbitkan. Atur konsep di tab Kuis, lalu terbitkan perubahan.</p>
        <ul className="mt-4 space-y-3">{stats.byConcept.map((c) => <li key={c.concept} className="rounded-xl border border-garis p-4">
          <div className="flex flex-wrap justify-between gap-2"><strong>{c.concept}</strong><span className="font-bold">{c.pct === null ? "Belum ada hasil" : `${c.pct}% benar`}</span></div>
          <p className="mt-1 text-sm">{c.questions} soal · {c.sessions} sesi menjawab · {c.correct}/{c.answers} jawaban benar</p>
          {c.pct !== null && <p className="mt-2 text-sm font-bold text-papan">{c.pct < 50 ? "Bahas ulang dengan contoh konkret dan cek pemahaman." : c.pct < 75 ? "Berikan latihan penguatan pada konsep ini." : "Lanjutkan materi; tetap cek siswa yang membutuhkan bantuan."}</p>}
        </li>)}</ul>
        {!stats.byConcept.length && <p className="mt-3">Tambahkan soal dan konsep untuk melihat ringkasan.</p>}
      </KartuLipatMandiri>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <KartuLipatMandiri id="rekap-cara" heading="Cara belajar yang dipilih" semua={semua} defaultOpen>
          <p className="text-[14px] text-tinta-2">Jumlah sesi; satu sesi bisa memakai beberapa cara belajar.</p>
          <ul className="mt-3">
            {modes.map((m) => (
              <BarRow
                key={m.key}
                label={m.label}
                value={m.value}
                max={stats.sessions}
                display={`${m.value} sesi`}
                title={`${m.label}: ${m.value} dari ${stats.sessions} sesi`}
                tone={m.key}
              />
            ))}
          </ul>
        </KartuLipatMandiri>

        <KartuLipatMandiri id="rekap-versi" heading="Skor kuis per versi teks" semua={semua} defaultOpen>
          <p className="text-[14px] text-tinta-2">
            Rata-rata dari 100. Perhatikan jumlah sesi di setiap versi; perbedaan skor tidak membuktikan satu mode lebih efektif.
          </p>
          <ul className="mt-3">
            {stats.byVersion.map((v) => (
              <BarRow
                key={v.versi}
                label={VERSI_LABEL[v.versi]}
                value={v.avgPct ?? 0}
                max={100}
                display={v.avgPct === null ? "—" : String(v.avgPct)}
                title={`${VERSI_LABEL[v.versi]}: ${v.avgPct ?? "belum ada"} (${v.attempts} sesi)`}
                tone={v.versi}
              />
            ))}
          </ul>
          <p className="mt-2 text-[14px] text-tinta-2">
            {stats.byVersion
              .map(
                (v) =>
                  `${VERSI_LABEL[v.versi]}: ${v.attempts} sesi` +
                  (v.avgDurationSec ? `, rata-rata ${formatDuration(v.avgDurationSec)}` : ""),
              )
              .join("; ")}
            .
          </p>
        </KartuLipatMandiri>
      </div>

      {questions.length > 0 && (
        <KartuLipatMandiri
          id="rekap-soal"
          heading="Hasil per soal"
          icon={<ListChecks className="size-5 shrink-0 text-papan" aria-hidden />}
          semua={semua}
          defaultOpen={false}
          summary={
            withData.length
              ? `${withData.length} soal punya hasil. ${questions.filter((x) => x.pct !== null && x.pct < 50).length} soal di bawah 50% benar.`
              : "Belum ada jawaban siswa."
          }
        >
          {withData.length > 0 && (
            <p className="text-[14px] text-tinta-2">Di bawah 50% benar: pertimbangkan pembahasan ulang.</p>
          )}
          {withData.length === 0 ? (
            <p className="mt-2 text-[14px] text-tinta-2">
              Persentase benar per soal muncul setelah siswa mengerjakan kuis (dicatat sejak pembaruan ini).
            </p>
          ) : (
            <ol className="mt-3 divide-y divide-garis">
              {questions.map(({ q, i, attempts, pct, wrong, hints }) => (
                <li key={i} className="grid gap-2 py-3 sm:grid-cols-[1fr_14rem] sm:items-center">
                  <div className="min-w-0">
                    <p className="font-bold">
                      {i + 1}. {q.q}
                    </p>
                    <Badge tone={QUIZ_TONE[quizType(q)]} className="mt-1">
                      {QUIZ_TYPE_LABEL[quizType(q)]}
                    </Badge>
                    {wrong.length > 0 && (
                      <p className="mt-1 text-[14px] text-tinta-2">
                        Jawaban salah yang sering: {wrong.map((w) => `“${w.text}” (${w.n})`).join(", ")}
                      </p>
                    )}
                    {hints > 0 && <p className="text-[14px] text-tinta-2">Petunjuk dibuka di {hints} sesi.</p>}
                  </div>
                  {pct === null ? (
                    <p className="text-[14px] text-tinta-2">Belum ada jawaban</p>
                  ) : (
                    <div title={`${pct}% benar dari ${attempts} sesi`}>
                      <div className="flex items-center justify-between text-[14px]">
                        <span
                          className={cx(
                            "font-bold",
                            pct < 50 ? "text-galat" : pct < 75 ? "text-aksen" : "text-berhasil",
                          )}
                        >
                          {pct}% benar
                        </span>
                        <span className="text-tinta-2">{attempts} sesi</span>
                      </div>
                      <div className="mt-1 h-2.5 rounded-full bg-krem" aria-hidden>
                        <div
                          className={cx(
                            "h-2.5 rounded-full",
                            pct < 50 ? "bg-galat" : pct < 75 ? "bg-aksen" : "bg-berhasil",
                          )}
                          style={{ width: `${Math.max(2, pct)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ol>
          )}
        </KartuLipatMandiri>
      )}

      {stats.recent.length > 0 && (
        <KartuLipatMandiri
          id="rekap-terbaru"
          heading="Hasil kuis terbaru"
          semua={semua}
          defaultOpen={false}
          summary={`${stats.recent.length} hasil kuis terakhir, dengan nama panggilan, cara belajar, skor, dan waktu.`}
        >
          {/* tabIndex: wilayah yang bisa digulir harus bisa dijangkau keyboard (WCAG 2.1.1) */}
          <div className="-mx-5 overflow-x-auto" tabIndex={0} role="region" aria-label="Tabel hasil kuis terbaru">
            <table className="w-full min-w-[32rem] text-left text-[15px]">
              <thead className="border-y border-garis bg-kertas text-[14px] text-tinta-2">
                <tr>
                  <th scope="col" className="px-5 py-2 font-bold">
                    Nama panggilan
                  </th>
                  <th scope="col" className="px-5 py-2 font-bold">
                    Cara belajar
                  </th>
                  <th scope="col" className="px-5 py-2 text-right font-bold">
                    Skor
                  </th>
                  <th scope="col" className="px-5 py-2 text-right font-bold">
                    Lama
                  </th>
                  <th scope="col" className="px-5 py-2 text-right font-bold">
                    Waktu (WIB)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-garis">
                {stats.recent.map((r, i) => (
                  <tr key={i} className="hover:bg-kertas">
                    <td className="px-5 py-2.5 font-bold">{r.alias || "Tanpa nama"}</td>
                    <td className="px-5 py-2.5">{describePrefs(r.prefs)}</td>
                    <td className="px-5 py-2.5 text-right tabular-nums">
                      {r.score}/{r.total}
                    </td>
                    <td className="px-5 py-2.5 text-right tabular-nums text-tinta-2">
                      {formatDuration(r.durationSec)}
                    </td>
                    <td className="px-5 py-2.5 text-right text-tinta-2">
                      {new Intl.DateTimeFormat("id-ID", {
                        hour: "2-digit",
                        minute: "2-digit",
                        day: "numeric",
                        month: "short",
                        timeZone: "Asia/Jakarta",
                      }).format(new Date(r.at))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </KartuLipatMandiri>
      )}
    </div>
  );
}
