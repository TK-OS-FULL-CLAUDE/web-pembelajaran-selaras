"use client";

// Menampilkan materi dalam format Selaras (lihat src/lib/text.ts) seperti halaman buku yang rapi:
// judul, paragraf, daftar, kotak catatan berwarna, tabel, dan gambar dengan deskripsi (alt text).
// Setiap kalimat diberi nomor supaya bisa dibacakan dan disorot satu per satu.

import {
  BookMarked,
  ImageIcon,
  Info,
  Lightbulb,
  PencilLine,
  TriangleAlert,
  Volume2,
  X,
  ZoomIn,
  ZoomOut,
  type LucideIcon,
} from "lucide-react";
import { Fragment, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  figureSpeech,
  inlineSpeech,
  parseBlocks,
  parseInline,
  sentenceRanges,
  type CalloutKind,
  type Inline,
} from "@/lib/text";
import type { GlossaryItem, LessonFigures } from "@/lib/types";

type SentenceRef = { index: number; start: number; end: number };
type Piece = { inline: Inline; sentences: SentenceRef[] };

type Group =
  | { type: "heading"; level: 2 | 3; piece: Piece }
  | { type: "para"; piece: Piece }
  | { type: "list"; ordered: boolean; start: number; items: Piece[] }
  | {
      type: "callout";
      kind: CalloutKind;
      title: string | null;
      titleIndex: number | null;
      lines: { bullet: boolean; piece: Piece }[];
    }
  | { type: "table"; header: Piece[] | null; rows: Piece[][] }
  | { type: "figure"; id: string | null; caption: Inline; description: string | null; index: number }
  | { type: "divider" };

/** Memecah materi menjadi blok + daftar kalimat bernomor (untuk dibacakan dan disorot). */
export function buildStructure(text: string, figures?: LessonFigures) {
  const sentences: string[] = [];
  const add = (s: string) => {
    sentences.push(s);
    return sentences.length - 1;
  };
  const piece = (raw: string, whole = false): Piece => {
    const inline = parseInline(raw);
    let ranges = sentenceRanges(inline.plain);
    if (whole && ranges.length > 1) ranges = [[ranges[0][0], ranges[ranges.length - 1][1]]];
    return {
      inline,
      sentences: ranges.map(([start, end]) => ({ index: add(inlineSpeech(inline, start, end)), start, end })),
    };
  };

  const groups: Group[] = parseBlocks(text).map((block): Group => {
    switch (block.type) {
      case "heading":
        return { type: "heading", level: block.level, piece: piece(block.text, true) };
      case "para":
        return { type: "para", piece: piece(block.text) };
      case "list":
        return { type: "list", ordered: block.ordered, start: block.start, items: block.items.map((i) => piece(i)) };
      case "callout": {
        const titleIndex = block.title ? add(/[.!?]$/.test(block.title) ? block.title : `${block.title}.`) : null;
        return {
          type: "callout",
          kind: block.kind,
          title: block.title,
          titleIndex,
          lines: block.lines.map((l) => ({ bullet: l.bullet, piece: piece(l.text) })),
        };
      }
      case "table":
        return {
          type: "table",
          header: block.header ? block.header.map((c) => piece(c, true)) : null,
          rows: block.rows.map((r) => r.map((c) => piece(c, true))),
        };
      case "figure": {
        const alt = block.id ? figures?.[block.id]?.alt : block.description;
        return {
          type: "figure",
          id: block.id,
          caption: parseInline(block.caption),
          description: block.description,
          index: add(figureSpeech(block.caption, alt)),
        };
      }
      default:
        return { type: "divider" };
    }
  });
  return { sentences, groups };
}

