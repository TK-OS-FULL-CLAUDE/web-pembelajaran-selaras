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
import { HeroDemo } from "@/components/hero-demo";
import { IconChip, Logo, buttonClass } from "@/components/ui";
import { Ring, Sparkle, Triangle } from "@/components/hero-decor";
import { DEMO_SHARE_CODE } from "@/lib/demo-content";
import type { ToneKey } from "@/lib/modes";

const STEPS = [
  {
    icon: FileUp,
    tone: "papan" as ToneKey,
    title: "Tulis atau ambil materi",
    text: "Tempel teks, potret halaman buku, atau unggah PDF dan Word. Gambar dan diagram ikut terbawa.",
  },
  {
    icon: ClipboardCheck,
    tone: "biru" as ToneKey,
    title: "Cek versi untuk kelas Anda",
    text: "AI menyiapkan draf teks mudah, ringkasan, Basa Jawa, Basa Sunda, dan deskripsi gambar. Anda membaca dan menyetujuinya.",
  },
  {
    icon: QrCode,
    tone: "ungu" as ToneKey,
    title: "Bagikan satu link",
    text: "Siswa memindai QR, memilih cara belajarnya, lalu mengerjakan kuis. Hasilnya masuk ke rekap Anda.",
  },
];

const MODES: { icon: typeof BookOpen; tone: ToneKey; title: string; text: string }[] = [
  { icon: BookOpen, tone: "papan", title: "Teks mudah", text: "Kalimat pendek, kata sehari-hari." },
  { icon: ScrollText, tone: "biru", title: "Ringkasan", text: "Poin penting untuk yang sulit fokus." },
  { icon: Languages, tone: "ungu", title: "Basa Jawa", text: "Materi dalam bahasa rumah siswa." },
  { icon: Languages, tone: "mawar", title: "Basa Sunda", text: "Lengkap dengan glosarium dua bahasa." },
  { icon: Volume2, tone: "jingga", title: "Dibacakan", text: "Suara dengan sorotan per kalimat." },
  { icon: ALargeSmall, tone: "nila", title: "Huruf besar", text: "Untuk siswa low vision." },
  { icon: Contrast, tone: "abu", title: "Kontras tinggi", text: "Hitam tebal di latar krem." },
  { icon: SpaceIcon, tone: "sian", title: "Spasi lega", text: "Jarak huruf dan baris lebih lebar." },
  { icon: Ruler, tone: "hijau", title: "Garis bantu", text: "Pita baca untuk disleksia." },
];

const NEW = [
  {
    icon: ImageIcon,
    tone: "biru" as ToneKey,
    title: "Gambar buku ikut tampil",
    text: "Diagram dari foto buku, PDF, atau Word dipotong otomatis. Deskripsinya ditulis AI, dicek guru, lalu dibacakan untuk siswa tunanetra. Siswa low vision bisa memperbesar gambar.",
  },
  {
    icon: ListChecks,
    tone: "mawar" as ToneKey,
    title: "Lima jenis soal",
    text: "Pilihan ganda, pilihan ganda kompleks, benar/salah, isian singkat, dan menjodohkan — semuanya bisa dibacakan dan dikerjakan dengan keyboard.",
  },
  {
    icon: BarChart3,
    tone: "hijau" as ToneKey,
    title: "Rekap yang bisa ditindaklanjuti",
    text: "Cara belajar yang dipilih siswa, skor per versi teks, dan soal mana yang paling sulit untuk dibahas ulang.",
  },
];

/** Sorotan penanda di headline: garis stabilo di bagian bawah teks. */
const hlTeal = "rounded-sm px-1 -mx-1 bg-[linear-gradient(transparent_55%,#99f6e4_55%,#99f6e4_92%,transparent_92%)]";
const hlBlue = "rounded-sm px-1 -mx-1 bg-[linear-gradient(transparent_55%,#bfdbfe_55%,#bfdbfe_92%,transparent_92%)]";

