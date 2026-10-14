import "server-only";
import { z } from "zod";
import { generateJson } from "./claude";
import type { GlossaryItem, QuizQuestion, RegionalLang } from "./types";

// Semua prompt AI Selaras ada di file ini supaya mudah ditinjau tim dan juri.
// Prinsip: AI hanya menyiapkan DRAF dari teks guru; guru wajib mengecek sebelum materi terbit.

const glossarySchema = z
  .array(z.object({ kata: z.string().min(1).max(60), arti: z.string().min(1).max(300) }))
  .max(10)
  .catch([]);

// JSON Schema untuk output terstruktur Claude: setiap object wajib additionalProperties: false.
const GLOSSARY_SCHEMA = {
  type: "array",
  items: {
    type: "object",
    properties: { kata: { type: "string" }, arti: { type: "string" } },
    required: ["kata", "arti"],
    additionalProperties: false,
  },
};

const TEXT_WITH_GLOSSARY_SCHEMA = {
  type: "object",
  properties: { teks: { type: "string" }, glosarium: GLOSSARY_SCHEMA },
  required: ["teks", "glosarium"],
  additionalProperties: false,
};

const FORMAT_RULES = `Format teks:
- Baris yang diawali "## " adalah judul bagian.
- Baris yang diawali "- " adalah butir daftar.
- Pisahkan paragraf dengan satu baris kosong.
- Jangan memakai format lain (tanpa tebal, miring, tabel, atau emoji).`;

// ---------- 1. Foto halaman buku → teks ----------

const photoSchema = z.object({
  judul: z.string().max(200).catch(""),
  teks: z.string(),
  terbaca: z.boolean().catch(true),
});

export async function photoToText(image: { mimeType: string; base64: string }) {
  const { data, model } = await generateJson({
    system:
      "Kamu membantu guru di Indonesia menyalin halaman buku pelajaran menjadi teks digital. Kamu menyalin dengan teliti dan tidak pernah menambah isi.",
    content: [
      { type: "image", source: { type: "base64", media_type: image.mimeType, data: image.base64 } },
      {
        type: "text",
        text: `Salin teks utama dari foto halaman buku pelajaran ini persis seperti tertulis.
Aturan:
- Abaikan nomor halaman, header, footer, dan tulisan kecil yang tidak penting.
- Gabungkan baris yang terpotong karena tata letak menjadi kalimat utuh.
- Judul bab atau subbab ditulis di baris sendiri, diawali "## ".
- Jangan meringkas, jangan menambah informasi, jangan memperbaiki isi.
- Isi "judul" dengan judul bab/topik utama bila terlihat.
- Jika foto tidak berisi teks yang terbaca, isi "terbaca" dengan false dan "teks" kosong.
${FORMAT_RULES}`,
      },
    ],
    schema: {
      type: "object",
      properties: { judul: { type: "string" }, teks: { type: "string" }, terbaca: { type: "boolean" } },
      required: ["judul", "teks", "terbaca"],
      additionalProperties: false,
    },
    validator: photoSchema,
    temperature: 0.1,
  });
  return { ...data, model };
}

// ---------- 2. Versi teks mudah + glosarium ----------

const simpleSchema = z.object({ teks: z.string().min(20), glosarium: glossarySchema });

export async function makeSimpleVersion(input: { body: string; grade: string; subject: string }) {
  const { data, model } = await generateJson({
    system:
      "Kamu adalah guru pendamping pendidikan inklusif di Indonesia. Kamu menulis ulang materi pelajaran supaya bisa diikuti siswa yang kesulitan membaca, tanpa mengubah isi pelajarannya.",
    content: [
      {
        type: "text",
        text: `Tulis ulang materi ${input.subject || "pelajaran"} untuk ${input.grade || "siswa SD"} berikut menjadi versi "teks mudah" untuk siswa dengan disleksia, sulit fokus, atau yang masih belajar Bahasa Indonesia.

Aturan isi:
- Pakai HANYA fakta yang ada di teks sumber. Jangan menambah fakta, contoh baru, atau angka baru.
- Semua gagasan penting dari teks sumber tetap ada.
- Kalimat pendek, paling banyak 12 kata, satu gagasan per kalimat.
- Pakai kata sehari-hari. Istilah penting tetap dipakai, lalu langsung dijelaskan dengan kata sederhana.
- Paragraf pendek (2–4 kalimat). Boleh memakai daftar butir untuk bahan atau langkah.
${FORMAT_RULES}

Buat juga "glosarium": 4–8 kata atau istilah sulit yang MUNCUL di teks sumber, masing-masing dengan arti singkat (1 kalimat) yang mudah dipahami anak. Tulis "kata" persis seperti di teks sumber.

Teks sumber:
"""
${input.body}
"""`,
      },
    ],
    schema: TEXT_WITH_GLOSSARY_SCHEMA,
    validator: simpleSchema,
  });
  return { text: data.teks.trim(), glossary: cleanGlossary(data.glosarium), model };
}

