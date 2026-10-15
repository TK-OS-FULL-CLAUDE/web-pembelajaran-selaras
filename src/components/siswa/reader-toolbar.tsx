"use client";

// Toolbar pembaca siswa, dua tingkat:
//   Tingkat 1: logo + pilihan versi teks
//   Tingkat 2 (di tengah): Dibacakan, Huruf besar, Kontras, Spasi lega, Garis bantu
//   Tingkat 3: hanya saat Dibacakan aktif, menjulur ke bawah tombol Dibacakan:
//              kecepatan, Dengarkan/Jeda/Lanjutkan, Dari awal

import {
  ALargeSmall,
  BookOpen,
  ChevronDown,
  Contrast,
  Languages,
  List,
  Pause,
  Play,
  RotateCcw,
  Ruler,
  SpaceIcon,
  Volume2,
  type LucideIcon,
} from "lucide-react";
import type { StudentPrefs } from "@/lib/types";
import type { SpeechRate, useSpeech } from "../use-speech";
import { Logo, cx } from "../ui";

const VERSION_ICON: Record<string, LucideIcon> = {
  mudah: BookOpen,
  ringkasan: List,
  jawa: Languages,
  sunda: Languages,
};

/*
 * Penting: warna latar (bg-*) TIDAK ditaruh di kelas dasar. Kalau bg-white ada di dasar
 * dan bg-warna ada di status aktif, keduanya bentrok dan bg-white bisa menang, sehingga
 * tulisan putih jadi tidak terlihat. Jadi latar putih hanya ada di status mati.
 */
const pillBase =
  "inline-flex h-11 items-center gap-2 rounded-xl border-2 px-3.5 text-[15px] font-bold shadow-[0_4px_10px_-6px_rgba(0,0,0,0.35)] transition-colors";

const TONE = {
  hijau: {
    off: "border-[#a9c9b0] bg-white text-[#245a3e] hover:border-[#2f7a55] hover:bg-[#e3f1e8] hover:text-[#17482f]",
    on: "border-[#2f7a55] bg-[#2f7a55] text-white hover:bg-[#256445]",
  },
  kuning: {
    off: "border-[#e6c46f] bg-white text-[#a8741a] hover:border-[#c98a1d] hover:bg-[#fbefcf] hover:text-[#7d5510]",
    on: "border-[#c98a1d] bg-[#c98a1d] text-white hover:bg-[#b0780f]",
  },
  biru: {
    off: "border-[#a6cfdc] bg-white text-[#1f6a80] hover:border-[#2b7f99] hover:bg-[#ddf0f6] hover:text-[#134b5c]",
    on: "border-[#2b7f99] bg-[#2b7f99] text-white hover:bg-[#236a81]",
  },
  abu: {
    off: "border-[#d6d3d1] bg-white text-tinta hover:border-papan hover:bg-papan-50 hover:text-papan",
    on: "border-papan bg-papan text-white hover:bg-papan-600",
  },
} as const;

/* Titik bullet di garis penjuluran sub-kontrol suara */
const bullet =
  "relative flex before:absolute before:-left-[1.7rem] before:top-1/2 before:size-2.5 before:-translate-y-1/2 before:rounded-full before:bg-papan before:content-['']";

const TOGGLES = [
  { key: "besar", label: "Huruf besar", icon: ALargeSmall, tone: TONE.hijau },
  { key: "kontras", label: "Kontras", icon: Contrast, tone: TONE.kuning },
  { key: "spasi", label: "Spasi lega", icon: SpaceIcon, tone: TONE.biru },
] as const;

/* Hiasan kecil (aria-hidden, hanya di layar lebar) */
function Leaf({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 28"
      className={cx("pointer-events-none hidden sm:block", className)}
      aria-hidden
    >
      <path d="M3 25C1 13 8 4 21 2c1 12-5 21-18 23z" fill="#8fbf8f" />
      <path
        d="M3 25C9 17 14 10 21 2"
        stroke="#4f8a5e"
        strokeWidth="1.4"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}
function Spark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cx("pointer-events-none hidden sm:block", className)}
      aria-hidden
    >
      <path
        d="M12 0c1 7 5 11 12 12-7 1-11 5-12 12-1-7-5-11-12-12 7-1 11-5 12-12z"
        fill="#e0903a"
      />
    </svg>
  );
}

