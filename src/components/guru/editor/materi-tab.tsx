"use client";

// Tab Materi (Peran 1): menulis materi asli, menandai kata sulit, melihat pratinjau HP siswa,
// dan cek keterbacaan sederhana (tanpa AI).

import { BookA, Gauge, Heading2, Highlighter, List, Smartphone, TriangleAlert } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { NEED_BY_KEY } from "@/lib/accommodations";
import { analyze, containsTerm, LONG_SENTENCE_WORDS, TARGET_AVG_WORDS } from "@/lib/readability";
import type { ClassNeeds } from "@/lib/types";
import { Button, Card, Field, Input, Textarea, cx } from "../../ui";
import { useToast } from "../../toast";
import { PhotoToText } from "../photo-to-text";
import { GlossaryEditor } from "./glossary-editor";
import type { EditableLesson, UpdateLesson } from "./lesson-editor";
import { StudentPreview } from "./student-preview";

type Panel = "kata" | "pratinjau" | "baca";

type Cls = { id: string; name: string; grade: string; needs: ClassNeeds } | null;

/** Rentang baris penuh yang tersentuh seleksi [start, end). */
function lineRange(text: string, start: number, end: number): [number, number] {
  const a = text.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
  const searchFrom = end > start && text[end - 1] === "\n" ? end - 1 : end;
  let b = text.indexOf("\n", searchFrom);
  if (b === -1) b = text.length;
  return [start === 0 ? 0 : a, b];
}

