"use client";

// Kartu yang bisa diciutkan (pola akordeon WAI-ARIA): tombol di dalam judul dengan aria-expanded.
// Dipakai untuk daftar kartu panjang (versi teks, soal kuis, perangkat ajar) supaya guru hanya
// membuka yang sedang dikerjakan. "Buka semua / Ciutkan semua" mengatur semua kartu sekaligus.

import { ChevronDown, ChevronsDownUp, ChevronsUpDown } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { cx } from "./ui";

/** Sinyal untuk membuka/menciutkan semua kartu; `n` berubah setiap tombol ditekan. */
export type LipatSemua = { open: boolean; n: number } | null;

export function useLipat(defaultOpen: boolean, semua?: LipatSemua) {
  const [open, setOpen] = useState(defaultOpen);
  const n = semua?.n;
  useEffect(() => {
    if (semua) setOpen(semua.open);
    // Hanya bereaksi pada tombol "semua", bukan pada perubahan isi kartu.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n]);
  return [open, setOpen] as const;
}

/** Tombol "Buka semua" dan "Ciutkan semua" untuk satu daftar kartu. */
export function LipatSemuaBar({
  onSet,
  label,
  className,
}: {
  onSet: (open: boolean) => void;
  /** Mis. "versi", "soal": dipakai untuk nama tombol yang jelas bagi pembaca layar. */
  label: string;
  className?: string;
}) {
  const btn =
    "inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-[14px] font-bold text-papan-600 hover:bg-papan-50";
  return (
    <div className={cx("flex flex-wrap items-center gap-1", className)}>
      <button type="button" className={btn} onClick={() => onSet(true)}>
        <ChevronsUpDown className="size-4" aria-hidden />
        Buka semua<span className="sr-only"> {label}</span>
      </button>
      <button type="button" className={btn} onClick={() => onSet(false)}>
        <ChevronsDownUp className="size-4" aria-hidden />
        Ciutkan semua<span className="sr-only"> {label}</span>
      </button>
    </div>
  );
}

/** Tombol buka/ciutkan kecil untuk kartu yang judulnya sudah berisi kontrol lain (mis. kartu soal). */
export function TombolLipat({
  open,
  onToggle,
  controls,
  name,
}: {
  open: boolean;
  onToggle: () => void;
  controls: string;
  /** Nama kartu, mis. "Soal 3". */
  name: string;
}) {
  return (
    <button
      type="button"
      aria-expanded={open}
      aria-controls={controls}
      onClick={onToggle}
      className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-garis bg-white px-3 text-[14px] font-bold text-tinta hover:border-papan/50 hover:bg-papan-50"
    >
      <ChevronDown className={cx("size-4 transition-transform", open && "rotate-180")} aria-hidden />
      {open ? "Ciutkan" : "Buka"}
      <span className="sr-only"> {name}</span>
    </button>
  );
}

/**
 * Kartu lipat dengan judul sebagai tombol. Ringkasan (`summary`) tampil di bawah judul saat kartu diciutkan.
 * Isi (`children`) hanya dirender saat terbuka.
 */
export function KartuLipat({
  id,
  heading,
  icon,
  badges,
  summary,
  open,
  onToggle,
  highlight = false,
  headingLevel = 2,
  children,
}: {
  id: string;
  heading: ReactNode;
  icon?: ReactNode;
  badges?: ReactNode;
  summary?: ReactNode;
  open: boolean;
  onToggle: () => void;
  /** Kartu yang perlu tindakan (mis. draf AI belum dicek): garis emas di kiri. */
  highlight?: boolean;
  headingLevel?: 2 | 3;
  children: ReactNode;
}) {
  const H = headingLevel === 2 ? "h2" : "h3";
  return (
    <section
      aria-labelledby={`${id}-judul`}
      className={cx(
        "overflow-hidden rounded-2xl surface-card",
        highlight ? "bg-aksen-50" : "border-garis",
      )}
    >
      <H id={`${id}-judul`} className="font-display text-lg font-bold">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={`${id}-isi`}
          onClick={onToggle}
          className="flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-kertas/70"
        >
          {icon}
          <span className="min-w-0 flex-1">
            <span className="block">{heading}</span>
            {badges && <span className="mt-1.5 flex flex-wrap gap-1.5 font-sans">{badges}</span>}
          </span>
          <span className="flex shrink-0 items-center gap-1 font-sans text-[14px] font-bold text-papan-600">
            <span className="hidden sm:inline">{open ? "Ciutkan" : "Buka"}</span>
            <ChevronDown className={cx("size-5 transition-transform", open && "rotate-180")} aria-hidden />
          </span>
        </button>
      </H>
      {!open && summary && <div className="-mt-1 px-5 pb-4 text-[14px] text-tinta-2">{summary}</div>}
      <div id={`${id}-isi`} hidden={!open} className="border-t border-garis px-5 pb-5 pt-4">
        {open && children}
      </div>
    </section>
  );
}

/** KartuLipat yang menyimpan status buka/ciutnya sendiri (untuk kartu yang tidak diatur dari luar). */
export function KartuLipatMandiri({
  defaultOpen,
  semua = null,
  ...props
}: Omit<Parameters<typeof KartuLipat>[0], "open" | "onToggle"> & { defaultOpen: boolean; semua?: LipatSemua }) {
  const [open, setOpen] = useLipat(defaultOpen, semua);
  return <KartuLipat {...props} open={open} onToggle={() => setOpen((o) => !o)} />;
}
