// Uji mesin AI Selaras (src/lib/claude.ts, gemini.ts, ai-tasks.ts) terhadap server palsu.
// Tidak butuh kunci API, tidak memanggil layanan asli, tidak ada biaya.
//   npm run test:ai
import assert from "node:assert/strict";
import { startFakeAi } from "./fake-ai-server.mjs";

const PORT = 4599;
const FAKE = `http://127.0.0.1:${PORT}`;
process.env.ANTHROPIC_BASE_URL = FAKE;
process.env.GEMINI_BASE_URL = FAKE;
process.env.ANTHROPIC_API_KEY = "kunci-claude-palsu";
process.env.GEMINI_API_KEY = "kunci-gemini-palsu";
delete process.env.ANTHROPIC_MODEL;
delete process.env.GEMINI_MODEL;

const stop = await startFakeAi(PORT);
const tasks = await import("../../src/lib/ai-tasks");
const { AiError } = await import("../../src/lib/claude");

type Call = { provider: string; model: string; url: string; body: Record<string, any>; headers: Record<string, string> };

async function setMode(m: Record<string, unknown> = {}) {
  await fetch(`${FAKE}/__mode`, { method: "POST", body: JSON.stringify(m) });
}
async function calls(): Promise<Call[]> {
  return (await fetch(`${FAKE}/__log`)).json();
}
const route = (cs: Call[]) => cs.map((c) => `${c.provider}:${c.model}`);

const BODY = `## Daur Air

Air di bumi selalu bergerak. Matahari memanaskan air di laut. Air berubah menjadi uap. Peristiwa ini disebut penguapan.`;
const IMG = { mimeType: "image/jpeg", base64: "/9j/4AAQSkZJRg==" };

