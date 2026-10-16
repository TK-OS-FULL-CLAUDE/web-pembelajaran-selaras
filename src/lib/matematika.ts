// Dukungan Matematika (server & browser): membaca angka gaya Indonesia, mencocokkan jawaban angka,
// menghitung ulang ekspresi dari AI, dan mengubah simbol matematika menjadi kata untuk dibacakan.
// Semuanya tanpa AI, jadi hasilnya pasti dan bisa diuji. Jawaban/kunci yang ditulis dengan LaTeX ($\frac{1}{2}$)
// lebih dulu diubah ke bentuk hitung biasa (1/2) oleh plainMath.

import { hasMath, latexToPlain, mathToPlain, mathToSpeech } from "./latex";

/** Teks yang mungkin memuat LaTeX ($\frac{1}{2}$, \sqrt{x}) → bentuk hitung biasa (1/2, sqrt(x)). */
export function plainMath(raw: string): string {
  if (hasMath(raw)) return mathToPlain(raw);
  if (/\\[A-Za-z]/.test(raw)) return latexToPlain(raw);
  return raw;
}

/** Mata pelajaran yang dianggap Matematika (prompt AI memakai aturan khusus). */
export function isMathSubject(subject: string | null | undefined): boolean {
  return /\b(matematika|mtk|math|numerasi|berhitung|aritmetika|aljabar|geometri)\b/i.test(subject ?? "");
}

/** Materi yang banyak memuat operasi hitung dianggap materi Matematika walau mapelnya tidak diisi. */
export function looksLikeMath(text: string): boolean {
  const ops = text.match(/\d\s*[×x*÷:+\-−=/^]\s*\d/g)?.length ?? 0;
  const fracs = text.match(/(?:^|[^\d/])\d{1,3}\/\d{1,3}(?![\d/])/g)?.length ?? 0;
  return ops + fracs >= 4;
}

export function mathMode(subject: string | null | undefined, text: string): boolean {
  return isMathSubject(subject) || looksLikeMath(text);
}

// ---------------------------------------------------------------------------
// Angka

export type ParsedNumber = { value: number; unit: string };

const SUPERSCRIPT: Record<string, string> = {
  "⁰": "0",
  "¹": "1",
  "²": "2",
  "³": "3",
  "⁴": "4",
  "⁵": "5",
  "⁶": "6",
  "⁷": "7",
  "⁸": "8",
  "⁹": "9",
};

/** Satu bilangan gaya Indonesia: "-3", "3,5", "3.5", "1.000", "1.000,5", "1/2", "1 1/2", "½". */
function parseNumeral(raw: string): number | null {
  let s = raw.normalize("NFKC").replace(/[−–—]/g, "-").replace(/⁄/g, "/").replace(/\s+/g, " ").trim();
  let sign = 1;
  if (s.startsWith("-")) {
    sign = -1;
    s = s.slice(1).trim();
  } else if (s.startsWith("+")) s = s.slice(1).trim();

  const mixed = s.match(/^(\d+) (\d+)\/(\d+)$/);
  if (mixed) {
    const den = Number(mixed[3]);
    return den ? sign * (Number(mixed[1]) + Number(mixed[2]) / den) : null;
  }
  const frac = s.match(/^(\d+(?:[.,]\d+)?)\/(\d+(?:[.,]\d+)?)$/);
  if (frac) {
    const a = parseNumeral(frac[1]);
    const b = parseNumeral(frac[2]);
    return a !== null && b ? (sign * a) / b : null;
  }
  let n: string;
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) n = s.replace(/\./g, "").replace(",", "."); // 1.000 / 1.000,5
  else if (/^\d+,\d+$/.test(s)) n = s.replace(",", "."); // 3,5
  else if (/^\d+\.\d+$/.test(s)) n = s; // 3.5 (titik desimal dari keyboard HP)
  else if (/^\d+$/.test(s)) n = s;
  else return null;
  const v = Number(n);
  return Number.isFinite(v) ? sign * v : null;
}

