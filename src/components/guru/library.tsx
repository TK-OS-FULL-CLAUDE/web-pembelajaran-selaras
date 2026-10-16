"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { LessonSummary } from "@/lib/data";
import { api } from "@/lib/client";
import { Badge, Button, Field, Input, Select, Notice } from "../ui";
export function Library({ lessons, classes }: { lessons: LessonSummary[]; classes: { id: string; name: string }[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [subject, setSubject] = useState("");
  const [grade, setGrade] = useState("");
  const [topic, setTopic] = useState("");
  const [templates, setTemplates] = useState(false);
  const [target, setTarget] = useState(classes[0]?.id ?? "");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const options = (key: "subject" | "grade" | "topic") => [...new Set(lessons.map((l) => l[key]).filter(Boolean))].sort();
  const matches = lessons.filter((l) => (!templates || l.is_template) && (!subject || l.subject === subject) &&
    (!grade || l.grade === grade) && (!topic || l.topic === topic) &&
    [l.title, l.subject, l.topic, l.class_name, l.grade].join(" ").toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  async function reuse(id: string) {
    setBusy(id); setError("");
    try {
      const result = await api<{ id: string }>(`/api/materi/${id}/salin`, { method: "POST", body: { classId: target || null } });
      router.push(`/guru/materi/${result.id}`);
    } catch (e) { setError((e as Error).message); setBusy(null); }
  }
  return <div className="space-y-5">
    <div className="grid gap-4 rounded-2xl surface-card p-5 sm:grid-cols-2 lg:grid-cols-4">
      <Field label="Cari judul atau kata kunci" htmlFor="pustaka-cari"><Input id="pustaka-cari" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari materi…" /></Field>
      {([["Mapel", "subject", subject, setSubject], ["Jenjang / kelas", "grade", grade, setGrade], ["Topik", "topic", topic, setTopic]] as const).map(([label, key, value, setter]) =>
        <Field key={key} label={label} htmlFor={`pustaka-${key}`}><Select id={`pustaka-${key}`} value={value} onChange={(e) => setter(e.target.value)}>
          <option value="">Semua</option>{options(key).map((o) => <option key={o} value={o}>{o}</option>)}
        </Select></Field>)}
      <label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={templates} onChange={(e) => setTemplates(e.target.checked)} />Hanya templat tersimpan</label>
      <Field label="Gunakan salinan untuk kelas" htmlFor="pustaka-tujuan"><Select id="pustaka-tujuan" value={target} onChange={(e) => setTarget(e.target.value)}>
        <option value="">Tanpa kelas</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </Select></Field>
    </div>
    {error && <Notice tone="error">{error}</Notice>}
    <p role="status" className="text-sm text-tinta-2">{matches.length} materi ditemukan. Salinan dibuat sebagai draf baru tanpa membawa rekap siswa.</p>
    {!matches.length && <p className="rounded-2xl surface-card p-6">Belum ada materi yang cocok. Ubah filter atau buat materi baru.</p>}
    <ul className="grid gap-4 md:grid-cols-2">{matches.map((l) => <li key={l.id} className="rounded-2xl surface-card p-5 shadow-kartu">
      <div className="flex flex-wrap gap-2"><Badge>{l.status === "published" ? "Terbit" : "Draf"}</Badge>{l.is_template && <Badge tone="papan">Templat</Badge>}</div>
      <h2 className="mt-3 text-xl font-bold"><Link href={`/guru/materi/${l.id}`} className="hover:underline">{l.title}</Link></h2>
      <p className="mt-2 text-sm text-tinta-2">{[l.subject, l.grade, l.topic, l.class_name].filter(Boolean).join(" · ") || "Kategori belum diisi"}</p>
      <div className="mt-4 flex flex-wrap items-center gap-4"><Button disabled={!!busy} onClick={() => reuse(l.id)}>{busy === l.id ? "Menyalin…" : "Gunakan sebagai materi baru"}</Button>
        <Link href={`/guru/materi/${l.id}`} className="font-bold text-papan underline">Buka editor</Link></div>
    </li>)}</ul>
  </div>;
}
