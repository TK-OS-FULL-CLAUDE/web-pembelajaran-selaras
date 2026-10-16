import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ButtonLink } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main id="isi" className="latar-buku flex flex-1 items-center">
        <div className="mx-auto flex max-w-lg flex-col items-start gap-4 px-6 py-16">
          <h1 className="font-display text-3xl font-extrabold text-tinta">Halaman tidak ditemukan</h1>
          <p className="text-tinta-2">
            Periksa lagi alamatnya. Kalau Anda siswa, minta guru membagikan ulang link atau kode materinya.
          </p>
          <ButtonLink href="/">Ke halaman depan</ButtonLink>
        </div>
      </main>
      <SiteFooter compact />
    </div>
  );
}