/**
 * Jawaban berupa angka, dengan satuan opsional di belakangnya: "24 cm", "-3", "50%", "3,5 kg", "1/2".
 * null bila jawabannya bukan angka (misalnya kata).
 */
export function parseAnswerNumber(raw: string): ParsedNumber | null {
  const s = plainMath(raw)
    .normalize("NFKC")
    .replace(/[−–—]/g, "-")
    .replace(/⁄/g, "/")
    .trim()
    .replace(/[.。]$/, "");
  const m = s.match(/^([-+]?\s*\d[\d.,]*(?:\s+\d+\/\d+|\s*\/\s*\d[\d.,]*)?)\s*(.*)$/);
  if (!m) return null;
  const value = parseNumeral(m[1].replace(/\s*\/\s*/, "/"));
  if (value === null) return null;
  const unit = m[2].trim().toLowerCase().replace(/[.]$/, "");
  // Satuan = satu kata pendek (cm, kg, %, °c, km/jam, cm²). Sisa lain berarti jawabannya kalimat, bukan angka.
  if (unit && !/^[\p{L}%°]{1,10}(?:\/[\p{L}]{1,6})?[²³23]?$/u.test(unit)) return null;
  // Satu huruf selain satuan (m, g, l, s) adalah variabel: "2x" bukan "2 satuan x".
  if (/^[a-z]$/.test(unit) && !"mgls".includes(unit)) return null;
  return { value, unit: unit.replace("²", "2").replace("³", "3") };
}

function close(a: number, b: number) {
  return Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));
}

/**
 * Apakah dua jawaban angka sama nilainya. Satuan boleh tidak ditulis siswa, tetapi bila ditulis harus sama.
 * null = salah satunya bukan angka (pakai pencocokan teks biasa).
 */
export function sameNumber(expected: string, given: string): boolean | null {
  const a = parseAnswerNumber(expected);
  const b = parseAnswerNumber(given);
  if (!a || !b) return null;
  // Pecahan dibandingkan bentuknya, bukan nilainya: pada soal "sederhanakan 4/12", 2/6 belum benar.
  // Bentuk lain yang juga benar (mis. 0,5 untuk 1/2) ditulis guru sebagai jawaban yang diterima.
  const fa = fractionForm(expected);
  const fb = fractionForm(given);
  if (fa || fb) return fa === fb && (!a.unit || !b.unit || a.unit === b.unit);
  if (!close(a.value, b.value)) return false;
  return !a.unit || !b.unit || a.unit === b.unit;
}

/** "1 / 2", "½", "-3/4", "1 1/2" → bentuk baku "1/2", "-3/4", "1 1/2"; null bila bukan pecahan. */
function fractionForm(raw: string): string | null {
  const s = plainMath(raw).normalize("NFKC").replace(/[−–—]/g, "-").replace(/⁄/g, "/").trim();
  const m = s.match(/^(-?)\s*(?:(\d+)\s+)?(\d+)\s*\/\s*(\d+)/);
  if (!m) return null;
  return `${m[1]}${m[2] ? `${Number(m[2])} ` : ""}${Number(m[3])}/${Number(m[4])}`;
}

// ---------------------------------------------------------------------------
// Menghitung ulang ekspresi (untuk memeriksa kunci jawaban buatan AI)

type Token = { t: "num"; v: number } | { t: "op"; v: string } | { t: "fn"; v: string } | { t: "var"; v: string };

/**
 * Pecah ekspresi menjadi token. Tanpa `withVars`, huruf x/X berarti kali (hitungan AI: "3 x 4");
 * dengan `withVars`, setiap huruf adalah variabel ("2x^2 - 3x") dan x hanya berarti kali di antara dua angka.
 */
/** Pangkat huruf kecil ditulis ulang dengan "^" sebelum NFKC (NFKC mengubah "x²" menjadi "x2"). */
function supToCaret(s: string): string {
  return s.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]+/g, (e) => `^${[...e].map((c) => SUPERSCRIPT[c]).join("")}`);
}

