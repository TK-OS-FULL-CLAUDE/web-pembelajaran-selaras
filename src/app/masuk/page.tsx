import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";
import { AuthShell } from "@/components/auth-shell";

export const metadata: Metadata = { title: "Masuk" };

export default function MasukPage() {
  return (
    <AuthShell title="Masuk sebagai guru">
      <AuthForm mode="masuk" />
    </AuthShell>
  );
}