// ---------- 3. Versi bahasa daerah ----------

const LANG_PROMPT: Record<RegionalLang, string> = {
  jw: "Bahasa Jawa ragam ngoko yang sopan dan umum dipahami anak SD di Jawa Tengah dan Jawa Timur. Tulis dengan ejaan Jawa Latin yang lazim (misalnya: godhong, banyu, srengenge).",
  su: "Bahasa Sunda ragam loma yang sopan dan umum dipahami anak SD di Jawa Barat, dengan ejaan Sunda Latin yang lazim.",
};

const regionalSchema = z.object({ teks: z.string().min(20), glosarium: glossarySchema });

export async function makeRegionalVersion(input: { body: string; grade: string; lang: RegionalLang }) {
  const { data, model } = await generateJson({
    system:
      "Kamu adalah guru SD yang fasih berbahasa daerah dan Bahasa Indonesia. Kamu menerjemahkan materi pelajaran dengan setia pada isi aslinya.",
    content: [
      {
        type: "text",
        text: `Terjemahkan materi untuk ${input.grade || "siswa SD"} berikut ke ${LANG_PROMPT[input.lang]}

Aturan:
- Terjemahkan isi teks sumber saja. Jangan menambah atau mengurangi fakta.
- Istilah ilmiah atau istilah pelajaran (misalnya nama zat, nama proses) tetap ditulis dalam Bahasa Indonesia, lalu dijelaskan dalam bahasa daerah bila perlu.
- Kalimat sederhana dan jelas untuk anak.
${FORMAT_RULES}

Buat juga "glosarium": 3–6 istilah penting dari teks (tulis istilahnya seperti di terjemahan), dengan arti dalam bahasa daerah tersebut, diikuti arti singkat Bahasa Indonesia dalam tanda kurung.

Teks sumber:
"""
${input.body}
"""`,
      },
    ],
    schema: TEXT_WITH_GLOSSARY_SCHEMA,
    validator: regionalSchema,
  });
  return { text: data.teks.trim(), glossary: cleanGlossary(data.glosarium), model };
}

// ---------- 4. Draf kuis ----------

const quizSchema = z.object({
  soal: z
    .array(
      z.object({
        pertanyaan: z.string().min(5),
        pilihan: z.array(z.string().min(1)).length(4),
        jawaban: z.number().int().min(0).max(3),
        pembahasan: z.string().catch(""),
      }),
    )
    .min(1)
    .max(10),
});

export async function makeQuizDraft(input: { body: string; grade: string; count: number }) {
  const { data, model } = await generateJson({
    system: "Kamu adalah guru SD di Indonesia yang menyusun soal pilihan ganda yang adil dan jelas.",
    content: [
      {
        type: "text",
        text: `Buat ${input.count} soal pilihan ganda untuk ${input.grade || "siswa SD"} dari materi berikut.

Aturan:
- Setiap soal hanya bisa dijawab dari isi materi. Jangan menanyakan hal di luar materi.
- 4 pilihan per soal, tepat satu yang benar. "jawaban" adalah nomor indeks pilihan yang benar (0–3).
- Kalimat soal pendek dan jelas. Hindari kalimat bertingkat dan pilihan "semua benar".
- Variasikan posisi jawaban benar.
- "pembahasan": satu kalimat yang menjelaskan kenapa jawabannya benar, merujuk isi materi.

Materi:
"""
${input.body}
"""`,
      },
    ],
    schema: {
      type: "object",
      properties: {
        soal: {
          type: "array",
          items: {
            type: "object",
            properties: {
              pertanyaan: { type: "string" },
              pilihan: { type: "array", items: { type: "string" } },
              jawaban: { type: "integer" },
              pembahasan: { type: "string" },
            },
            required: ["pertanyaan", "pilihan", "jawaban", "pembahasan"],
            additionalProperties: false,
          },
        },
      },
      required: ["soal"],
      additionalProperties: false,
    },
    validator: quizSchema,
    temperature: 0.4,
  });
  const questions: QuizQuestion[] = data.soal.map((s) => ({
    q: s.pertanyaan.trim(),
    options: s.pilihan.map((o) => o.trim()),
    answer: s.jawaban,
    explain: s.pembahasan.trim(),
    origin: "ai",
  }));
  return { questions, model };
}

function cleanGlossary(items: GlossaryItem[]): GlossaryItem[] {
  const seen = new Set<string>();
  return items
    .map((g) => ({ kata: g.kata.trim(), arti: g.arti.trim() }))
    .filter((g) => g.kata && g.arti && !seen.has(g.kata.toLowerCase()) && seen.add(g.kata.toLowerCase()));
}

