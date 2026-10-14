// Konten demo: kelas 4B dan materi IPAS "Fotosintesis".
// Teks ditulis sendiri oleh tim (bukan salinan buku). Versi Bahasa Jawa adalah draf:
// minta penutur asli mengecek sebelum lomba.

import type { ClassNeeds, GlossaryItem, QuizQuestion } from "./types";

export const DEMO_EMAIL = "guru@selaras.id";
export const DEMO_PASSWORD = "selaras-demo";
export const DEMO_TEACHER_NAME = "Bu Rina (akun demo)";
export const DEMO_SCHOOL = "SD Negeri Contoh 1";
export const DEMO_SHARE_CODE = "DEMO01";

export const DEMO_CLASS = {
  name: "Kelas 4B",
  grade: "Kelas 4 SD",
  needs: {
    totalSiswa: 28,
    lowVision: 2,
    tuli: 1,
    disleksia: 2,
    sulitFokus: 1,
    bahasaDaerah: 3,
    bahasa: "jw",
  } satisfies ClassNeeds,
};

export const FOTOSINTESIS_BODY = `## Fotosintesis: Cara Tumbuhan Membuat Makanan

Manusia dan hewan mendapat makanan dengan cara makan. Tumbuhan berbeda. Tumbuhan hijau dapat membuat makanannya sendiri melalui proses yang disebut fotosintesis.

Fotosintesis terjadi terutama di daun. Daun berwarna hijau karena mengandung klorofil, yaitu zat hijau daun. Klorofil menangkap energi dari cahaya matahari.

Untuk berfotosintesis, tumbuhan memerlukan air, karbon dioksida, dan cahaya matahari. Air diserap oleh akar dari dalam tanah, lalu diangkut melalui batang menuju daun. Karbon dioksida adalah gas dari udara yang masuk ke daun melalui lubang-lubang kecil bernama stomata.

Dengan bantuan energi cahaya matahari, air dan karbon dioksida diubah menjadi gula dan oksigen. Gula menjadi makanan bagi tumbuhan dan disimpan di bagian tubuhnya, misalnya di umbi, buah, atau biji. Oksigen dilepaskan ke udara.

Oksigen hasil fotosintesis kita hirup setiap hari untuk bernapas. Karena itu, menanam dan merawat tumbuhan berarti ikut menjaga udara yang kita butuhkan.`;

export const FOTOSINTESIS_GLOSSARY: GlossaryItem[] = [
  { kata: "fotosintesis", arti: "Cara tumbuhan hijau membuat makanannya sendiri dengan bantuan cahaya matahari." },
  { kata: "klorofil", arti: "Zat hijau di daun yang menangkap cahaya matahari." },
  { kata: "karbon dioksida", arti: "Gas di udara yang dipakai tumbuhan untuk membuat makanan." },
  { kata: "stomata", arti: "Lubang sangat kecil di daun, tempat udara keluar dan masuk." },
  { kata: "oksigen", arti: "Gas yang kita hirup untuk bernapas." },
  { kata: "diserap", arti: "Diambil dan masuk ke dalam, seperti spons menyerap air." },
];

export const FOTOSINTESIS_MUDAH = `## Fotosintesis

Kita makan untuk mendapat makanan. Tumbuhan tidak makan seperti kita. Tumbuhan hijau membuat makanannya sendiri. Cara ini disebut fotosintesis.

Fotosintesis terjadi di daun. Daun berwarna hijau. Warna hijau itu berasal dari klorofil. Klorofil menangkap cahaya matahari.

Tumbuhan butuh tiga hal:
- air
- karbon dioksida, yaitu gas dari udara
- cahaya matahari

Akar mengambil air dari tanah. Air naik lewat batang ke daun. Karbon dioksida masuk ke daun lewat lubang kecil. Lubang kecil itu bernama stomata.

Cahaya matahari memberi tenaga. Air dan karbon dioksida berubah menjadi gula dan oksigen. Gula adalah makanan tumbuhan. Gula disimpan di umbi, buah, atau biji.

Oksigen keluar ke udara. Kita menghirup oksigen untuk bernapas. Jadi, merawat tumbuhan berarti menjaga udara kita.`;

export const FOTOSINTESIS_JAWA = `## Fotosintesis: Carane Tetuwuhan Gawe Panganan

Manungsa lan kewan oleh panganan kanthi cara mangan. Tetuwuhan ora kaya ngono. Tetuwuhan sing ijo bisa gawe panganane dhewe. Proses iki diarani fotosintesis.

Fotosintesis kedadeyan utamane ing godhong. Godhong werna ijo amarga ana klorofil, yaiku zat ijo godhong. Klorofil nangkep tenaga saka sorot srengenge.

Supaya bisa fotosintesis, tetuwuhan butuh banyu, karbon dioksida, lan sorot srengenge. Banyu disedhot oyot saka jero lemah, banjur digawa liwat batang menyang godhong. Karbon dioksida yaiku gas saka hawa sing mlebu ing godhong liwat bolongan-bolongan cilik sing jenenge stomata.

Kanthi tenaga saka sorot srengenge, banyu lan karbon dioksida diowahi dadi gula lan oksigen. Gula dadi panganane tetuwuhan lan disimpen ing perangan awake, kayata ing umbi, woh, utawa wiji. Oksigen diculake menyang hawa.

Oksigen asil fotosintesis iku sing saben dina diisep awake dhewe kanggo ambegan. Mula, nandur lan ngopeni tetuwuhan tegese melu njaga hawa sing dibutuhake awake dhewe.`;

