// Data demo untuk fitur adaptif (Peran 2, tahap 3): konsep & petunjuk bertahap per soal kuis demo,
// jawaban salah yang sering dipilih (untuk analisis rekap), bank latihan adaptif, tugas berjenjang,
// dan satu materi Matematika (DEMO04) untuk mendemokan notasi, dibacakan, dan pemeriksa hitungan.
// Dipisah dari demo-content.ts supaya mudah ditinjau. Data siswa fiktif.

import type { GlossaryItem, Jenjang, QuizQuestion } from "./types";

/** Tambahan per soal kuis demo: konsep, petunjuk, dan jawaban salah yang sering dipilih (urut dari tersering). */
export type QuizExtra = { concept: string; hints: string[]; wrong: string[] };

export const FOTOSINTESIS_EXTRA: QuizExtra[] = [
  {
    concept: "Tempat fotosintesis",
    hints: [
      "Ingat bagian tumbuhan yang berwarna hijau dan banyak terkena cahaya.",
      "Zat hijau yang menangkap cahaya bernama klorofil.",
      "Klorofil paling banyak ada di bagian yang lebar dan tipis.",
    ],
    wrong: ["Batang", "Akar"],
  },
  {
    concept: "Klorofil",
    hints: ["Baca lagi kalimat tentang zat hijau daun.", "Apa yang ditangkap klorofil?"],
    wrong: ["Salah"],
  },
  {
    concept: "Bahan dan hasil fotosintesis",
    hints: [
      "Bedakan bahan (yang dipakai tumbuhan) dan hasil (yang dibuat tumbuhan).",
      "Gula dan oksigen dibuat oleh tumbuhan, jadi keduanya hasil.",
      "Bahannya ada tiga: satu dari tanah, satu dari udara, satu dari matahari.",
    ],
    wrong: ["Air; Oksigen; Karbon dioksida; Cahaya matahari", "Air; Cahaya matahari", "Air; Karbon dioksida; Cahaya matahari; Gula"],
  },
  {
    concept: "Stomata",
    hints: ["Karbon dioksida masuk ke daun lewat lubang-lubang kecil.", "Namanya diawali huruf S."],
    wrong: ["klorofil", "pori-pori"],
  },
  {
    concept: "Bahan dan hasil fotosintesis",
    hints: ["Mana yang diserap dari tanah, mana yang masuk dari udara?", "Gula dan oksigen adalah hasil."],
    wrong: [],
  },
];

export const TUMBUHAN_EXTRA: QuizExtra[] = [
  { concept: "Fungsi akar", hints: ["Bagian mana yang berada di dalam tanah?"], wrong: ["Daun", "Bunga"] },
  { concept: "Fungsi bagian tumbuhan", hints: ["Cocokkan satu per satu dengan tabel di materi."], wrong: [] },
  { concept: "Letak stomata", hints: ["Stomata adalah tempat keluar masuknya udara.", "Bagian mana yang lebar dan tipis?"], wrong: ["Benar"] },
  { concept: "Fungsi daun", hints: ["Fotosintesis terjadi di bagian yang berwarna hijau."], wrong: ["Akar", "Batang"] },
  { concept: "Penyerbukan", hints: ["Buah terbentuk dari bunga.", "Prosesnya melibatkan serbuk sari."], wrong: ["pembuahan", "perkecambahan"] },
];

export const PROSEDUR_EXTRA: QuizExtra[] = [
  { concept: "Pengertian teks prosedur", hints: ["Teks prosedur menjawab pertanyaan \"bagaimana cara…\"."], wrong: ["Cerita pengalaman pribadi"] },
  {
    concept: "Struktur teks prosedur",
    hints: ["Ingat contoh mencuci tangan: ada tujuan, bahan, lalu langkah."],
    wrong: ["Orientasi, komplikasi, resolusi", "Pendapat, alasan, penegasan"],
  },
  { concept: "Kalimat perintah", hints: ["Contoh: \"Basahi tangan dengan air bersih.\" Kalimat apa itu?"], wrong: ["Seru", "Tanya"] },
  { concept: "Konjungsi urutan", hints: ["Kata itu menghubungkan satu langkah dengan langkah berikutnya."], wrong: ["Kata sifat", "Kata seru"] },
  { concept: "Urutan langkah", hints: ["Lihat langkah nomor terakhir di contoh mencuci tangan."], wrong: ["Membilas tangan"] },
];

const guru = { origin: "guru" as const };

