import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";
import { AuthShell } from "@/components/auth-shell";
import { googleEnabled } from "@/lib/google-auth";

export const metadata: Metadata = { title: "Daftar" };

// Dibaca saat diminta (bukan saat build) supaya tombol Google muncul begitu kuncinya diisi.
export const dynamic = "force-dynamic";

export default function DaftarPage() {
  return (
    <AuthShell title="Buat akun guru">
      <AuthForm mode="daftar" google={googleEnabled()} />
    </AuthShell>
  );
}