function tokenize(expr: string, withVars = false): Token[] | null {
  let s = supToCaret(plainMath(expr))
    .normalize("NFKC")
    .replace(/[−–—]/g, "-")
    .replace(/[·⋅×]/g, "*")
    .replace(/[÷:]/g, "/")
    .replace(/\*\*/g, "^")
    .replace(/√/g, "sqrt")
    .replace(/π/g, "pi")
    .replace(/,/g, ".");
  s = withVars ? s.replace(/(\d)\s*[xX]\s*(?=\d)/g, "$1*") : s.replace(/[xX]/g, "*");
  const out: Token[] = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    const num = s.slice(i).match(/^\d+(?:\.\d+)?/);
    if (num) {
      out.push({ t: "num", v: Number(num[0]) });
      i += num[0].length;
      continue;
    }
    const word = s.slice(i).match(/^[A-Za-z]+/)?.[0];
    if (word) {
      // Satu rangkaian huruf: fungsi (sqrt/akar), konstanta pi, lalu variabel satu huruf ("xy" = x·y).
      let j = 0;
      while (j < word.length) {
        const rest = word.slice(j).toLowerCase();
        if (rest.startsWith("sqrt") || rest.startsWith("akar")) {
          out.push({ t: "fn", v: "sqrt" });
          j += 4;
        } else if (rest.startsWith("pi")) {
          out.push({ t: "var", v: "π" });
          j += 2;
        } else if (withVars) {
          out.push({ t: "var", v: word[j] });
          j++;
        } else return null;
      }
      i += word.length;
      continue;
    }
    if ("+-*/^()%".includes(c)) {
      out.push({ t: "op", v: c });
      i++;
      continue;
    }
    return null;
  }
  return out;
}

/** Hitung token dengan nilai variabel `vars`. null bila tidak bisa dibaca atau tidak terdefinisi (bagi 0, akar negatif). */
function run(tokens: Token[], vars: Record<string, number> = {}): number | null {
  let pos = 0;
  const peek = () => tokens[pos];
  const isOp = (v: string) => peek()?.t === "op" && peek()!.v === v;

  function primary(): number | null {
    const tok = peek();
    if (!tok) return null;
    if (tok.t === "num" || tok.t === "var") {
      pos++;
      let v = tok.t === "num" ? tok.v : tok.v === "π" ? Math.PI : vars[tok.v];
      if (v === undefined) return null;
      if (isOp("%")) {
        pos++;
        v /= 100;
      }
      return v;
    }
    if (tok.t === "fn") {
      pos++;
      const arg = unary();
      return arg === null || arg < 0 ? null : Math.sqrt(arg);
    }
    if (isOp("(")) {
      pos++;
      const v = expression();
      if (!isOp(")")) return null;
      pos++;
      return v;
    }
    return null;
  }
  function power(): number | null {
    const base = primary();
    if (base === null) return null;
    if (isOp("^")) {
      pos++;
      const exp = unary();
      return exp === null ? null : Math.pow(base, exp);
    }
    return base;
  }
  function unary(): number | null {
    if (isOp("-")) {
      pos++;
      const v = unary();
      return v === null ? null : -v;
    }
    if (isOp("+")) {
      pos++;
      return unary();
    }
    return power();
  }
  function term(): number | null {
    let v = unary();
    while (v !== null && (isOp("*") || isOp("/") || peek()?.t === "fn" || peek()?.t === "var" || isOp("("))) {
      // Perkalian tanpa tanda: 2(3+4), 2√9, 3x
      const op = isOp("*") || isOp("/") ? tokens[pos++].v : "*";
      const r = unary();
      if (r === null) return null;
      if (op === "/" && r === 0) return null;
      v = op === "*" ? v * r : v / r;
    }
    return v;
  }
  function expression(): number | null {
    let v = term();
    while (v !== null && (isOp("+") || isOp("-"))) {
      const op = tokens[pos++].v;
      const r = term();
      if (r === null) return null;
      v = op === "+" ? v + r : v - r;
    }
    return v;
  }

  const result = expression();
  if (result === null || pos !== tokens.length || !Number.isFinite(result)) return null;
  return result;
}

