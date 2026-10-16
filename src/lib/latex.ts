// Rumus LaTeX di materi Selaras (server & browser).
//   $...$ atau \(...\)   rumus di dalam kalimat, mis. $x^2 - x - 2 = 0$
//   $$...$$ atau \[...\] rumus di baris sendiri
// Ditampilkan dengan KaTeX (reader-text.tsx). Modul ini mencari rumusnya, mengubah LaTeX menjadi kata untuk
// dibacakan ("x kuadrat kurang x ..."), dan menjadi teks hitung biasa untuk memeriksa jawaban ("sqrt(x+2)").
// Semuanya tanpa AI dan tanpa regex lookbehind (Safari lama).

export type MathMatch = { start: number; end: number; tex: string; display: boolean };

/**
 * Rumus yang dimulai tepat di `i`, atau null. Aturan $...$ mengikuti Pandoc supaya harga/teks biasa aman:
 * pembuka tidak diikuti spasi, penutup tidak didahului spasi dan tidak langsung diikuti angka.
 */
export function mathAt(s: string, i: number): MathMatch | null {
  if (s[i] === "\\" && (s[i + 1] === "(" || s[i + 1] === "[")) {
    const close = s[i + 1] === "(" ? "\\)" : "\\]";
    const end = s.indexOf(close, i + 2);
    if (end < 0) return null;
    const tex = s.slice(i + 2, end).trim();
    return tex ? { start: i, end: end + 2, tex, display: s[i + 1] === "[" } : null;
  }
  if (s[i] !== "$" || s[i - 1] === "\\") return null;
  if (s[i + 1] === "$") {
    let j = i + 2;
    while (j < s.length) {
      const k = s.indexOf("$$", j);
      if (k < 0) return null;
      if (s[k - 1] !== "\\") {
        const tex = s.slice(i + 2, k).trim();
        return tex ? { start: i, end: k + 2, tex, display: true } : null;
      }
      j = k + 2;
    }
    return null;
  }
  const first = s[i + 1];
  if (!first || /\s/.test(first)) return null;
  for (let k = i + 1; k < s.length; k++) {
    if (s[k] === "\\") {
      k++;
      continue;
    }
    if (s[k] === "\n" && s[k + 1] === "\n") return null;
    if (s[k] !== "$") continue;
    if (/\s/.test(s[k - 1]) || /\d/.test(s[k + 1] ?? "")) return null;
    const tex = s.slice(i + 1, k);
    return tex.trim() ? { start: i, end: k + 1, tex, display: false } : null;
  }
  return null;
}

/** Semua rumus di teks, berurutan. */
export function findMath(s: string): MathMatch[] {
  const out: MathMatch[] = [];
  for (let i = 0; i < s.length; i++) {
    if (s[i] !== "$" && s[i] !== "\\") continue;
    const m = mathAt(s, i);
    if (m) {
      out.push(m);
      i = m.end - 1;
    }
  }
  return out;
}

export function hasMath(s: string): boolean {
  return findMath(s).length > 0;
}

// ---------------------------------------------------------------------------
// Membaca LaTeX

/** Isi grup {…} yang dimulai di s[i] === "{" → [isi, indeks setelah "}"]. */
function group(s: string, i: number): [string, number] {
  if (s[i] !== "{") {
    // Argumen satu karakter/perintah tanpa kurung kurawal, mis. \frac12 atau x^2.
    if (s[i] === "\\") {
      const m = s.slice(i).match(/^\\[A-Za-z]+/);
      if (m) return [m[0], i + m[0].length];
    }
    return [s[i] ?? "", i + 1];
  }
  let depth = 0;
  for (let k = i; k < s.length; k++) {
    if (s[k] === "\\") {
      k++;
      continue;
    }
    if (s[k] === "{") depth++;
    else if (s[k] === "}" && --depth === 0) return [s.slice(i + 1, k), k + 1];
  }
  return [s.slice(i + 1), s.length];
}

const skipSpace = (s: string, i: number) => {
  while (s[i] === " ") i++;
  return i;
};