/** Bank latihan adaptif Fotosintesis (sudah dicek guru). */
export const FOTOSINTESIS_PRACTICE: QuizQuestion[] = [
  {
    ...guru,
    type: "bs",
    concept: "Bahan dan hasil fotosintesis",
    q: "Oksigen adalah bahan yang diperlukan tumbuhan untuk berfotosintesis.",
    options: ["Benar", "Salah"],
    answer: 1,
    explain: "Salah. Oksigen adalah hasil fotosintesis yang dilepaskan ke udara, bukan bahannya.",
    hints: ["Bahan = yang dipakai. Hasil = yang dibuat.", "Coba ingat apa yang dilepaskan daun ke udara."],
  },
  {
    ...guru,
    type: "pg",
    concept: "Bahan dan hasil fotosintesis",
    q: "Manakah yang termasuk HASIL fotosintesis?",
    options: ["Air", "Gula", "Karbon dioksida", "Cahaya matahari"],
    answer: 1,
    explain: "Gula adalah makanan yang dibuat tumbuhan. Air, karbon dioksida, dan cahaya adalah bahannya.",
    hints: ["Hasil adalah sesuatu yang dibuat tumbuhan.", "Tumbuhan membuat makanannya sendiri."],
  },
  {
    ...guru,
    type: "pg",
    concept: "Bahan dan hasil fotosintesis",
    q: "Dari mana tumbuhan mendapat karbon dioksida?",
    options: ["Dari tanah", "Dari udara", "Dari matahari", "Dari bunga"],
    answer: 1,
    explain: "Karbon dioksida diambil dari udara melalui stomata di daun.",
    hints: ["Karbon dioksida masuk lewat stomata.", "Stomata berhubungan dengan udara."],
  },
  {
    ...guru,
    type: "isian",
    concept: "Stomata",
    q: "Stomata terdapat di bagian tumbuhan yang bernama …",
    options: [],
    answer: 0,
    accepted: ["daun"],
    explain: "Stomata adalah lubang-lubang kecil di daun.",
    hints: ["Bagian ini berwarna hijau dan lebar."],
  },
  {
    ...guru,
    type: "bs",
    concept: "Stomata",
    q: "Karbon dioksida masuk ke daun melalui stomata.",
    options: ["Benar", "Salah"],
    answer: 0,
    explain: "Benar. Stomata adalah jalan masuk karbon dioksida.",
    hints: ["Baca lagi kalimat tentang lubang kecil di daun."],
  },
  {
    ...guru,
    type: "pg",
    concept: "Tempat fotosintesis",
    q: "Mengapa fotosintesis terjadi terutama di daun?",
    options: ["Daun ada di dalam tanah", "Daun mengandung banyak klorofil", "Daun berwarna cokelat", "Daun menyimpan biji"],
    answer: 1,
    explain: "Daun mengandung klorofil yang menangkap cahaya matahari.",
    hints: ["Zat apa yang menangkap cahaya?"],
  },
];

export const FOTOSINTESIS_JENJANG: Jenjang = {
  dasar: {
    judul: "Ayo pilah bahan dan hasil",
    tugas: "Kamu akan memilah kartu bahan dan hasil fotosintesis bersama gurumu.",
    langkah: [
      "Ambil 5 kartu: air, karbon dioksida, cahaya matahari, gula, oksigen.",
      "Letakkan kartu bahan di kiri dan kartu hasil di kanan.",
      "Baca lagi bagian \"Bahan dan Hasil\" di materi, lalu cek kartumu.",
      "Ceritakan ke teman: apa yang masuk ke daun dan apa yang keluar.",
    ],
  },
  inti: {
    judul: "Gambar perjalanan fotosintesis",
    tugas: "Gambarlah satu daun dan tunjukkan bahan yang masuk serta hasil yang keluar.",
    langkah: [
      "Gambar daun, akar, dan matahari.",
      "Beri panah untuk air, karbon dioksida, dan cahaya yang masuk.",
      "Beri panah untuk gula dan oksigen yang dihasilkan.",
      "Tulis satu kalimat penjelasan di bawah gambar.",
    ],
  },
  tantangan: {
    judul: "Jadilah penjelas cilik",
    tugas: "Jelaskan kepada teman mengapa daun yang tertutup lama bisa menguning, memakai isi materi.",
    langkah: [
      "Ingat bahan apa yang tidak didapat daun yang tertutup.",
      "Tulis penjelasanmu dalam 3 kalimat.",
      "Bacakan kepada teman di kelompok Penguatan dan dengarkan pertanyaannya.",
    ],
  },
};

// ---------- Materi 4: Pecahan Senilai (Matematika, Kelas 4B) ----------

export const DEMO_SHARE_CODE_PECAHAN = "DEMO04";

