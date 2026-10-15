"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, Input } from "../ui";

export function OpenLesson() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  return <form className="mt-6 space-y-4" onSubmit={(e) => {
    e.preventDefault();
    const clean = code.trim().toUpperCase();
    if (!/^[A-Z0-9]{4,12}$/.test(clean)) { setError("Isi kode 4–12 huruf atau angka dari gurumu."); return; }
    router.push(`/s/${clean}`);
  }}>
    <Field label="Kode materi dari guru" htmlFor="kode-materi">
      <Input id="kode-materi" autoComplete="off" autoCapitalize="characters" spellCheck={false}
        value={code} onChange={(e) => { setCode(e.target.value); setError(""); }} maxLength={12}
        placeholder="Contoh: ABC234" aria-describedby={error ? "kode-error" : undefined} required />
    </Field>
    {error && <p id="kode-error" role="alert" className="text-galat">{error}</p>}
    <Button type="submit" size="lg">Buka materi</Button>
  </form>;
}
