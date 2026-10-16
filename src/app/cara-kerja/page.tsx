import type { Metadata } from "next";
import Link from "next/link";
import {
  ALargeSmall,
  BarChart3,
  BookOpen,
  Check,
  ClipboardCheck,
  Contrast,
  FileUp,
  ImageIcon,
  Languages,
  ListChecks,
  QrCode,
  Ruler,
  ScrollText,
  SpaceIcon,
  Volume2,
} from "lucide-react";
import { DemoLoginButton } from "@/components/demo-login-button";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { IconChip, buttonClass } from "@/components/ui";
import { DEMO_SHARE_CODE } from "@/lib/demo-content";

export const metadata: Metadata = { title: "Cara kerja" };

const STEPS = [
  {
    icon: FileUp,
    title: "Tulis atau ambil materi",
    text: "Tempel teks, potret halaman buku, atau unggah PDF dan Word. Gambar dan diagram ikut terbawa.",
  },
  {
    icon: ClipboardCheck,
    title: "Cek versi untuk kelas Anda",
    text: "AI menyiapkan draf teks mudah, ringkasan, Basa Jawa, Basa Sunda, dan deskripsi gambar. Anda membaca dan menyetujuinya.",
  },
  {
    icon: QrCode,
    title: "Bagikan satu link",
    text: "Siswa memindai QR, memilih cara belajarnya, lalu mengerjakan kuis. Hasilnya masuk ke rekap Anda.",
  },
];

const MODES = [
  { icon: BookOpen, title: "Teks mudah", text: "Kalimat pendek, kata sehari-hari." },
  { icon: ScrollText, title: "Ringkasan", text: "Poin penting untuk yang sulit fokus." },
  { icon: Languages, title: "Basa Jawa", text: "Materi dalam bahasa rumah siswa." },
  { icon: Languages, title: "Basa Sunda", text: "Lengkap dengan glosarium dua bahasa." },
  { icon: Volume2, title: "Dibacakan", text: "Suara dengan sorotan per kalimat." },
  { icon: ALargeSmall, title: "Huruf besar", text: "Untuk siswa low vision." },
  { icon: Contrast, title: "Kontras tinggi", text: "Hitam tebal di latar krem." },
  { icon: SpaceIcon, title: "Spasi lega", text: "Jarak huruf dan baris lebih lebar." },
  { icon: Ruler, title: "Garis bantu", text: "Pita baca untuk disleksia." },
];

const FEATURES = [
  {
    icon: ImageIcon,
    title: "Gambar buku ikut tampil",
    text: "Diagram dari foto buku, PDF, atau Word dipotong otomatis. Deskripsinya ditulis AI, dicek guru, lalu dibacakan untuk siswa tunanetra. Siswa low vision bisa memperbesar gambar.",
  },
  {
    icon: ListChecks,
    title: "Lima jenis soal",
    text: "Pilihan ganda, pilihan ganda kompleks, benar/salah, isian singkat, dan menjodohkan — semuanya bisa dibacakan dan dikerjakan dengan keyboard.",
  },
  {
    icon: BarChart3,
    title: "Rekap yang bisa ditindaklanjuti",
    text: "Cara belajar yang dipilih siswa, skor per versi teks, bagian yang belum dipahami, dan soal yang paling sulit untuk dibahas ulang.",
  },
];

const LISTS = [
  {
    title: "Yang didapat guru",
    items: [
      "Profil kebutuhan kelas tanpa data pribadi siswa.",
      "Panduan akomodasi praktis untuk low vision, tuli, disleksia, sulit fokus, dan bahasa ibu daerah.",
      "Draf AI (versi teks, deskripsi gambar, soal) selalu dicek guru sebelum siswa melihatnya.",
      "Satu materi bisa dibagikan ke beberapa kelas, dengan rekap per kelas.",
    ],
  },
  {
    title: "Yang didapat siswa",
    items: [
      "Tanpa install dan tanpa akun: cukup pindai QR.",
      "Materi tampil rapi seperti buku: judul, kotak catatan, tabel, dan gambar.",
      "Kata sulit bisa diketuk untuk melihat artinya.",
      "Kuis satu soal per layar dengan pembahasan, dan tombol “Aku belum paham”.",
    ],
  },
];

const JUMP = [
  { href: "#langkah", label: "Langkah guru" },
  { href: "#cara-belajar", label: "Cara belajar siswa" },
  { href: "#fitur", label: "Fitur" },
];

