import Link from "next/link";
import { BookOpen, ImageIcon, Languages, ListChecks, Volume2 } from "lucide-react";
import { IconChip, Logo } from "./ui";

const POINTS = [
  { icon: BookOpen, tone: "papan" as const, text: "Teks mudah dan ringkasan dari satu materi" },
  { icon: Languages, tone: "ungu" as const, text: "Versi Basa Jawa dan Basa Sunda" },
  { icon: Volume2, tone: "jingga" as const, text: "Dibacakan, huruf besar, kontras tinggi" },
  { icon: ImageIcon, tone: "biru" as const, text: "Gambar buku dengan deskripsi untuk siswa tunanetra" },
  { icon: ListChecks, tone: "mawar" as const, text: "Kuis lima jenis soal dan rekap per cara belajar" },
];

export function AuthShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <div className="pita-warna" aria-hidden />
      <header className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6">
        <Link href="/" aria-label="Selaras, ke halaman depan" className="inline-block rounded-xl">
          <Logo />
        </Link>
      </header>
      <main
        id="isi"
        className="mx-auto grid w-full max-w-6xl flex-1 items-start gap-10 px-4 pb-16 pt-4 sm:px-6 lg:grid-cols-[1fr_28rem]"
      >
        <section className="latar-titik hidden rounded-[1.75rem] border border-garis bg-white p-8 shadow-kartu lg:block">
          <p className="font-display text-[1.6rem] font-extrabold leading-tight">
            Satu materi dari guru, <span className="text-papan">setiap siswa</span> bisa mengikuti.
          </p>
          <ul className="mt-6 space-y-3">
            {POINTS.map((p) => (
              <li key={p.text} className="flex items-center gap-3 text-[16px]">
                <IconChip icon={p.icon} tone={p.tone} size="sm" />
                {p.text}
              </li>
            ))}
          </ul>
        </section>
        <div className="rounded-[1.75rem] border border-garis bg-white p-6 shadow-kartu sm:p-8">
          <h1 className="mb-6 font-display text-[1.9rem] font-extrabold">{title}</h1>
          {children}
        </div>
      </main>
    </div>
  );
}
