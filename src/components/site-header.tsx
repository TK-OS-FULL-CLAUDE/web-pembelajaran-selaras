// Navbar halaman publik (depan, cara kerja, masuk/daftar, buka materi siswa): papan tulis dengan ambalan kayu.
import Link from "next/link";
import { LogIn } from "lucide-react";
import { Logo, buttonClass } from "./ui";
import { SiteMenu } from "./site-menu";

export type SiteLinkKey = "cara-kerja" | "cara-belajar" | "siswa";

export const SITE_LINKS: { key: SiteLinkKey; href: string; label: string }[] = [
  { key: "cara-kerja", href: "/cara-kerja", label: "Cara kerja" },
  { key: "cara-belajar", href: "/cara-kerja#cara-belajar", label: "Cara belajar siswa" },
  { key: "siswa", href: "/s", label: "Buka materi siswa" },
];

export function SiteHeader({ current, showLogin = true }: { current?: SiteLinkKey; showLogin?: boolean }) {
  return (
    <header className="papan-tulis ambalan no-print relative z-30">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link href="/" aria-label="Selaras, ke halaman depan" className="rounded-xl">
          <Logo light />
        </Link>
        <nav aria-label="Utama" className="hidden items-center gap-1 md:flex">
          {SITE_LINKS.map((l) => (
            <Link
              key={l.key}
              href={l.href}
              aria-current={current === l.key ? "page" : undefined}
              className="tautan-kapur px-3.5 py-3 font-bold"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {showLogin && (
            <Link href="/masuk" className={buttonClass("emas", "md", "rounded-full px-5 max-sm:h-10 max-sm:px-3.5 max-sm:text-[14px]")}>
              <LogIn className="size-4" aria-hidden />
              Masuk guru
            </Link>
          )}
          <SiteMenu links={SITE_LINKS} current={current} />
        </div>
      </div>
    </header>
  );
}