export function MateriTab({
  lesson,
  update,
  aiOn,
  cls,
}: {
  lesson: EditableLesson;
  update: UpdateLesson;
  aiOn: boolean;
  cls: Cls;
}) {
  const toast = useToast();
  const textarea = useRef<HTMLTextAreaElement>(null);
  const [panel, setPanel] = useState<Panel>("kata");
  const stats = useMemo(() => analyze(lesson.body), [lesson.body]);
  const glossaryWarnings = useMemo(
    () =>
      lesson.glossary.map((g) =>
        !g.kata.trim()
          ? null
          : !containsTerm(lesson.body, g.kata)
            ? "Tidak ditemukan di materi, jadi tidak akan digarisbawahi."
            : !g.arti.trim()
              ? "Arti belum diisi."
              : null,
      ),
    [lesson.glossary, lesson.body],
  );
  const warningCount = glossaryWarnings.filter(Boolean).length;

  /** Ubah teks di sekitar seleksi lalu kembalikan kursor ke tempat yang masuk akal. */
  function transformLines(fn: (lines: string[]) => string[]) {
    const el = textarea.current;
    if (!el) return;
    const body = lesson.body;
    const [a, b] = lineRange(body, el.selectionStart, el.selectionEnd);
    const replaced = fn(body.slice(a, b).split("\n")).join("\n");
    update({ body: body.slice(0, a) + replaced + body.slice(b) });
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(a, a + replaced.length);
    });
  }

  const toggleHeading = () =>
    transformLines((lines) => {
      const allHeading = lines.every((l) => /^##\s/.test(l) || !l.trim());
      return lines.map((l) =>
        !l.trim() ? l : allHeading ? l.replace(/^##\s+/, "") : `## ${l.replace(/^(#{1,3}|[-•*])\s+/, "")}`,
      );
    });

  const toggleList = () =>
    transformLines((lines) => {
      const allList = lines.every((l) => /^[-•*]\s/.test(l) || !l.trim());
      return lines.map((l) =>
        !l.trim() ? l : allList ? l.replace(/^[-•*]\s+/, "") : `- ${l.replace(/^(#{1,3}|[-•*])\s+/, "")}`,
      );
    });

  function markDifficultWord() {
    const el = textarea.current;
    if (!el) return;
    const word = lesson.body.slice(el.selectionStart, el.selectionEnd).trim();
    if (!word) {
      toast.error("Blok dulu kata di materi, lalu tekan “Jadikan kata sulit”.");
      return;
    }
    if (word.includes("\n") || word.length > 60) {
      toast.error("Pilih satu kata atau istilah pendek saja.");
      return;
    }
    setPanel("kata");
    const existing = lesson.glossary.findIndex((g) => g.kata.trim().toLowerCase() === word.toLowerCase());
    const index = existing >= 0 ? existing : lesson.glossary.length;
    if (existing < 0) update((l) => ({ glossary: [...l.glossary, { kata: word, arti: "" }] }));
    setTimeout(() => document.getElementById(`glos-arti-${index}`)?.focus(), 60);
  }

  function showSentence(start: number, end: number) {
    const el = textarea.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(start, end);
    // Gulir kira-kira ke posisi kalimat (textarea tidak selalu menggulir sendiri).
    el.scrollTop = Math.max(0, (start / Math.max(1, lesson.body.length)) * el.scrollHeight - el.clientHeight / 2);
  }

  const needs = cls?.needs;
  const needsSimple = !!needs && needs.disleksia + needs.sulitFokus + needs.bahasaDaerah > 0;
  const tooHard = stats.avgWords > TARGET_AVG_WORDS || stats.longSentences.length > 0;

  const panels: { key: Panel; label: string; icon: typeof BookA; badge?: number }[] = [
    { key: "kata", label: "Kata sulit", icon: BookA, badge: warningCount || undefined },
    { key: "pratinjau", label: "Pratinjau HP", icon: Smartphone },
    { key: "baca", label: "Keterbacaan", icon: Gauge, badge: stats.longSentences.length || undefined },
  ];

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_24rem]">
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
          <Field label="Judul" htmlFor="judul">
            <Input id="judul" value={lesson.title} onChange={(e) => update({ title: e.target.value })} />
          </Field>
          <Field label="Mata pelajaran" htmlFor="mapel">
            <Input id="mapel" value={lesson.subject} onChange={(e) => update({ subject: e.target.value })} />
          </Field>
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <label htmlFor="isi-materi" className="text-[15px] font-bold">
              Materi asli
            </label>
            <PhotoToText
              aiOn={aiOn}
              label="Tambah teks dari foto buku"
              onText={({ text }) => update((l) => ({ body: l.body.trim() ? `${l.body.trim()}\n\n${text}` : text }))}
            />
          </div>

          <div
            className="flex flex-wrap gap-1.5 rounded-t-lg border border-b-0 border-batas bg-white p-1.5"
            role="toolbar"
            aria-label="Format materi"
            aria-controls="isi-materi"
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleHeading}
              aria-label="Judul bagian"
              title="Jadikan baris terpilih judul bagian (##)"
            >
              <Heading2 className="size-4" aria-hidden />
              <span className="sm:hidden">Judul</span>
              <span className="hidden sm:inline">Judul bagian</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={toggleList} title="Jadikan baris terpilih daftar (-)">
              <List className="size-4" aria-hidden />
              Daftar
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={markDifficultWord}
              aria-label="Jadikan kata sulit"
              title="Tambahkan kata yang diblok ke glosarium"
            >
              <Highlighter className="size-4" aria-hidden />
              <span className="sm:hidden">Kata sulit</span>
              <span className="hidden sm:inline">Jadikan kata sulit</span>
            </Button>
          </div>
          <Textarea
            id="isi-materi"
            ref={textarea}
            rows={20}
            value={lesson.body}
            onChange={(e) => update({ body: e.target.value })}
            className="-mt-2 rounded-t-none font-sans text-[16px]"
            aria-describedby="isi-bantuan"
          />
          <p id="isi-bantuan" className="text-[14px] text-tinta-2">
            {stats.words} kata, {stats.sentences} kalimat. Baris diawali <code>## </code> menjadi judul bagian,{" "}
            <code>- </code> menjadi daftar, baris kosong memisahkan paragraf. Tersimpan otomatis; Ctrl+S untuk simpan
            sekarang.
          </p>
        </div>
      </div>

      <Card className="h-fit p-4 lg:sticky lg:top-16">
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1" role="group" aria-label="Panel samping">
          {panels.map((p) => (
            <button
              key={p.key}
              type="button"
              aria-pressed={panel === p.key}
              onClick={() => setPanel(p.key)}
              className={cx(
                "relative flex h-14 flex-col items-center justify-center gap-0.5 rounded-lg px-1 text-[13px] font-bold",
                panel === p.key ? "bg-white text-papan shadow-sm" : "text-tinta-2 hover:text-tinta",
              )}
            >
              <p.icon className="size-4 shrink-0" aria-hidden />
              <span>{p.label}</span>
              {p.badge ? (
                <span
                  className="absolute right-1 top-1 min-w-5 rounded-full bg-aksen px-1 text-[11px] leading-5 text-white"
                  aria-label={`${p.badge} catatan`}
                >
                  {p.badge}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        <div className="mt-4">
          {panel === "kata" && (
            <div>
              <p className="mb-3 text-[14px] text-tinta-2">
                Kata ini digarisbawahi di layar siswa dan bisa diketuk. Cara cepat: blok kata di materi, lalu tekan
                “Jadikan kata sulit”.
              </p>
              <GlossaryEditor
                layout="stack"
                idPrefix="glos"
                items={lesson.glossary}
                warnings={glossaryWarnings}
                onChange={(glossary) => update({ glossary })}
              />
            </div>
          )}

          {panel === "pratinjau" && (
            <StudentPreview
              title={lesson.title}
              body={lesson.body}
              glossary={lesson.glossary}
              versions={lesson.versions}
            />
          )}

          {panel === "baca" && (
            <div className="space-y-4">
              <dl className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-kertas p-2">
                  <dt className="text-[12px] text-tinta-2">Rata-rata</dt>
                  <dd className={cx("text-xl font-bold", stats.avgWords > TARGET_AVG_WORDS && "text-aksen")}>
                    {stats.avgWords}
                  </dd>
                  <dd className="text-[12px] text-tinta-2">kata/kalimat</dd>
                </div>
                <div className="rounded-lg bg-kertas p-2">
                  <dt className="text-[12px] text-tinta-2">Kalimat panjang</dt>
                  <dd className={cx("text-xl font-bold", stats.longSentences.length > 0 && "text-aksen")}>
                    {stats.longSentences.length}
                  </dd>
                  <dd className="text-[12px] text-tinta-2">&gt; {LONG_SENTENCE_WORDS} kata</dd>
                </div>
                <div className="rounded-lg bg-kertas p-2">
                  <dt className="text-[12px] text-tinta-2">Paragraf padat</dt>
                  <dd className={cx("text-xl font-bold", stats.longParagraphs > 0 && "text-aksen")}>
                    {stats.longParagraphs}
                  </dd>
                  <dd className="text-[12px] text-tinta-2">&gt; 5 kalimat</dd>
                </div>
              </dl>
              <p className="text-[13px] text-tinta-2">
                Panduan umum bahasa sederhana untuk anak: rata-rata sekitar {TARGET_AVG_WORDS} kata per kalimat atau
                kurang, dan satu gagasan per kalimat.
              </p>

              {stats.longSentences.length > 0 && (
                <div>
                  <p className="text-[14px] font-bold">Kalimat yang bisa dipecah</p>
                  <ul className="mt-2 space-y-2">
                    {stats.longSentences.slice(0, 6).map((s) => (
                      <li key={s.start}>
                        <button
                          type="button"
                          onClick={() => showSentence(s.start, s.end)}
                          className="w-full rounded-lg border border-garis p-2 text-left text-[13px] hover:border-papan"
                        >
                          <span className="font-bold text-aksen">{s.words} kata · </span>
                          {s.text.split(/\s+/).slice(0, 12).join(" ")}…
                          <span className="mt-0.5 block font-bold text-papan-600">Tunjukkan di editor</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {tooHard && needsSimple && (
                <p className="flex gap-2 rounded-lg bg-aksen-50 p-3 text-[14px] text-tinta">
                  <TriangleAlert className="mt-0.5 size-4 shrink-0 text-aksen" aria-hidden />
                  <span>
                    {cls?.name} punya siswa dengan kebutuhan{" "}
                    {(["disleksia", "sulitFokus", "bahasaDaerah"] as const)
                      .filter((k) => needs![k] > 0)
                      .map((k) => NEED_BY_KEY[k].label.toLowerCase())
                      .join(", ")}
                    . Siapkan versi <strong>Teks mudah</strong> di tab Versi.
                  </span>
                </p>
              )}
              {!tooHard && stats.sentences > 0 && (
                <p className="rounded-lg bg-green-50 p-3 text-[14px] text-berhasil">
                  Kalimat sudah cukup pendek untuk sebagian besar siswa.
                </p>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
