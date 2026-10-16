import { BookOpen, ImageIcon, Languages, ListChecks, Volume2 } from "lucide-react";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";
import { IconChip } from "./ui";

const POINTS = [
  { icon: BookOpen, text: "Teks mudah dan ringkasan dari satu materi" },
  { icon: Languages, text: "Versi Basa Jawa dan Basa Sunda" },
  { icon: Volume2, text: "Dibacakan, huruf besar, kontras tinggi" },
  { icon: ImageIcon, text: "Gambar buku dengan deskripsi untuk siswa tunanetra" },
  { icon: ListChecks, text: "Kuis lima jenis soal dan rekap per kelas" },
];

export function AuthShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader showLogin={false} />
      <main
        id="isi"
        className="latar-buku mx-auto grid w-full max-w-6xl flex-1 items-start gap-10 px-4 pb-16 pt-8 sm:px-6 lg:grid-cols-[1fr_28rem]"
      >
        <section className="hidden rounded-[1.75rem] border border-garis bg-white p-8 shadow-kartu lg:block">
          <p className="font-display text-[1.6rem] font-extrabold leading-tight">
            Satu materi dari guru, setiap siswa bisa mengikuti.
          </p>
          <ul className="mt-6 space-y-3">
            {POINTS.map((p) => (
              <li key={p.text} className="flex items-center gap-3 text-[16px]">
                <IconChip icon={p.icon} size="sm" />
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
      <SiteFooter compact />
    </div>
  );
}
