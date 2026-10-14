// UI kit Selaras (Peran 4). Komponen kecil yang dipakai di semua halaman.
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}
export { cx };

type Variant = "primary" | "secondary" | "ghost" | "danger" | "ai";
type Size = "sm" | "md" | "lg";

const VARIANT: Record<Variant, string> = {
  primary: "bg-papan text-white hover:bg-papan-600 disabled:bg-batas",
  secondary: "border border-batas bg-white text-tinta hover:bg-papan-50 hover:border-papan disabled:text-tinta-2",
  ghost: "text-papan hover:bg-papan-50 disabled:text-tinta-2",
  danger: "border border-galat/40 bg-white text-galat hover:bg-red-50",
  ai: "border border-aksen bg-aksen-50 text-aksen hover:bg-amber-100 disabled:opacity-60",
};
const SIZE: Record<Size, string> = {
  sm: "h-9 px-3 text-[14px] gap-1.5",
  md: "h-11 px-4 text-[15px] gap-2",
  lg: "h-13 px-6 text-[17px] gap-2.5",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", extra?: string) {
  return cx(
    "inline-flex select-none items-center justify-center rounded-lg font-bold transition-colors disabled:cursor-not-allowed",
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

type Tone = "neutral" | "ai" | "ok" | "info" | "papan";
const TONE: Record<Tone, string> = {
  neutral: "bg-slate-100 text-tinta-2",
  ai: "bg-aksen-50 text-aksen ring-1 ring-aksen/30",
  ok: "bg-green-50 text-berhasil ring-1 ring-berhasil/25",
  info: "bg-blue-50 text-info ring-1 ring-info/20",
  papan: "bg-papan-50 text-papan",
};

export function Badge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[13px] font-bold",
        TONE[tone],
        className,
      )}
    >
      {children}
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
    info: "border-papan/25 bg-papan-50",
    warn: "border-aksen/40 bg-aksen-50",
    error: "border-galat/40 bg-red-50",
    ok: "border-berhasil/30 bg-green-50",
  }[tone];
  return (
    <div
      className={cx("rounded-xl border px-4 py-3 text-[15px]", styles, className)}
      role={tone === "error" ? "alert" : undefined}
    >
      {title && <p className="font-bold">{title}</p>}
      {children && <div className={title ? "mt-1 text-tinta-2" : ""}>{children}</div>}
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
  "w-full rounded-lg border border-batas bg-white px-3 py-2.5 text-[16px] text-tinta placeholder:text-slate-500 focus:border-papan focus:outline-none focus-visible:outline-3 focus-visible:outline-aksen";

export function Input(props: ComponentProps<"input">) {
  return <input {...props} className={cx(inputClass, "h-11", props.className)} />;
}

export function Textarea(props: ComponentProps<"textarea">) {
  return <textarea {...props} className={cx(inputClass, "leading-relaxed", props.className)} />;
}

export function Select(props: ComponentProps<"select">) {
  return <select {...props} className={cx(inputClass, "h-11", props.className)} />;
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <section className={cx("rounded-2xl border border-garis bg-white", className)}>{children}</section>;
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

export function Logo({ className, light = false }: { className?: string; light?: boolean }) {
  return (
    <span className={cx("inline-flex items-center gap-2", className)}>
      <svg viewBox="0 0 32 32" className="size-8" aria-hidden>
        <rect width="32" height="32" rx="8" fill={light ? "#ffffff" : "#0B5C5C"} />
        <g strokeLinecap="round" strokeWidth="3">
          <path d="M9 11h14" stroke={light ? "#0B5C5C" : "#fff"} />
          <path d="M9 16h9" stroke={light ? "#0B5C5C" : "#fff"} />
          <path d="M9 21h12" stroke={light ? "#B45309" : "#FDE68A"} />
        </g>
      </svg>
      <span
        className={cx("font-display text-[21px] font-extrabold tracking-tight", light ? "text-white" : "text-papan")}
      >
        Selaras
      </span>
    </span>
  );
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-batas/60 bg-white px-6 py-10 text-center">
      <p className="font-display text-lg font-bold">{title}</p>
      {children && <div className="mx-auto mt-1 max-w-md text-tinta-2">{children}</div>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}