export function ReaderToolbar({
  versions,
  prefs,
  onChange,
  onSelectVersion,
  ruler,
  onToggleRuler,
  speech,
  rate,
  onRateChange,
  resumeAt,
  onPlay,
  onPause,
}: {
  versions: { key: StudentPrefs["versi"]; label: string }[];
  prefs: StudentPrefs;
  onChange: (p: Partial<StudentPrefs>) => void;
  onSelectVersion: (key: StudentPrefs["versi"]) => void;
  ruler: boolean;
  onToggleRuler: () => void;
  speech: ReturnType<typeof useSpeech>;
  rate: SpeechRate;
  onRateChange: (r: SpeechRate) => void;
  resumeAt: number | null;
  onPlay: (startAt?: number) => void;
  onPause: () => void;
}) {
  return (
    <div className="no-print bg-[var(--reader-bg)]">
      {/* Tingkat 1: logo + versi teks */}
      <div className="mx-auto max-w-5xl px-4">
        <div className="flex flex-col items-center gap-3 py-3 sm:flex-row sm:justify-center sm:gap-8">
          <div className="shrink-0">
            <Logo />
          </div>

          {versions.length > 1 && (
            <div
              className="relative min-w-0 max-w-full"
              role="group"
              aria-label="Versi teks"
            >
              <Leaf className="absolute -left-3 -top-4 w-5 -rotate-12" />
              <Spark className="absolute -right-5 -top-3 w-4" />
              <Leaf className="absolute -bottom-3 -right-3 w-4 rotate-[30deg]" />
              <div className="flex max-w-full gap-1 overflow-x-auto rounded-full bg-[#ebe3de] p-1.5 shadow-[0_8px_18px_-10px_rgba(60,40,30,0.45)]">
                {versions.map((v) => {
                  const Icon = VERSION_ICON[v.key];
                  const aktif = prefs.versi === v.key;
                  return (
                    <button
                      key={v.key}
                      type="button"
                      aria-pressed={aktif}
                      onClick={() => onSelectVersion(v.key)}
                      className={cx(
                        "inline-flex h-11 shrink-0 items-center gap-2 rounded-full px-4 text-[16px] font-bold transition-colors",
                        aktif
                          ? "bg-papan text-white shadow hover:bg-papan-600"
                          : "text-[var(--reader-ink)] hover:bg-[#dccfc7]",
                      )}
                    >
                      {Icon && <Icon className="size-5" aria-hidden />}
                      {v.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tingkat 2: tampilan + Dibacakan, rata tengah */}
      <div>
        <div className="relative mx-auto flex max-w-5xl flex-wrap items-start justify-center gap-2.5 px-4 py-3">
          <Spark className="absolute -top-1 left-1 w-3" />

          {speech.supported && (
            <div className="flex flex-col items-start">
              <button
                type="button"
                aria-pressed={prefs.dengar}
                aria-expanded={prefs.dengar}
                aria-controls="kontrol-suara"
                onClick={() => {
                  if (prefs.dengar) speech.stop();
                  onChange({ dengar: !prefs.dengar });
                }}
                className={cx(
                  pillBase,
                  prefs.dengar ? TONE.abu.on : TONE.abu.off,
                )}
              >
                <Volume2 className="size-5" aria-hidden />
                Dibacakan
                <ChevronDown
                  className={cx(
                    "size-4 transition-transform",
                    prefs.dengar && "rotate-180",
                  )}
                  aria-hidden
                />
              </button>

              {/* Tingkat 3: menjulur ke bawah, menjorok ke dalam dengan bullet */}
              {prefs.dengar && (
                <ul
                  id="kontrol-suara"
                  className="ml-5 mt-2 space-y-2 border-l-2 border-[#cfe0d6] pl-5"
                >
                  <li className={bullet}>
                    <label htmlFor="kecepatan" className="sr-only">
                      Kecepatan suara
                    </label>
                    <div className="relative">
                      <select
                        id="kecepatan"
                        value={rate}
                        onChange={(e) =>
                          onRateChange(Number(e.target.value) as SpeechRate)
                        }
                        className="h-11 appearance-none rounded-xl border-2 border-[#d6d3d1] bg-white pl-3.5 pr-9 text-[15px] font-bold text-tinta shadow-[0_4px_10px_-6px_rgba(0,0,0,0.35)] transition-colors hover:border-papan hover:bg-papan-50"
                      >
                        <option value={0.8}>Pelan</option>
                        <option value={1}>Biasa</option>
                        <option value={1.2}>Cepat</option>
                      </select>
                      <ChevronDown
                        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-tinta"
                        aria-hidden
                      />
                    </div>
                  </li>
                  <li className={bullet}>
                    <button
                      type="button"
                      onClick={() =>
                        speech.speaking ? onPause() : onPlay(resumeAt ?? 0)
                      }
                      className="inline-flex h-11 items-center gap-2 rounded-xl bg-aksen px-4 text-[16px] font-bold text-white shadow-[0_6px_14px_-6px_rgba(120,60,10,0.7)] transition hover:brightness-90"
                    >
                      {speech.speaking ? (
                        <Pause className="size-5" aria-hidden />
                      ) : (
                        <Play className="size-5" aria-hidden />
                      )}
                      {speech.speaking
                        ? "Jeda"
                        : resumeAt !== null
                          ? "Lanjutkan"
                          : "Dengarkan"}
                    </button>
                  </li>
                  {!speech.speaking && resumeAt !== null && (
                    <li className={bullet}>
                      <button
                        type="button"
                        onClick={() => onPlay(0)}
                        className="inline-flex h-11 items-center gap-2 rounded-xl border-2 border-aksen bg-white px-4 text-[16px] font-bold text-aksen shadow-[0_4px_10px_-6px_rgba(0,0,0,0.35)] transition-colors hover:bg-orange-100"
                      >
                        Dari awal
                        <RotateCcw className="size-5" aria-hidden />
                      </button>
                    </li>
                  )}
                </ul>
              )}
            </div>
          )}

          {TOGGLES.map((t) => (
            <button
              key={t.key}
              type="button"
              aria-pressed={prefs[t.key]}
              onClick={() => onChange({ [t.key]: !prefs[t.key] })}
              className={cx(pillBase, prefs[t.key] ? t.tone.on : t.tone.off)}
            >
              <t.icon className="size-5" aria-hidden />
              {t.label}
            </button>
          ))}

          <button
            type="button"
            aria-pressed={ruler}
            onClick={onToggleRuler}
            className={cx(pillBase, ruler ? TONE.hijau.on : TONE.hijau.off)}
          >
            <Ruler className="size-5" aria-hidden />
            Garis bantu
          </button>
        </div>
      </div>
    </div>
  );
}
