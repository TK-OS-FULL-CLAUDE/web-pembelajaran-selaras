// UI kit Selaras (Peran 4). Komponen kecil yang dipakai di semua halaman.
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { TONES, type ToneKey } from "@/lib/modes";

function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}
export { cx };

type Variant = "primary" | "secondary" | "ghost" | "danger" | "ai" | "soft" | "emas" | "kapur";
type Size = "sm" | "md" | "lg";

const VARIANT: Record<Variant, string> = {
  primary:
    "bg-papan text-white shadow-[0_1px_2px_rgb(15_23_42/0.12),inset_0_1px_0_rgb(255_255_255/0.12)] hover:bg-papan-600 disabled:bg-batas disabled:shadow-none",
  secondary:
    "border border-garis bg-white text-tinta shadow-kartu hover:border-papan/50 hover:bg-papan-50 disabled:text-tinta-2 disabled:hover:bg-white",
  soft: "bg-papan-50 text-papan hover:bg-papan-100 disabled:text-tinta-2",
  ghost: "text-papan-600 hover:bg-papan-50 disabled:text-tinta-2",
  danger: "border border-galat/30 bg-white text-galat hover:bg-red-50",
  ai: "border border-aksen/35 bg-aksen-50 text-aksen hover:bg-aksen-100 disabled:opacity-60",
  /** Di atas papan tulis: tombol kuning krayon dengan teks gelap (9,3:1). */
  emas: "bg-emas text-tinta shadow-[0_2px_0_rgb(0_0_0/0.18)] hover:bg-[#f6d25c] disabled:opacity-60",
  /** Di atas papan tulis: garis kapur. */
  kapur: "border border-kapur/45 text-kapur hover:border-kapur hover:bg-white/10 disabled:opacity-60",
};
const SIZE: Record<Size, string> = {
  sm: "h-9 px-3 text-[14px] gap-1.5 rounded-lg",
  md: "h-11 px-4 text-[15px] gap-2 rounded-xl",
  lg: "h-13 px-6 text-[17px] gap-2.5 rounded-xl",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", extra?: string) {
  return cx(
    "inline-flex select-none items-center justify-center font-bold transition-[background-color,border-color,color,box-shadow] duration-150 disabled:cursor-not-allowed",
    VARIANT[variant],
    SIZE[size],
    extra,
  );
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button type="button" className={buttonClass(variant, size, className)} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}

type BadgeTone = "neutral" | "ai" | "ok" | "info" | ToneKey;
const BADGE: Record<"neutral" | "ai" | "ok" | "info", string> = {
  neutral: "bg-krem text-tinta",
  ai: "bg-aksen-50 text-aksen ring-1 ring-aksen/30",
  ok: "bg-hijau-50 text-berhasil ring-1 ring-berhasil/25",
  info: "bg-biru-50 text-info ring-1 ring-info/20",
};

