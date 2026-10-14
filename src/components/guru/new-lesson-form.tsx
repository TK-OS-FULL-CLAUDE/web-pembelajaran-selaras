"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";
import { Button, Field, Input, Notice, Select, Spinner, Textarea } from "../ui";
import { PhotoToText } from "./photo-to-text";

export function NewLessonForm({
  classes,
  defaultClassId,
  aiOn,
}: {
  classes: { id: string; name: string }[];
  defaultClassId: string | null;
  aiOn: boolean;
}) {
  const router = useRouter();
  const [classId, setClassId] = useState(defaultClassId ?? classes[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ id: string }>("/api/materi", {
        method: "POST",
        body: { classId: classId || null, title, subject, body },
      });
      router.push(`/guru/materi/${res.id}?tab=${body.trim() ? "versi" : "materi"}`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Kelas" htmlFor="kelas">
          <Select id="kelas" value={classId} onChange={(e) => setClassId(e.target.value)}>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
            <option value="">Tanpa kelas</option>
          </Select>
        </Field>
        <Field label="Judul materi" htmlFor="judul" className="sm:col-span-2">
          <Input
            id="judul"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="Contoh: Daur Air"
          />
        </Field>
        <Field label="Mata pelajaran" htmlFor="mapel">
          <Input id="mapel" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Contoh: IPAS" />
        </Field>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <label htmlFor="isi-materi" className="text-[15px] font-bold">
            Isi materi
          </label>
          <PhotoToText
            aiOn={aiOn}
            onText={({ text, title: guess }) => {
              setBody((b) => (b.trim() ? `${b.trim()}\n\n${text}` : text));
              if (!title && guess) setTitle(guess.replace(/^#+\s*/, ""));
            }}
          />
        </div>
        <Textarea
          id="isi-materi"
          rows={14}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={
            "Tempel teks materi di sini, atau ambil dari foto buku.\n\n## Judul bagian\nParagraf pertama…\n\n- butir daftar"
          }
        />
        <p className="text-[14px] text-tinta-2">
          Format sederhana: baris diawali <code>## </code> menjadi judul bagian, <code>- </code> menjadi daftar, baris
          kosong memisahkan paragraf. Isi bisa dilengkapi nanti.
        </p>
      </div>

      {error && <Notice tone="error">{error}</Notice>}
      <Button type="submit" size="lg" disabled={busy || !title.trim()}>
        {busy && <Spinner />}
        Simpan dan lanjut
      </Button>
    </form>
  );
}
