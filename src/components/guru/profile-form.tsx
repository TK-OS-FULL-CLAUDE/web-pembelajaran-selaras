"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";
import { Button, ButtonLink, Card, Field, Input, Notice, Spinner } from "../ui";
import { useToast } from "../toast";

export function ProfileForm({
  email,
  name,
  school,
  isNew,
}: {
  email: string;
  name: string;
  school: string;
  isNew: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    try {
      await api("/api/auth/profil", { method: "PATCH", body: Object.fromEntries(form.entries()) });
      toast.ok("Profil tersimpan.");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="mt-6 p-6">
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Email" htmlFor="email" hint="Email tidak bisa diubah.">
          <Input id="email" value={email} readOnly disabled />
        </Field>
        <Field label="Nama" htmlFor="name" hint="Tampil di halaman materi siswa, mis. Bu Rina.">
          <Input id="name" name="name" defaultValue={name} required minLength={2} maxLength={100} autoComplete="name" />
        </Field>
        <Field label="Sekolah" htmlFor="school" hint="Boleh dikosongkan.">
          <Input
            id="school"
            name="school"
            defaultValue={school}
            maxLength={150}
            autoComplete="organization"
            placeholder="Contoh: SD Negeri 2 Sleman"
            autoFocus={isNew}
          />
        </Field>
        {error && <Notice tone="error">{error}</Notice>}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={busy}>
            {busy && <Spinner />}
            Simpan profil
          </Button>
          <ButtonLink href="/guru" variant="ghost">
            Ke beranda guru
          </ButtonLink>
        </div>
      </form>
    </Card>
  );
}

/** Buat kata sandi (akun Google) atau ganti kata sandi, supaya bisa masuk dengan email dan kata sandi. */
export function PasswordForm({ hasPassword, hasGoogle }: { hasPassword: boolean; hasGoogle: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    const password = String(form.get("password") ?? "");
    if (password !== String(form.get("confirm") ?? "")) {
      setError("Kedua kata sandi baru belum sama.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api("/api/auth/kata-sandi", {
        method: "POST",
        body: { current: String(form.get("current") ?? ""), password },
      });
      toast.ok(hasPassword ? "Kata sandi diganti." : "Kata sandi dibuat. Sekarang Anda bisa masuk dengan email dan kata sandi.");
      formEl.reset();
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="mt-6 p-6">
      <h2 className="font-display text-lg font-bold">{hasPassword ? "Ganti kata sandi" : "Buat kata sandi"}</h2>
      <p className="mt-1 text-tinta-2">
        {hasPassword
          ? hasGoogle
            ? "Anda bisa masuk dengan Google atau dengan email dan kata sandi."
            : "Masukkan kata sandi lama, lalu kata sandi baru."
          : "Akun ini dibuat dengan Google. Buat kata sandi supaya bisa masuk juga dengan email dan kata sandi. Boleh dilewati."}
      </p>
      <form onSubmit={onSubmit} className="mt-4 space-y-4">
        {hasPassword && (
          <Field label="Kata sandi lama" htmlFor="current">
            <Input id="current" name="current" type="password" autoComplete="current-password" required />
          </Field>
        )}
        <Field label="Kata sandi baru" htmlFor="password" hint="Minimal 8 karakter.">
          <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
        </Field>
        <Field label="Ulangi kata sandi baru" htmlFor="confirm">
          <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required minLength={8} />
        </Field>
        {error && <Notice tone="error">{error}</Notice>}
        <Button type="submit" variant="secondary" disabled={busy}>
          {busy && <Spinner />}
          {hasPassword ? "Ganti kata sandi" : "Buat kata sandi"}
        </Button>
      </form>
    </Card>
  );
}