/**
 * Hitung ekspresi aritmetika sederhana: + − × ÷ : / ^ % ( ) √ π, juga LaTeX ($\frac{3}{4} \times 8$).
 * Angka desimal boleh pakai koma atau titik. Tidak memakai eval. null bila tidak bisa dibaca.
 */
export function evaluate(expr: string): number | null {
  if (!expr || expr.length > 200) return null;
  const tokens = tokenize(expr);
  if (!tokens?.length) return null;
  const result = run(tokens);
  return result === null ? null : Math.round(result * 1e9) / 1e9;
}

/**
 * Apakah dua ekspresi aljabar setara ("2(x+1)" dan "2x+2", "sqrt(x+2)" dan "(x+2)^(1/2)").
 * Diperiksa dengan menghitung keduanya pada beberapa nilai variabel. null = tidak bisa diperiksa
 * (bukan ekspresi, memuat "=", atau lebih dari 3 variabel).
 */
export function equivalent(a: string, b: string): boolean | null {
  if (a.length > 200 || b.length > 200) return null;
  const ta = tokenize(a, true);
  const tb = tokenize(b, true);
  if (!ta?.length || !tb?.length) return null;
  const names = [...new Set([...ta, ...tb].flatMap((t) => (t.t === "var" && t.v !== "π" ? [t.v] : [])))];
  if (names.length > 3) return null;
  const samples = [0.37, 1.3, 2.1, 3.7, -0.6, 5.2, -2.3, 0.81, 7.9, -4.4];
  let checked = 0;
  for (let k = 0; k < samples.length; k++) {
    const vars = Object.fromEntries(names.map((n, idx) => [n, samples[(k + idx * 3) % samples.length]]));
    const va = run(ta, vars);
    const vb = run(tb, vars);
    if (va === null || vb === null) continue; // di luar daerah asal salah satunya
    if (Math.abs(va - vb) > 1e-7 * Math.max(1, Math.abs(va), Math.abs(vb))) return false;
    checked++;
  }
  return checked >= 4 ? true : null;
}

/**
 * Bentuk baku ekspresi untuk dibandingkan apa adanya: LaTeX → hitung biasa, tanpa spasi, simbol diseragamkan.
 * "$\sqrt{x+2}$", "√(x+2)", "sqrt( x + 2 )" → "sqrt(x+2)"; "2·x" → "2x"; "x²" → "x^2".
 */
export function mathCanon(raw: string): string {
  return supToCaret(plainMath(raw))
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[−–—]/g, "-")
    .replace(/[×·⋅]/g, "*")
    .replace(/÷/g, "/")
    .replace(/\*\*/g, "^")
    .replace(/√/g, "sqrt")
    .replace(/akar/g, "sqrt")
    .replace(/π/g, "pi")
    .replace(/\s+/g, "")
    .replace(/[.]$/, "")
    .replace(/sqrt([a-z0-9.]+)/g, "sqrt($1)")
    .replace(/([\da-z)])\*(?=[a-z(])/g, "$1")
    .replace(/\^\((-?[\w.]+)\)/g, "^$1");
}

