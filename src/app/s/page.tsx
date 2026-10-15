import Link from "next/link";
import { OpenLesson } from "@/components/siswa/open-lesson";
import { Logo } from "@/components/ui";
import { DEMO_SHARE_CODE } from "@/lib/demo-content";
export const metadata = { title: "Buka materi siswa" };
export default function StudentEntry() {
  return <main id="isi" className="mx-auto max-w-xl px-5 py-12">
    <Link href="/"><Logo /></Link>
    <div className="mt-8 rounded-3xl border border-garis bg-white p-6 shadow-kartu">
      <h1 className="font-display text-3xl font-extrabold">Buka materi siswa</h1>
      <p className="mt-3 text-tinta-2">Tidak perlu akun. Masukkan kode materi atau buka link/QR yang dibagikan gurumu.</p>
      <OpenLesson />
      <p className="mt-6 text-sm text-tinta-2">Belum menerima kode? Minta kode kepada gurumu.</p>
    </div>
    <Link className="mt-6 inline-block font-bold text-papan underline" href={`/s/${DEMO_SHARE_CODE}`}>Coba demo siswa — Fotosintesis</Link>
  </main>;
}
