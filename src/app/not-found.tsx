import { ButtonLink, Logo } from "@/components/ui";

export default function NotFound() {
  return (
    <main id="isi" className="mx-auto flex min-h-dvh max-w-lg flex-col items-start justify-center gap-4 px-6">
      <Logo />
      <h1 className="font-display text-3xl font-extrabold text-tinta">Halaman tidak ditemukan</h1>
      <p className="text-tinta-2">
        Periksa lagi alamatnya. Kalau Anda siswa, minta guru membagikan ulang link atau kode materinya.
      </p>
      <ButtonLink href="/">Ke halaman depan</ButtonLink>
    </main>
  );
}