export const PECAHAN_BODY = `## Pecahan Senilai

Pecahan menunjukkan bagian dari satu benda utuh. Pada pecahan 3/4, angka 3 disebut **pembilang** dan angka 4 disebut **penyebut**. Penyebut menunjukkan benda dibagi menjadi berapa bagian sama besar. Pembilang menunjukkan berapa bagian yang diambil.

### Apa itu pecahan senilai?

**Pecahan senilai** adalah pecahan yang nilainya sama walaupun angkanya berbeda. Contohnya 1/2, 2/4, dan 4/8. Sebuah roti yang dipotong menjadi 2 bagian lalu diambil 1 bagian sama banyaknya dengan roti yang dipotong menjadi 4 bagian lalu diambil 2 bagian.

> Ingat: Untuk membuat pecahan senilai, kalikan atau bagi pembilang dan penyebut dengan bilangan yang sama.

### Contoh membuat pecahan senilai

1. Mulai dari pecahan 1/2.
2. Kalikan pembilangnya dengan 2: 1 × 2 = 2.
3. Kalikan penyebutnya dengan 2 juga: 2 × 2 = 4.
4. Jadi 1/2 = 2/4.

### Menyederhanakan pecahan

Pecahan disederhanakan dengan membagi pembilang dan penyebut dengan bilangan yang sama. Contohnya 6/8. Pembilang dan penyebut sama-sama dibagi 2: 6 : 2 = 3 dan 8 : 2 = 4. Jadi bentuk paling sederhana dari 6/8 adalah 3/4.

> Penting: Menambah atau mengurangi pembilang dan penyebut dengan bilangan yang sama TIDAK menghasilkan pecahan senilai. Misalnya 1/2 tidak sama dengan 2/3.`;

export const PECAHAN_GLOSSARY: GlossaryItem[] = [
  { kata: "pembilang", arti: "Angka di atas garis pecahan: banyak bagian yang diambil." },
  { kata: "penyebut", arti: "Angka di bawah garis pecahan: benda dibagi menjadi berapa bagian sama besar." },
  { kata: "Pecahan senilai", arti: "Pecahan yang angkanya berbeda tetapi nilainya sama, misalnya 1/2 dan 2/4." },
];

export const PECAHAN_MUDAH = `## Pecahan Senilai

Pecahan adalah bagian dari benda utuh. Contohnya 3/4.

- Angka atas (3) disebut **pembilang**.
- Angka bawah (4) disebut **penyebut**.

Pecahan senilai artinya nilainya sama. Angkanya berbeda. Contohnya 1/2 dan 2/4.

> Ingat: Kalikan angka atas dan angka bawah dengan bilangan yang sama.

## Contoh

1. Mulai dari 1/2.
2. Angka atas: 1 × 2 = 2.
3. Angka bawah: 2 × 2 = 4.
4. Jadi 1/2 = 2/4.

## Menyederhanakan

Bagi angka atas dan angka bawah dengan bilangan yang sama. Contohnya 6/8. Bagi dengan 2: 6 : 2 = 3 dan 8 : 2 = 4. Jadi 6/8 = 3/4.

> Penting: Jangan menambah angka atas dan bawah. 1/2 tidak sama dengan 2/3.`;

export const PECAHAN_RINGKASAN = `- Pembilang adalah angka atas, penyebut adalah angka bawah pecahan.
- Pecahan senilai nilainya sama walaupun angkanya berbeda, misalnya 1/2 = 2/4 = 4/8.
- Pecahan senilai dibuat dengan mengalikan pembilang dan penyebut dengan bilangan yang sama.
- Menyederhanakan pecahan: bagi pembilang dan penyebut dengan bilangan yang sama, misalnya 6/8 = 3/4.
- Menambah pembilang dan penyebut dengan bilangan yang sama tidak menghasilkan pecahan senilai.`;

