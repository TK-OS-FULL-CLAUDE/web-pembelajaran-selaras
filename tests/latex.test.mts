// Uji rumus LaTeX (src/lib/latex.ts): mencari $...$, membacakan rumus, mengubah ke hitungan biasa,
// mencocokkan jawaban rumus, dan pemeriksaan hasil "Ubah rumus ke LaTeX". Tanpa AI.
//   npm run test:mtk
import assert from "node:assert/strict";
import {
  findMath,
  hasMath,
  latexToPlain,
  latexToSpeech,
  mathToPlain,
  plainMathSpots,
  fixDoubledBackslashes,
  latexBatches,
  latexParagraphs,
  repairLatexEscapes,
} from "../src/lib/latex";
import {
  checkCalc,
  equivalent,
  evaluate,
  latexConversionProblem,
  mathCanon,
  mergeLatexLines,
  parseAnswerNumber,
  spokenMath,
} from "../src/lib/matematika";
import { answerMatches, isCorrect, playableQuestion } from "../src/lib/quiz";
import { parseBlocks, parseInline, plainText } from "../src/lib/text";
import type { QuizQuestion } from "../src/lib/types";

let passed = 0;
function test(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.log(`  ✗ ${name}`);
    throw err;
  }
}

console.log("Rumus LaTeX");

test("Mencari rumus $...$ tanpa salah menangkap harga atau tanda dolar biasa", () => {
  const tex = (s: string) => findMath(s).map((m) => m.tex);
  assert.deepEqual(tex("Selesaikan $x^2 - x - 2 = 0$ sekarang."), ["x^2 - x - 2 = 0"]);
  assert.deepEqual(tex("Hasil $\\frac{3}{4}$ dan $\\sqrt{x+2}$."), ["\\frac{3}{4}", "\\sqrt{x+2}"]);
  assert.deepEqual(tex("Harganya $5 dan $10."), [], "penutup didahului spasi → bukan rumus");
  assert.deepEqual(tex("Uang $ 5 $ saja."), [], "pembuka diikuti spasi → bukan rumus");
  assert.deepEqual(tex("Harga $5$10"), [], "penutup langsung diikuti angka → bukan rumus");
  assert.deepEqual(tex("Tanda \\$5 dan \\$6"), [], "\\$ adalah dolar biasa");
  assert.deepEqual(tex("Rumus \\(a+b\\) di kalimat"), ["a+b"]);
  const block = findMath("$$\\frac{1}{2} = \\frac{2}{4}$$");
  assert.equal(block[0].display, true);
  assert.equal(hasMath("Rp5.000 untuk 2 buku"), false);
});

test("Rumus dibacakan dalam Bahasa Indonesia", () => {
  assert.equal(latexToSpeech("x^2 - x - 2 = 0"), "x kuadrat kurang x kurang 2 sama dengan 0");
  assert.equal(latexToSpeech("\\frac{3}{4}"), "3 per 4");
  assert.equal(latexToSpeech("\\sqrt{x+2}"), "akar dari x tambah 2");
  assert.equal(latexToSpeech("3 \\times 4 = 12"), "3 kali 4 sama dengan 12");
  assert.equal(latexToSpeech("-3 + 5"), "negatif 3 tambah 5");
  assert.equal(latexToSpeech("90^\\circ"), "90 derajat");
  assert.equal(latexToSpeech("x^{3}"), "x pangkat tiga");
  assert.equal(latexToSpeech("\\sqrt[3]{8}"), "akar pangkat 3 dari 8");
  assert.equal(latexToSpeech("3{,}5 \\le x"), "3,5 kurang dari atau sama dengan x");
  assert.equal(latexToSpeech("\\frac{2}{3} = \\frac{\\square}{6}"), "2 per 3 sama dengan kotak kosong per 6");
});

test("LaTeX diubah ke hitungan biasa untuk diperiksa", () => {
  assert.equal(latexToPlain("\\frac{3}{4}"), "3/4");
  assert.equal(latexToPlain("\\frac{x+1}{2}"), "(x+1)/2");
  assert.equal(latexToPlain("\\sqrt{x+2}"), "sqrt(x+2)");
  assert.equal(latexToPlain("x^{\\frac{1}{2}} + 2"), "x^(1/2) + 2");
  assert.equal(latexToPlain("3 \\times 4 \\div 2"), "3 * 4 / 2");
  assert.equal(latexToPlain("1\\frac{1}{2}"), "1 1/2", "bilangan campuran");
  assert.equal(latexToPlain("3{,}5 + 1\\,000"), "3,5 + 1000");
  assert.equal(mathToPlain("Jadi $\\frac{6}{8} = \\frac{3}{4}$."), "Jadi 6/8 = 3/4.");
  assert.deepEqual(parseAnswerNumber("$\\frac{3}{4}$"), { value: 0.75, unit: "" });
  assert.deepEqual(parseAnswerNumber("$1\\frac{1}{2}$"), { value: 1.5, unit: "" });
  assert.deepEqual(parseAnswerNumber("$24\\text{ cm}$"), { value: 24, unit: "cm" });
  assert.equal(parseAnswerNumber("2x"), null, "2x adalah suku aljabar, bukan 2 dengan satuan x");
  assert.equal(evaluate("$\\frac{3}{4} \\times 8$"), 6);
  assert.equal(evaluate("2\\sqrt{9} + 1"), 7);
  assert.equal(evaluate("3²+1"), 10);
});

