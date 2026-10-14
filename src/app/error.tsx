"use client";

import { Button, Logo } from "@/components/ui";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const missingDb = error.message?.includes("DATABASE_URL");
  return (
    <main id="isi" className="mx-auto flex min-h-dvh max-w-lg flex-col items-start justify-center gap-4 px-6">
      <Logo />
      <h1 className="font-display text-3xl font-extrabold text-papan">Ada yang tidak beres</h1>
      <p className="text-tinta-2">
        {missingDb
          ? "Database belum tersambung. Isi DATABASE_URL di environment variables lalu deploy ulang. Cek status di /api/status."
          : "Halaman gagal dimuat. Coba lagi; kalau masih gagal, buka /api/status untuk melihat penyebabnya."}
      </p>
      <Button onClick={reset}>Coba lagi</Button>
    </main>
  );
}
