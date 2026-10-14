import Link from "next/link";
import { BookOpenCheck, Camera, ClipboardCheck, QrCode } from "lucide-react";
import { DemoLoginButton } from "@/components/demo-login-button";
import { HeroDemo } from "@/components/hero-demo";
import { ButtonLink, Logo } from "@/components/ui";
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

export default function Home() {
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Logo />
        <nav className="flex items-center gap-1" aria-label="Utama">
          <Link
            href={`/s/${DEMO_SHARE_CODE}`}
            className="hidden rounded-lg px-3 py-2 font-bold text-papan hover:bg-papan-50 sm:block"
          >
            Coba sebagai siswa
          </Link>
          <ButtonLink href="/masuk" variant="secondary" size="sm">
            Masuk guru
          </ButtonLink>
        </nav>
      </header>

      <main id="isi">
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-6 sm:px-6 lg:grid-cols-[1fr_1.1fr] lg:gap-14 lg:pt-12">
          <div>
            <h1 className="font-display text-[2.4rem] font-extrabold leading-[1.08] text-papan sm:text-[3.2rem]">
              Satu materi dari guru, setiap siswa bisa mengikuti.
            </h1>
            <p className="mt-5 max-w-xl text-[18px] text-tinta-2">
              Guru menulis materi sekali. Siswa membukanya di HP dengan cara yang cocok untuknya: kalimat lebih mudah,
              bahasa daerah, huruf besar, kontras tinggi, spasi lega, atau dibacakan.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <DemoLoginButton />
              <ButtonLink href={`/s/${DEMO_SHARE_CODE}`} variant="secondary" size="lg">
                <BookOpenCheck className="size-5" aria-hidden />
                Buka sebagai siswa
              </ButtonLink>
            </div>
            <p className="mt-4 text-[14px] text-tinta-2">
              Akun demo tidak perlu daftar. Semua data di dalamnya fiktif.
            </p>
          </div>
          <HeroDemo />
        </section>

        <section className="border-t border-garis bg-white">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
            <h2 className="font-display text-2xl font-extrabold text-tinta">Cara kerjanya</h2>
            <ol className="mt-8 grid gap-8 md:grid-cols-3">
              {STEPS.map((step, i) => (
                <li key={step.title} className="border-l-4 border-papan-100 pl-5">
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
              <h2 className="font-display text-2xl font-extrabold">Untuk guru</h2>
              <ul className="mt-4 space-y-3 text-[17px]">
                <li>Profil kebutuhan kelas tanpa data pribadi siswa.</li>
                <li>
                  Panduan akomodasi praktis untuk low vision, tuli, disleksia, sulit fokus, dan bahasa ibu daerah.
                </li>
                <li>Draf versi dari AI selalu dicek guru sebelum siswa melihatnya.</li>
                <li>Rekap: cara belajar yang dipilih siswa dan skor kuis per cara belajar.</li>
              </ul>
            </div>
            <div>
              <h2 className="font-display text-2xl font-extrabold">Untuk siswa</h2>
              <ul className="mt-4 space-y-3 text-[17px]">
                <li>Tanpa install dan tanpa akun: cukup pindai QR.</li>
                <li>Memilih sendiri cara belajar, dan bisa menggantinya kapan saja.</li>
                <li>Kata sulit bisa diketuk untuk melihat artinya.</li>
                <li>Kuis satu soal per layar dengan pembahasan.</li>
              </ul>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-garis">
        <div className="mx-auto max-w-6xl px-4 py-6 text-[14px] text-tinta-2 sm:px-6">
          Selaras — prototipe untuk hackathon 2026. Materi demo ditulis tim; data siswa demo fiktif.
        </div>
      </footer>
    </div>
  );
}
