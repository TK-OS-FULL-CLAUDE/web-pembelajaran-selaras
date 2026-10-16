// Footer papan hijau; navbar memakai latar putih.
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
      <footer className="site-footer papan-tulis krayon-atas no-print">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-4 text-[14px] sm:px-6">
          <p className="text-kapur/90">{NOTE}</p>
          <Link href="/cara-kerja" className="footer-link px-2 py-2 font-bold">
            Cara kerja Selaras
          </Link>
        </div>
      </footer>
    );
  }
  return (
    <footer className="site-footer papan-tulis krayon-atas no-print">
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
            <h2 className="font-display text-[16px] font-bold uppercase tracking-wider text-emas">
              {col.title}
            </h2>
            <ul className="mt-3 space-y-1">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="footer-link -mx-2 inline-flex min-h-11 items-center px-2 font-bold">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="bg-black/[0.025]">
        <p className="mx-auto max-w-6xl px-4 py-4 text-[14px] text-kapur/90 sm:px-6">{NOTE}</p>
      </div>
    </footer>
  );
}
