// Navbar halaman publik (depan, cara kerja, masuk/daftar, buka materi siswa): putih, berisi logo dan tombol Masuk guru.
// Tautan Cara kerja, Cara belajar siswa, dan Buka materi siswa ada di footer; halaman depan juga punya tombol ke materi siswa.
import Link from "next/link";
import { LogIn } from "lucide-react";
import { Logo, buttonClass } from "./ui";

export function SiteHeader({ showLogin = true }: { showLogin?: boolean }) {
  return (
    <header className="site-navbar no-print relative z-30">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link href="/" aria-label="Selaras, ke halaman depan" className="rounded-xl">
          <Logo />
        </Link>
        {showLogin && (
          <Link href="/masuk" className={buttonClass("primary", "md", "rounded-sm px-5 max-sm:h-10 max-sm:px-3.5 max-sm:text-[14px]")}>
            <LogIn className="size-4" aria-hidden />
            Masuk guru
          </Link>
        )}
      </div>
    </header>
  );
}
