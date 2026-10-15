// Uji AI tahap 3 (Matematika, latihan adaptif, analisis kelas, pemeriksa kesetiaan, tugas berjenjang)
// terhadap server AI palsu. Tanpa kunci API dan tanpa biaya. Dijalankan oleh: npm run test:ai
import assert from "node:assert/strict";
import { startFakeAi } from "./fake-ai-server.mjs";

const PORT = 4597;
const FAKE = `http://127.0.0.1:${PORT}`;
process.env.ANTHROPIC_BASE_URL = FAKE;
process.env.GEMINI_BASE_URL = FAKE;
process.env.ANTHROPIC_API_KEY = "kunci-claude-palsu";
process.env.GEMINI_API_KEY = "kunci-gemini-palsu";
delete process.env.ANTHROPIC_MODEL;
delete process.env.GEMINI_MODEL;

const stop = await startFakeAi(PORT);
const tasks = await import("../../src/lib/ai-tasks");
const kelas = await import("../../src/lib/ai-kelas");
const perangkat = await import("../../src/lib/ai-perangkat");
const { checkCalc } = await import("../../src/lib/matematika");

type Call = { provider: string; model: string; body: Record<string, any> };
async function setMode(m: Record<string, unknown> = {}) {
  await fetch(`${FAKE}/__mode`, { method: "POST", body: JSON.stringify(m) });
}
async function calls(): Promise<Call[]> {
  return (await fetch(`${FAKE}/__log`)).json();
}
const promptOf = (c: Call) => JSON.stringify(c.body.messages ?? c.body.contents);

const IPA = `## Daur Air

Air di bumi selalu bergerak. Matahari memanaskan air di laut. Air berubah menjadi uap. Peristiwa ini disebut penguapan.`;
const MTK = `## Pecahan Senilai

Pecahan senilai nilainya sama. Contohnya 1/2 = 2/4. Kalikan pembilang dan penyebut dengan bilangan yang sama: 1 × 2 = 2 dan 2 × 2 = 4.`;