test("Rumus di materi: blok $$...$$ (satu atau beberapa baris) dan rumus di dalam kalimat", () => {
  const blocks = parseBlocks("Paragraf.\n\n$$\\frac{1}{2} = \\frac{2}{4}$$\n\n$$\nx^2 - 1\n= 0\n$$\n\n\\[a+b\\]");
  assert.deepEqual(
    blocks.filter((b) => b.type === "math").map((b) => (b as { tex: string }).tex),
    ["\\frac{1}{2} = \\frac{2}{4}", "x^2 - 1\n= 0", "a+b"],
  );
  // $$ yang tidak ditutup sebelum baris kosong tetap tampil sebagai teks biasa.
  assert.equal(parseBlocks("$$x^2\n\nlanjut")[0].type, "para");
  const inline = parseInline("Hitung $\\frac{3}{4}$ dari 8.");
  const mark = inline.marks.find((m) => m.type === "math")!;
  assert.equal(mark.tex, "\\frac{3}{4}");
  assert.equal(inline.plain, "Hitung 3 per 4 dari 8.", "teks polos = bacaan rumus (untuk suara & kalimat)");
  assert.equal(plainText("Hasilnya:\n\n$$x^2$$"), "Hasilnya:\nx kuadrat");
  assert.equal(spokenMath("Selesaikan $x^2 - 1 = 0$ dan 3 × 4 = 12."), "Selesaikan x kuadrat kurang 1 sama dengan 0 dan 3 kali 4 sama dengan 12.");
});

test("Jawaban rumus: bentuk penulisan boleh beda, isi harus sama", () => {
  const cases: [string, string, boolean, boolean][] = [
    ["sqrt(x+2)", "√(x+2)", false, true],
    ["sqrt(x+2)", "$\\sqrt{x+2}$", false, true],
    ["x^2-x-2", "x² - x - 2", false, true],
    ["3/4", "$\\frac{3}{4}$", false, true],
    ["x+2", "x-2", false, false],
    ["2x", "2", false, false],
    ["1/3", "2/6", false, false],
    ["2", "x = 2", false, true],
    ["2x+2", "2(x+1)", false, false],
    ["2x+2", "2(x+1)", true, true],
    ["(x-2)(x+1)", "x^2 - x - 2", true, true],
    ["(x-2)(x+1)", "x^2 + x - 2", true, false],
    ["Jawa-Bali", "jawa bali", false, true],
  ];
  for (const [a, g, setara, want] of cases) assert.equal(answerMatches(a, g, setara), want, `${a} | ${g} | setara=${setara}`);
  assert.equal(mathCanon("$\\sqrt{x+2}$"), "sqrt(x+2)");
  assert.equal(mathCanon("2·x"), "2x");
  assert.equal(equivalent("sqrt(x+2)", "(x+2)^(1/2)"), true);
  assert.equal(equivalent("$\\sqrt{x+2}$", "x^(1/2)+2"), false);
  assert.equal(equivalent("x = 2", "2"), null, "persamaan tidak dibandingkan nilainya");

  const q: QuizQuestion = { type: "isian", q: "Tulis $2(x+1)$ tanpa kurung.", options: [], answer: 0, accepted: ["2x+2"], explain: "", setara: true };
  const p = playableQuestion(q)!;
  assert.equal(p.setara, true, "pilihan setara ikut ke siswa");
  assert.equal(isCorrect(p, { type: "isian", text: "2 + 2x" }), true);
  assert.equal(isCorrect({ ...p, setara: undefined }, { type: "isian", text: "2 + 2x" }), false);
});

test("Kunci pilihan ganda LaTeX tetap diperiksa hitungannya", () => {
  const q = (options: string[], answer: number, calc: string) => ({ type: "pg", options, answer, calc });
  assert.equal(checkCalc(q(["$\\frac{2}{4}$", "$\\frac{2}{3}$"], 0, "1/2"))?.ok, true);
  const wrong = checkCalc(q(["$\\frac{1}{2}$", "$\\frac{1}{4}$"], 1, "3/4 - 1/4"))!;
  assert.equal(wrong.ok, false);
  assert.match(wrong.message, /kunci jawabannya "1\/4"/, "pesan memakai tulisan biasa, bukan LaTeX");
  const twin = checkCalc(q(["$6$", "$\\frac{24}{4}$", "$8$"], 0, "3/4*8"))!;
  assert.match(twin.message, /Pilihan "24\/4" juga bernilai 6/);
});

