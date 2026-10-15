// Dukungan Matematika (server & browser): membaca angka gaya Indonesia, mencocokkan jawaban angka,
// menghitung ulang ekspresi dari AI, dan mengubah simbol matematika menjadi kata untuk dibacakan.
// Semuanya tanpa AI, jadi hasilnya pasti dan bisa diuji.

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
  const s = raw
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
  const s = raw.normalize("NFKC").replace(/[−–—]/g, "-").replace(/⁄/g, "/").trim();
  const m = s.match(/^(-?)\s*(?:(\d+)\s+)?(\d+)\s*\/\s*(\d+)/);
  if (!m) return null;
  return `${m[1]}${m[2] ? `${Number(m[2])} ` : ""}${Number(m[3])}/${Number(m[4])}`;
}

// ---------------------------------------------------------------------------
// Menghitung ulang ekspresi (untuk memeriksa kunci jawaban buatan AI)

type Token = { t: "num"; v: number } | { t: "op"; v: string } | { t: "fn"; v: string };

function tokenize(expr: string): Token[] | null {
  const s = expr
    .normalize("NFKC")
    .replace(/[−–—]/g, "-")
    .replace(/[×xX·⋅]/g, "*")
    .replace(/[÷:]/g, "/")
    .replace(/√/g, "sqrt")
    .replace(/,/g, ".");
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
    if (s.startsWith("sqrt", i) || s.startsWith("akar", i)) {
      out.push({ t: "fn", v: "sqrt" });
      i += 4;
      continue;
    }
    const sup = SUPERSCRIPT[c];
    if (sup) {
      out.push({ t: "op", v: "^" }, { t: "num", v: Number(sup) });
      i++;
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

/**
 * Hitung ekspresi aritmetika sederhana: + − × ÷ : / ^ % ( ) √. Angka desimal boleh pakai koma atau titik.
 * Tidak memakai eval. null bila tidak bisa dibaca.
 */
export function evaluate(expr: string): number | null {
  if (!expr || expr.length > 200) return null;
  const parsed = tokenize(expr);
  if (!parsed?.length) return null;
  const tokens: Token[] = parsed;
  let pos = 0;
  const peek = () => tokens[pos];
  const isOp = (v: string) => peek()?.t === "op" && peek()!.v === v;

  function primary(): number | null {
    const tok = peek();
    if (!tok) return null;
    if (tok.t === "num") {
      pos++;
      let v = tok.v;
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
    while (v !== null && (isOp("*") || isOp("/") || peek()?.t === "fn" || isOp("("))) {
      // Perkalian tanpa tanda: 2(3+4) atau 2√9
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
  return Math.round(result * 1e9) / 1e9;
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
  let s = text;
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
  if (value === null) return { ok: false, value: null, message: `Hitungan "${calc}" tidak bisa dibaca. Periksa kunci secara manual.` };
  const key = type === "pg" ? (q.options[q.answer] ?? "") : (q.accepted?.[0] ?? "");
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
    if (twin >= 0) return { ok: false, value, message: `Pilihan "${q.options[twin]}" juga bernilai ${formatNumber(value)}.` };
  }
  return { ok: true, value, message: `Hitungan cocok: ${calc} = ${formatNumber(value)}.` };
}

// ---------------------------------------------------------------------------
// Angka baru di draf AI (pemeriksa kesetiaan tanpa AI)

/** Angka di teks, tanpa nomor urut daftar ("1. ") dan tanpa ID gambar. */
function numbersIn(text: string): { token: string; value: number }[] {
  const cleaned = text
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
