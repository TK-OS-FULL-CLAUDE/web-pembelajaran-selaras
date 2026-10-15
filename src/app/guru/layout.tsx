import Link from "next/link";
import { LogoutButton } from "@/components/guru/logout-button";
import { Logo } from "@/components/ui";
import { requireTeacher } from "@/lib/auth";

export default async function GuruLayout({ children }: { children: React.ReactNode }) {
  const teacher = await requireTeacher();
  const name = teacher.name.replace(/\s*\(.*\)$/, "");
  const initials = name
    .replace(/^(bu|pak|bapak|ibu)\s+/i, "")
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  return (
    <div className="min-h-dvh">
      <header className="no-print border-b border-garis bg-white/95 backdrop-blur">
        <div className="pita-warna" aria-hidden />
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/guru" aria-label="Selaras, ke beranda guru" className="rounded-xl">
            <Logo />
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/guru/pustaka" className="rounded-xl px-3 py-3 text-sm font-bold text-papan hover:bg-papan-50">Perpustakaan</Link>
            <Link
              href="/guru/profil"
              className="hidden items-center gap-3 rounded-xl px-2 py-1 hover:bg-papan-50 sm:flex"
              aria-label={`Profil guru: ${name}`}
            >
              <span
                className="flex size-10 items-center justify-center rounded-full bg-papan-100 font-display text-[15px] font-extrabold text-papan"
                aria-hidden
              >
                {initials || "G"}
              </span>
              <div className="text-left leading-tight">
                <p className="font-bold">{name}</p>
                {teacher.school && <p className="text-[14px] text-tinta-2">{teacher.school}</p>}
              </div>
            </Link>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main id="isi" className="mx-auto max-w-6xl px-4 pb-20 pt-8 sm:px-6">
        {children}
      </main>
    </div>
  );
}
