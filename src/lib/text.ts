// Utilitas teks yang dipakai di server dan browser.
//
// Format materi Selaras sengaja mirip Markdown sederhana supaya mudah ditulis guru (dan AI),
// tetapi tetap tampil rapi seperti buku di layar siswa:
//
//   ## Judul bagian            ### Subjudul
//   Paragraf biasa. Baris kosong memisahkan paragraf.
//   - butir daftar             1. langkah bernomor
//   **tebal**  *miring*  ==stabilo==   s^2 (pangkat)   3/4 (pecahan, tampil bersusun)
//   > Penting: kotak catatan   (label lain: Ingat, Catatan, Contoh, Tahukah kamu?, Info, Definisi …)
//   | Kolom | Kolom |          tabel (baris kedua |---|---| menandai baris judul)
//   ![Keterangan gambar](gambar:ID)   gambar/diagram; deskripsinya (alt text) disimpan terpisah
//   [Gambar: deskripsi]        gambar dari buku yang belum diunggah (hanya deskripsi)
//   ---                        garis pemisah

/** Sidik pendek sebuah teks (djb2). Dipakai untuk tahu apakah materi asli berubah setelah versi dibuat. */
export function fingerprint(text: string): string {
  let h = 5381;
  const s = text.trim();
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(16);
}

// ---------------------------------------------------------------------------
// Blok

export type CalloutKind = "info" | "penting" | "ingat" | "contoh" | "tahukah";

export type CalloutLine = { bullet: boolean; text: string };

export type TextBlock =
  | { type: "heading"; level: 2 | 3; text: string }
  | { type: "para"; text: string }
  | { type: "list"; ordered: boolean; start: number; items: string[] }
  | { type: "callout"; kind: CalloutKind; title: string | null; lines: CalloutLine[] }
  | { type: "table"; header: string[] | null; rows: string[][] }
  | { type: "figure"; id: string | null; caption: string; description: string | null }
  | { type: "divider" };

const CALLOUT_LABELS: [RegExp, CalloutKind][] = [
  [/^(penting|perhatian|awas|hati-hati)$/i, "penting"],
  [/^(ingat|catatan|kesimpulan|rangkuman|intisari)$/i, "ingat"],
  [/^(contoh|kegiatan|ayo mencoba|ayo berlatih|latihan|coba)$/i, "contoh"],
  [/^(tahukah kamu\??|info|tips?|fakta menarik)$/i, "tahukah"],
  [/^(definisi|pengertian|istilah)$/i, "info"],
];

/** "Penting: isi" atau "**Penting:** isi" → { title: "Penting", kind, rest: "isi" } */
function calloutLabel(line: string): { title: string; kind: CalloutKind; rest: string } | null {
  const m = line.match(/^\*{0,2}([^*:：]{2,24}?)\s*[:：]\s*\*{0,2}\s*(.*)$/);
  if (!m) return null;
  const label = m[1].trim();
  for (const [re, kind] of CALLOUT_LABELS) {
    if (re.test(label)) return { title: label, kind, rest: m[2] };
  }
  return null;
}

export const FIGURE_LINE = /^!\[([^\]\n]*)\]\(gambar:([A-Za-z0-9-]{8,64})\)$/;
const LEGACY_FIGURE = /^\[(gambar|diagram|foto|ilustrasi|tabel|grafik|peta)\s*:\s*(.+)\]$/i;
const TABLE_SEPARATOR = /^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?$/;

function splitCells(line: string): string[] {
  let s = line.trim();
  if (s.startsWith("|")) s = s.slice(1);
  if (s.endsWith("|") && !s.endsWith("\\|")) s = s.slice(0, -1);
  const cells: string[] = [];
  let cur = "";
  for (let i = 0; i < s.length; i++) {
    if (s[i] === "\\" && s[i + 1] === "|") {
      cur += "|";
      i++;
    } else if (s[i] === "|") {
      cells.push(cur.trim());
      cur = "";
    } else cur += s[i];
  }
  cells.push(cur.trim());
  return cells;
}

