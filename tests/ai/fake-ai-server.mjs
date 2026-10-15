// Server palsu yang meniru Claude Messages API dan Gemini generateContent (REST),
// supaya mesin AI Selaras bisa diuji tanpa kunci API dan tanpa biaya.
//
// Dipakai oleh tests/ai/ai.test.mts, atau dijalankan sendiri untuk mencoba UI tanpa kunci asli:
//   node tests/ai/fake-ai-server.mjs            (port 4599)
//   lalu di .env.local: ANTHROPIC_BASE_URL=http://127.0.0.1:4599  GEMINI_BASE_URL=http://127.0.0.1:4599
//                       ANTHROPIC_API_KEY=palsu  GEMINI_API_KEY=palsu
//
// Perilaku tiap penyedia diatur lewat POST /__mode, mis. {"claude": "529", "gemini": "ok"}.
// Mode: ok | badjson | 400schema | 401 | 402 | 429 | 500 | 529 | hang | refusal | maxtokens | unreadable
// Mode bisa dibatasi ke satu model: {"claude": {"claude-haiku-5-5": "529"}}.
import http from "node:http";
import { pathToFileURL } from "node:url";

const mode = { claude: "ok", gemini: "ok" };
const log = [];

function modeFor(provider, model) {
  const m = mode[provider];
  return typeof m === "object" ? (m[model] ?? "ok") : m;
}

/** Jawaban palsu yang masuk akal, ditebak dari isi prompt. */
function answerFor(prompt, provider, m) {
  const tag = `(${provider})`;
  const perangkat = perangkatAnswer(prompt, tag);
  if (perangkat) return perangkat;
  if (prompt.includes("Salin teks utama dari foto")) {
    if (m === "unreadable") return { judul: "", teks: "", terbaca: false };
    return {
      judul: "Daur Air",
      teks: `## Daur Air\n\nAir di bumi selalu bergerak. Matahari memanaskan air laut ${tag}.\n\n[Gambar: panah dari laut ke awan]`,
      terbaca: true,
    };
  }
  if (prompt.includes("soal pilihan ganda")) {
    return {
      soal: [
        { pertanyaan: "Apa yang memanaskan air laut?", pilihan: ["Matahari", "Bulan", "Angin", "Batu"], jawaban: 0, pembahasan: `Matahari ${tag}.` },
        { pertanyaan: "Uap air yang mendingin membentuk…", pilihan: ["Tanah", "Awan", "Pasir", "Api"], jawaban: 1, pembahasan: "Awan." },
        { pertanyaan: "Air yang jatuh dari awan disebut…", pilihan: ["Embun", "Kabut", "Hujan", "Salju"], jawaban: 2, pembahasan: "Hujan." },
      ],
    };
  }
  if (prompt.includes("Buat ringkasan materi")) {
    return { teks: `1. Air di bumi selalu bergerak ${tag}.\n2) Matahari memanaskan air.\n* Uap air membentuk awan.\n- Hujan jatuh ke bumi.` };
  }
  if (prompt.includes("Terjemahkan materi")) {
    return {
      teks: `Banyu ing bumi tansah obah. Srengenge manasi banyu segara lan dadi penguapan ${tag}.`,
      glosarium: [
        { kata: "penguapan", arti: "Banyu dadi uap. (Air menjadi uap.)" },
        { kata: "pengembunan", arti: "Ora ana ing teks iki" },
      ],
    };
  }
  if (prompt.includes("Jawab pertanyaan siswa berikut")) {
    // Pertanyaan yang memuat "bitcoin" dianggap di luar materi (prompt sudah di-JSON.stringify, cukup dicari katanya).
    if (/bitcoin/i.test(prompt)) return { ditemukan: false, jawaban: "" };
    return { ditemukan: true, jawaban: `Klorofil membuat daun berwarna hijau ${tag}.` };
  }
  // Teks mudah
  return {
    teks: `Air di bumi selalu bergerak. Matahari memanaskan air ${tag}.\n\nAir berubah jadi uap. Ini disebut penguapan.`,
    glosarium: [
      { kata: "penguapan", arti: "Air berubah menjadi uap." },
      { kata: "Penguapan", arti: "duplikat" },
      { kata: "fotosintesis", arti: "tidak ada di teks sumber" },
    ],
  };
}

