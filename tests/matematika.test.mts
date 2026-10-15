// Uji dukungan Matematika (src/lib/matematika.ts) dan pemeriksaan jawaban angka di kuis. Tanpa AI.
//   npm run test:mtk
import assert from "node:assert/strict";
import {
  checkCalc,
  evaluate,
  isMathSubject,
  looksLikeMath,
  parseAnswerNumber,
  sameNumber,
  spokenMath,
} from "../src/lib/matematika";
import { isCorrect, normalizeAnswer, playableQuestion, responseSummary } from "../src/lib/quiz";
import { parseInline } from "../src/lib/text";
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

console.log("Matematika");

test("Angka gaya Indonesia: minus, koma/titik desimal, ribuan, pecahan, satuan", () => {
  assert.deepEqual(parseAnswerNumber("-3"), { value: -3, unit: "" });
  assert.deepEqual(parseAnswerNumber("−3"), { value: -3, unit: "" });
  assert.deepEqual(parseAnswerNumber("3,5"), { value: 3.5, unit: "" });
  assert.deepEqual(parseAnswerNumber("3.5"), { value: 3.5, unit: "" });
  assert.deepEqual(parseAnswerNumber("1.000"), { value: 1000, unit: "" });
  assert.deepEqual(parseAnswerNumber("1.250,5 kg"), { value: 1250.5, unit: "kg" });
  assert.deepEqual(parseAnswerNumber("1/2"), { value: 0.5, unit: "" });
  assert.deepEqual(parseAnswerNumber("1 1/2"), { value: 1.5, unit: "" });
  assert.deepEqual(parseAnswerNumber("½"), { value: 0.5, unit: "" });
  assert.deepEqual(parseAnswerNumber("24 cm²"), { value: 24, unit: "cm2" });
  assert.deepEqual(parseAnswerNumber("60 km/jam"), { value: 60, unit: "km/jam" });
  assert.equal(parseAnswerNumber("penguapan"), null);
  assert.equal(parseAnswerNumber("2 dan 3"), null, "kalimat bukan angka bersatuan");
});

test("Jawaban isian angka: nilai sama diterima, minus tidak dibuang, satuan opsional", () => {
  const q = (accepted: string[]): QuizQuestion => ({ type: "isian", q: "?", options: [], answer: 0, accepted, explain: "" });
  const ok = (acc: string[], text: string) => isCorrect(q(acc), { type: "isian", text });
  assert.ok(!ok(["-3"], "3"), "dulu -3 menerima 3");
  assert.ok(ok(["-3"], "-3"));
  assert.ok(ok(["-3"], "−3"));
  assert.ok(ok(["3,5"], "3.5"));
  assert.ok(ok(["1/2"], "1 / 2"));
  assert.ok(ok(["1/2"], "½"));
  assert.ok(!ok(["1/3"], "2/6"), "soal menyederhanakan: bentuk pecahan harus sama");
  assert.ok(ok(["1/2", "0,5"], "0.5"), "bentuk lain ditulis guru sebagai jawaban yang diterima");
  assert.ok(ok(["24 cm"], "24"), "satuan boleh tidak ditulis");
  assert.ok(ok(["24"], "24 cm"));
  assert.ok(!ok(["24 cm"], "24 m"), "satuan berbeda = salah");
  assert.ok(ok(["Stomata"], " stomata. "), "jawaban kata tetap seperti dulu");
  assert.equal(normalizeAnswer("kira-kira -5"), "kira kira -5");
});

test("Menghitung ulang ekspresi tanpa eval", () => {
  assert.equal(evaluate("3 × 4 + 2"), 14);
  assert.equal(evaluate("12 : 3"), 4);
  assert.equal(evaluate("3/4 - 1/8"), 0.625);
  assert.equal(evaluate("2^3 + √9"), 11);
  assert.equal(evaluate("(5 - 8) * 2"), -6);
  assert.equal(evaluate("2(3+4)"), 14);
  assert.equal(evaluate("25% * 80"), 20);
  assert.equal(evaluate("1,5 + 1,5"), 3);
  assert.equal(evaluate("1/0"), null);
  assert.equal(evaluate("alert(1)"), null);
  assert.equal(evaluate("2 +"), null);
});