export function parseBlocks(text: string): TextBlock[] {
  const blocks: TextBlock[] = [];
  let para: string[] = [];
  let list: { ordered: boolean; start: number; items: string[] } | null = null;
  let callout: { kind: CalloutKind; title: string | null; lines: CalloutLine[] } | null = null;
  let table: { rows: string[][]; header: string[] | null } | null = null;

  const flushPara = () => {
    if (para.length) blocks.push({ type: "para", text: para.join(" ").trim() });
    para = [];
  };
  const flushList = () => {
    if (list?.items.length) blocks.push({ type: "list", ...list });
    list = null;
  };
  const flushCallout = () => {
    if (callout && (callout.lines.length || callout.title)) blocks.push({ type: "callout", ...callout });
    callout = null;
  };
  const flushTable = () => {
    if (table && (table.rows.length || table.header)) {
      const width = Math.max(table.header?.length ?? 0, ...table.rows.map((r) => r.length));
      const pad = (r: string[]) => [...r, ...Array(Math.max(0, width - r.length)).fill("")];
      blocks.push({ type: "table", header: table.header ? pad(table.header) : null, rows: table.rows.map(pad) });
    }
    table = null;
  };
  const flushAll = () => {
    flushPara();
    flushList();
    flushCallout();
    flushTable();
  };

  for (const raw of text.replace(/\r\n?/g, "\n").split("\n")) {
    const line = raw.trim();
    if (!line) {
      flushAll();
      continue;
    }

    // Tabel
    if (line.startsWith("|")) {
      flushPara();
      flushList();
      flushCallout();
      table ??= { rows: [], header: null };
      if (TABLE_SEPARATOR.test(line)) {
        if (!table.header && table.rows.length === 1) table.header = table.rows.pop()!;
        continue;
      }
      table.rows.push(splitCells(line));
      continue;
    }
    flushTable();

    // Kotak catatan
    const quote = line.match(/^>\s?(.*)$/);
    if (quote) {
      flushPara();
      flushList();
      const content = quote[1].trim();
      if (!callout) {
        const label = calloutLabel(content);
        callout = { kind: label?.kind ?? "info", title: label?.title ?? null, lines: [] };
        const rest = label ? label.rest.trim() : content;
        if (rest) callout.lines.push(lineOf(rest));
      } else if (content) {
        callout.lines.push(lineOf(content));
      }
      continue;
    }
    flushCallout();

    const heading = line.match(/^(#{1,4})\s+(.*)$/);
    if (heading) {
      flushPara();
      flushList();
      const text = heading[2].replace(/\s+#+$/, "").trim();
      if (text) blocks.push({ type: "heading", level: heading[1].length >= 3 ? 3 : 2, text });
      continue;
    }

    const figure = line.match(FIGURE_LINE);
    if (figure) {
      flushPara();
      flushList();
      blocks.push({ type: "figure", id: figure[2], caption: figure[1].trim(), description: null });
      continue;
    }
    const legacy = line.match(LEGACY_FIGURE);
    if (legacy) {
      flushPara();
      flushList();
      blocks.push({ type: "figure", id: null, caption: "", description: legacy[2].trim() });
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line)) {
      flushPara();
      flushList();
      blocks.push({ type: "divider" });
      continue;
    }

    const numbered = line.match(/^(\d{1,3})[.)]\s+(.*)$/);
    const bullet = numbered ? null : line.match(/^[-•*–]\s+(.*)$/);
    if (numbered || bullet) {
      flushPara();
      const ordered = !!numbered;
      if (list && list.ordered !== ordered) flushList();
      list ??= { ordered, start: numbered ? Number(numbered[1]) : 1, items: [] };
      list.items.push((numbered ? numbered[2] : bullet![1]).trim());
      continue;
    }

    flushList();
    para.push(line);
  }
  flushAll();
  return blocks;
}

function lineOf(content: string): CalloutLine {
  const b = content.match(/^(?:[-•*–]|\d{1,3}[.)])\s+(.*)$/);
  return b ? { bullet: true, text: b[1].trim() } : { bullet: false, text: content };
}

// ---------------------------------------------------------------------------
// Format dalam baris: **tebal**, *miring*, ==stabilo==, dan notasi matematika: s^2 (pangkat), 3/4 (pecahan)

export type MarkType = "b" | "i" | "m" | "sup" | "frac";
export type InlineMark = { start: number; end: number; type: MarkType };
export type Inline = { plain: string; marks: InlineMark[] };