/** Jawaban palsu Generator Perangkat Ajar (src/lib/ai-perangkat.ts). Sengaja diberi nomor/butir untuk diuji dirapikan. */
function perangkatAnswer(prompt, tag) {
  if (prompt.includes("Susun draf modul ajar")) {
    return {
      tujuan: [`1. Peserta didik dapat menjelaskan penguapan ${tag}.`, "- Peserta didik dapat menyebutkan urutan daur air."],
      sarana: ["Gelas berisi air", "Materi Selaras (link dari guru)"],
      pendahuluan: { menit: 10, langkah: ["Salam dan doa.", "Pertanyaan pemantik: ke mana air hujan pergi?"] },
      inti: { menit: 50, langkah: ["Siswa membaca materi.", "Siswa mengamati air yang dipanaskan.", "Siswa mengerjakan LKPD."] },
      penutup: { menit: 10, langkah: ["Siswa menyimpulkan.", "Refleksi singkat."] },
      asesmen: ["Formatif: LKPD dengan rubrik.", "Sumatif: kuis singkat di Selaras."],
      akomodasi: ["Siswa disleksia memakai versi teks mudah dan dibacakan."],
    };
  }
  if (prompt.includes("Susun draf LKPD versi sederhana")) {
    return {
      judul: "Air Bergerak",
      tujuan: "Hari ini kamu belajar tentang air.",
      petunjuk: ["Baca teks pendek.", "Jawab soal."],
      aktivitas: [
        { judul: "Baca", langkah: ["Baca teks mudah."], pertanyaan: [`Apa yang memanaskan air? (lingkari) ${tag}`, "Gambar awan. (gambar)"] },
        { judul: "", langkah: [], pertanyaan: ["Air jadi apa? (satu kata)"] },
      ],
    };
  }
  if (prompt.includes("Susun draf rubrik penilaian")) {
    return {
      judul: "Rubrik LKPD Daur Air",
      kriteria: [
        { nama: "Pemahaman konsep", level: ["Perlu bantuan menyebut penguapan.", "Menyebut penguapan.", "Menjelaskan penguapan.", `Menjelaskan dan memberi contoh ${tag}.`] },
        { nama: "Ketepatan jawaban", level: ["1 jawaban tepat.", "2 jawaban tepat.", "3 jawaban tepat.", "Semua jawaban tepat."] },
        { nama: "Kerja sama", level: ["Perlu diajak.", "Kadang ikut.", "Ikut aktif.", "Memimpin diskusi."] },
      ],
    };
  }
  if (prompt.includes("Susun draf LKPD")) {
    return {
      judul: "LKPD Daur Air",
      tujuan: "Setelah mengerjakan LKPD ini, kamu dapat menjelaskan daur air.",
      petunjuk: ["Tulis nama dan kelasmu.", "Kerjakan bersama kelompok."],
      aktivitas: [
        { judul: "", langkah: ["Amati air yang dipanaskan."], pertanyaan: [`1) Apa yang terjadi pada air? ${tag}`, "Mengapa air berubah?"] },
        { judul: "Urutan daur air", langkah: [], pertanyaan: ["Tulis urutan daur air."] },
      ],
    };
  }
  return null;
}

const server = http.createServer(async (req, res) => {
  let raw = "";
  for await (const chunk of req) raw += chunk;
  const body = raw ? JSON.parse(raw) : {};
  const send = (status, payload) => {
    res.statusCode = status;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify(payload));
  };

  if (req.url === "/__mode") {
    mode.claude = "ok";
    mode.gemini = "ok";
    Object.assign(mode, body);
    log.length = 0;
    return send(200, {});
  }
  if (req.url === "/__log") return send(200, log);

  const isClaude = req.url.startsWith("/v1/messages");
  const provider = isClaude ? "claude" : "gemini";
  const model = isClaude ? body.model : decodeURIComponent(req.url.match(/models\/([^:]+):/)?.[1] ?? "");
  const m = modeFor(provider, model);
  log.push({ provider, model, url: req.url, body, headers: req.headers });

  if (m === "hang") return; // tidak pernah menjawab
  if (m === "400schema" && (body.output_config || body.generationConfig?.responseJsonSchema)) {
    return send(400, { error: { message: "schema not supported (palsu)" } });
  }
  if (m === "402") return send(400, { error: { message: "Your credit balance is too low (palsu)" } });
  if (["401", "429", "500", "529"].includes(m)) return send(Number(m), { error: { message: `palsu ${m}` } });

  const prompt = JSON.stringify(isClaude ? body.messages : body.contents);
  const json = JSON.stringify(answerFor(prompt, provider, m));
  const text = m === "badjson" ? "maaf, ini bukan JSON" : json;

  if (isClaude) {
    return send(200, {
      id: "msg_palsu",
      type: "message",
      role: "assistant",
      model,
      content: [{ type: "text", text }],
      stop_reason: m === "refusal" ? "refusal" : m === "maxtokens" ? "max_tokens" : "end_turn",
      usage: { input_tokens: 1, output_tokens: 1 },
    });
  }
  return send(200, {
    candidates: [
      {
        content: { role: "model", parts: [{ text: "berpikir…", thought: true }, { text }] },
        finishReason: m === "refusal" ? "SAFETY" : m === "maxtokens" ? "MAX_TOKENS" : "STOP",
      },
    ],
  });
});

/** Jalankan server. Mengembalikan fungsi untuk menutupnya. */
export function startFakeAi(port = 4599) {
  return new Promise((resolve) => {
    server.listen(port, "127.0.0.1", () =>
      resolve(() => {
        server.closeAllConnections?.();
        return new Promise((r) => server.close(() => r()));
      }),
    );
  });
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const port = Number(process.env.PORT || 4599);
  await startFakeAi(port);
  console.log(`Server AI palsu jalan di http://127.0.0.1:${port}`);
}
