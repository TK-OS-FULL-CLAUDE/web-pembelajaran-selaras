import Link from "next/link";
import { BookOpen, Camera, ClipboardCheck, QrCode } from "lucide-react";
import { DemoLoginButton } from "@/components/demo-login-button";
import { HeroDemo } from "@/components/hero-demo";
import { Logo } from "@/components/ui";
import { Paperclip, Ring, Sparkle, Triangle } from "@/components/hero-decor";
import { DEMO_SHARE_CODE } from "@/lib/demo-content";

const STEPS = [
  {
    icon: Camera,
    title: "Tulis atau potret materi",
    text: "Tempel teks, atau potret halaman buku dan biarkan Selaras menyalinnya.",
  },
  {
    icon: ClipboardCheck,
    title: "Cek versi untuk kelas Anda",
    text: "AI menyiapkan draf teks mudah dan bahasa daerah sesuai profil kelas. Anda membaca dan menyetujuinya.",
  },
  {
    icon: QrCode,
    title: "Bagikan satu link",
    text: "Siswa memindai QR, memilih cara belajarnya, lalu mengerjakan kuis. Hasilnya masuk ke rekap Anda.",
  },
];

/** Sorotan penanda di headline: garis stabilo hijau di bagian bawah teks. */
const hlMint =
  "rounded-sm px-1 -mx-1 bg-[linear-gradient(transparent_52%,#a9e0bb_52%,#a9e0bb_94%,transparent_94%)]";
const hlSky =
  "rounded-sm px-1 -mx-1 bg-[linear-gradient(transparent_52%,#a8dcf0_52%,#a8dcf0_94%,transparent_94%)]";
const kuning = "rounded px-1 bg-[linear-gradient(transparent_45%,#ffe08a_45%)]";
const peach = "rounded px-1 bg-[linear-gradient(transparent_45%,#ffcfb0_45%)]";
const mint = "rounded px-1 bg-[linear-gradient(transparent_45%,#bfe9cb_45%)]";
const sky = "rounded px-1 bg-[linear-gradient(transparent_45%,#bde4f5_45%)]";
const lilac = "rounded px-1 bg-[linear-gradient(transparent_45%,#ddd3fa_45%)]";

