"use client";

// Toolbar pembaca siswa, satu baris yang menempel di atas saat menggulir:
//   - Pilihan versi teks (daftar pilihan biasa, tidak perlu digulir ke samping)
//   - Alat tampilan: Dibacakan, Huruf besar, Kontras, Spasi lega, Garis bantu
//     (di HP alat ini dibuka lewat tombol "Tampilan" supaya tidak menumpuk)
//   - Saat Dibacakan aktif: baris kecil Dengarkan/Jeda, Dari awal, dan kecepatan
// Semua tombol memakai satu warna: putih saat mati, hijau papan tulis saat aktif.

import {
  ALargeSmall,
  BookOpen,
  Check,
  ChevronDown,
  Contrast,
  Languages,
  List,
  Pause,
  Play,
  RotateCcw,
  Ruler,
  SlidersHorizontal,
  SpaceIcon,
  Volume2,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { StudentPrefs } from "@/lib/types";
import type { SpeechRate, useSpeech } from "../use-speech";
import { cx } from "../ui";

const VERSION_ICON: Record<string, LucideIcon> = {
  asli: BookOpen,
  mudah: BookOpen,
  ringkasan: List,
  jawa: Languages,
  sunda: Languages,
};

/*
 * Warna latar (bg-*) hanya ada di status mati atau aktif, tidak di kelas dasar,
 * supaya keduanya tidak bentrok dan tulisan putih tetap terbaca.
 */
const toolBase =
  "inline-flex min-h-11 items-center gap-2 rounded-xl border-2 px-3 text-[15px] font-bold transition-colors";
const toolOff =
  "border-[var(--reader-line)] bg-[var(--reader-bg)] text-[var(--reader-ink)] hover:border-papan hover:bg-papan-50 hover:text-papan-600";
const toolOn = "border-papan bg-papan text-white hover:bg-papan-600";

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
  const [toolsOpen, setToolsOpen] = useState(false);
  // Di HP panel alat menempel di atas; tutup otomatis saat siswa mulai menggulir bacaan supaya layar tidak tertutup.
  useEffect(() => {
    if (!toolsOpen) return;
    const start = window.scrollY;
    const onScroll = () => {
      if (Math.abs(window.scrollY - start) > 160) setToolsOpen(false);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [toolsOpen]);
  const tools: { key: string; label: string; icon: LucideIcon; on: boolean; toggle: () => void; hidden?: boolean }[] = [
    {
      key: "dengar",
      label: "Dibacakan",
      icon: Volume2,
      on: prefs.dengar,
      hidden: !speech.supported,
      toggle: () => {
        if (prefs.dengar) speech.stop();
        onChange({ dengar: !prefs.dengar });
      },
    },
    { key: "besar", label: "Huruf besar", icon: ALargeSmall, on: prefs.besar, toggle: () => onChange({ besar: !prefs.besar }) },
    { key: "kontras", label: "Kontras", icon: Contrast, on: prefs.kontras, toggle: () => onChange({ kontras: !prefs.kontras }) },
    { key: "spasi", label: "Spasi lega", icon: SpaceIcon, on: prefs.spasi, toggle: () => onChange({ spasi: !prefs.spasi }) },
    { key: "garis", label: "Garis bantu", icon: Ruler, on: ruler, toggle: onToggleRuler },
  ];
  const visible = tools.filter((t) => !t.hidden);
  const activeCount = visible.filter((t) => t.on).length;
  const VersionIcon = VERSION_ICON[prefs.versi] ?? BookOpen;

  return (
    <div className="no-print sticky top-0 z-20 border-b border-[var(--reader-line)] bg-[var(--reader-bg)]/95 shadow-[0_6px_16px_-12px_rgb(30_42_35/0.5)] backdrop-blur">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-2 px-4 py-2.5">
        {versions.length > 1 && (
          <div className="relative min-w-[10rem] flex-1 md:max-w-[15rem] md:flex-none">
            <label htmlFor="versi-teks" className="sr-only">
              Versi teks
            </label>
            <VersionIcon
              className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-papan"
              aria-hidden
            />
            <select
              id="versi-teks"
              value={prefs.versi}
              onChange={(e) => onSelectVersion(e.target.value as StudentPrefs["versi"])}
              className="h-11 w-full appearance-none rounded-xl border-2 border-papan/50 bg-[var(--reader-bg)] pl-10 pr-9 text-[16px] font-bold text-[var(--reader-ink)] hover:border-papan focus:border-papan"
            >
              {versions.map((v) => (
                <option key={v.key} value={v.key}>
                  {v.label}
                </option>
              ))}
            </select>
            <ChevronDown
              className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[var(--reader-ink)]"
              aria-hidden
            />
          </div>
        )}

        <button
          type="button"
          aria-expanded={toolsOpen}
          aria-controls="alat-tampilan"
          onClick={() => setToolsOpen((o) => !o)}
          className={cx(toolBase, toolOff, "md:hidden", versions.length > 1 ? "" : "flex-1 justify-center")}
        >
          <SlidersHorizontal className="size-5" aria-hidden />
          Tampilan
          {activeCount > 0 && (
            <span className="rounded-full bg-papan px-2 text-[13px] leading-6 text-white">
              {activeCount}
              <span className="sr-only"> aktif</span>
            </span>
          )}
          <ChevronDown className={cx("size-4 transition-transform", toolsOpen && "rotate-180")} aria-hidden />
        </button>

        <div
          id="alat-tampilan"
          role="group"
          aria-label="Tampilan bacaan"
          className={cx(
            "w-full grid-cols-2 gap-2 md:flex md:w-auto md:flex-1 md:flex-wrap md:justify-end",
            toolsOpen ? "grid" : "hidden",
          )}
        >
          {visible.map((t) => (
            <button
              key={t.key}
              type="button"
              aria-pressed={t.on}
              aria-expanded={t.key === "dengar" ? t.on : undefined}
              aria-controls={t.key === "dengar" ? "kontrol-suara" : undefined}
              onClick={t.toggle}
              className={cx(toolBase, t.on ? toolOn : toolOff, "justify-start text-left leading-tight")}
            >
              <t.icon className="size-5 shrink-0" aria-hidden />
              {t.label}
              {t.on && <Check className="ml-auto size-4 md:hidden" aria-hidden />}
            </button>
          ))}
        </div>
      </div>

      {prefs.dengar && speech.supported && (
        <div id="kontrol-suara" className="border-t border-[var(--reader-line)]">
          <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-2 px-4 py-2">
            <button
              type="button"
              onClick={() => (speech.speaking ? onPause() : onPlay(resumeAt ?? 0))}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-papan px-4 text-[16px] font-bold text-white hover:bg-papan-600"
            >
              {speech.speaking ? <Pause className="size-5" aria-hidden /> : <Play className="size-5" aria-hidden />}
              {speech.speaking ? "Jeda" : resumeAt !== null ? "Lanjutkan" : "Dengarkan"}
            </button>
            {!speech.speaking && resumeAt !== null && (
              <button type="button" onClick={() => onPlay(0)} className={cx(toolBase, toolOff)}>
                <RotateCcw className="size-5" aria-hidden />
                Dari awal
              </button>
            )}
            <label htmlFor="kecepatan" className="ml-auto text-[15px] font-bold text-[var(--reader-ink)]">
              Kecepatan
            </label>
            <div className="relative">
              <select
                id="kecepatan"
                value={rate}
                onChange={(e) => onRateChange(Number(e.target.value) as SpeechRate)}
                className="h-11 appearance-none rounded-xl border-2 border-[var(--reader-line)] bg-[var(--reader-bg)] pl-3 pr-9 text-[15px] font-bold text-[var(--reader-ink)] hover:border-papan"
              >
                <option value={0.8}>Pelan</option>
                <option value={1}>Biasa</option>
                <option value={1.2}>Cepat</option>
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[var(--reader-ink)]"
                aria-hidden
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
