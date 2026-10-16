"use client";

// Peran 4: rekap per materi — cara belajar yang dipilih siswa, skor kuis per versi teks,
// dan soal mana yang paling sulit.

import { Clock, ListChecks, RefreshCw, Sparkles, Target, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { LessonStats } from "@/lib/data";
import { MODE_TONE, QUIZ_TONE, TONES, type ModeKey } from "@/lib/modes";
import { questionKey, quizType } from "@/lib/quiz";
import { QUIZ_TYPE_LABEL, VERSION_LABEL, isRegionalVersion, type QuizQuestion, type VersionKey } from "@/lib/types";
import { InlineText } from "../../reader-text";
import { Badge, Button, Card, EmptyState, Spinner, StatCard, cx } from "../../ui";
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
      <span className="h-3 rounded-full bg-slate-100" aria-hidden>
        <span className={cx("block h-3 rounded-full", TONES[MODE_TONE[tone]].bar)} style={{ width: `${pct}%` }} />
      </span>
      <span className="text-right text-[15px] font-bold tabular-nums">{display}</span>
    </li>
  );
}

export function RekapTab({
  lessonId,
  stats,
  published,
  quiz,
  lesson,
  update,
  aiOn,
  goTo,
}: {
  lessonId: string;
  stats: LessonStats;
  published: boolean;
  quiz: QuizQuestion[];
  lesson: EditableLesson;
  update: UpdateLesson;
  aiOn: boolean;
  goTo: (tab: TabKey) => void;
}) {
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
        <div className="flex items-center gap-3">{refresh}<a href={`/api/materi/${lessonId}/laporan`} className="rounded-xl border border-papan px-4 py-3 font-bold text-papan">Unduh laporan CSV</a></div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Users} tone="papan" label="Sesi belajar" value={stats.sessions} />
        <StatCard
          icon={Sparkles}
          tone="ungu"
          label="Memakai cara belajar lain"
          value={`${adaptivePct}%`}
          hint={`${stats.adaptiveSessions} sesi`}
        />
        <StatCard
          icon={Target}
          tone="hijau"
          label="Rata-rata skor kuis"
          value={stats.avgScorePct ?? "—"}
          hint={stats.quizAttempts ? `dari 100 · ${stats.quizAttempts} sesi kuis` : "belum ada"}
        />
        <StatCard
          icon={Clock}
          tone="jingga"
          label="Rata-rata waktu kuis"
          value={formatDuration(stats.avgDurationSec)}
        />
      </div>

      <AnalysisCard lessonId={lessonId} stats={stats} lesson={lesson} update={update} aiOn={aiOn} goTo={goTo} />

      <GroupsCard stats={stats} lesson={lesson} goTo={goTo} />

      <Card className="p-5">
        <h2 className="text-lg font-bold">Konsep yang perlu dibahas ulang</h2>
        <p className="mt-1 text-sm text-tinta-2">{stats.quizAttempts} sesi menyelesaikan kuis · {stats.totalQuizAttempts} percobaan seluruhnya. Persentase dihitung dari jawaban pada hasil terakhir setiap sesi, bukan persentase anak yang menguasai konsep.</p>
        <p className="mt-2 text-sm text-tinta-2">Atur konsep setiap soal di tab Kuis. Setelah perubahan tersimpan, tekan Perbarui untuk memuat pengelompokan terbaru.</p>
        <ul className="mt-4 space-y-3">{stats.byConcept.map((c) => <li key={c.concept} className="rounded-xl border border-garis p-4">
          <div className="flex flex-wrap justify-between gap-2"><strong>{c.concept}</strong><span className="font-bold">{c.pct === null ? "Belum ada hasil" : `${c.pct}% benar`}</span></div>
          <p className="mt-1 text-sm">{c.questions} soal · {c.sessions} sesi menjawab · {c.correct}/{c.answers} jawaban benar</p>
          {c.pct !== null && <p className="mt-2 text-sm font-bold text-papan">{c.pct < 50 ? "Bahas ulang dengan contoh konkret dan cek pemahaman." : c.pct < 75 ? "Berikan latihan penguatan pada konsep ini." : "Lanjutkan materi; tetap cek siswa yang membutuhkan bantuan."}</p>}
        </li>)}</ul>
        {!stats.byConcept.length && <p className="mt-3">Tambahkan soal dan konsep untuk melihat ringkasan.</p>}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="font-display text-lg font-bold">Cara belajar yang dipilih</h2>
          <p className="mt-0.5 text-[14px] text-tinta-2">Jumlah sesi; satu sesi bisa memakai beberapa cara belajar.</p>
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
        </Card>

        <Card className="p-5">
          <h2 className="font-display text-lg font-bold">Skor kuis per versi teks</h2>
          <p className="mt-0.5 text-[14px] text-tinta-2">
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
        </Card>
      </div>

      {questions.length > 0 && (
        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold">
              <ListChecks className="size-5 text-papan" aria-hidden />
              Hasil per soal
            </h2>
            {withData.length > 0 && (
              <p className="text-[14px] text-tinta-2">Di bawah 50% benar: pertimbangkan pembahasan ulang.</p>
            )}
          </div>
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
                      {i + 1}. <InlineText text={q.q} />
                    </p>
                    <Badge tone={QUIZ_TONE[quizType(q)]} className="mt-1">
                      {QUIZ_TYPE_LABEL[quizType(q)]}
                    </Badge>
                    {wrong.length > 0 && (
                      <p className="mt-1 text-[14px] text-tinta-2">
                        Jawaban salah yang sering:{" "}
                        {wrong.map((w, k) => (
                          <span key={k}>
                            {k > 0 && ", "}“<InlineText text={w.text} />” ({w.n})
                          </span>
                        ))}
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
                      <div className="mt-1 h-2.5 rounded-full bg-slate-100" aria-hidden>
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
        </Card>
      )}

      {stats.recent.length > 0 && (
        <Card className="overflow-hidden">
          <h2 className="px-5 pt-5 font-display text-lg font-bold">Hasil kuis terbaru</h2>
          {/* tabIndex: wilayah yang bisa digulir harus bisa dijangkau keyboard (WCAG 2.1.1) */}
          <div className="mt-3 overflow-x-auto" tabIndex={0} role="region" aria-label="Tabel hasil kuis terbaru">
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
        </Card>
      )}
    </div>
  );
}