const WORD: Record<string, string> = {
  times: " kali ",
  cdot: " kali ",
  div: " dibagi ",
  pm: " plus minus ",
  mp: " minus plus ",
  le: " kurang dari atau sama dengan ",
  leq: " kurang dari atau sama dengan ",
  leqslant: " kurang dari atau sama dengan ",
  ge: " lebih dari atau sama dengan ",
  geq: " lebih dari atau sama dengan ",
  geqslant: " lebih dari atau sama dengan ",
  ne: " tidak sama dengan ",
  neq: " tidak sama dengan ",
  approx: " kira-kira ",
  equiv: " ekuivalen dengan ",
  to: " menuju ",
  rightarrow: " menuju ",
  Rightarrow: " maka ",
  implies: " maka ",
  infty: " tak hingga ",
  pi: " pi ",
  alpha: " alfa ",
  beta: " beta ",
  gamma: " gamma ",
  delta: " delta ",
  Delta: " delta ",
  epsilon: " epsilon ",
  theta: " teta ",
  lambda: " lambda ",
  mu: " mu ",
  rho: " rho ",
  sigma: " sigma ",
  Sigma: " sigma ",
  phi: " fi ",
  omega: " omega ",
  sum: " jumlah ",
  prod: " hasil kali ",
  int: " integral ",
  lim: " limit ",
  log: " log ",
  ln: " ln ",
  sin: " sin ",
  cos: " cos ",
  tan: " tan ",
  circ: " derajat ",
  degree: " derajat ",
  angle: " sudut ",
  triangle: " segitiga ",
  perp: " tegak lurus ",
  parallel: " sejajar ",
  in: " anggota ",
  cdots: " dan seterusnya ",
  ldots: " dan seterusnya ",
  dots: " dan seterusnya ",
  square: " kotak kosong ",
  Box: " kotak kosong ",
  "%": " persen ",
};

const POWER_WORD: Record<string, string> = { "2": " kuadrat", "3": " pangkat tiga" };

/** LaTeX → kata Bahasa Indonesia untuk dibacakan. "x^2 - x - 2 = 0" → "x kuadrat kurang x kurang 2 sama dengan 0". */
export function latexToSpeech(tex: string): string {
  const spoken = speakTex(tex);
  return spoken
    .replace(/−/g, "-")
    // Minus di antara dua suku = "kurang"; minus di awal, setelah "(" atau "=" = "negatif".
    .replace(/([\w)])\s*-\s*/g, "$1 kurang ")
    .replace(/-\s*/g, " negatif ")
    .replace(/\s*\+\s*/g, " tambah ")
    .replace(/\s*=\s*/g, " sama dengan ")
    .replace(/\s*<\s*/g, " kurang dari ")
    .replace(/\s*>\s*/g, " lebih dari ")
    .replace(/\s*\/\s*/g, " per ")
    .replace(/\s*\*\s*/g, " kali ")
    .replace(/(\w)!/g, "$1 faktorial")
    .replace(/[{}]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:])/g, "$1")
    .trim();
}

