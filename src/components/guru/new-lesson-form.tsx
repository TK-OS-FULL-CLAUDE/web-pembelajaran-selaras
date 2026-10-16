"use client";

import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";
import type { ImportResult } from "@/lib/impor/types";
import type { LessonFigures } from "@/lib/types";
import { ReaderText } from "../reader-text";
import { Button, Card, Field, Input, Notice, Select, Spinner, Textarea, cx } from "../ui";
import { ImportPanel } from "./import-panel";

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
  const [figures, setFigures] = useState<LessonFigures>({});
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ id: string }>("/api/materi", {
        method: "POST",
        body: { classId: classId || null, title, subject, body, figures },
      });
      // Ada gambar → langsung ke tab Materi supaya deskripsinya dicek; ada teks → ke tab Versi.
      const tab = Object.keys(figures).length ? "materi" : body.trim() ? "versi" : "materi";
      router.push(`/guru/materi/${res.id}?tab=${tab}`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  function onImported(result: ImportResult) {
    setBody((b) => (b.trim() ? `${b.trim()}\n\n${result.text}` : result.text));
    setFigures((f) => ({ ...f, ...result.figures }));
    if (!title && result.title) setTitle(result.title.replace(/^#+\s*/, "").slice(0, 160));
    setPreview(true);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Card className="p-5">
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
      </Card>

      <Card className="p-5">
        <h2 className="font-display text-lg font-extrabold">Isi materi</h2>
        <p className="mt-0.5 text-[14px] text-tinta-2">
          Tempel teks, atau ambil dari foto halaman buku, PDF, atau Word. Gambar dan diagram ikut diambil. Isi bisa
          dilengkapi nanti.
        </p>
        <div className="mt-4">
          <ImportPanel aiOn={aiOn} onImported={onImported} />
        </div>
        <div className="mt-4 flex items-end justify-between gap-3">
          <label htmlFor="isi-materi" className="text-[15px] font-bold">
            Teks materi
          </label>
          {body.trim() && (
            <button
              type="button"
              onClick={() => setPreview((p) => !p)}
              className="text-[14px] font-bold text-papan-600 underline"
            >
              {preview ? "Ubah teks" : "Lihat hasil"}
            </button>
          )}
        </div>
        {preview && body.trim() ? (
          <div
            className="reader mt-2 max-h-[34rem] overflow-y-auto rounded-2xl surface-card px-5 py-5"
            style={{ background: "#fff" }}
          >
            <ReaderText text={body} glossary={[]} figures={figures} />
          </div>
        ) : (
          <Textarea
            id="isi-materi"
            rows={14}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className={cx("mt-2")}
            placeholder={"## Judul bagian\n\nParagraf pertama…\n\n- butir daftar\n\n> Ingat: hal yang penting"}
          />
        )}
        <p className="mt-2 text-[14px] text-tinta-2">
          Format: <code>## </code> judul bagian, <code>- </code> daftar, <code>1. </code> langkah,{" "}
          <code>**tebal**</code>, <code>&gt; Ingat: …</code> kotak catatan. Toolbar lengkap ada di editor setelah
          disimpan.
        </p>
      </Card>

      {error && <Notice tone="error">{error}</Notice>}
      <Button type="submit" size="lg" disabled={busy || !title.trim()}>
        {busy ? <Spinner /> : <ArrowRight className="size-5" aria-hidden />}
        Simpan dan lanjut
      </Button>
    </form>
  );
}
