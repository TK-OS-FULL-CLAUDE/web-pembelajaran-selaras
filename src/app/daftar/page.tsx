import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";
import { AuthShell } from "@/components/auth-shell";

export const metadata: Metadata = { title: "Daftar" };

export default function DaftarPage() {
  return (
    <AuthShell title="Buat akun guru">
      <AuthForm mode="daftar" />
    </AuthShell>
  );
}