function speakTex(s: string): string {
  let out = "";
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === "\\") {
      const name = s.slice(i + 1).match(/^([A-Za-z]+|.)/)?.[1] ?? "";
      i += 1 + name.length;
      if (name === "frac" || name === "dfrac" || name === "tfrac") {
        const [a, j] = group(s, skipSpace(s, i));
        const [b, k] = group(s, skipSpace(s, j));
        out += ` ${speakTex(a)} per ${speakTex(b)} `;
        i = k;
      } else if (name === "sqrt") {
        let n = "";
        if (s[i] === "[") {
          const close = s.indexOf("]", i);
          n = s.slice(i + 1, close);
          i = close + 1;
        }
        const [a, j] = group(s, skipSpace(s, i));
        out += n ? ` akar pangkat ${speakTex(n)} dari ${speakTex(a)} ` : ` akar dari ${speakTex(a)} `;
        i = j;
      } else if (["text", "mathrm", "textbf", "mathbf", "operatorname", "textit", "mathit", "mbox"].includes(name)) {
        const [a, j] = group(s, skipSpace(s, i));
        out += ` ${a} `;
        i = j;
      } else if (["left", "right", "big", "Big", "bigg", "Bigg", "displaystyle", "limits"].includes(name)) {
        // pembungkus tampilan, tidak dibacakan
      } else if ([",", ";", ":", "!", " ", "quad", "qquad"].includes(name)) {
        out += " ";
      } else if (name === "{" || name === "}" || name === "$" || name === "#" || name === "&" || name === "_") {
        out += " ";
      } else {
        out += WORD[name] ?? ` ${name} `;
      }
      continue;
    }
    if (c === "^") {
      const [a, j] = group(s, skipSpace(s, i + 1));
      const inner = a.trim();
      out += inner === "\\circ" ? " derajat" : (POWER_WORD[inner] ?? ` pangkat ${speakTex(inner)}`);
      out += " ";
      i = j;
      continue;
    }
    if (c === "_") {
      const [a, j] = group(s, skipSpace(s, i + 1));
      out += ` ${speakTex(a)} `;
      i = j;
      continue;
    }
    if (c === "%") {
      out += " persen ";
      i++;
      continue;
    }
    if (c === "&") {
      i++;
      continue;
    }
    if (s.startsWith("{,}", i) || s.startsWith("{.}", i)) {
      out += s[i + 1]; // 3{,}5 dibaca "3,5"
      i += 3;
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

/**
 * LaTeX → teks hitung biasa (untuk mencocokkan jawaban dan menghitung ulang):
 * "\frac{1}{2}" → "1/2", "\sqrt{x+2}" → "sqrt(x+2)", "x^{2}" → "x^(2)", "3 \times 4" → "3*4".
 */
export function latexToPlain(tex: string): string {
  let out = "";
  let i = 0;
  const s = tex;
  const simple = (t: string) => /^-?[\w.,]+$/.test(t.trim());
  while (i < s.length) {
    const c = s[i];
    if (c === "\\") {
      const name = s.slice(i + 1).match(/^([A-Za-z]+|.)/)?.[1] ?? "";
      i += 1 + name.length;
      if (name === "frac" || name === "dfrac" || name === "tfrac") {
        const [a, j] = group(s, skipSpace(s, i));
        const [b, k] = group(s, skipSpace(s, j));
        const pa = latexToPlain(a);
        const pb = latexToPlain(b);
        // Bilangan campuran 1\frac{1}{2} → "1 1/2", bukan "11/2".
        if (/\d$/.test(out)) out += " ";
        out += `${simple(pa) ? pa : `(${pa})`}/${simple(pb) ? pb : `(${pb})`}`;
        i = k;
      } else if (name === "sqrt") {
        let n = "";
        if (s[i] === "[") {
          const close = s.indexOf("]", i);
          n = s.slice(i + 1, close);
          i = close + 1;
        }
        const [a, j] = group(s, skipSpace(s, i));
        out += n ? `(${latexToPlain(a)})^(1/(${latexToPlain(n)}))` : `sqrt(${latexToPlain(a)})`;
        i = j;
      } else if (["text", "mathrm", "textbf", "mathbf", "operatorname", "textit", "mathit", "mbox"].includes(name)) {
        const [a, j] = group(s, skipSpace(s, i));
        out += a;
        i = j;
      } else if (name === "times" || name === "cdot") out += "*";
      else if (name === "div") out += "/";
      else if (name === "pi") out += "pi";
      else if (name === "le" || name === "leq") out += "<=";
      else if (name === "ge" || name === "geq") out += ">=";
      else if (name === "ne" || name === "neq") out += "!=";
      else if (name === "%") out += "%";
      else if (name === "{") out += "(";
      else if (name === "}") out += ")";
      else if (["left", "right", ",", ";", ":", "!", " ", "quad", "qquad", "displaystyle", "big", "Big"].includes(name)) {
        // abaikan
      } else out += name;
      continue;
    }
    if (c === "^") {
      const [a, j] = group(s, skipSpace(s, i + 1));
      const p = latexToPlain(a);
      out += simple(p) ? `^${p}` : `^(${p})`;
      i = j;
      continue;
    }
    if (s.startsWith("{,}", i) || s.startsWith("{.}", i)) {
      out += s[i + 1]; // koma desimal gaya LaTeX: 3{,}5
      i += 3;
      continue;
    }
    if (c === "{") out += "(";
    else if (c === "}") out += ")";
    else if (c !== "$") out += c;
    i++;
  }
  return out.replace(/\s+/g, " ").trim();
}

/** Teks yang mungkin berisi $...$: setiap rumus diganti bentuk hitung biasa. */
export function mathToPlain(text: string): string {
  const parts = findMath(text);
  if (!parts.length) return text;
  let out = "";
  let last = 0;
  for (const m of parts) {
    out += text.slice(last, m.start) + latexToPlain(m.tex);
    last = m.end;
  }
  return out + text.slice(last);
}

/** Teks yang mungkin berisi $...$: setiap rumus diganti kata untuk dibacakan. */
export function mathToSpeech(text: string): string {
  const parts = findMath(text);
  if (!parts.length) return text;
  let out = "";
  let last = 0;
  for (const m of parts) {
    out += text.slice(last, m.start) + latexToSpeech(m.tex);
    last = m.end;
  }
  return out + text.slice(last);
}

/**
 * Perbaikan LaTeX yang rusak karena escape JSON: "\frac" yang ditulis model tanpa garis miring ganda
 * terbaca sebagai karakter kontrol (\f = form feed, \t = tab, \b = backspace, \r = carriage return).
 * Karakter kontrol itu tidak pernah dipakai di materi, jadi aman dikembalikan menjadi perintah LaTeX.
 */
export function repairLatexEscapes(s: string): string {
  if (!/[\f\u0008\t\r\u000b\n]/.test(s)) return s;
  return s
    .replace(/\f(?=[a-z])/g, "\\f")
    .replace(/\u0008(?=[a-z])/g, "\\b")
    .replace(/\t(?=(?:imes|ext(?:bf|it)?|heta|riangle|frac|an|o|au)(?![a-z]))/g, "\\t")
    .replace(/\r(?=(?:ight|ho|angle)(?![a-z]))/g, "\\r")
    .replace(/\n(?=(?:eq|abla)(?![a-z]))/g, "\\n")
    .replace(/\u000b(?=[a-z])/g, "\\v");
}

/** Teks tanpa rumus $...$ (diganti spasi). */
export function stripMath(text: string): string {
  const parts = findMath(text);
  if (!parts.length) return text;
  let out = "";
  let last = 0;
  for (const m of parts) {
    out += `${text.slice(last, m.start)} `;
    last = m.end;
  }
  return out + text.slice(last);
}

const PLAIN_MATH = [
  /(?:^|[^\d/.,])\d{1,4}\s*\/\s*\d{1,4}(?![\d/])/g, // pecahan 3/4 (bukan tanggal 15/10/2026)
  /[\p{L}\d)]\s*\^\s*[\p{L}\d(-]/gu, // pangkat x^2
  /√|\bsqrt\s*\(/g, // akar
  /[\p{L}\d)][²³⁴]/gu, // pangkat kecil x²
  /\d\s*[×x*÷]\s*\d/g, // 3 × 4
  /\d\s*[+\-−]\s*\d+\s*=/g, // 5 + 3 =
];

/**
 * Banyaknya rumus yang masih ditulis biasa (di luar $...$): 3/4, x^2, √x, x², 3 × 4, 5 + 3 =.
 * Dipakai untuk menawarkan "Ubah rumus ke LaTeX" kepada guru.
 */
export function plainMathSpots(text: string): number {
  const rest = stripMath(text)
    .split("\n")
    .filter((l) => !/^!\[[^\]]*\]\(gambar:/.test(l.trim()))
    .join("\n");
  return PLAIN_MATH.reduce((n, re) => n + (rest.match(re)?.length ?? 0), 0);
}

/**
 * Model kadang menulis perintah LaTeX dengan garis miring ganda ("\\frac") di dalam string JSON yang sudah benar,
 * sehingga KaTeX membacanya sebagai ganti baris + "frac". Bila sumbernya tidak memakai "\\", kembalikan ke satu.
 */
export function fixDoubledBackslashes(source: string, output: string): string {
  if (source.includes("\\\\") || !/\\\\[A-Za-z]/.test(output)) return output;
  return output.replace(/\\\\(?=[A-Za-z])/g, "\\");
}

/**
 * Materi dipecah per paragraf (dipisah baris kosong) untuk "Ubah rumus ke LaTeX": hanya paragraf yang berisi
 * rumus tulisan biasa yang dikirim ke AI, dan tiap paragraf diperiksa sendiri, jadi satu paragraf yang gagal
 * tidak membatalkan seluruh materi. `parts.join("")` sama persis dengan teks asal.
 */
export function latexParagraphs(text: string): { parts: string[]; todo: number[] } {
  const parts = text.split(/(\n[ \t]*\n+)/);
  const todo = parts.flatMap((p, i) => (i % 2 === 0 && plainMathSpots(p) > 0 ? [i] : []));
  return { parts, todo };
}

/** Bagi daftar indeks menjadi beberapa permintaan (jumlah bagian dan panjang teks per permintaan dibatasi). */
export function latexBatches(parts: string[], todo: number[], maxItems = 20, maxChars = 6000): number[][] {
  const batches: number[][] = [];
  let cur: number[] = [];
  let chars = 0;
  for (const i of todo) {
    const len = parts[i].length;
    if (cur.length && (cur.length >= maxItems || chars + len > maxChars)) {
      batches.push(cur);
      cur = [];
      chars = 0;
    }
    cur.push(i);
    chars += len;
  }
  if (cur.length) batches.push(cur);
  return batches;
}