export default function Home() {
  return (
    <div className="min-h-dvh">
      <div className="bg-[radial-gradient(50%_60%_at_8%_10%,#fef3c7_0%,rgba(254,243,199,0)_100%),radial-gradient(55%_70%_at_92%_35%,#ccfbf1_0%,rgba(204,251,241,0)_100%),radial-gradient(40%_50%_at_60%_100%,#dbeafe_0%,rgba(219,234,254,0)_100%)]">
        <div className="pita-warna" aria-hidden />
        <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
          <Logo />
          <nav className="flex items-center gap-2 sm:gap-4" aria-label="Utama">
            <Link
              href="/s"
              className="hidden rounded-xl px-3 py-2 font-bold text-papan-600 hover:bg-white/70 sm:inline-flex"
            >
              Buka materi siswa
            </Link>
            <Link href="/masuk" className={buttonClass("primary", "md", "rounded-full px-6")}>
              Masuk guru
            </Link>
          </nav>
        </header>

        <main id="isi">
          <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-6 sm:px-6 lg:grid-cols-[1fr_1.15fr] lg:pt-12">
            <div className="relative">
              <Sparkle className="pointer-events-none absolute -top-2 right-6 hidden w-7 text-[#f59e0b] lg:block" />
              <Triangle className="pointer-events-none absolute bottom-6 right-4 hidden w-7 rotate-12 text-[#ea580c] lg:block" />
              <Ring className="pointer-events-none absolute bottom-28 right-14 hidden w-6 text-[#0d9488] lg:block" />

              <p className="inline-flex items-center gap-2 rounded-full border border-papan/20 bg-white/80 px-3 py-1 text-[14px] font-bold text-papan">
                <span className="size-2 rounded-full bg-papan" aria-hidden />
                Untuk kelas inklusif di Indonesia
              </p>
              <h1 className="mt-4 font-display text-[2.4rem] font-extrabold leading-[1.1] text-tinta sm:text-[3.2rem]">
                <span className={hlTeal}>Satu materi</span> dari guru, setiap <span className={hlBlue}>siswa</span> bisa
                mengikuti.
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
              <p className="mt-4 text-[14px] text-tinta-2">
                Akun demo tidak perlu daftar. Semua data di dalamnya fiktif.
              </p>
              <Link href={`/s/${DEMO_SHARE_CODE}`} className="mt-3 inline-block font-bold text-papan underline">Coba demo siswa — Fotosintesis</Link>
            </div>
            <HeroDemo />
          </section>
        </main>
      </div>

      <section className="border-y border-garis bg-white" aria-labelledby="judul-cara">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <p className="font-bold text-papan">Untuk siswa</p>
          <h2 id="judul-cara" className="mt-1 font-display text-[1.9rem] font-extrabold">
            Satu materi, banyak cara belajar
          </h2>
          <p className="mt-2 max-w-2xl text-tinta-2">
            Siswa memilih sendiri tanpa akun dan tanpa install. Pilihannya diingat di HP mereka dan bisa diganti kapan
            saja.
          </p>
          <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {MODES.map((m) => (
              <li
                key={m.title}
                className="flex items-center gap-4 rounded-2xl border border-garis bg-white p-4 shadow-kartu"
              >
                <IconChip icon={m.icon} tone={m.tone} size="lg" />
                <div>
                  <p className="font-bold">{m.title}</p>
                  <p className="text-[15px] text-tinta-2">{m.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6" aria-labelledby="judul-langkah">
        <p className="font-bold text-papan">Untuk guru</p>
        <h2 id="judul-langkah" className="mt-1 font-display text-[1.9rem] font-extrabold">
          Cara kerjanya
        </h2>
        <ol className="mt-8 grid gap-5 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <li key={step.title} className="relative rounded-2xl border border-garis bg-white p-6 shadow-kartu">
              <div className="flex items-center justify-between">
                <IconChip icon={step.icon} tone={step.tone} size="lg" />
                <span className="font-display text-[2.6rem] font-extrabold leading-none text-slate-200" aria-hidden>
                  {i + 1}
                </span>
              </div>
              <h3 className="mt-4 text-lg font-bold">
                <span className="sr-only">Langkah {i + 1}: </span>
                {step.title}
              </h3>
              <p className="mt-1 text-tinta-2">{step.text}</p>
            </li>
          ))}
        </ol>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {NEW.map((f) => (
            <div key={f.title} className="rounded-2xl border border-garis bg-white p-6 shadow-kartu">
              <IconChip icon={f.icon} tone={f.tone} />
              <h3 className="mt-4 text-lg font-bold">{f.title}</h3>
              <p className="mt-1 text-tinta-2">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-garis bg-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-2">
          {[
            {
              title: "Untuk guru",
              items: [
                "Profil kebutuhan kelas tanpa data pribadi siswa.",
                "Panduan akomodasi praktis untuk low vision, tuli, disleksia, sulit fokus, dan bahasa ibu daerah.",
                "Draf AI (versi teks, deskripsi gambar, soal) selalu dicek guru sebelum siswa melihatnya.",
                "Impor dari foto buku, PDF, dan Word — teks, tabel, dan gambar ikut rapi.",
              ],
            },
            {
              title: "Untuk siswa",
              items: [
                "Tanpa install dan tanpa akun: cukup pindai QR.",
                "Materi tampil rapi seperti buku: judul, kotak catatan, tabel, dan gambar.",
                "Kata sulit bisa diketuk untuk melihat artinya.",
                "Kuis satu soal per layar dengan pembahasan.",
              ],
            },
          ].map((col) => (
            <div key={col.title}>
              <h2 className="font-display text-2xl font-extrabold">{col.title}</h2>
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
      </section>

      <footer className="border-t border-garis">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-[14px] text-tinta-2 sm:px-6">
          <span>Selaras — prototipe untuk hackathon 2026. Materi demo ditulis tim; data siswa demo fiktif.</span>
          <Logo className="scale-75" />
        </div>
      </footer>
    </div>
  );
}
