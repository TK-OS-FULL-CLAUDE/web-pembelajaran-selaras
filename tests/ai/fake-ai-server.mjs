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
  const adaptif = adaptifAnswer(prompt, tag);
  if (adaptif) return adaptif;
  const perangkat = perangkatAnswer(prompt, tag);
  if (perangkat) return perangkat;
  if (prompt.includes("Salin teks utama dari foto")) {
    if (m === "unreadable") return { judul: "", teks: "", terbaca: false, gambar: [] };
    return {
      judul: "Daur Air",
      teks: `## Daur Air\n\nAir di bumi selalu bergerak. Matahari memanaskan air laut ${tag}.\n\n[[GAMBAR 1]]\n\nUap air naik ke udara.`,
      terbaca: true,
      gambar: [
        { nomor: 1, keterangan: "Daur air", deskripsi: "Panah dari laut ke awan, lalu hujan turun ke gunung.", kotak: [300, 100, 700, 900] },
      ],
    };
  }
  if (prompt.includes("Tulis deskripsi untuk gambar")) {
    return { deskripsi: `Diagram daun dengan panah cahaya, air, dan udara ${tag}.`, keterangan: "Diagram daun" };
  }
  if (prompt.includes("Jenis soal yang dipakai")) {
    const all = [
      { jenis: "pg", pertanyaan: "Apa yang memanaskan air laut?", pilihan: ["Matahari", "Bulan", "Angin", "Batu"], jawaban: [0], isian: [], pasangan: [], pembahasan: `Matahari ${tag}.` },
      { jenis: "bs", pertanyaan: "Uap air yang mendingin membentuk awan.", pilihan: [], jawaban: [0], isian: [], pasangan: [], pembahasan: "Benar." },
      { jenis: "pgk", pertanyaan: "Pilih semua peristiwa dalam daur air.", pilihan: ["Penguapan", "Pembakaran", "Pengembunan", "Hujan"], jawaban: [0, 2, 3], isian: [], pasangan: [], pembahasan: "Pembakaran bukan bagian daur air." },
      { jenis: "isian", pertanyaan: "Air yang jatuh dari awan disebut …", pilihan: [], jawaban: [], isian: ["hujan"], pasangan: [], pembahasan: "Hujan." },
      { jenis: "jodoh", pertanyaan: "Pasangkan peristiwa dengan artinya.", pilihan: [], jawaban: [], isian: [], pasangan: [
        { kiri: "Penguapan", kanan: "Air menjadi uap" },
        { kiri: "Pengembunan", kanan: "Uap menjadi titik air" },
        { kiri: "Hujan", kanan: "Air jatuh dari awan" },
      ], pembahasan: "Sesuai urutan daur air." },
      // Soal rusak: pilihan ganda tanpa pilihan → harus dibuang.
      { jenis: "pg", pertanyaan: "Soal rusak tanpa pilihan?", pilihan: [], jawaban: [0], isian: [], pasangan: [], pembahasan: "" },
    ];
    // Hanya jenis yang diminta (lihat daftar di prompt).
    const wanted = all.filter((q) => q.jenis === "pg" ? prompt.includes('\\"pg\\" = pilihan ganda') : prompt.includes(`\\"${q.jenis}\\" =`));
    return { soal: wanted.length ? wanted : all };
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

/** Teks prompt asli (prompt diterima dalam bentuk JSON.stringify). */
function unescape(prompt) {
  return prompt.replace(/\\(["\\n])/g, (_, c) => (c === "n" ? "\n" : c));
}

/**
 * Jawaban palsu fitur adaptif & Matematika: kuis Matematika (satu kunci sengaja salah hitung), bank latihan,
 * analisis rekap, pemeriksa kesetiaan, dan tugas berjenjang.
 */
function adaptifAnswer(prompt, tag) {
  const text = unescape(prompt);
  if (prompt.includes("Jenis soal yang dipakai") && prompt.includes("Ini materi Matematika")) {
    return {
      soal: [
        // Rumus memakai LaTeX seperti yang diminta prompt; kunci isian & hitungan tulisan biasa.
        { jenis: "pg", konsep: "Pecahan senilai", pertanyaan: `Pecahan yang senilai dengan $\\frac{2}{3}$ adalah … ${tag}`, pilihan: ["$\\frac{4}{6}$", "$\\frac{3}{4}$", "$\\frac{2}{6}$", "$\\frac{4}{3}$"], jawaban: [0], isian: [], pasangan: [], pembahasan: "$2 \\times 2 = 4$ dan $3 \\times 2 = 6$.", petunjuk: ["Kalikan pembilang dan penyebut.", "Dikali 2."], hitungan: "2/3", setara: false },
        // Kunci sengaja salah: 3/4 - 1/4 = 1/2, bukan 1/4 → harus bertanda "Periksa hitungan".
        { jenis: "pg", konsep: "Pengurangan pecahan", pertanyaan: "$\\frac{3}{4} - \\frac{1}{4} = \\ldots$", pilihan: ["$\\frac{1}{2}$", "$\\frac{1}{4}$", "$\\frac{2}{8}$", "$1$"], jawaban: [1], isian: [], pasangan: [], pembahasan: "Kurangi pembilangnya.", petunjuk: ["Penyebutnya sudah sama."], hitungan: "3/4 - 1/4", setara: false },
        { jenis: "isian", konsep: "Pecahan senilai", pertanyaan: "$\\frac{1}{2} = \\frac{\\square}{10}$", pilihan: [], jawaban: [], isian: ["5"], pasangan: [], pembahasan: "$1 \\times 5 = 5$.", petunjuk: ["2 dikali berapa menjadi 10?"], hitungan: "10/2", setara: false },
        { jenis: "isian", konsep: "Bentuk aljabar", pertanyaan: "Tulis $2(x+1)$ tanpa tanda kurung.", pilihan: [], jawaban: [], isian: ["2x+2"], pasangan: [], pembahasan: "$2 \\times x + 2 \\times 1$.", petunjuk: ["Kalikan 2 dengan setiap suku."], hitungan: "", setara: true },
      ],
    };
  }
  if (prompt.includes("soal latihan untuk SETIAP konsep")) {
    const names = [...text.matchAll(/Konsep "([^"]+)"/g)].map((m) => m[1]);
    const math = prompt.includes("Ini materi Matematika");
    return {
      soal: names.flatMap((konsep) => [
        { jenis: "bs", konsep, pertanyaan: `Latihan ${konsep}: pernyataan ini benar ${tag}.`, pilihan: [], jawaban: [0], isian: [], pasangan: [], pembahasan: "Benar, sesuai materi.", petunjuk: ["Baca lagi materinya.", "Perhatikan kata kuncinya."], hitungan: "" },
        math
          ? { jenis: "isian", konsep, pertanyaan: "Sederhanakan $\\frac{3}{9}$.", pilihan: [], jawaban: [], isian: ["1/3"], pasangan: [], pembahasan: "$3 : 3 = 1$ dan $9 : 3 = 3$.", petunjuk: ["Bagi dengan 3."], hitungan: "3/9", setara: false }
          : { jenis: "pg", konsep, pertanyaan: `Mana yang benar tentang ${konsep}?`, pilihan: ["Sesuai materi", "Tidak sesuai", "Tidak tahu", "Lainnya"], jawaban: [0], isian: [], pasangan: [], pembahasan: "Sesuai materi.", petunjuk: ["Ingat isi materi."], hitungan: "" },
      ]),
    };
  }
  if (prompt.includes("Ubah setiap rumus")) {
    // Ubah rumus tulisan biasa sederhana; teks berisi "UBAH-ANGKA" sengaja diberi angka yang salah.
    const texts = [...text.matchAll(/Teks (\d+):\n"""\n([\s\S]*?)\n"""/g)].map((m) => ({ no: Number(m[1]), teks: m[2] }));
    return {
      hasil: texts.map(({ no, teks }) => ({
        no,
        teks: teks
          .replace(/(\d+) × (\d+) = (\d+)/g, "$$$1 \\times $2 = $3$$")
          .replace(/(^|[^\d/$])(\d{1,3})\/(\d{1,3})(?![\d/])/g, "$1$$\\frac{$2}{$3}$$")
          .replace(/\bx\^2\b/g, "$$x^2$$")
          .replace(/UBAH-ANGKA (\d+)/, (_, d) => `UBAH-ANGKA ${Number(d) + 1}`),
      })),
    };
  }
  if (prompt.includes("Baca hasil kuis kelas")) {
    const konsep = text.match(/\[konsep: ([^;\]]+);/)?.[1] ?? "";
    return {
      ringkasan: `Sebagian besar kelas memahami materi, tetapi satu konsep masih sering keliru ${tag}.`,
      temuan: [
        { konsep, soal: [3, 99], dugaan: "Kemungkinan siswa mengira oksigen adalah bahan fotosintesis.", saran: "Pakai kartu bahan dan hasil, lalu bahas bersama." },
        { konsep: "Konsep karangan", soal: [1], dugaan: "Dugaan kedua.", saran: "Saran kedua." },
      ],
      caraBelajar: "Jumlah sesi per cara belajar masih kecil, jadi belum bisa disimpulkan.",
      penjelasan: "Tumbuhan memakai air, karbon dioksida, dan cahaya.\n- Oksigen adalah hasil, bukan bahan.",
    };
  }
  if (prompt.includes("Bandingkan draf")) {
    const draft = text.match(/Draf [^\n]*:\n"""\n([\s\S]*?)\n"""/)?.[1] ?? "";
    const words = draft.replace(/[#>*|-]/g, " ").split(/\s+/).filter(Boolean).slice(0, 5).join(" ");
    return {
      temuan: [
        { kutipan: words, jenis: "fakta_baru", penjelasan: `Contoh temuan palsu ${tag}.` },
        { kutipan: "kalimat yang tidak ada di draf mana pun", jenis: "angka", penjelasan: "Harus dibuang karena kutipannya tidak ada." },
      ],
    };
  }
  if (prompt.includes("Susun draf tugas berjenjang")) {
    const tugas = (judul) => ({ judul, tugas: `Kerjakan tugas ${judul.toLowerCase()} ${tag}.`, langkah: ["1. Baca materi.", "- Kerjakan bersama teman."] });
    return { dasar: tugas("Ayo ulangi"), inti: tugas("Ayo berlatih"), tantangan: tugas("Ayo jelaskan") };
  }
  return null;
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
  // "rawlatex": model lupa menggandakan garis miring LaTeX di dalam JSON (\frac, \sqrt, \times).
  const text = m === "badjson" ? "maaf, ini bukan JSON" : m === "rawlatex" ? json.replace(/\\\\/g, "\\") : json;

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