/** Jawaban yang berupa rumus/ekspresi (bukan kata): memuat LaTeX, akar, pangkat, atau operasi di antara angka/variabel. */
export function looksLikeExpression(s: string): boolean {
  const t = s.normalize("NFKC");
  return (
    /[$\\√^²³×÷*=<>≤≥]/.test(t) ||
    /\b(?:sqrt|akar)\s*\(/i.test(t) ||
    /[\p{L}\d)]\s*\+\s*[\p{L}\d(]/u.test(t) ||
    /\d\s*\/\s*[\p{L}\d(]|[\p{L})]\s*\/\s*\d/u.test(t) ||
    /(?:\d|\b[a-z]|\))\s*[-−]\s*(?:\d|[a-z]\b|\()/i.test(t)
  );
}

/** Angka dalam tulisan Indonesia: 3.5 → "3,5", 1500 → "1.500". */
export function formatNumber(n: number): string {
  return n.toLocaleString("id-ID", { maximumFractionDigits: 6 });
}

// ---------------------------------------------------------------------------
// Membacakan simbol matematika

const UNIT_WORD: Record<string, string> = {
  mm: "milimeter",
  cm: "sentimeter",
  dm: "desimeter",
  m: "meter",
  km: "kilometer",
  mg: "miligram",
  g: "gram",
  kg: "kilogram",
  ml: "mililiter",
  l: "liter",
  ha: "hektare",
};

/**
 * Teks untuk suara: "3 × 4 = 12" → "3 kali 4 sama dengan 12", "1/2" → "1 per 2", "s²" → "s kuadrat",
 * "-3" → "negatif 3", "5 cm²" → "5 sentimeter persegi". Teks biasa tidak berubah.
 */
export function spokenMath(text: string): string {
  let s = hasMath(text) ? mathToSpeech(text) : text;
  // Satuan luas/volume dan satuan setelah angka.
  s = s.replace(/(\d)\s*(mm|cm|dm|km|m)(²|\^2)(?![\p{L}\d])/gu, (_, d, u) => `${d} ${UNIT_WORD[u]} persegi`);
  s = s.replace(/(\d)\s*(mm|cm|dm|km|m)(³|\^3)(?![\p{L}\d])/gu, (_, d, u) => `${d} ${UNIT_WORD[u]} kubik`);
  s = s.replace(/(\d)\s*(mm|cm|dm|km|m|mg|kg|g|ml|l|ha)(?![\p{L}\d²³^])/gu, (_, d, u) => `${d} ${UNIT_WORD[u]}`);
  s = s.replace(/°\s*C\b/g, " derajat Celsius").replace(/°/g, " derajat");
  // Pangkat
  s = s.replace(/([\p{L}\d)])\s*(\^2|²)(?![\d])/gu, "$1 kuadrat");
  s = s.replace(/([\p{L}\d)])\s*(\^3|³)(?![\d])/gu, "$1 pangkat tiga");
  s = s.replace(/([\p{L}\d)])\s*\^\s*\(?(-?\d+)\)?/gu, "$1 pangkat $2");
  s = s.replace(/([\p{L}\d)])([⁰¹²³⁴⁵⁶⁷⁸⁹]+)/gu, (_, b, e: string) => `${b} pangkat ${[...e].map((c) => SUPERSCRIPT[c]).join("")}`);
  s = s.replace(/√\s*/g, "akar ");
  // Pecahan (bukan tanggal 15/10/2026) dan bilangan campuran "1 1/2".
  s = s.replace(/(^|[^\d/])(\d{1,4})\s*\/\s*(\d{1,4})(?![\d/])/g, "$1$2 per $3");
  s = s.replace(/[½]/g, " 1 per 2").replace(/[¼]/g, " 1 per 4").replace(/[¾]/g, " 3 per 4");
  // Operasi
  s = s.replace(/(\d|\))\s*[×xX*·]\s*(?=[\d(])/g, "$1 kali ");
  s = s.replace(/(\d|\))\s*[÷]\s*(?=[\d(])/g, "$1 dibagi ");
  s = s.replace(/(\d|\))\s+:\s+(?=[\d(])/g, "$1 dibagi ");
  s = s.replace(/\s*≠\s*/g, " tidak sama dengan ");
  s = s.replace(/\s*≈\s*/g, " kira-kira ");
  s = s.replace(/\s*≤\s*/g, " kurang dari atau sama dengan ");
  s = s.replace(/\s*≥\s*/g, " lebih dari atau sama dengan ");
  s = s.replace(/(\S)\s*<\s*(?=\S)/g, "$1 kurang dari ");
  s = s.replace(/(\S)\s*>\s*(?=\S)/g, "$1 lebih dari ");
  s = s.replace(/\s*=\s*/g, " sama dengan ");
  s = s.replace(/(\d|\))\s*\+\s*(?=[\d(-])/g, "$1 tambah ");
  s = s.replace(/(\d|\))\s+[-−]\s+(?=[\d(])/g, "$1 kurang ");
  // Bilangan negatif: di awal, setelah spasi, kurung, atau kata operasi.
  s = s.replace(/(^|[\s(])[-−](\d)/g, "$1negatif $2");
  s = s.replace(/(\d)\s*%/g, "$1 persen");
  s = s.replace(/\bπ\b|π/g, "pi");
  return s.replace(/\s{2,}/g, " ").trim();
}