export default function Home() {
  return (
    <div className="min-h-dvh">
      {/* Header + hero berbagi satu latar: krem di kiri, mint-biru muda di kanan */}
      <div className="bg-[#fff9e8] bg-[radial-gradient(45%_55%_at_6%_8%,#ffe8a3_0%,rgba(255,232,163,0)_100%),radial-gradient(40%_45%_at_30%_95%,#d3f0dc_0%,rgba(211,240,220,0)_100%),radial-gradient(60%_75%_at_88%_40%,#b9e6f2_0%,#d6f1e6_45%,rgba(255,249,232,0)_78%)]">
        <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
          <Logo />
          <nav className="flex items-center gap-2 sm:gap-5" aria-label="Utama">
            <Link
              href={`/s/${DEMO_SHARE_CODE}`}
              className="rounded-lg px-2 py-2 font-bold text-papan hover:underline"
            >
              Coba sebagai siswa
            </Link>
            <Link
              href="/masuk"
              className="inline-flex h-11 items-center rounded-full bg-papan px-6 font-bold text-white transition-opacity hover:opacity-90"
            >
              Masuk guru
            </Link>
          </nav>
        </header>

        <main id="isi">
          <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-6 sm:px-6 lg:grid-cols-[1fr_1.15fr] lg:gap-10 lg:pt-12">
            <div className="relative">
              <Sparkle className="pointer-events-none absolute -top-2 right-6 hidden w-7 text-[#f4b84b] lg:block" />
              <Triangle className="pointer-events-none absolute bottom-6 right-4 hidden w-7 rotate-12 text-[#ee8f33] lg:block" />
              <Ring className="pointer-events-none absolute bottom-28 right-14 hidden w-6 text-[#7bb095] lg:block" />

              {/* 
                PERUBAHAN 1: Menghapus dekorasi garis bergelombang di bawah kata "mengikuti." 
                Teks sekarang tampil bersih.
              */}
              <h1 className="font-display text-[2.4rem] font-extrabold leading-[1.1] text-papan sm:text-[3.2rem]">
                <span className={hlMint}>Satu materi</span> dari guru, setiap{" "}
                <span className={hlSky}>siswa</span> bisa mengikuti.
              </h1>

              {/* 
                PERUBAHAN 2: Menghapus semua highlight (stabilo) warna-warni pada deskripsi. 
                Teks kembali menjadi paragraf standar berwarna abu-abu/tinta.
              */}
              <p className="mt-5 max-w-xl text-[18px] text-tinta-2">
                Guru menulis materi sekali. Siswa membukanya di HP dengan cara
                yang cocok untuknya: kalimat lebih mudah, bahasa daerah, huruf
                besar, kontras tinggi, spasi lega, atau dibacakan.
              </p>

              <div className="mt-8 flex flex-col items-start gap-3">
                {/* Bentuk pil untuk tombol demo; ikon panah ada di demo-login-button.tsx */}
                <div className="[&_button]:!rounded-full">
                  <DemoLoginButton />
                </div>
                <Link
                  href={`/s/${DEMO_SHARE_CODE}`}
                  className="inline-flex h-12 items-center gap-2 rounded-full bg-[#d5e3dc] px-6 text-[16px] font-bold text-papan transition-colors hover:bg-[#c6d9cf]"
                >
                  <BookOpen className="size-5" aria-hidden />
                  Buka sebagai siswa
                </Link>
              </div>
              <p className="mt-4 text-[14px] text-tinta-2">
                Akun demo tidak perlu daftar. Semua data di dalamnya fiktif.
              </p>
            </div>
            <HeroDemo />
          </section>
        </main>
      </div>

      {/* ---- Mulai dari sini ke bawah: tidak diubah ---- */}
      <div>
        <section className="border-t border-garis bg-white">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
            <h2 className="font-display text-2xl font-extrabold text-tinta">
              Cara kerjanya
            </h2>
            <ol className="mt-8 grid gap-8 md:grid-cols-3">
              {STEPS.map((step, i) => (
                <li
                  key={step.title}
                  className="border-l-4 border-papan-100 pl-5"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex size-9 items-center justify-center rounded-full bg-papan font-display font-extrabold text-white">
                      {i + 1}
                    </span>
                    <step.icon className="size-6 text-papan" aria-hidden />
                  </div>
                  <h3 className="mt-4 text-lg font-bold">{step.title}</h3>
                  <p className="mt-1 text-tinta-2">{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <div className="grid gap-10 md:grid-cols-2">
            <div>
              <h2 className="font-display text-2xl font-extrabold">
                Untuk guru
              </h2>
              <ul className="mt-4 space-y-3 text-[17px]">
                <li>Profil kebutuhan kelas tanpa data pribadi siswa.</li>
                <li>
                  Panduan akomodasi praktis untuk low vision, tuli, disleksia,
                  sulit fokus, dan bahasa ibu daerah.
                </li>
                <li>
                  Draf versi dari AI selalu dicek guru sebelum siswa melihatnya.
                </li>
                <li>
                  Rekap: cara belajar yang dipilih siswa dan skor kuis per cara
                  belajar.
                </li>
              </ul>
            </div>
            <div>
              <h2 className="font-display text-2xl font-extrabold">
                Untuk siswa
              </h2>
              <ul className="mt-4 space-y-3 text-[17px]">
                <li>Tanpa install dan tanpa akun: cukup pindai QR.</li>
                <li>
                  Memilih sendiri cara belajar, dan bisa menggantinya kapan
                  saja.
                </li>
                <li>Kata sulit bisa diketuk untuk melihat artinya.</li>
                <li>Kuis satu soal per layar dengan pembahasan.</li>
              </ul>
            </div>
          </div>
        </section>
      </div>

      <footer className="border-t border-garis">
        <div className="mx-auto max-w-6xl px-4 py-6 text-[14px] text-tinta-2 sm:px-6">
          Selaras — prototipe untuk hackathon 2026. Materi demo ditulis tim;
          data siswa demo fiktif.
        </div>
      </footer>
    </div>
  );
}