const MARKERS: [string, MarkType][] = [
  ["**", "b"],
  ["==", "m"],
  ["*", "i"],
];

function walkInline(raw: string, acc: Inline) {
  let i = 0;
  while (i < raw.length) {
    const c = raw[i];
    if (c === "\\" && /[*=\\|]/.test(raw[i + 1] ?? "")) {
      acc.plain += raw[i + 1];
      i += 2;
      continue;
    }
    // Pangkat: s^2, 10^-3, x^(n+1) → angka/huruf pangkat ditulis tanpa "^" dan diberi tanda superskrip.
    if (c === "^" && i > 0 && !/\s/.test(raw[i - 1])) {
      const exp = raw.slice(i + 1).match(/^\((-?[\p{L}\d+\-]{1,10})\)|^(-?[\p{L}\d]{1,4})/u);
      if (exp) {
        const start = acc.plain.length;
        acc.plain += exp[1] ?? exp[2];
        acc.marks.push({ start, end: acc.plain.length, type: "sup" });
        i += 1 + exp[0].length;
        continue;
      }
    }
    let matched = false;
    for (const [m, type] of MARKERS) {
      if (!raw.startsWith(m, i)) continue;
      // "2*3*4" adalah perkalian, bukan teks miring.
      if (m === "*" && /\d/.test(raw[i - 1] ?? "")) break;
      const after = raw[i + m.length];
      // Penanda pembuka harus langsung diikuti huruf, bukan spasi (jadi "5 * 3" tetap teks biasa).
      if (!after || /\s/.test(after) || after === m[0]) break;
      let j = raw.indexOf(m, i + m.length);
      while (j !== -1 && (/\s/.test(raw[j - 1]) || (m === "*" && (raw[j + 1] === "*" || raw[j - 1] === "*")))) {
        j = raw.indexOf(m, j + 1);
      }
      if (j === -1) break;
      // "***" di akhir: ambil dua bintang terakhir sebagai penutup tebal (bintang pertama menutup miring).
      if (m === "**") while (raw[j + 2] === "*") j++;
      const start = acc.plain.length;
      walkInline(raw.slice(i + m.length, j), acc);
      if (acc.plain.length > start) acc.marks.push({ start, end: acc.plain.length, type });
      i = j + m.length;
      matched = true;
      break;
    }
    if (!matched) {
      acc.plain += c;
      i++;
    }
  }
}

// Pecahan angka/angka, bukan tanggal (15/10/2026) dan bukan bagian bilangan lain. Tanpa lookbehind (Safari lama).
const FRACTION = /(^|[^\d/.,])(\d{1,4})\/(\d{1,4})(?![\d/])/g;

export function parseInline(raw: string): Inline {
  const acc: Inline = { plain: "", marks: [] };
  walkInline(raw, acc);
  for (const m of acc.plain.matchAll(FRACTION)) {
    const start = (m.index ?? 0) + m[1].length;
    const end = start + m[2].length + 1 + m[3].length;
    if (!acc.marks.some((x) => x.type === "sup" && x.start < end && x.end > start)) {
      acc.marks.push({ start, end, type: "frac" });
    }
  }
  return acc;
}

/**
 * Potongan teks untuk dibacakan: pangkat ditulis lagi dengan "^" (s^2 → "s kuadrat" di spokenMath),
 * sedangkan teks tampilannya tanpa "^".
 */
export function inlineSpeech(inline: Inline, start = 0, end = inline.plain.length): string {
  const sups = inline.marks.filter((m) => m.type === "sup" && m.start >= start && m.start < end).map((m) => m.start);
  if (!sups.length) return inline.plain.slice(start, end);
  let out = "";
  let last = start;
  for (const at of sups.sort((a, b) => a - b)) {
    out += inline.plain.slice(last, at) + "^";
    last = at;
  }
  return out + inline.plain.slice(last, end);
}

/** Teks tanpa penanda format dalam baris. */
export function stripInline(raw: string): string {
  return parseInline(raw).plain;
}

// ---------------------------------------------------------------------------
// Kalimat