export default function CaraKerjaPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader current="cara-kerja" />
      <main id="isi" className="flex-1">
        <section className="latar-buku border-b border-garis">
          <div className="mx-auto max-w-6xl px-4 pb-10 pt-10 sm:px-6 sm:pt-14">
            <p className="font-bold text-papan">Cara kerja</p>
            <h1 className="mt-1 max-w-3xl font-display text-[2.1rem] font-extrabold leading-tight sm:text-[2.7rem]">
              Dari satu materi guru ke banyak cara belajar siswa
            </h1>
            <p className="mt-3 max-w-2xl text-[18px] text-tinta-2">
              Guru menyiapkan materi sekali, memeriksa versi yang dibuat AI, lalu membagikan satu link. Setiap siswa
              memilih cara membaca yang paling nyaman untuknya.
            </p>
            <nav aria-label="Di halaman ini" className="mt-6 flex flex-wrap gap-2">
              {JUMP.map((j) => (
                <a
                  key={j.href}
                  href={j.href}
                  className="inline-flex min-h-11 items-center rounded-full border border-papan/30 bg-white px-4 font-bold text-papan hover:bg-papan-50"
                >
                  {j.label}
                </a>
              ))}
            </nav>
          </div>
        </section>

        <section id="langkah" aria-labelledby="judul-langkah" className="scroll-mt-4">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
            <p className="font-bold text-papan">Untuk guru</p>
            <h2 id="judul-langkah" className="mt-1 font-display text-[1.8rem] font-extrabold">
              Tiga langkah
            </h2>
            <ol className="mt-8 grid gap-6 md:grid-cols-3">
              {STEPS.map((step, i) => (
                <li key={step.title} className="relative surface-card rounded-xl p-6">
                  <div className="flex items-center gap-3">
                    <span
                      className="papan-tulis flex size-11 shrink-0 items-center justify-center rounded-full font-display text-[1.2rem] font-extrabold"
                      aria-hidden
                    >
                      {i + 1}
                    </span>
                    <IconChip icon={step.icon} />
                  </div>
                  <h3 className="mt-4 text-lg font-bold">
                    <span className="sr-only">Langkah {i + 1}: </span>
                    {step.title}
                  </h3>
                  <p className="mt-1 text-tinta-2">{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="cara-belajar" aria-labelledby="judul-cara" className="scroll-mt-4 border-y border-garis bg-white">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
            <p className="font-bold text-papan">Untuk siswa</p>
            <h2 id="judul-cara" className="mt-1 font-display text-[1.8rem] font-extrabold">
              Satu materi, banyak cara belajar
            </h2>
            <p className="mt-2 max-w-2xl text-tinta-2">
              Siswa memilih sendiri tanpa akun dan tanpa install. Pilihannya diingat di HP mereka dan bisa diganti
              kapan saja.
            </p>
            <ul className="mt-8 grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
              {MODES.map((m) => (
                <li key={m.title} className="flex items-start gap-3">
                  <IconChip icon={m.icon} size="sm" className="mt-0.5" />
                  <div>
                    <p className="font-bold">{m.title}</p>
                    <p className="text-[15px] text-tinta-2">{m.text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="fitur" aria-labelledby="judul-fitur" className="scroll-mt-4">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
            <p className="font-bold text-papan">Fitur</p>
            <h2 id="judul-fitur" className="mt-1 font-display text-[1.8rem] font-extrabold">
              Yang membuat kelas lebih mudah diikuti
            </h2>
            <div className="mt-8 grid gap-6 md:grid-cols-3">
              {FEATURES.map((f) => (
                <div key={f.title} className="surface-card rounded-xl p-6">
                  <IconChip icon={f.icon} />
                  <h3 className="mt-4 text-lg font-bold">{f.title}</h3>
                  <p className="mt-1 text-tinta-2">{f.text}</p>
                </div>
              ))}
            </div>
            <div className="mt-12 grid gap-10 md:grid-cols-2">
              {LISTS.map((col) => (
                <div key={col.title}>
                  <h3 className="font-display text-xl font-extrabold">{col.title}</h3>
                  <ul className="mt-4 space-y-3 text-[17px]">
                    {col.items.map((item) => (
                      <li key={item} className="flex gap-3">
                        <span
                          className="mt-1 flex size-6 shrink-0 items-center justify-center rounded-full bg-papan-100 text-papan"
                          aria-hidden
                        >
                          <Check className="size-4" />
                        </span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section aria-labelledby="judul-coba" className="border-t border-garis bg-papan-50">
          <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-12 sm:px-6 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 id="judul-coba" className="font-display text-[1.6rem] font-extrabold">
                Coba sendiri sekarang
              </h2>
              <p className="mt-1 text-tinta-2">Akun demo tidak perlu daftar. Semua data di dalamnya fiktif.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="[&_button]:rounded-full">
                <DemoLoginButton />
              </div>
              <Link href={`/s/${DEMO_SHARE_CODE}`} className={buttonClass("secondary", "lg", "rounded-full")}>
                <BookOpen className="size-5 text-papan" aria-hidden />
                Coba sebagai siswa
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