export function useReaderStructure(text: string, figures?: LessonFigures) {
  return useMemo(() => buildStructure(text, figures), [text, figures]);
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Potongan teks [s, e) dengan format tebal/miring/stabilo. */
function renderMarked(inline: Inline, s: number, e: number, key: string): ReactNode[] {
  const cuts = new Set([s, e]);
  for (const m of inline.marks) {
    if (m.end > s && m.start < e) {
      cuts.add(Math.max(s, m.start));
      cuts.add(Math.min(e, m.end));
    }
  }
  const points = [...cuts].sort((a, b) => a - b);
  const out: ReactNode[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    if (b <= a) continue;
    let node: ReactNode = inline.plain.slice(a, b);
    const active = inline.marks.filter((m) => m.start <= a && m.end >= b);
    const frac = active.find((m) => m.type === "frac");
    if (frac && frac.start === a && frac.end === b) node = <Fraction text={inline.plain.slice(a, b)} />;
    if (active.some((m) => m.type === "sup")) node = <sup>{node}</sup>;
    if (active.some((m) => m.type === "i")) node = <em>{node}</em>;
    if (active.some((m) => m.type === "b")) node = <strong>{node}</strong>;
    if (active.some((m) => m.type === "m")) node = <mark>{node}</mark>;
    out.push(<Fragment key={`${key}-${a}`}>{node}</Fragment>);
  }
  return out;
}

/** Pecahan bersusun. Pembaca layar membacanya "3 per 4". */
function Fraction({ text }: { text: string }) {
  const [top, bottom] = text.split("/");
  return (
    <span className="pecahan">
      <span className="sr-only">
        {top} per {bottom}
      </span>
      <span className="pecahan-susun" aria-hidden>
        <span className="pecahan-atas">{top}</span>
        <span>{bottom}</span>
      </span>
    </span>
  );
}

/** Teks satu baris dengan format Selaras (tebal, miring, pangkat, pecahan), mis. untuk soal kuis dan LKPD. */
export function InlineText({ text }: { text: string }) {
  const inline = parseInline(text);
  return <>{renderMarked(inline, 0, inline.plain.length, "t")}</>;
}

const CALLOUT_ICON: Record<CalloutKind, LucideIcon> = {
  info: Info,
  penting: TriangleAlert,
  ingat: BookMarked,
  contoh: PencilLine,
  tahukah: Lightbulb,
};

export function ReaderText({
  text,
  glossary,
  figures,
  activeSentence = -1,
  onTerm,
  onSpeak,
}: {
  text: string;
  glossary: GlossaryItem[];
  figures?: LessonFigures;
  activeSentence?: number;
  onTerm?: (item: GlossaryItem) => void;
  /** Membacakan teks pendek (deskripsi gambar). Tanpa ini tombol "Dengarkan" tidak muncul. */
  onSpeak?: (text: string) => void;
}) {
  const { sentences, groups } = useReaderStructure(text, figures);

  // Tanpa lookbehind (?<!…) supaya tetap jalan di Safari lama (iOS < 16.4).
  const termRegex = useMemo(() => {
    const words = glossary
      .map((g) => g.kata.trim())
      .filter(Boolean)
      .sort((a, b) => b.length - a.length);
    if (!words.length) return null;
    return new RegExp(`(^|[^\\p{L}\\p{N}])(${words.map(escapeRegExp).join("|")})(?=$|[^\\p{L}\\p{N}])`, "giu");
  }, [glossary]);

  const byWord = useMemo(() => {
    const map = new Map<string, GlossaryItem>();
    for (const g of glossary) map.set(g.kata.trim().toLowerCase(), g);
    return map;
  }, [glossary]);

  // Setiap istilah hanya digarisbawahi pada kemunculan pertama supaya teks tidak ramai.
  const seen = new Set<string>();

  const renderRange = (inline: Inline, s: number, e: number, key: string, terms = true): ReactNode[] => {
    if (!termRegex || !onTerm || !terms) return renderMarked(inline, s, e, key);
    const segment = inline.plain.slice(s, e);
    const nodes: ReactNode[] = [];
    let last = s;
    for (const match of segment.matchAll(termRegex)) {
      if (match.index === undefined) continue;
      const word = match[2];
      const k = word.toLowerCase();
      const item = byWord.get(k);
      if (!item || seen.has(k)) continue;
      seen.add(k);
      const a = s + match.index + match[1].length;
      const b = a + word.length;
      // Tanda baca setelah istilah ikut "ditempel" supaya tidak terpisah ke baris berikutnya.
      const punct = inline.plain.slice(b, e).match(/^[,.;:!?)\]”"'’]+/)?.[0] ?? "";
      nodes.push(...renderMarked(inline, last, a, `${key}-p${a}`));
      nodes.push(
        <span key={`${key}-t${a}`} className="whitespace-nowrap">
          <button type="button" className="term" onClick={() => onTerm(item)} aria-label={`${word}: lihat arti`}>
            {renderMarked(inline, a, b, `${key}-w${a}`)}
          </button>
          {punct && renderMarked(inline, b, b + punct.length, `${key}-q${b}`)}
        </span>,
      );
      last = b + punct.length;
    }
    nodes.push(...renderMarked(inline, last, e, `${key}-r${last}`));
    return nodes;
  };

  // Judul tidak diberi garis istilah: istilah digarisbawahi di kalimat isi pertama.
  const renderPiece = (p: Piece, key: string, terms = true): ReactNode =>
    p.sentences.map((ref, i) => (
      <Fragment key={`${key}-${ref.index}`}>
        <span data-sentence={ref.index} className={ref.index === activeSentence ? "sentence-active" : undefined}>
          {renderRange(p.inline, ref.start, ref.end, `${key}-${ref.index}`, terms)}
        </span>
        {i < p.sentences.length - 1 ? " " : null}
      </Fragment>
    ));

  return (
    <div className="reader-text">
      {groups.map((g, gi) => {
        const key = `g${gi}`;
        switch (g.type) {
          case "heading":
            return g.level === 2 ? (
              <h2 key={key}>{renderPiece(g.piece, key, false)}</h2>
            ) : (
              <h3 key={key}>{renderPiece(g.piece, key, false)}</h3>
            );
          case "para":
            return <p key={key}>{renderPiece(g.piece, key)}</p>;
          case "list": {
            const items = g.items.map((item, ii) => <li key={ii}>{renderPiece(item, `${key}-${ii}`)}</li>);
            return g.ordered ? (
              <ol key={key} start={g.start} style={{ "--start": g.start - 1 } as CSSProperties}>
                {items}
              </ol>
            ) : (
              <ul key={key}>{items}</ul>
            );
          }
          case "callout": {
            const Icon = CALLOUT_ICON[g.kind];
            const bullets = g.lines.filter((l) => l.bullet);
            return (
              <aside key={key} className="callout" data-kind={g.kind} aria-label={g.title ?? "Catatan"}>
                {g.title && (
                  <p className="callout-title">
                    <Icon className="size-[1.1em] shrink-0" aria-hidden />
                    <span
                      data-sentence={g.titleIndex ?? undefined}
                      className={g.titleIndex === activeSentence ? "sentence-active" : undefined}
                    >
                      {g.title}
                    </span>
                  </p>
                )}
                {g.lines.map((l, li) => (l.bullet ? null : <p key={li}>{renderPiece(l.piece, `${key}-${li}`)}</p>))}
                {bullets.length > 0 && (
                  <ul>
                    {g.lines.map((l, li) =>
                      l.bullet ? <li key={li}>{renderPiece(l.piece, `${key}-${li}`)}</li> : null,
                    )}
                  </ul>
                )}
              </aside>
            );
          }
          case "table":
            return (
              <div key={key} className="tabel-wrap" role="region" aria-label="Tabel" tabIndex={0}>
                <table>
                  {g.header && (
                    <thead>
                      <tr>
                        {g.header.map((c, ci) => (
                          <th key={ci} scope="col">
                            {renderPiece(c, `${key}-h${ci}`, false)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                  )}
                  <tbody>
                    {g.rows.map((r, ri) => (
                      <tr key={ri}>
                        {r.map((c, ci) => (
                          <td key={ci}>{renderPiece(c, `${key}-${ri}-${ci}`)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          case "figure":
            return (
              <Figure
                key={key}
                id={g.id}
                caption={g.caption.plain ? renderMarked(g.caption, 0, g.caption.plain.length, `${key}-c`) : null}
                captionText={g.caption.plain}
                alt={g.id ? (figures?.[g.id]?.alt ?? "") : (g.description ?? "")}
                legacy={!g.id}
                width={g.id ? figures?.[g.id]?.width : undefined}
                height={g.id ? figures?.[g.id]?.height : undefined}
                index={g.index}
                active={g.index === activeSentence}
                onSpeak={onSpeak ? () => onSpeak(sentences[g.index]) : undefined}
              />
            );
          default:
            return <hr key={key} />;
        }
      })}
    </div>
  );
}

function Figure({
  id,
  caption,
  captionText,
  alt,
  legacy,
  width,
  height,
  index,
  active,
  onSpeak,
}: {
  id: string | null;
  caption: ReactNode;
  captionText: string;
  alt: string;
  legacy: boolean;
  width?: number;
  height?: number;
  index: number;
  active: boolean;
  onSpeak?: () => void;
}) {
  const [zoom, setZoom] = useState(false);
  const [failed, setFailed] = useState(false);

  if (legacy) {
    // Gambar dari buku yang belum diunggah: hanya deskripsinya.
    return (
      <figure className="figur" data-sentence={index} data-active={active}>
        <div className="flex gap-3 rounded-xl bg-[color-mix(in_srgb,var(--reader-line)_35%,transparent)] p-3">
          <ImageIcon className="mt-1 size-[1.2em] shrink-0 text-[var(--reader-accent)]" aria-hidden />
          <p>
            <span className="font-bold">Gambar di buku: </span>
            {alt}
          </p>
        </div>
        {onSpeak && <SpeakButton onClick={onSpeak} />}
      </figure>
    );
  }

  const src = `/api/gambar/${id}`;
  const label = alt.trim() || captionText || "Gambar materi";
  return (
    <figure className="figur" data-sentence={index} data-active={active}>
      {failed ? (
        <div className="flex items-center gap-2 rounded-xl bg-slate-100 p-4 text-[0.9em] text-tinta-2">
          <ImageIcon className="size-5" aria-hidden />
          Gambar tidak bisa dimuat.
        </div>
      ) : (
        // Gambar tidak dibungkus tombol supaya pembaca layar membacakan deskripsinya (alt) di alur bacaan.
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/no-noninteractive-element-interactions */}
          <img
            src={src}
            alt={label}
            loading="lazy"
            width={width}
            height={height}
            onError={() => setFailed(true)}
            onClick={() => setZoom(true)}
            className="cursor-zoom-in"
          />
          <button
            type="button"
            onClick={() => setZoom(true)}
            className="no-print absolute right-2 top-2 flex size-11 items-center justify-center rounded-full bg-white/95 text-tinta shadow-kartu hover:bg-white"
            aria-label={`Perbesar gambar${captionText ? `: ${captionText}` : ""}`}
          >
            <ZoomIn className="size-5" aria-hidden />
          </button>
        </div>
      )}
      {(caption || alt.trim() || onSpeak) && (
        <figcaption>
          {caption && <span className="block font-bold text-[var(--reader-ink)]">{caption}</span>}
          {alt.trim() && (
            <details className="mt-1">
              <summary className="cursor-pointer font-bold text-[var(--reader-accent)]">Deskripsi gambar</summary>
              <p className="mt-1 text-[var(--reader-ink)]">{alt}</p>
            </details>
          )}
          {onSpeak && <SpeakButton onClick={onSpeak} />}
        </figcaption>
      )}
      {zoom &&
        createPortal(
          <ZoomDialog src={src} alt={label} caption={captionText} onClose={() => setZoom(false)} />,
          document.body,
        )}
    </figure>
  );
}

function SpeakButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="no-print mt-1.5 inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 font-bold text-[var(--reader-accent)] hover:bg-black/5"
    >
      <Volume2 className="size-[1.1em]" aria-hidden />
      Dengarkan deskripsi
    </button>
  );
}

/** Tampilan gambar layar penuh untuk siswa low vision: bisa diperbesar sampai 4×. */
function ZoomDialog({
  src,
  alt,
  caption,
  onClose,
}: {
  src: string;
  alt: string;
  caption: string;
  onClose: () => void;
}) {
  const [scale, setScale] = useState(1);
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "+" || e.key === "=") setScale((s) => Math.min(4, s + 0.5));
      if (e.key === "-") setScale((s) => Math.max(1, s - 0.5));
    };
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  return (
    <div
      className="no-print fixed inset-0 z-50 flex flex-col bg-[#0b1220]/95 font-sans"
      role="dialog"
      aria-modal="true"
      aria-label={`Gambar diperbesar: ${caption || alt}`}
    >
      <div className="flex items-center justify-between gap-2 p-3 text-white">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setScale((s) => Math.max(1, s - 0.5))}
            disabled={scale <= 1}
            className="flex size-12 items-center justify-center rounded-full bg-white/15 hover:bg-white/25 disabled:opacity-40"
            aria-label="Perkecil"
          >
            <ZoomOut className="size-6" aria-hidden />
          </button>
          <span className="w-14 text-center text-lg font-bold tabular-nums" aria-live="polite">
            {Math.round(scale * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setScale((s) => Math.min(4, s + 0.5))}
            disabled={scale >= 4}
            className="flex size-12 items-center justify-center rounded-full bg-white/15 hover:bg-white/25 disabled:opacity-40"
            aria-label="Perbesar"
          >
            <ZoomIn className="size-6" aria-hidden />
          </button>
        </div>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          className="flex size-12 items-center justify-center rounded-full bg-white text-tinta"
          aria-label="Tutup gambar"
        >
          <X className="size-6" aria-hidden />
        </button>
      </div>
      <div className="flex-1 overflow-auto" style={{ touchAction: "pinch-zoom pan-x pan-y" }}>
        <div
          className="flex min-h-full min-w-full items-center justify-center p-4"
          style={{ width: `${scale * 100}%` }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={alt} className="h-auto w-full max-w-none rounded-lg bg-white" />
        </div>
      </div>
      {(caption || alt) && (
        <p className="max-h-[30vh] overflow-y-auto bg-black/60 px-5 py-3 text-[17px] leading-relaxed text-white">
          {caption && <strong className="block text-white">{caption}</strong>}
          {alt !== caption && alt}
        </p>
      )}
    </div>
  );
}
