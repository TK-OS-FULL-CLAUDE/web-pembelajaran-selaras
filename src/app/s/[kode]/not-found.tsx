import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
export default function NotFound() {
  return <div className="flex min-h-dvh flex-col">
    <SiteHeader />
    <main id="isi" className="latar-buku flex-1">
      <div className="mx-auto max-w-xl px-5 py-16">
        <h1 className="font-display text-3xl font-extrabold">Materi belum tersedia</h1>
        <p className="my-4 text-tinta-2">Periksa kode dari guru. Materi mungkin belum diterbitkan atau sudah ditarik.</p>
        <Link href="/s" className="inline-flex min-h-11 items-center font-bold text-papan underline">Masukkan kode lain</Link>
      </div>
    </main>
    <SiteFooter compact />
  </div>;
}