test("Periksa hitungan: kunci AI yang salah dan pilihan kembar ditandai", () => {
  const base = { type: "pg", options: ["5/8", "1/2", "3/8", "1"], answer: 0, calc: "3/4 - 1/8" };
  assert.equal(checkCalc(base)?.ok, true);
  const wrong = checkCalc({ ...base, answer: 1 });
  assert.equal(wrong?.ok, false);
  assert.match(wrong!.message, /0,625.*1\/2/);
  const twin = checkCalc({ ...base, options: ["5/8", "0,625", "3/8", "1"] });
  assert.match(twin!.message, /juga bernilai/);
  assert.equal(checkCalc({ type: "isian", options: [], answer: 0, accepted: ["-6"], calc: "(5-8)*2" })?.ok, true);
  assert.equal(checkCalc({ type: "bs", options: [], answer: 0 }), null);
});

test("Dibacakan: simbol matematika jadi kata", () => {
  assert.equal(spokenMath("3 × 4 = 12"), "3 kali 4 sama dengan 12");
  assert.equal(spokenMath("12 : 3 = 4"), "12 dibagi 3 sama dengan 4");
  assert.equal(spokenMath("Pecahan 1/2 senilai 2/4."), "Pecahan 1 per 2 senilai 2 per 4.");
  assert.equal(spokenMath("Luas = s²"), "Luas sama dengan s kuadrat");
  assert.equal(spokenMath("Suhu -3 °C"), "Suhu negatif 3 derajat Celsius");
  assert.equal(spokenMath("Luasnya 24 cm²."), "Luasnya 24 sentimeter persegi.");
  assert.equal(spokenMath("5 - 3 = 2"), "5 kurang 3 sama dengan 2");
  assert.equal(spokenMath("10^3"), "10 pangkat tiga");
  assert.equal(spokenMath("Tanggal 15/10/2026, anak-anak, 2-3 kali, 10 menit"), "Tanggal 15/10/2026, anak-anak, 2-3 kali, 10 menit");
});

test("Deteksi Matematika", () => {
  assert.ok(isMathSubject("Matematika"));
  assert.ok(isMathSubject("MTK kelas 4"));
  assert.ok(!isMathSubject("IPAS"));
  assert.ok(looksLikeMath("1/2 + 1/4 = 3/4. 2 × 3 = 6. 8 : 2 = 4. 5 - 1 = 4."));
  assert.ok(!looksLikeMath("Air di bumi selalu bergerak. Matahari memanaskan air laut."));
});

test("Notasi: pangkat jadi superskrip, pecahan ditandai, bukan tanggal; 2*3*4 tidak jadi miring", () => {
  const a = parseInline("Luas = s^2 dan 10^3.");
  assert.equal(a.plain, "Luas = s2 dan 103.");
  assert.deepEqual(
    a.marks.filter((m) => m.type === "sup").map((m) => a.plain.slice(m.start, m.end)),
    ["2", "3"],
  );
  const f = parseInline("Pecahan 3/4 dan tanggal 15/10/2026.");
  assert.deepEqual(
    f.marks.filter((m) => m.type === "frac").map((m) => f.plain.slice(m.start, m.end)),
    ["3/4"],
  );
  const star = parseInline("Hitung 2*3*4 = 24.");
  assert.equal(star.plain, "Hitung 2*3*4 = 24.");
  assert.equal(star.marks.length, 0);
  assert.equal(parseInline("*miring* tetap").marks[0].type, "i");
});

test("Soal untuk siswa membawa konsep & petunjuk, tanpa hitungan pemeriksa; ringkasan jawaban", () => {
  const q: QuizQuestion = {
    type: "pg",
    q: "3/4 - 1/8 = ?",
    options: ["5/8", "1/2", ""],
    answer: 0,
    explain: "",
    concept: " Pengurangan pecahan ",
    hints: ["Samakan penyebut.", " ", "3/4 = 6/8."],
    calc: "3/4 - 1/8",
  };
  const p = playableQuestion(q)!;
  assert.equal(p.concept, "Pengurangan pecahan");
  assert.deepEqual(p.hints, ["Samakan penyebut.", "3/4 = 6/8."]);
  assert.equal(p.calc, undefined);
  assert.equal(responseSummary(p, { type: "pg", choice: 1 }), "1/2");
  assert.equal(responseSummary(p, { type: "pg", choice: null }), undefined);
});

console.log(`\n${passed} uji lulus`);
