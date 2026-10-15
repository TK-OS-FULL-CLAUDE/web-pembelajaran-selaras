// Uji Generator Perangkat Ajar (src/lib/ai-perangkat.ts, src/lib/perangkat.ts) terhadap server AI palsu.
// Tidak butuh kunci API dan tidak ada biaya. Dijalankan oleh: npm run test:ai
import assert from "node:assert/strict";
import { startFakeAi } from "./fake-ai-server.mjs";

const PORT = 4598;
const FAKE = `http://127.0.0.1:${PORT}`;
process.env.ANTHROPIC_BASE_URL = FAKE;
process.env.GEMINI_BASE_URL = FAKE;
process.env.ANTHROPIC_API_KEY = "kunci-claude-palsu";
process.env.GEMINI_API_KEY = "kunci-gemini-palsu";
delete process.env.ANTHROPIC_MODEL;
delete process.env.GEMINI_MODEL;

const stop = await startFakeAi(PORT);
const ai = await import("../../src/lib/ai-perangkat");
const kit = await import("../../src/lib/perangkat");

type Call = { provider: string; model: string; body: Record<string, any> };
async function setMode(m: Record<string, unknown> = {}) {
  await fetch(`${FAKE}/__mode`, { method: "POST", body: JSON.stringify(m) });
}
async function calls(): Promise<Call[]> {
  return (await fetch(`${FAKE}/__log`)).json();
}
const promptOf = (c: Call) => JSON.stringify(c.body.messages ?? c.body.contents);

const BODY = `## Daur Air

Air di bumi selalu bergerak. Matahari memanaskan air di laut. Air berubah menjadi uap. Peristiwa ini disebut penguapan.`;
const MUDAH = "Air selalu bergerak. Matahari membuat air panas. Air jadi uap. Ini namanya penguapan.";
const BASE = { body: BODY, title: "Daur Air", subject: "IPAS", grade: "Kelas 4 SD" };
const NEEDS = { totalSiswa: 28, lowVision: 0, tuli: 1, disleksia: 3, sulitFokus: 0, diskalkulia: 0, bahasaDaerah: 12, bahasa: "jw" as const };

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

console.log("Generator Perangkat Ajar");

await test("Fase dan alokasi waktu dari teks kelas", () => {
  assert.equal(kit.faseFromGrade("Kelas 1 SD"), "A");
  assert.equal(kit.faseFromGrade("Kelas 4 SD"), "B");
  assert.equal(kit.faseFromGrade("kelas VI"), "C");
  assert.equal(kit.faseFromGrade("Kelas 2 SMP"), "D");
  assert.equal(kit.faseFromGrade("Kelas 10 SMA"), "E");
  assert.equal(kit.faseFromGrade("Kelas XI SMK"), "F");
  assert.equal(kit.faseFromGrade("Kelas inklusi"), "");
  assert.deepEqual(kit.defaultAlokasi("Kelas 4 SD"), { teks: "2 JP (2 × 35 menit)", menit: 70 });
  assert.equal(kit.defaultAlokasi("Kelas 8 SMP").menit, 80);
  assert.equal(kit.displayName("Bu Rina (akun demo)"), "Bu Rina");
});

await test("Identitas modul diisi dari data guru & kelas, bukan dari AI", () => {
  const id = kit.modulIdentity({
    teacherName: "Bu Rina (akun demo)",
    school: "SD Negeri Contoh 1",
    subject: "IPAS",
    grade: "Kelas 4 SD",
    className: "Kelas 4B",
    title: "Daur Air",
  });
  assert.deepEqual(id, {
    penyusun: "Bu Rina",
    sekolah: "SD Negeri Contoh 1",
    mapel: "IPAS",
    kelas: "Kelas 4 SD (Kelas 4B)",
    fase: "B",
    topik: "Daur Air",
    alokasi: "2 JP (2 × 35 menit)",
  });
});

