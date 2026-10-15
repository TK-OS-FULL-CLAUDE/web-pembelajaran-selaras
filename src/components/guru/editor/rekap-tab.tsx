"use client";

// Peran 4: rekap per materi — cara belajar yang dipilih siswa dan skor kuis per versi teks.

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { LessonStats } from "@/lib/data";
import { VERSION_LABEL, isRegionalVersion, type VersionKey } from "@/lib/types";
import { Button, Card, EmptyState, Spinner } from "../../ui";

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

/** Satu baris batang horizontal: label, batang tipis, angka. Satu warna (papan); teks tetap warna tinta. */
function BarRow({
  label,
  value,
  max,
  display,
  title,
}: {
  label: string;
  value: number;
  max: number;
  display: string;
  title: string;
}) {
  const pct = max > 0 ? Math.max(value > 0 ? 2 : 0, (value / max) * 100) : 0;
  return (
    <li className="grid grid-cols-[8.5rem_1fr_4.5rem] items-center gap-3 py-1.5" title={title}>
      <span className="text-[15px]">{label}</span>
      <span className="h-3 rounded-full bg-slate-100" aria-hidden>
        <span className="block h-3 rounded-full bg-papan" style={{ width: `${pct}%` }} />
      </span>
      <span className="text-right text-[15px] font-bold tabular-nums">{display}</span>
    </li>
  );
}

export function RekapTab({ stats, published }: { stats: LessonStats; published: boolean }) {
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
      <EmptyState title="Belum ada siswa yang membuka materi ini" action={refresh}>
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <p className="max-w-2xl text-[17px]">
          <strong>{stats.sessions} siswa</strong> membuka materi ini;{" "}
          <strong>
            {stats.adaptiveSessions} ({adaptivePct}%)
          </strong>{" "}
          memakai minimal satu cara belajar selain teks asli.
          {stats.avgScorePct !== null && (
            <>
              {" "}
              Rata-rata skor kuis <strong>{stats.avgScorePct}</strong> dari 100 ({stats.quizAttempts} siswa)
              {stats.avgDurationSec !== null && (
                <>
                  , rata-rata waktu mengerjakan <strong>{formatDuration(stats.avgDurationSec)}</strong>
                </>
              )}
              .
            </>
          )}
        </p>
        {refresh}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="font-display text-lg font-bold">Cara belajar yang dipilih</h2>
          <p className="mt-0.5 text-[14px] text-tinta-2">Jumlah siswa; satu siswa bisa memilih beberapa cara.</p>
          <ul className="mt-3">
            {modes.map((m) => (
              <BarRow
                key={m.key}
                label={m.label}
                value={m.value}
                max={stats.sessions}
                display={`${m.value} siswa`}
                title={`${m.label}: ${m.value} dari ${stats.sessions} siswa`}
              />
            ))}
          </ul>
        </Card>

        <Card className="p-5">
          <h2 className="font-display text-lg font-bold">Skor kuis per versi teks</h2>
          <p className="mt-0.5 text-[14px] text-tinta-2">
            Rata-rata dari 100. Jumlah siswa di setiap versi masih kecil; baca sebagai petunjuk awal.
          </p>
          <ul className="mt-3">
            {stats.byVersion.map((v) => (
              <BarRow
                key={v.versi}
                label={VERSI_LABEL[v.versi]}
                value={v.avgPct ?? 0}
                max={100}
                display={v.avgPct === null ? "—" : String(v.avgPct)}
                title={`${VERSI_LABEL[v.versi]}: ${v.avgPct ?? "belum ada"} (${v.attempts} siswa)`}
              />
            ))}
          </ul>
          <p className="mt-2 text-[14px] text-tinta-2">
            {stats.byVersion
              .map(
                (v) =>
                  `${VERSI_LABEL[v.versi]}: ${v.attempts} siswa` +
                  (v.avgDurationSec ? `, rata-rata ${formatDuration(v.avgDurationSec)}` : ""),
              )
              .join("; ")}
            .
          </p>
        </Card>
      </div>

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
                  <tr key={i}>
                    <td className="px-5 py-2.5 font-bold">{r.alias || "Tanpa nama"}</td>
                    <td className="px-5 py-2.5">{describePrefs(r.prefs)}</td>
                    <td className="px-5 py-2.5 text-right tabular-nums">
                      {r.score}/{r.total}
                    </td>
                    <td className="px-5 py-2.5 text-right tabular-nums text-tinta-2">{formatDuration(r.durationSec)}</td>
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
