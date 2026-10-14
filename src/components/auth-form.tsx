"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";
import { DemoLoginButton } from "./demo-login-button";
import { Button, Field, Input, Notice, Spinner } from "./ui";

export function AuthForm({ mode }: { mode: "masuk" | "daftar" }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    try {
      await api(mode === "masuk" ? "/api/auth/masuk" : "/api/auth/daftar", {
        method: "POST",
        body: Object.fromEntries(form.entries()),
      });
      router.push("/guru");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {mode === "masuk" && (
        <div className="rounded-2xl bg-papan-50 p-5">
          <p className="font-bold">Mencoba Selaras untuk penjurian atau latihan?</p>
          <p className="mt-1 text-tinta-2">Akun demo sudah berisi kelas 4B dan materi Fotosintesis.</p>
          <div className="mt-4">
            <DemoLoginButton size="md" />
          </div>
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4" noValidate={false}>
        {mode === "daftar" && (
          <>
            <Field label="Nama" htmlFor="name">
              <Input
                id="name"
                name="name"
                autoComplete="name"
                required
                minLength={2}
                placeholder="Contoh: Rina Kartika"
              />
            </Field>
            <Field label="Sekolah" htmlFor="school" hint="Boleh dikosongkan.">
              <Input id="school" name="school" autoComplete="organization" placeholder="Contoh: SD Negeri 2 Sleman" />
            </Field>
          </>
        )}
        <Field label="Email" htmlFor="email">
          <Input id="email" name="email" type="email" autoComplete="email" required inputMode="email" />
        </Field>
        <Field label="Kata sandi" htmlFor="password" hint={mode === "daftar" ? "Minimal 8 karakter." : undefined}>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete={mode === "masuk" ? "current-password" : "new-password"}
            required
            minLength={mode === "daftar" ? 8 : 1}
          />
        </Field>
        {error && <Notice tone="error">{error}</Notice>}
        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          {busy && <Spinner />}
          {mode === "masuk" ? "Masuk" : "Buat akun"}
        </Button>
      </form>

      <p className="text-center text-tinta-2">
        {mode === "masuk" ? (
          <>
            Belum punya akun?{" "}
            <Link href="/daftar" className="font-bold text-papan-600 underline underline-offset-2">
              Daftar
            </Link>
          </>
        ) : (
          <>
            Sudah punya akun?{" "}
            <Link href="/masuk" className="font-bold text-papan-600 underline underline-offset-2">
              Masuk
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