export const FOTOSINTESIS_JAWA_GLOSSARY: GlossaryItem[] = [
  {
    kata: "fotosintesis",
    arti: "Carane tetuwuhan ijo gawe panganane dhewe nganggo sorot srengenge. (Cara tumbuhan membuat makanan.)",
  },
  { kata: "klorofil", arti: "Zat ijo ing godhong sing nangkep sorot srengenge. (Zat hijau daun.)" },
  { kata: "karbon dioksida", arti: "Gas ing hawa sing dienggo tetuwuhan gawe panganan. (Gas dari udara.)" },
  { kata: "stomata", arti: "Bolongan cilik banget ing godhong, dalane hawa metu lan mlebu. (Lubang kecil di daun.)" },
  { kata: "oksigen", arti: "Gas sing diisep awake dhewe kanggo ambegan. (Gas untuk bernapas.)" },
];

export const FOTOSINTESIS_QUIZ: QuizQuestion[] = [
  {
    q: "Di bagian mana fotosintesis terutama terjadi?",
    options: ["Akar", "Batang", "Daun", "Bunga"],
    answer: 2,
    explain: "Fotosintesis terutama terjadi di daun, karena daun mengandung klorofil yang menangkap cahaya matahari.",
    origin: "guru",
  },
  {
    q: "Zat hijau daun yang menangkap cahaya matahari disebut…",
    options: ["Oksigen", "Klorofil", "Stomata", "Gula"],
    answer: 1,
    explain: "Klorofil adalah zat hijau daun. Klorofil menangkap energi dari cahaya matahari.",
    origin: "guru",
  },
  {
    q: "Mana yang TIDAK diperlukan tumbuhan untuk berfotosintesis?",
    options: ["Air", "Cahaya matahari", "Karbon dioksida", "Oksigen"],
    answer: 3,
    explain:
      "Oksigen justru dihasilkan oleh fotosintesis. Bahan yang diperlukan adalah air, karbon dioksida, dan cahaya matahari.",
    origin: "guru",
  },
  {
    q: "Lewat apa karbon dioksida masuk ke daun?",
    options: ["Stomata", "Akar", "Klorofil", "Biji"],
    answer: 0,
    explain: "Karbon dioksida masuk ke daun melalui stomata, yaitu lubang-lubang kecil di daun.",
    origin: "guru",
  },
  {
    q: "Apa hasil dari fotosintesis?",
    options: ["Gula dan oksigen", "Air dan tanah", "Karbon dioksida dan air", "Cahaya dan panas"],
    answer: 0,
    explain: "Fotosintesis mengubah air dan karbon dioksida menjadi gula (makanan tumbuhan) dan oksigen.",
    origin: "guru",
  },
];

/** Materi kedua: masih draf tanpa versi, untuk menunjukkan AI secara langsung saat demo. */
export const DAUR_AIR_BODY = `## Daur Air

Air di bumi selalu bergerak dan berputar. Perjalanan air ini disebut daur air.

Matahari memanaskan air di laut, sungai, dan danau. Air yang panas berubah menjadi uap air dan naik ke udara. Peristiwa ini disebut penguapan.

Di tempat yang tinggi, udara lebih dingin. Uap air mendingin dan berubah menjadi titik-titik air yang sangat kecil. Titik-titik air itu berkumpul membentuk awan. Peristiwa ini disebut pengembunan.

Saat awan menjadi berat, titik-titik air jatuh ke bumi sebagai hujan. Air hujan meresap ke dalam tanah atau mengalir ke sungai, lalu kembali ke laut. Daur air pun dimulai lagi.`;

/** Potongan pendek untuk contoh interaktif di halaman depan. */
export const HERO_SAMPLE = {
  asli: "Fotosintesis terjadi terutama di daun. Daun berwarna hijau karena mengandung klorofil, yaitu zat hijau daun. Klorofil menangkap energi dari cahaya matahari.",
  mudah:
    "Fotosintesis terjadi di daun. Daun berwarna hijau. Warna hijau itu berasal dari klorofil. Klorofil menangkap cahaya matahari.",
  jawa: "Fotosintesis kedadeyan utamane ing godhong. Godhong werna ijo amarga ana klorofil, yaiku zat ijo godhong. Klorofil nangkep tenaga saka sorot srengenge.",
};
