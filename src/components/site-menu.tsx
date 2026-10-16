"use client";

// Menu navbar di layar sempit: tombol "Menu" membuka daftar tautan di bawah papan tulis.
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { cx } from "./ui";

export function SiteMenu({
  links,
  current,
}: {
  links: { key: string; href: string; label: string }[];
  current?: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="menu-utama"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex size-11 items-center justify-center rounded-xl border border-kapur/45 text-kapur hover:bg-white/10"
      >
        {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
        <span className="sr-only">Menu</span>
      </button>
      <nav
        id="menu-utama"
        aria-label="Utama"
        hidden={!open}
        className="papan-tulis ambalan absolute inset-x-0 top-full border-t border-white/10 px-4 pb-4 pt-2"
      >
        <ul className="space-y-1">
          {links.map((l) => (
            <li key={l.key}>
              <Link
                href={l.href}
                onClick={() => setOpen(false)}
                aria-current={current === l.key ? "page" : undefined}
                className={cx("tautan-kapur flex min-h-12 items-center px-3 text-[17px] font-bold")}
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