const ABBREVIATIONS = new Set([
  "dll",
  "dsb",
  "dst",
  "dkk",
  "tsb",
  "yth",
  "no",
  "hlm",
  "hal",
  "jl",
  "rp",
  "kg",
  "cm",
  "km",
  "mm",
  "ml",
  "dr",
  "drs",
  "ir",
  "prof",
  "bpk",
  "sdr",
  "st",
  "kab",
  "kec",
  "kel",
  "prov",
  "misal",
  "mis",
  "ttg",
  "spt",
]);

/**
 * Posisi kalimat [awal, akhir) di dalam teks polos. Titik di antara angka (1.000, 3.5) dan singkatan umum
 * (dll., Rp., hlm.) tidak memecah kalimat.
 */
export function sentenceRanges(plain: string): [number, number][] {
  const ranges: [number, number][] = [];
  let start = 0;
  const n = plain.length;
  for (let i = 0; i < n; i++) {
    const c = plain[i];
    if (c !== "." && c !== "!" && c !== "?") continue;
    let j = i;
    while (j + 1 < n && /[.!?…]/.test(plain[j + 1])) j++;
    while (j + 1 < n && /["'”’)\]]/.test(plain[j + 1])) j++;
    const next = plain[j + 1];
    if (next !== undefined && !/\s/.test(next)) {
      i = j;
      continue;
    }
    if (c === ".") {
      const word = plain
        .slice(start, i)
        .match(/([\p{L}]+)$/u)?.[1]
        ?.toLowerCase();
      const following = plain.slice(j + 1).trimStart()[0];
      if (word && ABBREVIATIONS.has(word) && following && /[\p{Ll}\d]/u.test(following)) {
        i = j;
        continue;
      }
    }
    ranges.push([start, j + 1]);
    start = j + 1;
    i = j;
  }
  if (start < n) ranges.push([start, n]);
  // Rapikan spasi di tepi dan buang kalimat kosong.
  return ranges
    .map(([a, b]): [number, number] => {
      while (a < b && /\s/.test(plain[a])) a++;
      while (b > a && /\s/.test(plain[b - 1])) b--;
      return [a, b];
    })
    .filter(([a, b]) => b > a);
}

/** Memecah teks menjadi kalimat untuk dibacakan satu per satu. */
export function splitSentences(text: string): string[] {
  return sentenceRanges(text).map(([a, b]) => text.slice(a, b));
}

export function wordCount(text: string): number {
  return text.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}

// ---------------------------------------------------------------------------
// Gambar

/** ID gambar yang dipakai di teks (urut, tanpa duplikat). */
export function figureIds(text: string): string[] {
  const ids: string[] = [];
  for (const raw of text.split("\n")) {
    const m = raw.trim().match(FIGURE_LINE);
    if (m && !ids.includes(m[2])) ids.push(m[2]);
  }
  return ids;
}

/** Baris penanda gambar untuk ditulis ke materi. */
export function figureLine(id: string, caption: string): string {
  const clean = caption
    .replace(/[\[\]\n\r]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return `![${clean}](gambar:${id})`;
}

/** Kalimat yang dibacakan untuk sebuah gambar. */
export function figureSpeech(caption: string, alt: string | null | undefined): string {
  const parts = ["Gambar."];
  const c = stripInline(caption).trim();
  if (c) parts.push(/[.!?]$/.test(c) ? c : `${c}.`);
  const a = (alt ?? "").trim();
  if (a) parts.push(a);
  return parts.join(" ");
}

// ---------------------------------------------------------------------------

/** Menghapus penanda format supaya teks enak dibaca mesin (pratinjau, hitung kata, dsb.). */
export function plainText(text: string): string {
  return parseBlocks(text)
    .map((b) => {
      switch (b.type) {
        case "list":
          return b.items.map(stripInline).join(". ");
        case "callout":
          return [b.title, ...b.lines.map((l) => stripInline(l.text))].filter(Boolean).join(". ");
        case "table":
          return [b.header, ...b.rows]
            .filter((r): r is string[] => !!r)
            .map((r) => r.map(stripInline).join(", "))
            .join(". ");
        case "figure":
          return b.description ? `Gambar: ${b.description}` : b.caption ? `Gambar: ${stripInline(b.caption)}` : "";
        case "divider":
          return "";
        default:
          return stripInline(b.text);
      }
    })
    .filter(Boolean)
    .join("\n");
}
