// Uji format materi (src/lib/text.ts) dan logika kuis (src/lib/quiz.ts). Tanpa database, tanpa AI.
//   npm run test:format
import assert from "node:assert/strict";
import {
  figureIds,
  figureLine,
  figureSpeech,
  parseBlocks,
  parseInline,
  plainText,
  splitSentences,
} from "../src/lib/text";
import {
  isCorrect,
  normalizeAnswer,
  playableQuestion,
  questionKey,
  questionProblem,
  stableShuffle,
} from "../src/lib/quiz";
import { analyze, containsTerm } from "../src/lib/readability";
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

console.log("Format materi & kuis");

test("Blok: judul, subjudul, paragraf, daftar, daftar bernomor, garis", () => {
  const b = parseBlocks("## Judul\n\n### Sub\nBaris satu\nbaris dua.\n\n- a\n- b\n1. satu\n2) dua\n\n---");
  assert.deepEqual(
    b.map((x) => x.type),
    ["heading", "heading", "para", "list", "list", "divider"],
  );
  assert.deepEqual(b[0], { type: "heading", level: 2, text: "Judul" });
  assert.deepEqual(b[1], { type: "heading", level: 3, text: "Sub" });
  assert.deepEqual(b[2], { type: "para", text: "Baris satu baris dua." });
  assert.deepEqual(b[3], { type: "list", ordered: false, start: 1, items: ["a", "b"] });
  assert.deepEqual(b[4], { type: "list", ordered: true, start: 1, items: ["satu", "dua"] });
});

test("Kotak catatan dengan label dan butir", () => {
  const [c] = parseBlocks("> **Ingat:** Air itu penting.\n> - minum\n> - mandi");
  assert.equal(c.type, "callout");
  if (c.type !== "callout") return;
  assert.equal(c.kind, "ingat");
  assert.equal(c.title, "Ingat");
  assert.deepEqual(c.lines, [
    { bullet: false, text: "Air itu penting." },
    { bullet: true, text: "minum" },
    { bullet: true, text: "mandi" },
  ]);
  const [plain] = parseBlocks("> Air memiliki tiga wujud: padat, cair, gas.");
  assert.ok(plain.type === "callout" && plain.title === null && plain.kind === "info", "titik dua biasa bukan label");
  const [tahu] = parseBlocks("> Tahukah kamu? Lebah menari.");
  assert.ok(tahu.type === "callout");
});

test("Tabel dengan baris judul dan sel kosong", () => {
  const [t] = parseBlocks("| Bahan | Asal |\n|---|---|\n| Air | Tanah |\n| Cahaya |");
  assert.deepEqual(t, {
    type: "table",
    header: ["Bahan", "Asal"],
    rows: [
      ["Air", "Tanah"],
      ["Cahaya", ""],
    ],
  });
  const [noHeader] = parseBlocks("| a | b |\n| c | d |");
  assert.ok(noHeader.type === "table" && noHeader.header === null && noHeader.rows.length === 2);
});

test("Gambar: baris penanda, baris lama [Gambar: …], ID", () => {
  const id = "0a7e5e1a-5e1a-4a5a-9f00-000000000001";
  const text = `Teks.\n\n${figureLine(id, "Diagram [daun]\n")}\n\n[Gambar: panah dari laut ke awan]`;
  const b = parseBlocks(text);
  assert.deepEqual(b[1], { type: "figure", id, caption: "Diagram daun", description: null });
  assert.deepEqual(b[2], { type: "figure", id: null, caption: "", description: "panah dari laut ke awan" });
  assert.deepEqual(figureIds(text + `\n${figureLine(id, "lagi")}`), [id]);
  assert.equal(figureSpeech("Diagram daun", "Daun hijau."), "Gambar. Diagram daun. Daun hijau.");
});

test("Format dalam baris: tebal, miring, stabilo, perkalian tetap teks biasa", () => {
  const a = parseInline("Ini **sangat *penting*** dan ==diingat==.");
  assert.equal(a.plain, "Ini sangat penting dan diingat.");
  assert.deepEqual(a.marks.map((m) => [m.type, a.plain.slice(m.start, m.end)]).sort(), [
    ["b", "sangat penting"],
    ["i", "penting"],
    ["m", "diingat"],
  ]);
  assert.equal(parseInline("5 * 3 = 15 dan 2 * 4").plain, "5 * 3 = 15 dan 2 * 4");
  assert.equal(parseInline("**belum ditutup").plain, "**belum ditutup");
  assert.equal(parseInline("pakai \\*bintang\\*").plain, "pakai *bintang*");
});