// ---------------------------------------------------------------------------
// Pemeriksaan hitungan pada soal

export type CalcCheck = { ok: boolean; value: number | null; message: string };

/**
 * Bandingkan hasil `calc` (ekspresi dari AI/guru) dengan kunci jawaban soal.
 * null = soal tidak punya hitungan, atau jenis soalnya tidak bisa diperiksa (benar/salah, menjodohkan).
 */
export function checkCalc(q: {
  type?: string;
  calc?: string;
  options: string[];
  answer: number;
  accepted?: string[];
}): CalcCheck | null {
  const calc = q.calc?.trim();
  if (!calc) return null;
  const type = q.type ?? "pg";
  if (type !== "pg" && type !== "isian") return null;
  const value = evaluate(calc);
  if (value === null) return { ok: false, value: null, message: `Hitungan "${plainMath(calc)}" tidak bisa dibaca. Periksa kunci secara manual.` };
  const key = plainMath(type === "pg" ? (q.options[q.answer] ?? "") : (q.accepted?.[0] ?? ""));
  const parsed = parseAnswerNumber(key);
  if (!parsed) return { ok: false, value, message: `Kunci "${key}" bukan angka, padahal hitungannya ${formatNumber(value)}.` };
  if (!close(parsed.value, value)) {
    return { ok: false, value, message: `Hitungan ${calc} = ${formatNumber(value)}, tetapi kunci jawabannya "${key}".` };
  }
  if (type === "pg") {
    // Pecahan lain yang senilai (6/8 untuk 3/4) wajar sebagai pengecoh soal menyederhanakan, jadi tidak ditandai.
    const keyForm = fractionForm(key);
    const twin = q.options.findIndex((o, i) => {
      if (i === q.answer) return false;
      const n = parseAnswerNumber(o);
      if (!n || !close(n.value, value)) return false;
      const form = fractionForm(o);
      return !(keyForm && form && form !== keyForm);
    });
    if (twin >= 0) return { ok: false, value, message: `Pilihan "${plainMath(q.options[twin])}" juga bernilai ${formatNumber(value)}.` };
  }
  return { ok: true, value, message: `Hitungan cocok: ${calc} = ${formatNumber(value)}.` };
}

// ---------------------------------------------------------------------------
// Angka baru di draf AI (pemeriksa kesetiaan tanpa AI)

/** Angka di teks, tanpa nomor urut daftar ("1. ") dan tanpa ID gambar. */
function numbersIn(text: string): { token: string; value: number }[] {
  // Rumus LaTeX dibaca sebagai hitungan biasa dulu: \frac{3}{4} → 3/4, 1\,000 → 1000, 3{,}5 → 3,5.
  const cleaned = (hasMath(text) ? mathToPlain(text) : text)
    .split("\n")
    .map((l) => l.replace(/^\s*(?:[-*•>]\s*)?\d{1,3}[.)]\s+/, " ").replace(/\(gambar:[^)]*\)/g, " "))
    .join("\n");
  const out: { token: string; value: number }[] = [];
  for (const m of cleaned.matchAll(/\d+(?:[.,]\d+)*/g)) {
    const before = cleaned[(m.index ?? 0) - 1] ?? "";
    if (/[\p{L}_]/u.test(before)) continue; // bagian dari kata/kode, mis. "H2O", "COVID19"
    const token = m[0].replace(/[.,]$/, "");
    const parsed = parseAnswerNumber(token);
    if (parsed) out.push({ token, value: parsed.value });
  }
  return out;
}