export const PECAHAN_QUIZ: QuizQuestion[] = [
  {
    ...guru,
    type: "pg",
    concept: "Pecahan senilai",
    q: "Pecahan yang senilai dengan 1/2 adalah …",
    options: ["2/4", "2/3", "1/4", "3/2"],
    answer: 0,
    explain: "1 × 2 = 2 dan 2 × 2 = 4, jadi 1/2 = 2/4.",
    hints: ["Pecahan senilai nilainya sama.", "Kalikan pembilang dan penyebut dengan bilangan yang sama.", "Coba kalikan keduanya dengan 2."],
    calc: "1/2",
  },
  {
    ...guru,
    type: "isian",
    concept: "Pecahan senilai",
    q: "2/3 = …/6. Berapa pembilangnya?",
    options: [],
    answer: 0,
    accepted: ["4"],
    explain: "Penyebut 3 dikali 2 menjadi 6, jadi pembilang 2 juga dikali 2: 2 × 2 = 4.",
    hints: ["Penyebut 3 berubah menjadi 6. Dikali berapa?", "3 × 2 = 6.", "Pembilangnya juga dikali 2."],
    calc: "2 * (6 / 3)",
  },
  {
    ...guru,
    type: "pg",
    concept: "Menyederhanakan pecahan",
    q: "Bentuk paling sederhana dari 6/8 adalah …",
    options: ["4/6", "3/4", "1/2", "2/3"],
    answer: 1,
    explain: "6 : 2 = 3 dan 8 : 2 = 4, jadi 6/8 = 3/4.",
    hints: ["Bagi pembilang dan penyebut dengan bilangan yang sama.", "6 dan 8 sama-sama bisa dibagi 2."],
    calc: "6/8",
  },
  {
    ...guru,
    type: "bs",
    concept: "Pecahan senilai",
    q: "Pecahan 3/6 senilai dengan 1/2.",
    options: ["Benar", "Salah"],
    answer: 0,
    explain: "Benar. 1 × 3 = 3 dan 2 × 3 = 6, jadi 1/2 = 3/6.",
    hints: ["Coba kalikan pembilang dan penyebut 1/2 dengan 3."],
  },
  {
    ...guru,
    type: "isian",
    concept: "Menyederhanakan pecahan",
    q: "Sederhanakan 4/12.",
    options: [],
    answer: 0,
    accepted: ["1/3"],
    explain: "4 dan 12 sama-sama dibagi 4: 4 : 4 = 1 dan 12 : 4 = 3, jadi 4/12 = 1/3.",
    hints: ["Cari bilangan terbesar yang bisa membagi 4 dan 12.", "4 : 4 = 1. Berapa 12 : 4?"],
    calc: "4/12",
  },
];

export const PECAHAN_EXTRA: QuizExtra[] = PECAHAN_QUIZ.map((q, i) => ({
  concept: q.concept!,
  hints: q.hints ?? [],
  // Kesalahan khas: menambah pembilang & penyebut (1/2 → 2/3), menyederhanakan belum tuntas (2/6).
  wrong: [["2/3", "1/4"], ["5", "3"], ["4/6", "1/2"], ["Salah"], ["2/6", "1/4"]][i],
}));

export const PECAHAN_PRACTICE: QuizQuestion[] = [
  {
    ...guru,
    type: "bs",
    concept: "Pecahan senilai",
    q: "1/3 senilai dengan 2/4, karena pembilang dan penyebut sama-sama ditambah 1.",
    options: ["Benar", "Salah"],
    answer: 1,
    explain: "Salah. Pecahan senilai dibuat dengan MENGALIKAN, bukan menambah. 1/3 = 2/6.",
    hints: ["Baca kotak Penting di materi.", "Coba kalikan 1 dan 3 dengan 2."],
  },
  {
    ...guru,
    type: "pg",
    concept: "Pecahan senilai",
    q: "Pecahan yang senilai dengan 1/3 adalah …",
    options: ["2/4", "2/6", "3/4", "1/6"],
    answer: 1,
    explain: "1 × 2 = 2 dan 3 × 2 = 6, jadi 1/3 = 2/6.",
    hints: ["Kalikan pembilang dan penyebut dengan 2."],
    calc: "1/3",
  },
  {
    ...guru,
    type: "isian",
    concept: "Pecahan senilai",
    q: "3/4 = 6/… Berapa penyebutnya?",
    options: [],
    answer: 0,
    accepted: ["8"],
    explain: "3 × 2 = 6, maka 4 × 2 = 8.",
    hints: ["Pembilang 3 menjadi 6. Dikali berapa?", "Kalikan penyebut 4 dengan bilangan yang sama."],
    calc: "4 * (6 / 3)",
  },
  {
    ...guru,
    type: "isian",
    concept: "Menyederhanakan pecahan",
    q: "Sederhanakan 2/6.",
    options: [],
    answer: 0,
    accepted: ["1/3"],
    explain: "2 : 2 = 1 dan 6 : 2 = 3, jadi 2/6 = 1/3.",
    hints: ["2 dan 6 sama-sama bisa dibagi 2."],
    calc: "2/6",
  },
  {
    ...guru,
    type: "pg",
    concept: "Menyederhanakan pecahan",
    q: "Bentuk paling sederhana dari 5/10 adalah …",
    options: ["1/2", "5/10", "1/5", "2/5"],
    answer: 0,
    explain: "5 : 5 = 1 dan 10 : 5 = 2, jadi 5/10 = 1/2.",
    hints: ["Bagi pembilang dan penyebut dengan 5."],
    calc: "5/10",
  },
];
