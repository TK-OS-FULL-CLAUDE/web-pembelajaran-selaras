import Link from "next/link";
import { LogoutButton } from "@/components/guru/logout-button";
import { Logo } from "@/components/ui";
import { requireTeacher } from "@/lib/auth";

export default async function GuruLayout({ children }: { children: React.ReactNode }) {
  const teacher = await requireTeacher();
  return (
    <div className="min-h-dvh">
      <header className="no-print border-b border-garis bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/guru" aria-label="Selaras, ke beranda guru">
            <Logo />
          </Link>
          <div className="flex items-center gap-2">
            <div className="hidden text-right leading-tight sm:block">
              <p className="font-bold">{teacher.name}</p>
              {teacher.school && <p className="text-[14px] text-tinta-2">{teacher.school}</p>}
            </div>
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
