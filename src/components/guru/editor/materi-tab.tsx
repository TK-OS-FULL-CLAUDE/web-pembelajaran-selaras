"use client";

// Tab Materi (Peran 1): menulis materi asli dengan format kaya (judul, daftar, kotak catatan, tabel, gambar),
// mengambil materi dari foto buku/PDF/Word, menandai kata sulit, mengecek deskripsi gambar,
// melihat pratinjau HP siswa, dan cek keterbacaan sederhana (tanpa AI).

import {
  BookA,
  Bold,
  ChevronDown,
  Eye,
  Gauge,
  Heading2,
  Heading3,
  Highlighter,
  ImageIcon,
  Italic,
  List,
  ListOrdered,
  Minus,
  PenLine,
  Sigma,
  Smartphone,
  Sparkles,
  SquarePen,
  Table2,
  TextQuote,
  TriangleAlert,
  Undo2,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { NEED_BY_KEY } from "@/lib/accommodations";
import type { ImportResult } from "@/lib/impor/types";
import { api } from "@/lib/client";
import { findMath, latexBatches, latexParagraphs, plainMathSpots } from "@/lib/latex";
import { isMathSubject } from "@/lib/matematika";
import { analyze, containsTerm, LONG_SENTENCE_WORDS, TARGET_AVG_WORDS } from "@/lib/readability";
import { figureIds } from "@/lib/text";
import type { ClassNeeds } from "@/lib/types";
import { ReaderText } from "../../reader-text";
import { Tex } from "../../tex";
import { Button, Card, Field, Input, Spinner, Textarea, cx } from "../../ui";
import { useToast } from "../../toast";
import { ImportPanel } from "../import-panel";
import { FiguresPanel } from "./figures-panel";
import { GlossaryEditor } from "./glossary-editor";
import type { EditableLesson, UpdateLesson } from "./lesson-editor";
import { StudentPreview } from "./student-preview";

type Panel = "kata" | "gambar" | "pratinjau" | "baca";

type Cls = { id: string; name: string; grade: string; needs: ClassNeeds } | null;

/** Rentang baris penuh yang tersentuh seleksi [start, end). */
function lineRange(text: string, start: number, end: number): [number, number] {
  const a = text.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
  const searchFrom = end > start && text[end - 1] === "\n" ? end - 1 : end;
  let b = text.indexOf("\n", searchFrom);
  if (b === -1) b = text.length;
  return [start === 0 ? 0 : a, b];
}

const PREFIX = /^(#{1,4}|[-•*]|\d{1,3}[.)]|>)\s+/;

/** Palet rumus: `make` menerima teks yang diblok guru dan memberi [LaTeX, bagian yang dipilih sesudahnya]. */
const MATH_SNIPPETS: { label: string; preview: string; make: (sel: string) => [string, string?] }[] = [
  {
    label: "Pecahan",
    preview: "\\frac{a}{b}",
    make: (sel) => {
      const m = sel.match(/^\s*([^/]+?)\s*\/\s*([^/]+?)\s*$/);
      return m ? [`\\frac{${m[1]}}{${m[2]}}`] : [`\\frac{${sel || "a"}}{b}`, sel ? "b" : "a"];
    },
  },
  { label: "Akar", preview: "\\sqrt{x}", make: (sel) => [`\\sqrt{${sel || "x"}}`, sel ? undefined : "x"] },
  { label: "Pangkat", preview: "x^{n}", make: (sel) => [`${sel || "x"}^{2}`, "2"] },
  { label: "Kali", preview: "\\times", make: () => [" \\times "] },
  { label: "Bagi", preview: "\\div", make: () => [" \\div "] },
  { label: "Kurang dari atau sama dengan", preview: "\\le", make: () => [" \\le "] },
  { label: "Lebih dari atau sama dengan", preview: "\\ge", make: () => [" \\ge "] },
  { label: "Tidak sama dengan", preview: "\\ne", make: () => [" \\ne "] },
  { label: "Derajat", preview: "90^\\circ", make: (sel) => [`${sel || "90"}^\\circ`] },
  { label: "Pi", preview: "\\pi", make: () => ["\\pi"] },
];

const CALLOUTS = [
  { label: "Ingat", hint: "biru" },
  { label: "Penting", hint: "merah" },
  { label: "Contoh", hint: "hijau" },
  { label: "Tahukah kamu?", hint: "kuning" },
];

export function MateriTab({
  lessonId,
  lesson,
  update,
  aiOn,
  cls,
}: {
  lessonId: string;
  lesson: EditableLesson;
  update: UpdateLesson;
  aiOn: boolean;
  cls: Cls;
}) {
  const toast = useToast();
  const textarea = useRef<HTMLTextAreaElement>(null);
  const [panel, setPanel] = useState<Panel>("kata");
  const [view, setView] = useState<"tulis" | "lihat">("tulis");
  const [calloutOpen, setCalloutOpen] = useState(false);
  const [mathOpen, setMathOpen] = useState(false);
  const [latexBusy, setLatexBusy] = useState(false);
  const [latexUndo, setLatexUndo] = useState<{ before: string; after: string; rejected: number } | null>(null);
  const spots = useMemo(() => plainMathSpots(lesson.body), [lesson.body]);
  const offerLatex = spots > 0 && (isMathSubject(lesson.subject) || spots >= 3);
  // Isi materi terbaru, untuk memeriksa apakah guru mengetik selama AI bekerja.
  const bodyRef = useRef(lesson.body);
  useEffect(() => {
    bodyRef.current = lesson.body;
  }, [lesson.body]);
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
  const figureCount = figureIds(lesson.body).filter(
    (id) => !lesson.figures[id]?.alt?.trim() || !lesson.figures[id]?.altChecked,
  ).length;

  /** Ganti bagian teks lalu pilih kembali bagian yang baru supaya guru melihat hasilnya. */
  function replaceRange(a: number, b: number, text: string, select: [number, number] = [a, a + text.length]) {
    const el = textarea.current;
    const body = lesson.body;
    update({ body: body.slice(0, a) + text + body.slice(b) });
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      el.setSelectionRange(select[0], select[1]);
    });
  }

  function ensureWriteView(): HTMLTextAreaElement | null {
    if (view !== "tulis") {
      setView("tulis");
      toast.error("Pindah ke mode Tulis dulu, lalu pilih teksnya.");
      return null;
    }
    return textarea.current;
  }

  /** Ubah setiap baris yang tersentuh seleksi. */
  function transformLines(fn: (lines: string[]) => string[]) {
    const el = ensureWriteView();
    if (!el) return;
    const [a, b] = lineRange(lesson.body, el.selectionStart, el.selectionEnd);
    replaceRange(a, b, fn(lesson.body.slice(a, b).split("\n")).join("\n"));
  }

  /** Jadikan baris terpilih ber-awalan tertentu, atau lepas bila semuanya sudah begitu. */
  const togglePrefix = (test: RegExp, make: (i: number) => string) =>
    transformLines((lines) => {
      const filled = lines.filter((l) => l.trim());
      const all = filled.length > 0 && filled.every((l) => test.test(l));
      let n = 0;
      return lines.map((l) => (!l.trim() ? l : all ? l.replace(PREFIX, "") : `${make(n++)}${l.replace(PREFIX, "")}`));
    });

  /** Bungkus kata terpilih dengan penanda (**tebal**, ==stabilo==, *miring*), atau lepas bila sudah. */
  function wrap(marker: string, placeholder: string) {
    const el = ensureWriteView();
    if (!el) return;
    const body = lesson.body;
    let a = el.selectionStart;
    let b = el.selectionEnd;
    while (a < b && /\s/.test(body[a])) a++;
    while (b > a && /\s/.test(body[b - 1])) b--;
    const sel = body.slice(a, b);
    const m = marker.length;
    if (sel.length > m * 2 && sel.startsWith(marker) && sel.endsWith(marker)) {
      const inner = sel.slice(m, -m);
      return replaceRange(a, b, inner);
    }
    if (body.slice(a - m, a) === marker && body.slice(b, b + m) === marker) {
      return replaceRange(a - m, b + m, sel);
    }
    const text = sel || placeholder;
    replaceRange(a, b, `${marker}${text}${marker}`, [a + m, a + m + text.length]);
  }

  /** Sisipkan blok (tabel, garis, gambar) sebagai paragraf sendiri setelah baris kursor. */
  function insertBlock(block: string, selectInside?: string) {
    const el = textarea.current;
    const body = lesson.body;
    const pos = el && view === "tulis" ? el.selectionEnd : body.length;
    let end = body.indexOf("\n", pos);
    if (end === -1) end = body.length;
    const before = body.slice(0, end);
    const after = body.slice(end);
    const lead = before.trim() ? (before.endsWith("\n\n") ? "" : before.endsWith("\n") ? "\n" : "\n\n") : "";
    const trail = after.trim() ? (after.startsWith("\n\n") ? "" : "\n") : "";
    const start = before.length + lead.length;
    const sub = selectInside ? block.indexOf(selectInside) : -1;
    if (view !== "tulis") setView("tulis");
    replaceRange(
      end,
      end,
      `${lead}${block}${trail}${after.startsWith("\n") || !after ? "" : "\n"}`,
      sub >= 0 ? [start + sub, start + sub + selectInside!.length] : [start + block.length, start + block.length],
    );
  }

  /** Sisipkan rumus dari palet. Di luar $...$ rumusnya diberi tanda dolar; di dalamnya disisipkan apa adanya. */
  function insertMath(make: (sel: string) => [string, string?]) {
    setMathOpen(false);
    const el = ensureWriteView();
    if (!el) return;
    const body = lesson.body;
    const a = el.selectionStart;
    const b = el.selectionEnd;
    const sel = body.slice(a, b);
    const inside = findMath(body).some((m) => m.start < a && a < m.end);
    const plainSel = !inside && /^\$[^$]+\$$/.test(sel.trim()) ? sel.trim().slice(1, -1) : sel;
    const [tex, pick] = make(plainSel.includes("\n") ? "" : plainSel.trim());
    const core = inside ? tex : tex.trim();
    // Rumus baru yang menempel pada rumus lain diberi spasi, supaya "$a$$b$" tidak terbaca sebagai "$$".
    const lead = !inside && body[a - 1] === "$" ? " " : "";
    const trail = !inside && body[b] === "$" ? " " : "";
    const text = inside ? core : `${lead}$${core}$${trail}`;
    const start = a + (inside ? 0 : lead.length + 1);
    const sub = pick ? core.indexOf(pick) : -1;
    // Kursor tetap di dalam rumus (sebelum "$" penutup) supaya tombol palet berikutnya menambah rumus yang sama.
    replaceRange(a, b, text, sub >= 0 ? [start + sub, start + sub + pick!.length] : [start + core.length, start + core.length]);
  }

  /** Ubah rumus tulisan biasa di `text` ke LaTeX lewat AI, per paragraf (hanya paragraf yang berisi rumus). */
  async function latexForText(text: string) {
    const { parts, todo } = latexParagraphs(text);
    const out = [...parts];
    let changed = 0;
    let rejected = 0;
    for (const batch of latexBatches(parts, todo)) {
      const res = await api<{ texts: string[]; changed: number; rejected: number }>("/api/ai/latex", {
        method: "POST",
        body: { lessonId, texts: batch.map((i) => parts[i]) },
      });
      batch.forEach((i, k) => (out[i] = res.texts[k] ?? parts[i]));
      changed += res.changed;
      rejected += res.rejected;
    }
    return { text: out.join(""), changed, rejected };
  }

  /**
   * Tanpa argumen: seluruh materi (tombol "Ubah rumus ke LaTeX"). Dengan `only`: hanya teks yang baru diimpor
   * dari PDF/Word, dijalankan otomatis setelah impor.
   */
  async function convertLatex(only?: string) {
    const start = bodyRef.current;
    const target = only ?? start;
    setLatexBusy(true);
    try {
      const res = await latexForText(target);
      if (!res.changed) {
        if (!only || res.rejected) {
          toast.error(
            res.rejected
              ? "AI ikut mengubah angka atau kata di bagian yang berisi rumus, jadi hasilnya tidak dipakai. Tekan lagi untuk mencoba ulang, atau ubah dengan tombol Rumus."
              : "Tidak ada rumus yang perlu diubah.",
          );
        }
        return;
      }
      const cur = bodyRef.current;
      const at = cur.lastIndexOf(target);
      if (at < 0 || (!only && cur !== start)) {
        toast.error("Materi berubah saat AI bekerja. Tekan Ubah rumus ke LaTeX lagi.");
        return;
      }
      const after = cur.slice(0, at) + res.text + cur.slice(at + target.length);
      update((l) => (l.body === cur ? { body: after } : {}));
      setLatexUndo({ before: cur, after, rejected: res.rejected });
      setView("lihat");
      toast.ok(
        `${only ? "Rumus dari file" : "Rumus"} sudah ditulis dengan LaTeX${
          res.rejected ? `; ${res.rejected} bagian dibiarkan tulisan biasa karena AI ikut mengubah angka/kata di sana` : ""
        }. Periksa hasilnya di Lihat hasil.`,
      );
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLatexBusy(false);
    }
  }

  function insertCallout(label: string) {
    setCalloutOpen(false);
    const el = ensureWriteView();
    if (!el) return;
    const [a, b] = lineRange(lesson.body, el.selectionStart, el.selectionEnd);
    const sel = lesson.body.slice(a, b).trim();
    if (sel && el.selectionStart !== el.selectionEnd) {
      const lines = sel.split("\n").filter((l) => l.trim());
      const text = [
        `> ${label}: ${lines[0].replace(PREFIX, "")}`,
        ...lines.slice(1).map((l) => `> ${l.replace(/^>\s*/, "")}`),
      ].join("\n");
      replaceRange(a, b, text);
    } else {
      insertBlock(`> ${label}: Tulis isi catatan di sini.`, "Tulis isi catatan di sini.");
    }
  }

  function markDifficultWord() {
    const el = ensureWriteView();
    if (!el) return;
    const word = lesson.body
      .slice(el.selectionStart, el.selectionEnd)
      .replace(/\*\*|==|\*/g, "")
      .trim();
    if (!word) {
      toast.error("Blok dulu kata di materi, lalu tekan “Kata sulit”.");
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
    setView("tulis");
    requestAnimationFrame(() => {
      const el = textarea.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(start, end);
      el.scrollTop = Math.max(0, (start / Math.max(1, lesson.body.length)) * el.scrollHeight - el.clientHeight / 2);
    });
  }

  function onImported(result: ImportResult) {
    update((l) => ({
      body: l.body.trim() ? `${l.body.trim()}\n\n${result.text}` : result.text,
      figures: { ...l.figures, ...result.figures },
      title: (!l.title.trim() || /^tanpa judul$/i.test(l.title.trim())) && result.title ? result.title : l.title,
    }));
    if (Object.keys(result.figures).length) setPanel("gambar");
    setView("lihat");
    // Materi Matematika dari PDF/Word: rumus tulisan biasa langsung diubah ke LaTeX oleh AI (bisa dibatalkan).
    const found = plainMathSpots(result.text);
    if (aiOn && found > 0 && (isMathSubject(lesson.subject) || found >= 3)) void convertLatex(result.text);
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!(e.ctrlKey || e.metaKey)) return;
    const k = e.key.toLowerCase();
    if (k === "b") {
      e.preventDefault();
      wrap("**", "teks tebal");
    } else if (k === "i") {
      e.preventDefault();
      wrap("*", "teks miring");
    }
  };

  const needs = cls?.needs;
  const needsSimple = !!needs && needs.disleksia + needs.sulitFokus + needs.bahasaDaerah > 0;
  const tooHard = stats.avgWords > TARGET_AVG_WORDS || stats.longSentences.length > 0;

  const panels: { key: Panel; label: string; icon: LucideIcon; badge?: number }[] = [
    { key: "kata", label: "Kata sulit", icon: BookA, badge: warningCount || undefined },
    { key: "gambar", label: "Gambar", icon: ImageIcon, badge: figureCount || undefined },
    { key: "pratinjau", label: "HP siswa", icon: Smartphone },
    { key: "baca", label: "Keterbacaan", icon: Gauge, badge: stats.longSentences.length || undefined },
  ];

  const tool = (
    label: string,
    icon: LucideIcon,
    onClick: () => void,
    opts: { title?: string; short?: string } = {},
  ) => {
    const Icon = icon;
    return (
      <button
        type="button"
        onClick={onClick}
        title={opts.title ?? label}
        aria-label={label}
        className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-[14px] font-bold text-tinta-2 transition-colors hover:bg-papan-50 hover:text-papan"
      >
        <Icon className="size-4" aria-hidden />
        {opts.short && <span className="hidden xl:inline">{opts.short}</span>}
      </button>
    );
  };
  const sep = <span className="mx-0.5 h-6 w-px shrink-0 bg-garis" aria-hidden />;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_25rem]">
      <div className="min-w-0 space-y-5">
        <Card className="p-4 sm:p-5">
          <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
            <Field label="Judul" htmlFor="judul">
              <Input id="judul" value={lesson.title} onChange={(e) => update({ title: e.target.value })} />
            </Field>
            <Field label="Mata pelajaran" htmlFor="mapel">
              <Input id="mapel" value={lesson.subject} onChange={(e) => update({ subject: e.target.value })} />
            </Field>
          </div>
          <div className="mt-4 border-t border-garis pt-4">
            <ImportPanel lessonId={lessonId} aiOn={aiOn} onImported={onImported} />
          </div>
        </Card>

        <div>
          <div className="mb-2 flex flex-wrap items-end justify-between gap-3">
            <label htmlFor="isi-materi" className="font-display text-[17px] font-extrabold">
              Materi asli
            </label>
            <div className="flex rounded-xl bg-krem p-1" role="group" aria-label="Tampilan editor">
              {(
                [
                  ["tulis", "Tulis", SquarePen],
                  ["lihat", "Lihat hasil", Eye],
                ] as const
              ).map(([key, label, Icon]) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={view === key}
                  onClick={() => setView(key)}
                  className={cx(
                    "inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-[14px] font-bold",
                    view === key ? "bg-white text-papan shadow-kartu" : "text-tinta-2 hover:text-tinta",
                  )}
                >
                  <Icon className="size-4" aria-hidden />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-batas/70 bg-white shadow-kartu focus-within:border-papan focus-within:ring-4 focus-within:ring-papan/10">
            <div
              className="relative flex items-center gap-0.5 overflow-x-auto border-b border-garis bg-kertas px-1.5 py-1"
              role="toolbar"
              aria-label="Format materi"
              aria-controls="isi-materi"
            >
              {tool("Judul bagian", Heading2, () => togglePrefix(/^##\s/, () => "## "), {
                short: "Judul",
                title: "Judul bagian (##)",
              })}
              {tool("Subjudul", Heading3, () => togglePrefix(/^###\s/, () => "### "), { title: "Subjudul (###)" })}
              {sep}
              {tool("Tebal", Bold, () => wrap("**", "teks tebal"), { title: "Tebal (Ctrl+B)" })}
              {tool("Miring", Italic, () => wrap("*", "teks miring"), { title: "Miring (Ctrl+I)" })}
              {tool("Stabilo", Highlighter, () => wrap("==", "teks penting"), { title: "Stabilo (==teks==)" })}
              {sep}
              {tool("Daftar", List, () => togglePrefix(/^[-•*]\s/, () => "- "), { title: "Daftar butir (-)" })}
              {tool("Daftar bernomor", ListOrdered, () => togglePrefix(/^\d{1,3}[.)]\s/, (i) => `${i + 1}. `), {
                title: "Langkah bernomor (1.)",
              })}
              <div className="relative">
                <button
                  type="button"
                  aria-expanded={calloutOpen}
                  aria-haspopup="menu"
                  onClick={() => {
                    setCalloutOpen((o) => !o);
                    setMathOpen(false);
                  }}
                  title="Kotak catatan (> Ingat: …)"
                  className="inline-flex h-9 shrink-0 items-center gap-1 rounded-lg px-2.5 text-[14px] font-bold text-tinta-2 hover:bg-papan-50 hover:text-papan"
                >
                  <TextQuote className="size-4" aria-hidden />
                  <span className="hidden xl:inline">Kotak</span>
                  <ChevronDown className="size-3.5" aria-hidden />
                </button>
              </div>
              {tool(
                "Tabel",
                Table2,
                () => insertBlock("| Kolom 1 | Kolom 2 |\n|---|---|\n| Isi | Isi |\n| Isi | Isi |", "Kolom 1"),
                {
                  title: "Sisipkan tabel",
                },
              )}
              {tool("Garis pemisah", Minus, () => insertBlock("---"))}
              <button
                type="button"
                aria-expanded={mathOpen}
                aria-haspopup="menu"
                onClick={() => {
                  setMathOpen((o) => !o);
                  setCalloutOpen(false);
                }}
                title="Rumus matematika (LaTeX)"
                aria-label="Rumus"
                className="inline-flex h-9 shrink-0 items-center gap-1 rounded-lg px-2.5 text-[14px] font-bold text-tinta-2 hover:bg-papan-50 hover:text-papan"
              >
                <Sigma className="size-4" aria-hidden />
                <span className="hidden xl:inline">Rumus</span>
                <ChevronDown className="size-3.5" aria-hidden />
              </button>
              {tool("Gambar", ImageIcon, () => setPanel("gambar"), { title: "Tambah gambar (panel Gambar)" })}
              {sep}
              <button
                type="button"
                onClick={markDifficultWord}
                title="Tambahkan kata yang diblok ke glosarium"
                className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-[14px] font-bold text-aksen hover:bg-aksen-50"
              >
                <BookA className="size-4" aria-hidden />
                Kata sulit
              </button>
            </div>
            {calloutOpen && (
              <div
                className="flex flex-wrap gap-1.5 border-b border-garis bg-white px-2 py-2"
                role="menu"
                aria-label="Jenis kotak catatan"
              >
                {CALLOUTS.map((c) => (
                  <button
                    key={c.label}
                    type="button"
                    role="menuitem"
                    onClick={() => insertCallout(c.label)}
                    className={cx(
                      "h-9 rounded-lg px-3 text-[14px] font-bold",
                      c.hint === "biru" && "bg-biru-50 text-biru",
                      c.hint === "merah" && "bg-merah-50 text-merah",
                      c.hint === "hijau" && "bg-hijau-50 text-hijau",
                      c.hint === "kuning" && "bg-kuning-50 text-kuning-700",
                    )}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            )}

            {mathOpen && (
              <div className="border-b border-garis bg-white px-2 py-2" role="menu" aria-label="Sisipkan rumus">
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => insertMath((sel) => [sel || "x^2 + 1", sel ? undefined : "x^2 + 1"])}
                    className="h-10 rounded-lg bg-papan-50 px-3 text-[14px] font-bold text-papan hover:bg-papan-100"
                  >
                    Rumus di kalimat <code className="font-normal">$…$</code>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMathOpen(false);
                      insertBlock("$$\\frac{a}{b} = c$$", "\\frac{a}{b} = c");
                    }}
                    className="h-10 rounded-lg bg-papan-50 px-3 text-[14px] font-bold text-papan hover:bg-papan-100"
                  >
                    Rumus di baris sendiri <code className="font-normal">$$…$$</code>
                  </button>
                  {MATH_SNIPPETS.map((m) => (
                    <button
                      key={m.label}
                      type="button"
                      role="menuitem"
                      title={m.label}
                      onClick={() => insertMath(m.make)}
                      className="inline-flex h-10 min-w-10 items-center justify-center rounded-lg border border-garis px-2.5 text-[15px] hover:border-papan hover:bg-papan-50"
                    >
                      <span className="sr-only">{m.label}</span>
                      <span aria-hidden>
                        <Tex tex={m.preview} />
                      </span>
                    </button>
                  ))}
                </div>
                <p className="mt-1.5 px-1 text-[13px] text-tinta-2">
                  Blok angka atau rumus dulu bila ingin dibungkus, misalnya blok <code>3/4</code> lalu tekan Pecahan.
                </p>
              </div>
            )}

            {view === "tulis" ? (
              <Textarea
                id="isi-materi"
                ref={textarea}
                rows={22}
                value={lesson.body}
                onChange={(e) => update({ body: e.target.value })}
                onKeyDown={onKeyDown}
                className="block rounded-none border-0 font-sans text-[16px] shadow-none focus:ring-0 focus-visible:outline-none"
                aria-describedby="isi-bantuan"
                placeholder={
                  "## Judul bagian\n\nTulis paragraf di sini…\n\n- butir daftar\n\n> Ingat: hal yang penting"
                }
              />
            ) : (
              <div
                id="isi-materi"
                className="reader max-h-[44rem] min-h-[22rem] overflow-y-auto px-5 py-6 sm:px-8"
                style={{ background: "#fff" }}
              >
                {lesson.body.trim() ? (
                  <ReaderText text={lesson.body} glossary={lesson.glossary} figures={lesson.figures} />
                ) : (
                  <p className="text-tinta-2">Materi masih kosong.</p>
                )}
                <button
                  type="button"
                  onClick={() => setView("tulis")}
                  className="mt-6 inline-flex h-10 items-center gap-1.5 rounded-xl bg-papan-50 px-3 text-[14px] font-bold text-papan hover:bg-papan-100"
                >
                  <PenLine className="size-4" aria-hidden />
                  Lanjut menulis
                </button>
              </div>
            )}
          </div>
          {(offerLatex || latexUndo) && (
            <div
              className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-aksen/30 bg-aksen-50 px-3 py-2.5 text-[14px]"
              role="status"
            >
              <Sigma className="size-4 shrink-0 text-aksen" aria-hidden />
              {latexUndo && lesson.body === latexUndo.after ? (
                <>
                  <span className="min-w-0 flex-1">
                    Rumus sudah diubah ke LaTeX oleh AI. Periksa angkanya di Lihat hasil.
                    {latexUndo.rejected > 0 &&
                      ` ${latexUndo.rejected} bagian dibiarkan tulisan biasa karena AI ikut mengubah angka/kata di sana.`}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      update({ body: latexUndo.before });
                      setLatexUndo(null);
                    }}
                  >
                    <Undo2 className="size-4" aria-hidden />
                    Batalkan
                  </Button>
                </>
              ) : (
                <>
                  <span className="min-w-0 flex-1">
                    Ada {spots} rumus yang masih ditulis biasa (mis. 3/4, x^2, √x). Tulis dengan LaTeX supaya tampil rapi
                    dan dibacakan dengan benar.
                  </span>
                  {aiOn ? (
                    <Button variant="secondary" size="sm" disabled={latexBusy} onClick={() => convertLatex()}>
                      {latexBusy ? <Spinner /> : <Sparkles className="size-4" aria-hidden />}
                      Ubah rumus ke LaTeX
                    </Button>
                  ) : (
                    <span className="text-tinta-2">Pakai tombol Rumus di toolbar.</span>
                  )}
                </>
              )}
            </div>
          )}
          <FormatGuide stats={stats} />
        </div>
      </div>

      <Card className="h-fit p-3 sm:p-4 lg:sticky lg:top-20">
        <div className="grid grid-cols-4 gap-1 rounded-xl bg-krem p-1" role="group" aria-label="Panel samping">
          {panels.map((p) => (
            <button
              key={p.key}
              type="button"
              aria-pressed={panel === p.key}
              onClick={() => setPanel(p.key)}
              className={cx(
                "relative flex h-14 flex-col items-center justify-center gap-0.5 rounded-lg px-1 text-[12px] font-bold leading-tight",
                panel === p.key ? "bg-white text-papan shadow-kartu" : "text-tinta-2 hover:text-tinta",
              )}
            >
              <p.icon className="size-4 shrink-0" aria-hidden />
              <span>{p.label}</span>
              {p.badge ? (
                <span
                  className="absolute right-0.5 top-0.5 min-w-5 rounded-full bg-aksen px-1 text-[11px] leading-5 text-white"
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
                “Kata sulit”.
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

          {panel === "gambar" && (
            <FiguresPanel
              lessonId={lessonId}
              lesson={lesson}
              update={update}
              aiOn={aiOn}
              onInsert={(line) => insertBlock(line)}
            />
          )}

          {panel === "pratinjau" && (
            <StudentPreview
              title={lesson.title}
              body={lesson.body}
              glossary={lesson.glossary}
              versions={lesson.versions}
              figures={lesson.figures}
            />
          )}

          {panel === "baca" && (
            <div className="space-y-4">
              <dl className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-kertas p-2">
                  <dt className="text-[12px] text-tinta-2">Rata-rata</dt>
                  <dd className={cx("text-xl font-bold", stats.avgWords > TARGET_AVG_WORDS && "text-aksen")}>
                    {stats.avgWords}
                  </dd>
                  <dd className="text-[12px] text-tinta-2">kata/kalimat</dd>
                </div>
                <div className="rounded-xl bg-kertas p-2">
                  <dt className="text-[12px] text-tinta-2">Kalimat panjang</dt>
                  <dd className={cx("text-xl font-bold", stats.longSentences.length > 0 && "text-aksen")}>
                    {stats.longSentences.length}
                  </dd>
                  <dd className="text-[12px] text-tinta-2">&gt; {LONG_SENTENCE_WORDS} kata</dd>
                </div>
                <div className="rounded-xl bg-kertas p-2">
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
                          className="w-full rounded-xl border border-garis p-2 text-left text-[13px] hover:border-papan"
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
                <p className="flex gap-2 rounded-xl bg-aksen-50 p-3 text-[14px] text-tinta">
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
                <p className="rounded-xl bg-hijau-50 p-3 text-[14px] text-berhasil">
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

function FormatGuide({ stats }: { stats: { words: number; sentences: number } }) {
  const [open, setOpen] = useState(false);
  return (
    <div id="isi-bantuan" className="mt-2 text-[14px] text-tinta-2">
      <p>
        {stats.words} kata, {stats.sentences} kalimat. Tersimpan otomatis; Ctrl+S untuk simpan sekarang.{" "}
        <button
          type="button"
          className="font-bold text-papan-600 underline"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? "Tutup panduan format" : "Panduan format"}
        </button>
      </p>
      {open && (
        <dl className="muncul mt-2 grid gap-x-6 gap-y-1.5 rounded-2xl border border-garis bg-white p-4 sm:grid-cols-2">
          {[
            ["## Judul", "judul bagian"],
            ["### Subjudul", "subjudul"],
            ["- butir", "daftar butir"],
            ["1. langkah", "langkah bernomor"],
            ["**kata**", "tebal"],
            ["==kata==", "stabilo"],
            ["> Ingat: …", "kotak catatan (Ingat, Penting, Contoh, Tahukah kamu?)"],
            ["| a | b |", "tabel; baris kedua |---|---|"],
            ["![keterangan](gambar:…)", "gambar (lewat panel Gambar)"],
            ["---", "garis pemisah"],
            ["$x^2$, $\\frac{3}{4}$, $\\sqrt{x}$", "rumus (LaTeX) di dalam kalimat; tombol Rumus"],
            ["$$x^2 - 1 = 0$$", "rumus di baris sendiri"],
          ].map(([code, desc]) => (
            <div key={code} className="flex items-baseline gap-2">
              <dt>
                <code>{code}</code>
              </dt>
              <dd>{desc}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