/**
 * Angka yang muncul di draf tetapi tidak ada di teks sumber. Dipakai untuk menandai versi/perangkat AI
 * yang menambah atau mengubah angka (pemeriksaan pasti, tanpa AI).
 */
export function newNumbers(source: string, draft: string): string[] {
  const known = new Set(numbersIn(source).map((n) => n.value));
  const seen = new Set<number>();
  const out: string[] = [];
  for (const n of numbersIn(draft)) {
    if (known.has(n.value) || seen.has(n.value)) continue;
    seen.add(n.value);
    out.push(n.token);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Pemeriksaan hasil "Ubah rumus ke LaTeX"

/** Nama fungsi di rumus tulisan biasa (sqrt(x), akar(x), sin x) yang wajar hilang setelah ditulis dengan LaTeX. */
const LATEX_WORDS = new Set("sqrt akar abs exp sin cos tan sec csc cot log lim max min".split(" "));

/**
 * Kata-kata (≥ 3 huruf) di teks, tanpa nama perintah LaTeX (\\frac, \\lim, \\varepsilon, \\begin{aligned} …)
 * dan tanpa nama fungsi tulisan biasa (sqrt, akar). Isi \\text{…} tetap dihitung sebagai kata.
 */
function proseWords(t: string): Set<string> {
  const flat = t
    .replace(/\\(?:text|textbf|textit|mathrm|mathbf|mathit|operatorname|mbox)\s*\{([^{}]*)\}/g, " $1 ")
    .replace(/\\[A-Za-z]+/g, " ")
    .toLowerCase();
  return new Set((flat.match(/\p{L}{3,}/gu) ?? []).filter((w) => !LATEX_WORDS.has(w)));
}

/**
 * Bila hasil satu bagian ditolak, periksa baris demi baris (daftar, tabel, langkah bernomor): baris yang aman
 * dipakai, baris yang angka/katanya berubah tetap seperti sumber. null bila jumlah barisnya berbeda.
 */
export function mergeLatexLines(source: string, output: string): { text: string; kept: number; changed: number } | null {
  const src = source.split("\n");
  const out = output.split("\n");
  if (src.length < 2 || src.length !== out.length) return null;
  let kept = 0;
  let changed = 0;
  const lines = src.map((s, i) => {
    const o = out[i];
    if (o.trim() === s.trim()) return s;
    if (latexConversionProblem(s, o)) {
      kept++;
      return s;
    }
    changed++;
    return o;
  });
  return { text: lines.join("\n"), kept, changed };
}

/**
 * Hasil AI yang mengubah penulisan rumus ke LaTeX hanya boleh mengubah cara menulis rumusnya:
 * tidak ada angka yang hilang atau bertambah, dan kata di luar rumus tetap. null = aman; selain itu alasannya.
 */
export function latexConversionProblem(source: string, output: string): string | null {
  const src = supToCaret(source).normalize("NFKC");
  const added = newNumbers(src, output);
  if (added.length) return `angka baru: ${added.slice(0, 3).join(", ")}`;
  const lost = newNumbers(output, src);
  if (lost.length) return `angka hilang: ${lost.slice(0, 3).join(", ")}`;
  const a = proseWords(src);
  const b = proseWords(output);
  const tolerance = Math.max(2, Math.ceil(a.size * 0.03));
  const extra = [...b].filter((w) => !a.has(w));
  if (extra.length > tolerance) return `kata baru: ${extra.slice(0, 3).join(", ")}`;
  const missing = [...a].filter((w) => !b.has(w));
  if (missing.length > tolerance) return `kata hilang: ${missing.slice(0, 3).join(", ")}`;
  return null;
}