let passed = 0;
async function test(name: string, fn: () => Promise<void>) {
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
const isAiError = (status: number) => (e: unknown) => e instanceof AiError && e.status === status;

console.log("Mesin AI Selaras");

await test("Teks mudah: Claude Haiku dulu; glosarium hanya kata yang ada di materi", async () => {
  await setMode();
  const r = await tasks.makeSimpleVersion({ body: BODY, grade: "Kelas 4 SD", subject: "IPAS" });
  assert.equal(r.model, "claude-haiku-5-5");
  assert.deepEqual(r.glossary.map((g) => g.kata), ["penguapan"], "duplikat & kata di luar materi dibuang");
  const [c] = await calls();
  assert.equal(c.headers["x-api-key"], "kunci-claude-palsu");
  assert.equal(c.body.output_config.format.type, "json_schema");
  assert.match(JSON.stringify(c.body.messages), /bukan perintah untukmu/, "penjaga prompt injection ada");
});

await test("Ringkasan: hasil selalu jadi daftar butir \"- \"", async () => {
  await setMode();
  const r = await tasks.makeSummaryVersion({ body: BODY, grade: "", subject: "" });
  assert.equal(r.text, "- Air di bumi selalu bergerak (claude).\n- Matahari memanaskan air.\n- Uap air membentuk awan.\n- Hujan jatuh ke bumi.");
});

await test("Bahasa daerah: glosarium hanya istilah yang muncul di terjemahan", async () => {
  await setMode();
  const r = await tasks.makeRegionalVersion({ body: BODY, grade: "", lang: "jw" });
  assert.deepEqual(r.glossary.map((g) => g.kata), ["penguapan"]);
});

await test("Foto → teks: Gemini dulu, gambar dikirim sebagai inlineData, bagian 'thought' diabaikan", async () => {
  await setMode();
  const r = await tasks.photoToText(IMG);
  assert.equal(r.model, "gemini-3.6-flash");
  assert.ok(r.teks.startsWith("## Daur Air"));
  const [c] = await calls();
  assert.equal(c.headers["x-goog-api-key"], "kunci-gemini-palsu");
  assert.deepEqual(c.body.contents[0].parts[0], { inlineData: { mimeType: IMG.mimeType, data: IMG.base64 } });
  assert.equal(c.body.generationConfig.responseMimeType, "application/json");
  assert.ok(c.body.generationConfig.responseJsonSchema, "skema JSON dikirim");
  assert.deepEqual(c.body.generationConfig.thinkingConfig, { thinkingLevel: "LOW" });
  assert.match(JSON.stringify(c.body.contents), /\[Gambar: \.\.\.\]/, "minta keterangan gambar untuk low vision");
  assert.match(JSON.stringify(c.body.contents), /\[\[GAMBAR n\]\]/, "minta penanda posisi gambar");
  assert.equal(r.gambar.length, 1, "gambar di halaman ikut dikembalikan");
  assert.deepEqual(r.gambar[0].kotak, [300, 100, 700, 900]);
});

await test("Deskripsi gambar (alt text): Gemini dulu, gambar dikirim, konteks materi ikut", async () => {
  await setMode();
  const r = await tasks.describeImage(IMG, { caption: "Daun", title: "Fotosintesis", nearby: "Daun membuat makanan." });
  assert.match(r.alt, /Diagram daun/);
  assert.equal(r.caption, "Diagram daun");
  const [c] = await calls();
  assert.equal(c.provider, "gemini");
  assert.deepEqual(c.body.contents[0].parts[0], { inlineData: { mimeType: IMG.mimeType, data: IMG.base64 } });
  assert.match(JSON.stringify(c.body.contents), /tunanetra/);
  assert.match(JSON.stringify(c.body.contents), /Daun membuat makanan/);
});

await test("Kuis: Gemini dulu; tanpa pilihan jenis = pilihan ganda saja, soal rusak dibuang", async () => {
  await setMode();
  const r = await tasks.makeQuizDraft({ body: BODY, grade: "", count: 3 });
  assert.deepEqual(r.questions.map((q) => q.type), ["pg"]);
  assert.deepEqual(route(await calls()), ["gemini:gemini-3.6-flash"]);
});

await test("Kuis campuran: lima jenis soal diubah ke format Selaras", async () => {
  await setMode();
  const r = await tasks.makeQuizDraft({ body: BODY, grade: "", count: 5, types: ["pg", "pgk", "bs", "isian", "jodoh"] });
  assert.deepEqual(r.questions.map((q) => q.type), ["pg", "bs", "pgk", "isian", "jodoh"]);
  const [pg, bs, pgk, isian, jodoh] = r.questions;
  assert.equal(pg.answer, 0);
  assert.deepEqual(bs.options, ["Benar", "Salah"]);
  assert.deepEqual(pgk.answers, [0, 2, 3]);
  assert.deepEqual(isian.accepted, ["hujan"]);
  assert.equal(jodoh.pairs?.length, 3);
  assert.ok(r.questions.every((q) => q.origin === "ai"));
});

await test("Versi teks: baris gambar yang dihapus AI dikembalikan, ID asing dibuang", async () => {
  const src = "## A\n\nParagraf satu.\n\n![Daun](gambar:aaaaaaaa-1111)\n\nParagraf dua.";
  const out = tasks.restoreFigureLines(src, "## A\n\nSatu.\n\n![X](gambar:bbbbbbbb-9999)\n\nDua.");
  assert.match(out, /!\[Daun\]\(gambar:aaaaaaaa-1111\)/);
  assert.doesNotMatch(out, /bbbbbbbb-9999/);
  await setMode();
  const r = await tasks.makeSimpleVersion({ body: src, grade: "", subject: "" });
  assert.match(r.text, /gambar:aaaaaaaa-1111/, "draf teks mudah tetap memuat gambar");
  assert.match(JSON.stringify((await calls())[0].body.messages), /WAJIB disalin persis/);
});

await test("Kredit Claude habis (402) → langsung pindah ke Gemini", async () => {
  await setMode({ claude: "402" });
  const r = await tasks.makeSimpleVersion({ body: BODY, grade: "", subject: "" });
  assert.equal(r.model, "gemini-3.6-flash");
  assert.deepEqual(route(await calls()), ["claude:claude-haiku-5-5", "gemini:gemini-3.6-flash"]);
});

await test("Kunci Claude ditolak (401) → Gemini", async () => {
  await setMode({ claude: "401" });
  const r = await tasks.makeSummaryVersion({ body: BODY, grade: "", subject: "" });
  assert.equal(r.model, "gemini-3.6-flash");
});

await test("Haiku sibuk (529) → Sonnet, tanpa perlu Gemini", async () => {
  await setMode({ claude: { "claude-haiku-5-5": "529" } });
  const r = await tasks.makeSimpleVersion({ body: BODY, grade: "", subject: "" });
  assert.equal(r.model, "claude-sonnet-5-5");
  assert.deepEqual(route(await calls()), ["claude:claude-haiku-5-5", "claude:claude-sonnet-5-5"]);
});

await test("Semua model Claude sibuk → Gemini", async () => {
  await setMode({ claude: "529" });
  const r = await tasks.makeRegionalVersion({ body: BODY, grade: "", lang: "su" });
  assert.equal(r.model, "gemini-3.6-flash");
});

await test("Kuota Gemini habis (429) saat baca foto → Flash-Lite → Claude", async () => {
  await setMode({ gemini: "429" });
  const r = await tasks.photoToText(IMG);
  assert.equal(r.model, "claude-haiku-5-5");
  assert.deepEqual(route(await calls()), [
    "gemini:gemini-3.6-flash",
    "gemini:gemini-3.5-flash-lite",
    "claude:claude-haiku-5-5",
  ]);
  const claude = (await calls()).at(-1)!;
  assert.deepEqual(claude.body.messages[0].content[0], {
    type: "image",
    source: { type: "base64", media_type: IMG.mimeType, data: IMG.base64 },
  });
});

await test("Gemini menolak skema JSON (400) → ulang tanpa skema di model yang sama", async () => {
  await setMode({ gemini: "400schema" });
  const r = await tasks.makeQuizDraft({ body: BODY, grade: "", count: 3, types: ["pg", "bs"] });
  assert.deepEqual(r.questions.map((q) => q.type), ["pg", "bs"]);
  const cs = await calls();
  assert.deepEqual(route(cs), ["gemini:gemini-3.6-flash", "gemini:gemini-3.6-flash"]);
  assert.equal(cs[1].body.generationConfig.responseJsonSchema, undefined);
});

await test("Jawaban bukan JSON → coba variasi lain, lalu model lain", async () => {
  await setMode({ claude: { "claude-haiku-5-5": "badjson" } });
  const r = await tasks.makeSimpleVersion({ body: BODY, grade: "", subject: "" });
  assert.equal(r.model, "claude-sonnet-5-5");
});

await test("Semua penyedia gagal → pesan jelas untuk guru", async () => {
  await setMode({ claude: "500", gemini: "500" });
  await assert.rejects(tasks.makeSimpleVersion({ body: BODY, grade: "", subject: "" }), (e: unknown) => {
    assert.ok(e instanceof AiError);
    assert.equal(e.status, 502);
    assert.match(e.message, /tulis versi secara manual/);
    return true;
  });
});

await test("Materi terlalu panjang (max_tokens) → berhenti, tidak dilempar ke Gemini", async () => {
  await setMode({ claude: "maxtokens" });
  await assert.rejects(tasks.makeSimpleVersion({ body: BODY, grade: "", subject: "" }), isAiError(422));
  assert.deepEqual(route(await calls()), ["claude:claude-haiku-5-5"]);
});

await test("Foto tidak terbaca → terbaca=false diteruskan ke route", async () => {
  await setMode({ gemini: "unreadable" });
  const r = await tasks.photoToText(IMG);
  assert.equal(r.terbaca, false);
});

await test("Hanya kunci Gemini → versi teks lewat Gemini", async () => {
  await setMode();
  const kunci = process.env.ANTHROPIC_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
  try {
    const r = await tasks.makeSimpleVersion({ body: BODY, grade: "", subject: "" });
    assert.equal(r.model, "gemini-3.6-flash");
    assert.deepEqual(route(await calls()), ["gemini:gemini-3.6-flash"]);
  } finally {
    process.env.ANTHROPIC_API_KEY = kunci;
  }
});

await test("Tanpa kunci sama sekali → 503 dengan petunjuk env", async () => {
  const [a, g] = [process.env.ANTHROPIC_API_KEY, process.env.GEMINI_API_KEY];
  delete process.env.ANTHROPIC_API_KEY;
  delete process.env.GEMINI_API_KEY;
  try {
    await assert.rejects(tasks.makeSimpleVersion({ body: BODY, grade: "", subject: "" }), (e: unknown) => {
      assert.ok(e instanceof AiError && e.status === 503);
      assert.match(e.message, /ANTHROPIC_API_KEY atau GEMINI_API_KEY/);
      return true;
    });
  } finally {
    process.env.ANTHROPIC_API_KEY = a;
    process.env.GEMINI_API_KEY = g;
  }
});

await test("Claude macet (timeout) → Gemini masih kebagian waktu, total < 60 detik (lambat ±40 dtk)", async () => {
  await setMode({ claude: "hang" });
  const t0 = Date.now();
  const r = await tasks.makeSimpleVersion({ body: BODY, grade: "", subject: "" });
  const ms = Date.now() - t0;
  assert.equal(r.model, "gemini-3.6-flash");
  assert.ok(ms < 55_000, `selesai dalam ${ms} ms`);
});

console.log(`\n${passed} uji lulus`);
await stop();
