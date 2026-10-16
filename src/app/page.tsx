import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import { DemoLoginButton } from "@/components/demo-login-button";
import { HeroDemo } from "@/components/hero-demo";
import { Ring, Sparkle } from "@/components/hero-decor";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { buttonClass } from "@/components/ui";
import { DEMO_SHARE_CODE } from "@/lib/demo-content";

// Halaman depan dibuat ringkas: satu pesan, contoh yang bisa dicoba, dan dua pintu masuk.
// Penjelasan lengkap (cara kerja, cara belajar siswa, fitur) ada di /cara-kerja, dibuka dari navbar.
export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main id="isi" className="latar-buku flex-1">
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-8 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:pb-20 lg:pt-14">
          <div className="relative">
            <Sparkle className="pointer-events-none absolute -top-2 right-6 hidden w-7 text-emas lg:block" />
            <Ring className="pointer-events-none absolute bottom-24 right-12 hidden w-6 text-papan-200 lg:block" />

            <p className="inline-flex items-center gap-2 rounded-full border border-papan/25 bg-white px-3 py-1 text-[14px] font-bold text-papan">
              <span className="size-2 rounded-full bg-emas" aria-hidden />
              Untuk kelas inklusif di Indonesia
            </p>
            <h1 className="mt-4 font-display text-[2.4rem] font-extrabold leading-[1.1] text-tinta sm:text-[3.2rem]">
              Satu materi dari guru, setiap siswa bisa mengikuti.
            </h1>
            <p className="mt-5 max-w-xl text-[18px] text-tinta-2">
              Guru menulis materi sekali. Siswa membukanya di HP dengan cara yang cocok untuknya: kalimat lebih mudah,
              bahasa daerah, huruf besar, kontras tinggi, spasi lega, atau dibacakan — lengkap dengan gambar yang
              dideskripsikan.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <div className="[&_button]:rounded-full">
                <DemoLoginButton />
              </div>
              <Link href="/s" className={buttonClass("secondary", "lg", "rounded-full")}>
                <BookOpen className="size-5 text-papan" aria-hidden />
                Buka materi siswa
              </Link>
            </div>
            <p className="mt-4 text-[14px] text-tinta-2">Akun demo tidak perlu daftar. Semua data di dalamnya fiktif.</p>
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
              <Link href={`/s/${DEMO_SHARE_CODE}`} className="inline-flex min-h-11 items-center font-bold text-papan underline">
                Coba demo siswa — Fotosintesis
              </Link>
              <Link href="/cara-kerja" className="inline-flex min-h-11 items-center gap-1.5 font-bold text-papan-600 hover:underline">
                Lihat cara kerjanya
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
          </div>
          <HeroDemo />
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
