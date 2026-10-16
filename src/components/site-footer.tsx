// Footer: papan tulis dengan pita krayon di atasnya. Versi ringkas dipakai di ruang guru dan halaman masuk.
import Link from "next/link";
import { Logo } from "./ui";

const NOTE = "Selaras — prototipe untuk Joints Hackathon UGM 2026. Materi demo ditulis tim; data siswa demo fiktif.";

const COLUMNS = [
  {
    title: "Selaras",
    links: [
      { href: "/cara-kerja", label: "Cara kerja" },
      { href: "/cara-kerja#cara-belajar", label: "Cara belajar siswa" },
      { href: "/cara-kerja#fitur", label: "Fitur untuk guru" },
    ],
  },
  {
    title: "Mulai",
    links: [
      { href: "/s", label: "Buka materi siswa" },
      { href: "/masuk", label: "Masuk guru" },
      { href: "/daftar", label: "Buat akun guru" },
    ],
  },
];

export function SiteFooter({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <footer className="papan-tulis krayon-atas no-print">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-4 text-[14px] sm:px-6">
          <p className="text-kapur/85">{NOTE}</p>
          <Link href="/cara-kerja" className="tautan-kapur px-2 py-2 font-bold">
            Cara kerja Selaras
          </Link>
        </div>
      </footer>
    );
  }
  return (
    <footer className="papan-tulis krayon-atas no-print">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.5fr_1fr_1fr]">
        <div>
          <Logo light />
          <p className="mt-4 max-w-sm text-[16px] text-kapur/90">
            Satu materi dari guru, setiap siswa bisa mengikuti. Untuk kelas inklusif di Indonesia: teks mudah, bahasa
            daerah, huruf besar, kontras tinggi, dan dibacakan.
          </p>
        </div>
        {COLUMNS.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <h2 className="font-display text-[14px] font-extrabold uppercase tracking-[0.12em] text-emas">
              {col.title}
            </h2>
            <ul className="mt-3 space-y-1">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="tautan-kapur -mx-2 inline-flex min-h-11 items-center px-2 font-bold">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto max-w-6xl px-4 py-4 text-[14px] text-kapur/85 sm:px-6">{NOTE}</p>
      </div>
    </footer>
  );
}