test("JSON dari model: LaTeX yang terbaca sebagai karakter kontrol dikembalikan", () => {
  assert.equal(repairLatexEscapes("$\frac{1}{2}$"), "$\\frac{1}{2}$");
  assert.equal(repairLatexEscapes("$3 \times 4$"), "$3 \\times 4$");
  assert.equal(repairLatexEscapes("$x \neq 2$"), "$x \\neq 2$");
  assert.equal(repairLatexEscapes("$\right)$"), "$\\right)$");
  assert.equal(repairLatexEscapes("Baris 1\nBaris 2\tangka"), "Baris 1\nBaris 2\tangka", "tab/baris baru biasa tidak diubah");
  assert.equal(fixDoubledBackslashes("Hasil 3/4", "Hasil $\\\\frac{3}{4}$"), "Hasil $\\frac{3}{4}$");
  assert.equal(fixDoubledBackslashes("a \\\\ b", "a \\\\ b"), "a \\\\ b", "\\\\ yang memang ada di sumber dibiarkan");
});

test("Ubah rumus ke LaTeX: rumus tulisan biasa terdeteksi; hasil yang mengubah angka/kata ditolak", () => {
  assert.equal(plainMathSpots("Hasil 3/4 + 1/8 = 7/8 dan x^2 serta √9."), 5);
  assert.equal(plainMathSpots("Tanggal 15/10/2026, harga Rp5.000, kelas 4."), 0);
  assert.equal(plainMathSpots("Sudah rapi: $\\frac{3}{4}$ dan $x^2$."), 0);
  const src = "Hasil 3/4 + 1/8 adalah 7/8. Luas s² dan √9 = 3.\n\n![Gambar](gambar:abc)";
  const ok = "Hasil $\\frac{3}{4} + \\frac{1}{8}$ adalah $\\frac{7}{8}$. Luas $s^2$ dan $\\sqrt{9} = 3$.\n\n![Gambar](gambar:abc)";
  assert.equal(latexConversionProblem(src, ok), null);
  assert.match(latexConversionProblem(src, ok.replace("{7}{8}", "{6}{8}"))!, /angka baru/);
  assert.match(latexConversionProblem(src, ok.replace("\\frac{7}{8}", "x"))!, /angka hilang/);
  assert.match(latexConversionProblem(src, ok.replace("adalah", "yaitu sama dengan nilai"))!, /kata baru/);
});

test("Ubah rumus ke LaTeX untuk materi panjang: per paragraf, per baris, nama perintah LaTeX bukan kata baru", () => {
  // Nama perintah LaTeX (\\lim, \\varepsilon, \\begin{aligned}) tidak dihitung sebagai kata baru.
  assert.equal(
    latexConversionProblem(
      "Iterasi berhenti bila |x1 - x0| < e dan lim f(x) = 0.",
      "Iterasi berhenti bila $|x_1 - x_0| < \\varepsilon$ dan $\\lim f(x) = 0$.",
    ),
    null,
  );
  assert.equal(latexConversionProblem("Luas = s^2 cm.", "Luas $= s^2 \\text{ cm}$."), null);
  // Satu paragraf: baris yang aman dipakai, baris yang angkanya berubah tetap seperti sumber.
  const src = "1. Hitung 3/4 + 1/4.\n2. Hasilnya 1.\n3. Nilai x^2 = 4.";
  const out = "1. Hitung $\\frac{3}{4} + \\frac{1}{4}$.\n2. Hasilnya $1{,}0$ atau 10/10.\n3. Nilai $x^2 = 4$.";
  assert.ok(latexConversionProblem(src, out));
  const merged = mergeLatexLines(src, out)!;
  assert.equal(merged.changed, 2);
  assert.equal(merged.kept, 1);
  assert.equal(merged.text.split("\n")[1], "2. Hasilnya 1.");
  assert.equal(mergeLatexLines("satu baris 3/4", "satu baris $\\frac{3}{4}$\nbaris baru"), null, "jumlah baris beda");
  // Materi dipecah per paragraf; hanya paragraf berisi rumus yang dikirim; join() mengembalikan teks asal.
  const body = "## Judul\n\nTeks biasa tanpa rumus.\n\nHitung 3/4 + 1/8.\n\n\nLuas x^2.";
  const { parts, todo } = latexParagraphs(body);
  assert.equal(parts.join(""), body);
  assert.deepEqual(todo.map((i) => parts[i]), ["Hitung 3/4 + 1/8.", "Luas x^2."]);
  assert.deepEqual(latexBatches(["a".repeat(4000), "b".repeat(4000), "c"], [0, 1, 2]), [[0], [1, 2]]);
  assert.equal(latexBatches(Array(45).fill("x"), [...Array(45).keys()]).length, 3, "paling banyak 20 bagian per permintaan");
});

console.log(`\n${passed} uji lulus`);