let passed = 0;
async function test(name: string, fn: () => Promise<void> | void) {
  const t0 = Date.now();
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name} (${Date.now() - t0} ms)`);
  } catch (err) {
    console.log(`  ✗ ${name}`);
    await stop();
    throw err;
  }
}

console.log("AI adaptif & Matematika");

await test("Kuis Matematika: konsep, petunjuk, hitungan ikut; kunci yang salah hitung ditandai (tidak diubah diam-diam)", async () => {
  await setMode();
  const r = await tasks.makeQuizDraft({ body: MTK, grade: "Kelas 4 SD", count: 3, types: ["pg", "isian"], subject: "Matematika" });
  assert.equal(r.math, true);
  assert.equal(r.questions.length, 3);
  const [a, b, c] = r.questions;
  assert.equal(a.concept, "Pecahan senilai");
  assert.deepEqual(a.hints, ["Kalikan pembilang dan penyebut.", "Dikali 2."]);
  assert.equal(checkCalc(a)?.ok, true);
  assert.equal(b.answer, 1, "kunci AI dibiarkan apa adanya");
  assert.equal(checkCalc(b)?.ok, false, "3/4 - 1/4 = 1/2, bukan 1/4");
  assert.equal(checkCalc(c)?.ok, true);
  const p = promptOf((await calls())[0]);
  assert.match(p, /Ini materi Matematika/);
  assert.match(p, /Aplikasi menghitung ulang ekspresi ini/);
  assert.match(p, /JANGAN menulis jawaban akhirnya di petunjuk/);
});

await test("Kuis IPA: aturan Matematika tidak dipakai, hitungan dikosongkan", async () => {
  await setMode();
  const r = await tasks.makeQuizDraft({ body: IPA, grade: "", count: 3, types: ["pg"], subject: "IPAS" });
  assert.equal(r.math, false);
  assert.ok(r.questions.every((q) => q.calc === undefined));
  const p = promptOf((await calls())[0]);
  assert.doesNotMatch(p, /Ini materi Matematika/);
  assert.match(p, /\\"hitungan\\" diisi \\"\\"/);
});

await test("Versi teks mudah Matematika: angka, lambang, dan langkah wajib disalin persis", async () => {
  await setMode();
  await tasks.makeSimpleVersion({ body: MTK, grade: "", subject: "Matematika" });
  assert.match(promptOf((await calls())[0]), /Salin SEMUA angka, lambang/);
  await setMode();
  await tasks.makeSimpleVersion({ body: IPA, grade: "", subject: "IPAS" });
  assert.doesNotMatch(promptOf((await calls())[0]), /Salin SEMUA angka/);
});

await test("Bank latihan: konsep sesuai permintaan, miskonsepsi kelas ikut ke prompt", async () => {
  await setMode();
  const r = await tasks.makePracticeBank({
    body: IPA,
    grade: "Kelas 4 SD",
    subject: "IPAS",
    concepts: [
      { konsep: "Penguapan", contoh: ["Apa itu penguapan?"], dugaan: "Siswa mengira uap adalah asap." },
      { konsep: "Daur air", contoh: [] },
    ],
    perConcept: 2,
  });
  assert.equal(r.questions.length, 4);
  assert.deepEqual([...new Set(r.questions.map((q) => q.concept))], ["Penguapan", "Daur air"]);
  assert.ok(r.questions.every((q) => q.origin === "ai" && q.hints?.length));
  const p = promptOf((await calls())[0]);
  assert.match(p, /Siswa mengira uap adalah asap/);
  assert.match(p, /jangan diulang/);
});

await test("Analisis kelas: angka dari aplikasi, nomor soal & konsep karangan dibuang, tanpa nama siswa", async () => {
  await setMode();
  const { analysis } = await kelas.analyzeClass({
    body: IPA,
    data: {
      kelas: "Kelas 4 SD",
      mapel: "IPAS",
      judul: "Daur Air",
      profilKelas: "Jumlah siswa: 28. 3 siswa disleksia.",
      sesiKuis: 20,
      rataSkor: 71,
      perCaraBelajar: [{ cara: "Teks asli", sesi: 12, rata: 68 }],
      soal: [
        { no: 1, konsep: "Penguapan", jenis: "Pilihan ganda", soal: "Apa itu penguapan?", kunci: "Air menjadi uap", sesi: 20, benarPersen: 90, jawabanSalah: [], petunjukDibuka: 0 },
        { no: 2, konsep: "Penguapan", jenis: "Pilihan ganda", soal: "Uap berasal dari?", kunci: "Air", sesi: 20, benarPersen: 80, jawabanSalah: [], petunjukDibuka: 1 },
        { no: 3, konsep: "Bahan fotosintesis", jenis: "Pilihan ganda kompleks", soal: "Pilih bahan", kunci: "Air", sesi: 20, benarPersen: 35, jawabanSalah: [{ teks: "Oksigen", n: 9 }], petunjukDibuka: 6 },
      ],
    },
  });
  assert.deepEqual(analysis.temuan[0].soal, [3], "soal 99 tidak ada di data");
  assert.equal(analysis.temuan[0].konsep, "Penguapan", "konsep pertama di data");
  assert.equal(analysis.temuan[1].konsep, "", "konsep karangan dikosongkan");
  const p = promptOf((await calls())[0]);
  assert.match(p, /Jawaban salah terbanyak: \\"Oksigen\\" \(9 sesi\)/);
  assert.match(p, /Petunjuk dibuka di 6 sesi/);
  assert.doesNotMatch(p, /Dimas|Sari/);
});

await test("Pemeriksa kesetiaan: temuan dengan kutipan yang tidak ada di draf dibuang", async () => {
  await setMode();
  const draft = "Air di bumi selalu bergerak cepat sekali. Matahari memanaskan air.";
  const { findings } = await kelas.checkFaithfulness({ source: IPA, draft, label: "versi teks mudah" });
  assert.equal(findings.length, 1);
  assert.equal(findings[0].kutipan, "Air di bumi selalu bergerak");
  assert.equal(findings[0].jenis, "fakta_baru");
});

await test("Tugas berjenjang: tiga tingkat, langkah dirapikan, konsep kuis ikut ke prompt", async () => {
  await setMode();
  const r = await perangkat.makeJenjang({
    body: IPA,
    title: "Daur Air",
    subject: "IPAS",
    grade: "Kelas 4 SD",
    konsep: ["Penguapan", "Pengembunan"],
  });
  assert.deepEqual(Object.keys(r.data), ["dasar", "inti", "tantangan"]);
  assert.deepEqual(r.data.dasar.langkah, ["Baca materi.", "Kerjakan bersama teman."]);
  const p = promptOf((await calls())[0]);
  assert.match(p, /Penguapan, Pengembunan/);
  assert.match(p, /tanpa menyebut \\"lemah\\"/);
});

console.log(`\n${passed} uji lulus`);
await stop();