export function Badge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}) {
  const style = tone in BADGE ? BADGE[tone as keyof typeof BADGE] : TONES[tone as ToneKey].chip;
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[13px] font-bold",
        style,
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Kotak ikon berwarna (warna kategori). */
export function IconChip({
  icon: Icon,
  tone = "papan",
  size = "md",
  className,
}: {
  icon: LucideIcon;
  tone?: ToneKey;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const box = { sm: "size-8 rounded-lg", md: "size-11 rounded-xl", lg: "size-14 rounded-2xl" }[size];
  const ico = { sm: "size-4", md: "size-5", lg: "size-7" }[size];
  return (
    <span className={cx("flex shrink-0 items-center justify-center", box, TONES[tone].chip, className)} aria-hidden>
      <Icon className={ico} />
    </span>
  );
}

export function Notice({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: "info" | "warn" | "error" | "ok";
  title?: string;
  children?: ReactNode;
  className?: string;
}) {
  const styles = {
    info: "border-papan/20 bg-papan-50 [--n:var(--color-papan)]",
    warn: "border-aksen/30 bg-aksen-50 [--n:var(--color-aksen)]",
    error: "border-galat/30 bg-red-50 [--n:var(--color-galat)]",
    ok: "border-berhasil/25 bg-hijau-50 [--n:var(--color-berhasil)]",
  }[tone];
  return (
    <div
      className={cx("rounded-2xl border border-l-[5px] border-l-[var(--n)] px-4 py-3 text-[15px]", styles, className)}
      role={tone === "error" ? "alert" : undefined}
    >
      {title && <p className="font-bold text-tinta">{title}</p>}
      {children && <div className={title ? "mt-1 text-tinta-2" : "text-tinta"}>{children}</div>}
    </div>
  );
}

export function Field({
  label,
  hint,
  htmlFor,
  children,
  className,
}: {
  label: string;
  hint?: string;
  htmlFor: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-[15px] font-bold text-tinta">
        {label}
      </label>
      {children}
      {hint && <p className="text-[14px] text-tinta-2">{hint}</p>}
    </div>
  );
}

export const inputClass =
  "w-full rounded-xl border border-batas bg-white px-3.5 py-2.5 text-[16px] text-tinta shadow-[inset_0_1px_2px_rgb(15_23_42/0.04)] placeholder:text-slate-500 transition-[border-color,box-shadow] hover:border-tinta-2 focus:border-papan focus:outline-none focus:ring-4 focus:ring-papan/15 focus-visible:outline-3 focus-visible:outline-aksen";

export function Input(props: ComponentProps<"input">) {
  return <input {...props} className={cx(inputClass, "h-11", props.className)} />;
}

export function Textarea(props: ComponentProps<"textarea">) {
  return <textarea {...props} className={cx(inputClass, "leading-relaxed", props.className)} />;
}

export function Select(props: ComponentProps<"select">) {
  return <select {...props} className={cx(inputClass, "h-11 pr-8", props.className)} />;
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <section className={cx("rounded-2xl border border-garis bg-white shadow-kartu", className)}>{children}</section>
  );
}

/** Angka ringkas dengan ikon berwarna (beranda guru, rekap). */
export function StatCard({
  icon,
  tone,
  label,
  value,
  hint,
}: {
  icon: LucideIcon;
  tone: ToneKey;
  label: string;
  value: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-2xl border border-garis bg-white p-4 shadow-kartu sm:flex-row sm:items-center sm:gap-4">
      <IconChip icon={icon} tone={tone} size="lg" />
      <div className="min-w-0">
        <p className="text-[14px] font-bold text-tinta-2">{label}</p>
        <p
          className={cx(
            "font-display font-extrabold leading-tight tabular-nums text-tinta",
            String(value).length > 6 ? "text-[1.25rem]" : "text-[1.7rem]",
          )}
        >
          {value}
        </p>
        {hint && <p className="text-[13px] text-tinta-2">{hint}</p>}
      </div>
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cx(
        "inline-block size-4 animate-spin rounded-full border-2 border-current border-r-transparent",
        className,
      )}
    />
  );
}

export function Logo({
  className,
  light = false,
  compact = false,
}: {
  className?: string;
  /** Untuk latar gelap (papan tulis). */
  light?: boolean;
  /** Sembunyikan tulisan "Selaras" di layar sempit (ikon tetap tampil). */
  compact?: boolean;
}) {
  return (
    <span className={cx("inline-flex items-center gap-2.5", className)}>
      <svg viewBox="0 0 36 36" className="size-9 shrink-0" aria-hidden>
        <rect width="36" height="36" rx="10" fill={light ? "#F7F3E8" : "#2D6A4F"} />
        <g strokeLinecap="round" strokeWidth="3.4">
          <path d="M10 12.5h16" stroke={light ? "#1B4332" : "#ffffff"} />
          <path d="M10 18h10" stroke={light ? "#B02A31" : "#F4A6A9"} />
          <path d="M10 23.5h13" stroke={light ? "#2453A6" : "#F2C230"} />
        </g>
      </svg>
      <span
        className={cx(
          "font-display text-[22px] font-extrabold tracking-tight",
          light ? "text-kapur" : "text-tinta",
          compact && "sr-only sm:not-sr-only",
        )}
      >
        Selaras
      </span>
    </span>
  );
}

export function EmptyState({
  title,
  children,
  action,
  icon: Icon,
  tone = "papan",
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  icon?: LucideIcon;
  tone?: ToneKey;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-batas/50 bg-white px-6 py-10 text-center">
      {Icon && <IconChip icon={Icon} tone={tone} size="lg" className="mx-auto mb-3" />}
      <p className="font-display text-lg font-bold">{title}</p>
      {children && <div className="mx-auto mt-1 max-w-md text-tinta-2">{children}</div>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

/** Judul bagian dengan garis krayon kecil di depannya. */
export function SectionTitle({
  id,
  children,
  action,
  tone = "papan",
}: {
  id?: string;
  children: ReactNode;
  action?: ReactNode;
  tone?: ToneKey;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h2 id={id} className="flex items-center gap-2.5 font-display text-xl font-extrabold">
        <span className={cx("h-6 w-1.5 rounded-full", TONES[tone].bar)} aria-hidden />
        {children}
      </h2>
      {action}
    </div>
  );
}
