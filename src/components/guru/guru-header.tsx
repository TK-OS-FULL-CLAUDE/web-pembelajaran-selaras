"use client";

// Navbar ruang guru: papan tulis dengan pita krayon, menu Beranda/Perpustakaan, profil, dan Keluar.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, Library } from "lucide-react";
import { Logo, cx } from "../ui";
import { LogoutButton } from "./logout-button";

const LINKS = [
  { href: "/guru", label: "Beranda", icon: House, match: (p: string) => p === "/guru" || p.startsWith("/guru/kelas") || p.startsWith("/guru/materi") },
  { href: "/guru/pustaka", label: "Perpustakaan", icon: Library, match: (p: string) => p.startsWith("/guru/pustaka") },
];

export function GuruHeader({ name, school, initials }: { name: string; school: string | null; initials: string }) {
  const path = usePathname() ?? "";
  return (
    <header className="site-navbar no-print relative z-30">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-2.5 sm:px-6">
        <div className="flex min-w-0 items-center gap-1 sm:gap-5">
          <Link href="/guru" aria-label="Selaras, ke beranda guru" className="shrink-0 rounded-xl">
            <Logo compact />
          </Link>
          <nav aria-label="Menu guru" className="flex items-center gap-0.5">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                aria-current={l.match(path) ? "page" : undefined}
                className="nav-link inline-flex min-h-12 min-w-12 items-center justify-center gap-2 px-2.5 text-[15px] font-bold sm:px-3.5"
              >
                <l.icon className="size-5 shrink-0 text-tinta-2 sm:size-4" aria-hidden />
                <span className="sr-only sm:not-sr-only">{l.label}</span>
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/guru/profil"
            aria-current={path.startsWith("/guru/profil") ? "page" : undefined}
            className="nav-link hidden items-center gap-3 px-2 py-1.5 md:flex"
            aria-label={`Profil guru: ${name}`}
          >
            <span
              className="flex size-10 items-center justify-center rounded-full bg-emas font-display text-[15px] font-extrabold text-tinta"
              aria-hidden
            >
              {initials || "G"}
            </span>
            <span className="text-left leading-tight">
              <span className="block font-bold">{name}</span>
              {school && <span className="block text-[14px] text-tinta-2">{school}</span>}
            </span>
          </Link>
          <Link
            href="/guru/profil"
            aria-label={`Profil guru: ${name}`}
            className={cx(
              "flex size-11 items-center justify-center rounded-full bg-emas font-display text-[15px] font-extrabold text-tinta md:hidden",
            )}
          >
            <span aria-hidden>{initials || "G"}</span>
          </Link>
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