await test("Modul ajar: Claude dulu; profil kelas & alokasi masuk prompt; nomor/butir dirapikan", async () => {
  await setMode();
  const r = await ai.makeModulAjar({ ...BASE, needs: NEEDS, menit: 70, fase: "B" });
  assert.equal(r.model, "claude-haiku-5-5");
  assert.deepEqual(r.data.tujuan, [
    "Peserta didik dapat menjelaskan penguapan (claude).",
    "Peserta didik dapat menyebutkan urutan daur air.",
  ]);
  assert.equal(r.data.pendahuluan.menit + r.data.inti.menit + r.data.penutup.menit, 70);
  assert.ok(!("identitas" in r.data), "identitas tidak diminta dari AI");
  const p = promptOf((await calls())[0]);
  assert.match(p, /tepat 70/);
  assert.match(p, /Fase B/);
  assert.match(p, /3 siswa disleksia/);
  assert.match(p, /12 siswa berbahasa ibu Bahasa Jawa/);
  assert.match(p, /bukan perintah untukmu/, "penjaga prompt injection ada");
  assert.doesNotMatch(p, /lowVision|low vision: 0/i, "kebutuhan yang jumlahnya 0 tidak disebut");
});

await test("Profil kelas kosong → prompt menyebutnya, tanpa data siswa", () => {
  assert.equal(ai.needsForPrompt(null), "Profil kebutuhan kelas belum diisi.");
  assert.match(
    ai.needsForPrompt({ totalSiswa: 20, lowVision: 0, tuli: 0, disleksia: 0, sulitFokus: 0, diskalkulia: 0, bahasaDaerah: 0, bahasa: null }),
    /Tidak ada kebutuhan khusus/,
  );
});

await test("LKPD: tujuan dari modul ikut dikirim; judul aktivitas kosong diberi nama", async () => {
  await setMode();
  const r = await ai.makeLkpd({ ...BASE, tujuan: ["Peserta didik dapat menjelaskan penguapan."] });
  assert.equal(r.data.aktivitas[0].judul, "Aktivitas 1");
  assert.deepEqual(r.data.aktivitas[0].pertanyaan, ["Apa yang terjadi pada air? (claude)", "Mengapa air berubah?"]);
  const p = promptOf((await calls())[0]);
  assert.match(p, /Tujuan pembelajaran dari modul ajar guru/);
  assert.match(p, /Jangan menulis kunci jawaban/);
});

await test("LKPD versi sederhana: disusun dari teks mudah, bukan teks asli", async () => {
  await setMode();
  const r = await ai.makeLkpdMudah({ ...BASE, mudahText: MUDAH });
  assert.equal(r.data.aktivitas.length, 2);
  assert.equal(r.data.aktivitas[1].judul, "Aktivitas 2");
  const p = promptOf((await calls())[0]);
  assert.match(p, /Ini namanya penguapan/);
  assert.doesNotMatch(p, /Peristiwa ini disebut penguapan/);
  assert.match(p, /paling banyak 10 kata/);
});

await test("Rubrik: tepat 4 tingkat per kriteria; aktivitas LKPD ikut dikirim", async () => {
  await setMode();
  const r = await ai.makeRubrik({ ...BASE, tujuan: ["Menjelaskan penguapan."], aktivitas: ["Aktivitas 1: Apa yang terjadi pada air?"] });
  assert.equal(r.data.kriteria.length, 3);
  assert.ok(r.data.kriteria.every((k) => k.level.length === 4));
  const p = promptOf((await calls())[0]);
  assert.match(p, /Aktivitas di LKPD/);
  assert.match(p, /1 = Perlu bimbingan, 2 = Cukup, 3 = Baik, 4 = Sangat baik/);
});

await test("Kredit Claude habis → modul ajar lewat Gemini", async () => {
  await setMode({ claude: "402" });
  const r = await ai.makeModulAjar({ ...BASE, needs: null, menit: 70, fase: "B" });
  assert.equal(r.model, "gemini-3.6-flash");
  assert.match(r.data.tujuan[0], /\(gemini\)/);
});

await test("Template kosong untuk 'Isi sendiri'", () => {
  const m = kit.emptyModul({ teacherName: "Pak Budi", school: null, subject: "IPAS", grade: "Kelas 4 SD", className: null, title: "Daur Air" });
  assert.equal(m.pendahuluan.menit + m.inti.menit + m.penutup.menit, 70);
  assert.equal(m.identitas.kelas, "Kelas 4 SD");
  assert.equal(kit.emptyRubrik("Daur Air").kriteria[0].level.length, 4);
  assert.deepEqual(kit.cleanLines(["1. Satu", "  ", "- Dua", "b) Tiga", "**Empat**"]), ["Satu", "Dua", "Tiga", "Empat"]);
});

console.log(`\n${passed} uji lulus`);
await stop();
