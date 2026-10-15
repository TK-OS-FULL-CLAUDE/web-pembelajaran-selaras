import Link from "next/link";
export default function NotFound() {
  return <main id="isi" className="mx-auto max-w-xl px-5 py-16">
    <h1 className="text-3xl font-bold">Materi belum tersedia</h1>
    <p className="my-4">Periksa kode dari guru. Materi mungkin belum diterbitkan atau sudah ditarik.</p>
    <Link href="/s" className="font-bold text-papan underline">Masukkan kode lain</Link>
  </main>;
}