test("Kalimat: angka desimal dan singkatan tidak memecah kalimat", () => {
  assert.deepEqual(splitSentences("Harganya Rp1.500 per kg. Beli juga sayur, buah, dll. untuk ibu! Selesai?"), [
    "Harganya Rp1.500 per kg.",
    "Beli juga sayur, buah, dll. untuk ibu!",
    "Selesai?",
  ]);
  assert.deepEqual(splitSentences('Ia berkata, "Ayo!" Lalu pergi.'), ['Ia berkata, "Ayo!"', "Lalu pergi."]);
});

test("Teks polos untuk dibacakan", () => {
  const p = plainText("## Judul\n\n**Tebal** biasa.\n\n| A | B |\n|---|---|\n| 1 | 2 |\n\n> Ingat: Satu.");
  assert.equal(p, "Judul\nTebal biasa.\nA, B. 1, 2\nIngat. Satu.");
});

test("Keterbacaan & istilah: penanda format diabaikan, tanpa lookbehind", () => {
  const r = analyze("## Judul\n\n![x](gambar:abcdefgh-1)\n\n| a | b |\n\n> Ingat: Satu dua tiga.\n\n1. Langkah satu.");
  assert.equal(r.sentences, 2);
  assert.ok(containsTerm("Proses **fotosintesis** terjadi.", "fotosintesis"));
  assert.ok(!containsTerm("fotosintesisnya", "fotosintesis"));
});

const pg: QuizQuestion = { type: "pg", q: "Apa?", options: ["A", "", "C"], answer: 2, explain: "" };

test("Soal siap dikerjakan: pilihan kosong dibuang, kunci disesuaikan", () => {
  const p = playableQuestion(pg)!;
  assert.deepEqual(p.options, ["A", "C"]);
  assert.equal(p.answer, 1);
  assert.equal(playableQuestion({ ...pg, answer: 1 }), null, "kunci menunjuk pilihan kosong");
  assert.equal(playableQuestion({ q: "Lama tanpa type", options: ["x", "y"], answer: 0, explain: "" })?.type, "pg");
  assert.equal(questionProblem({ ...pg, q: "" }), "Pertanyaan masih kosong.");
});

test("Pemeriksaan jawaban lima jenis soal", () => {
  assert.ok(isCorrect(pg, { type: "pg", choice: 2 }));
  const bs: QuizQuestion = { type: "bs", q: "Air mendidih.", options: ["Benar", "Salah"], answer: 1, explain: "" };
  assert.ok(isCorrect(bs, { type: "bs", choice: 1 }));
  assert.ok(!isCorrect(bs, { type: "bs", choice: 0 }));
  const pgk: QuizQuestion = {
    type: "pgk",
    q: "Pilih",
    options: ["a", "b", "c"],
    answer: 0,
    answers: [0, 2],
    explain: "",
  };
  assert.ok(isCorrect(pgk, { type: "pgk", choices: [2, 0] }));
  assert.ok(!isCorrect(pgk, { type: "pgk", choices: [0] }), "harus semua jawaban benar");
  const isian: QuizQuestion = {
    type: "isian",
    q: "?",
    options: [],
    answer: 0,
    accepted: ["Stomata", "1.000 ml"],
    explain: "",
  };
  assert.ok(isCorrect(isian, { type: "isian", text: "  stomata. " }));
  assert.ok(isCorrect(isian, { type: "isian", text: "1000 ML" }));
  assert.ok(!isCorrect(isian, { type: "isian", text: "stoma" }));
  const jodoh: QuizQuestion = {
    type: "jodoh",
    q: "?",
    options: [],
    answer: 0,
    pairs: [
      { kiri: "Akar", kanan: "Menyerap air" },
      { kiri: "Daun", kanan: "Membuat makanan" },
    ],
    explain: "",
  };
  assert.ok(isCorrect(jodoh, { type: "jodoh", match: [0, 1] }));
  assert.ok(!isCorrect(jodoh, { type: "jodoh", match: [1, 0] }));
  assert.ok(!isCorrect(jodoh, { type: "jodoh", match: [0, null] }));
  assert.equal(normalizeAnswer("Pengembunan!"), "pengembunan");
});

test("Kunci soal stabil dan pengacakan menjodohkan tidak pernah sama dengan urutan benar", () => {
  assert.equal(questionKey({ q: " Apa itu? " }), questionKey({ q: "apa itu?" }));
  for (const seed of ["a", "b", "c", "soal panjang sekali"]) {
    const out = stableShuffle([0, 1, 2], seed);
    assert.notDeepEqual(out, [0, 1, 2]);
    assert.deepEqual([...out].sort(), [0, 1, 2]);
    assert.deepEqual(stableShuffle([0, 1, 2], seed), out, "selalu sama untuk teks yang sama");
  }
});

console.log(`\n${passed} uji lulus`);
