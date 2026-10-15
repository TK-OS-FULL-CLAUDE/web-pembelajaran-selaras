// Konten demo: 2 kelas, 3 materi terbit (masing-masing dengan 4 versi + kuis 5 soal), 1 draf untuk demo AI.
// Teks ditulis sendiri oleh tim (bukan salinan buku). Versi Basa Jawa dan Basa Sunda adalah DRAF:
// minta penutur asli mengeceknya sebelum lomba.

import { DEMO_FIG_FOTOSINTESIS, DEMO_FIG_TUMBUHAN } from "./demo-images";
import type { ClassNeeds, GlossaryItem, QuizQuestion } from "./types";

const FIG_FOTOSINTESIS = `![Diagram fotosintesis pada daun](gambar:${DEMO_FIG_FOTOSINTESIS})`;
const FIG_TUMBUHAN = `![Bagian-bagian tumbuhan](gambar:${DEMO_FIG_TUMBUHAN})`;

export const DEMO_EMAIL = "guru@selaras.id";
export const DEMO_PASSWORD = "selaras-demo";
export const DEMO_TEACHER_NAME = "Bu Rina (akun demo)";
export const DEMO_SCHOOL = "SD Negeri Contoh 1";
export const DEMO_SHARE_CODE = "DEMO01";
export const DEMO_SHARE_CODE_TUMBUHAN = "DEMO02";
export const DEMO_SHARE_CODE_PROSEDUR = "DEMO03";

export const DEMO_CLASS = {
  name: "Kelas 4B",
  grade: "Kelas 4 SD",
  needs: {
    totalSiswa: 28,
    lowVision: 2,
    tuli: 1,
    disleksia: 2,
    sulitFokus: 1,
    diskalkulia: 2,
    bahasaDaerah: 3,
    bahasa: "jw",
  } satisfies ClassNeeds,
};

export const DEMO_CLASS_6 = {
  name: "Kelas 6A",
  grade: "Kelas 6 SD",
  needs: {
    totalSiswa: 30,
    lowVision: 1,
    tuli: 1,
    disleksia: 3,
    sulitFokus: 2,
    diskalkulia: 1,
    bahasaDaerah: 4,
    bahasa: "su",
  } satisfies ClassNeeds,
};

export const FOTOSINTESIS_BODY = `## Fotosintesis: Cara Tumbuhan Membuat Makanan

Manusia dan hewan mendapat makanan dengan cara makan. Tumbuhan berbeda. Tumbuhan hijau dapat membuat makanannya sendiri melalui proses yang disebut **fotosintesis**.

### Di mana fotosintesis terjadi?

Fotosintesis terjadi terutama di daun. Daun berwarna hijau karena mengandung **klorofil**, yaitu zat hijau daun. Klorofil menangkap energi dari cahaya matahari.

### Bahan-bahan fotosintesis

Untuk berfotosintesis, tumbuhan memerlukan air, karbon dioksida, dan cahaya matahari. Air diserap oleh akar dari dalam tanah, lalu diangkut melalui batang menuju daun. Karbon dioksida adalah gas dari udara yang masuk ke daun melalui lubang-lubang kecil bernama stomata.

| Bahan | Asalnya | Cara sampai ke daun |
|---|---|---|
| Air | Tanah | Diserap akar, lalu diangkut lewat batang |
| Karbon dioksida | Udara | Masuk lewat stomata |
| Cahaya matahari | Matahari | Ditangkap klorofil |

${FIG_FOTOSINTESIS}

### Hasil fotosintesis

Dengan bantuan energi cahaya matahari, air dan karbon dioksida diubah menjadi **gula** dan **oksigen**. Gula menjadi makanan bagi tumbuhan dan disimpan di bagian tubuhnya, misalnya di umbi, buah, atau biji. Oksigen dilepaskan ke udara.

> Ingat: Bahan fotosintesis adalah air, karbon dioksida, dan cahaya matahari. Hasilnya gula dan oksigen.

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

Kita makan untuk mendapat makanan. Tumbuhan tidak makan seperti kita. Tumbuhan hijau membuat makanannya sendiri. Cara ini disebut **fotosintesis**.

Fotosintesis terjadi di daun. Daun berwarna hijau. Warna hijau itu berasal dari klorofil. Klorofil menangkap cahaya matahari.

Tumbuhan butuh tiga hal:
- air
- karbon dioksida, yaitu gas dari udara
- cahaya matahari

Akar mengambil air dari tanah. Air naik lewat batang ke daun. Karbon dioksida masuk ke daun lewat lubang kecil. Lubang kecil itu bernama stomata.

${FIG_FOTOSINTESIS}

Cahaya matahari memberi tenaga. Air dan karbon dioksida berubah menjadi gula dan oksigen. Gula adalah makanan tumbuhan. Gula disimpan di umbi, buah, atau biji.

> Ingat: Daun membuat gula dan oksigen.

Oksigen keluar ke udara. Kita menghirup oksigen untuk bernapas. Jadi, merawat tumbuhan berarti menjaga udara kita.`;

export const FOTOSINTESIS_RINGKASAN = `- Tumbuhan hijau membuat makanannya sendiri melalui fotosintesis.
- Fotosintesis terjadi terutama di daun yang mengandung klorofil.
- Klorofil menangkap energi dari cahaya matahari.
- Bahannya air dari tanah, karbon dioksida dari udara, dan cahaya matahari.
- Karbon dioksida masuk ke daun melalui stomata.
- Hasilnya gula untuk makanan tumbuhan dan oksigen yang dilepas ke udara.
- Kita menghirup oksigen itu untuk bernapas.`;

export const FOTOSINTESIS_JAWA = `## Fotosintesis: Carane Tetuwuhan Gawe Panganan

Manungsa lan kewan oleh panganan kanthi cara mangan. Tetuwuhan ora kaya ngono. Tetuwuhan sing ijo bisa gawe panganane dhewe. Proses iki diarani fotosintesis.

Fotosintesis kedadeyan utamane ing godhong. Godhong werna ijo amarga ana klorofil, yaiku zat ijo godhong. Klorofil nangkep tenaga saka sorot srengenge.

Supaya bisa fotosintesis, tetuwuhan butuh banyu, karbon dioksida, lan sorot srengenge. Banyu disedhot oyot saka jero lemah, banjur digawa liwat batang menyang godhong. Karbon dioksida yaiku gas saka hawa sing mlebu ing godhong liwat bolongan-bolongan cilik sing jenenge stomata.

${FIG_FOTOSINTESIS}

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

export const FOTOSINTESIS_SUNDA = `## Fotosintesis: Cara Tutuwuhan Nyieun Kadaharan

Manusa jeung sato meunangkeun kadaharan ku cara dahar. Tutuwuhan mah béda. Tutuwuhan héjo bisa nyieun kadaharanana sorangan ngaliwatan prosés anu disebut fotosintesis.

Fotosintesis lumangsung utamana di daun. Daun warnana héjo lantaran ngandung klorofil, nya éta zat héjo daun. Klorofil nyerep tanaga tina cahaya panonpoé.

Pikeun fotosintesis, tutuwuhan butuh cai, karbon dioksida, jeung cahaya panonpoé. Cai diserep ku akar tina jero taneuh, tuluy dibawa ngaliwatan tangkal ka daun. Karbon dioksida nya éta gas tina hawa anu asup ka daun ngaliwatan liang-liang leutik anu disebut stomata.

${FIG_FOTOSINTESIS}

Ku bantuan tanaga cahaya panonpoé, cai jeung karbon dioksida dirobah jadi gula jeung oksigen. Gula jadi kadaharan pikeun tutuwuhan sarta disimpen dina bagian awakna, saperti dina beuti, buah, atawa siki. Oksigen dileupaskeun ka hawa.

Oksigen hasil fotosintesis téh ku urang diseuseup unggal poé pikeun ngarénghap. Ku sabab éta, melak jeung ngarawat tutuwuhan hartina milu ngajaga hawa anu urang butuhkeun.`;

export const FOTOSINTESIS_SUNDA_GLOSSARY: GlossaryItem[] = [
  {
    kata: "fotosintesis",
    arti: "Cara tutuwuhan héjo nyieun kadaharan sorangan maké cahaya panonpoé. (Cara tumbuhan membuat makanan.)",
  },
  { kata: "klorofil", arti: "Zat héjo dina daun anu nyerep cahaya panonpoé. (Zat hijau daun.)" },
  { kata: "karbon dioksida", arti: "Gas dina hawa anu dipaké tutuwuhan pikeun nyieun kadaharan. (Gas dari udara.)" },
  { kata: "stomata", arti: "Liang leutik pisan dina daun, jalan hawa kaluar jeung asup. (Lubang kecil di daun.)" },
  { kata: "oksigen", arti: "Gas anu ku urang diseuseup pikeun ngarénghap. (Gas untuk bernapas.)" },
];

export const FOTOSINTESIS_QUIZ: QuizQuestion[] = [
  {
    type: "pg",
    q: "Di bagian mana fotosintesis terutama terjadi?",
    options: ["Akar", "Batang", "Daun", "Bunga"],
    answer: 2,
    explain: "Fotosintesis terutama terjadi di daun, karena daun mengandung klorofil yang menangkap cahaya matahari.",
    origin: "guru",
  },
  {
    type: "bs",
    q: "Klorofil adalah zat hijau daun yang menangkap energi dari cahaya matahari.",
    options: ["Benar", "Salah"],
    answer: 0,
    explain: "Benar. Klorofil membuat daun berwarna hijau dan menangkap energi cahaya matahari.",
    origin: "guru",
  },
  {
    type: "pgk",
    q: "Pilih semua bahan yang diperlukan tumbuhan untuk berfotosintesis.",
    options: ["Air", "Oksigen", "Karbon dioksida", "Cahaya matahari", "Gula"],
    answer: 0,
    answers: [0, 2, 3],
    explain: "Bahannya air, karbon dioksida, dan cahaya matahari. Oksigen dan gula justru hasil fotosintesis.",
    origin: "guru",
  },
  {
    type: "isian",
    q: "Lubang kecil di daun, tempat karbon dioksida masuk, disebut …",
    options: [],
    answer: 0,
    accepted: ["stomata", "stoma"],
    explain: "Karbon dioksida masuk ke daun melalui stomata, yaitu lubang-lubang kecil di daun.",
    origin: "guru",
  },
  {
    type: "jodoh",
    q: "Pasangkan setiap zat dengan keterangannya.",
    options: [],
    answer: 0,
    pairs: [
      { kiri: "Air", kanan: "Diserap akar dari tanah" },
      { kiri: "Karbon dioksida", kanan: "Masuk lewat stomata" },
      { kiri: "Gula", kanan: "Makanan bagi tumbuhan" },
      { kiri: "Oksigen", kanan: "Dilepaskan ke udara" },
    ],
    explain: "Air dan karbon dioksida adalah bahan; gula dan oksigen adalah hasil fotosintesis.",
    origin: "guru",
  },
];

// ---------- Materi 2: Bagian Tumbuhan dan Fungsinya (IPAS, Kelas 4B) ----------

export const TUMBUHAN_BODY = `## Bagian Tumbuhan dan Fungsinya

Tumbuhan memiliki beberapa bagian utama, yaitu akar, batang, daun, bunga, buah, dan biji. Setiap bagian mempunyai tugas masing-masing.

${FIG_TUMBUHAN}

### Akar

Akar berada di dalam tanah. Akar menyerap air dan zat hara dari tanah. Akar juga mencengkeram tanah sehingga tumbuhan dapat berdiri tegak dan tidak mudah roboh.

### Batang

Batang menopang tumbuhan agar tetap tegak. Di dalam batang terdapat saluran yang mengangkut air dari akar ke daun, serta mengangkut makanan dari daun ke seluruh bagian tumbuhan.

### Daun

Daun adalah tempat tumbuhan membuat makanan melalui fotosintesis. Di permukaan daun terdapat stomata, yaitu lubang kecil tempat keluar masuknya udara.

### Bunga, buah, dan biji

Bunga adalah alat perkembangbiakan. Dari bunga yang mengalami penyerbukan, terbentuklah buah. Di dalam buah terdapat biji. Biji yang ditanam dapat tumbuh menjadi tumbuhan baru.

> Contoh: Biji mangga yang ditanam di tanah yang lembap dapat tumbuh menjadi pohon mangga baru.`;

export const TUMBUHAN_GLOSSARY: GlossaryItem[] = [
  { kata: "zat hara", arti: "Zat makanan dari tanah yang dibutuhkan tumbuhan untuk tumbuh." },
  { kata: "menopang", arti: "Menahan supaya tetap berdiri dan tidak jatuh." },
  { kata: "stomata", arti: "Lubang sangat kecil di daun, tempat udara keluar dan masuk." },
  { kata: "perkembangbiakan", arti: "Cara makhluk hidup menghasilkan keturunan baru." },
  { kata: "penyerbukan", arti: "Menempelnya serbuk sari ke kepala putik sehingga bunga bisa menjadi buah." },
];

export const TUMBUHAN_MUDAH = `## Bagian Tumbuhan

Tumbuhan punya beberapa bagian. Ada akar, batang, daun, bunga, buah, dan biji. Setiap bagian punya tugas.

${FIG_TUMBUHAN}

Akar ada di dalam tanah. Akar mengambil air dari tanah. Akar juga mengambil zat hara. Zat hara adalah makanan dari tanah. Akar memegang tanah dengan kuat. Jadi, tumbuhan tidak mudah roboh.

Batang menopang tumbuhan. Artinya, batang menahan tumbuhan supaya tetap berdiri. Di dalam batang ada saluran. Saluran ini membawa air dari akar ke daun. Saluran ini juga membawa makanan dari daun ke bagian lain.

Daun membuat makanan. Cara ini disebut fotosintesis. Di daun ada lubang kecil. Lubang kecil itu bernama stomata. Udara keluar dan masuk lewat stomata.

Bunga membantu tumbuhan berkembang biak. Bunga perlu penyerbukan dulu. Setelah itu, bunga bisa menjadi buah. Di dalam buah ada biji. Biji bisa ditanam. Lalu, biji tumbuh menjadi tumbuhan baru.`;

export const TUMBUHAN_RINGKASAN = `- Bagian utama tumbuhan adalah akar, batang, daun, bunga, buah, dan biji.
- Akar menyerap air dan zat hara serta mencengkeram tanah.
- Batang menopang tumbuhan dan mengangkut air serta makanan.
- Daun membuat makanan melalui fotosintesis.
- Stomata di daun menjadi tempat keluar masuknya udara.
- Bunga yang mengalami penyerbukan membentuk buah berisi biji.
- Biji yang ditanam dapat tumbuh menjadi tumbuhan baru.`;

export const TUMBUHAN_JAWA = `## Perangan Tetuwuhan lan Gunane

Tetuwuhan nduweni sawetara perangan utama, yaiku oyot, batang, godhong, kembang, woh, lan wiji. Saben perangan nduweni tugas dhewe-dhewe.

${FIG_TUMBUHAN}

Oyot ana ing jero lemah. Oyot nyedhot banyu lan zat hara saka lemah. Oyot uga nyengkeram lemah, saengga tetuwuhan bisa ngadeg jejeg lan ora gampang rubuh.

Batang nyangga tetuwuhan supaya tetep jejeg. Ing jero batang ana saluran sing nggawa banyu saka oyot menyang godhong, lan nggawa panganan saka godhong menyang kabeh perangan tetuwuhan.

Godhong yaiku papan tetuwuhan gawe panganan liwat fotosintesis. Ing lumahing godhong ana stomata, yaiku bolongan cilik papan metu lan mlebune hawa.

Kembang yaiku piranti kanggo ngembangake turun. Kembang sing wis ngalami penyerbukan bakal dadi woh. Ing jero woh ana wiji. Wiji sing ditandur bisa thukul dadi tetuwuhan anyar.`;

export const TUMBUHAN_JAWA_GLOSSARY: GlossaryItem[] = [
  { kata: "zat hara", arti: "Zat panganan saka lemah sing dibutuhake tetuwuhan. (Zat makanan dari tanah.)" },
  { kata: "fotosintesis", arti: "Carane tetuwuhan ijo gawe panganane dhewe. (Cara tumbuhan membuat makanan.)" },
  { kata: "stomata", arti: "Bolongan cilik banget ing godhong, dalane hawa metu lan mlebu. (Lubang kecil di daun.)" },
  { kata: "penyerbukan", arti: "Serbuk sari tekan putik, saengga kembang bisa dadi woh. (Penyerbukan bunga.)" },
];

export const TUMBUHAN_SUNDA = `## Bagian Tutuwuhan jeung Gunana

Tutuwuhan boga sababaraha bagian utama, nya éta akar, tangkal, daun, kembang, buah, jeung siki. Unggal bagian boga tugas séwang-séwangan.

${FIG_TUMBUHAN}

Akar aya di jero taneuh. Akar nyerep cai jeung zat hara tina taneuh. Akar ogé nyengkram taneuh, ku kituna tutuwuhan bisa nangtung ajeg sarta henteu gampang rubuh.

Tangkal nahan tutuwuhan sangkan tetep nangtung. Di jero tangkal aya saluran anu mawa cai ti akar ka daun, sarta mawa kadaharan ti daun ka sakumna bagian tutuwuhan.

Daun nya éta tempat tutuwuhan nyieun kadaharan ngaliwatan fotosintesis. Dina beungeut daun aya stomata, nya éta liang leutik tempat kaluar asupna hawa.

Kembang nya éta alat pikeun ngabiakkeun turunan. Kembang anu geus ngalaman penyerbukan bakal jadi buah. Di jero buah aya siki. Siki anu dipelak bisa tumuwuh jadi tutuwuhan anyar.`;

export const TUMBUHAN_SUNDA_GLOSSARY: GlossaryItem[] = [
  { kata: "zat hara", arti: "Zat kadaharan tina taneuh anu diperlukeun ku tutuwuhan. (Zat makanan dari tanah.)" },
  { kata: "fotosintesis", arti: "Cara tutuwuhan héjo nyieun kadaharan sorangan. (Cara tumbuhan membuat makanan.)" },
  { kata: "stomata", arti: "Liang leutik pisan dina daun, jalan hawa kaluar jeung asup. (Lubang kecil di daun.)" },
  { kata: "penyerbukan", arti: "Sari kembang nepi ka putik, ku kituna kembang bisa jadi buah. (Penyerbukan bunga.)" },
];

export const TUMBUHAN_QUIZ: QuizQuestion[] = [
  {
    type: "pg",
    q: "Bagian tumbuhan yang menyerap air dari tanah adalah…",
    options: ["Daun", "Akar", "Bunga", "Buah"],
    answer: 1,
    explain: "Akar berada di dalam tanah dan menyerap air serta zat hara.",
    origin: "guru",
  },
  {
    type: "jodoh",
    q: "Pasangkan bagian tumbuhan dengan fungsinya.",
    options: [],
    answer: 0,
    pairs: [
      { kiri: "Akar", kanan: "Menyerap air dan zat hara" },
      { kiri: "Batang", kanan: "Menopang dan mengangkut air" },
      { kiri: "Daun", kanan: "Tempat membuat makanan" },
      { kiri: "Bunga", kanan: "Alat perkembangbiakan" },
    ],
    explain: "Setiap bagian tumbuhan punya tugas masing-masing, seperti dijelaskan di materi.",
    origin: "guru",
  },
  {
    type: "bs",
    q: "Stomata terdapat di akar tumbuhan.",
    options: ["Benar", "Salah"],
    answer: 1,
    explain: "Salah. Stomata terdapat di permukaan daun, tempat keluar masuknya udara.",
    origin: "guru",
  },
  {
    type: "pg",
    q: "Tumbuhan membuat makanan di bagian…",
    options: ["Akar", "Batang", "Daun", "Biji"],
    answer: 2,
    explain: "Daun adalah tempat tumbuhan membuat makanan melalui fotosintesis.",
    origin: "guru",
  },
  {
    type: "isian",
    q: "Buah terbentuk dari bunga yang mengalami …",
    options: [],
    answer: 0,
    accepted: ["penyerbukan"],
    explain: "Bunga yang mengalami penyerbukan akan membentuk buah.",
    origin: "guru",
  },
];

// ---------- Materi 3: Mengenal Teks Prosedur (Bahasa Indonesia, Kelas 6A) ----------

export const PROSEDUR_BODY = `## Mengenal Teks Prosedur

Teks prosedur adalah teks yang berisi langkah-langkah untuk melakukan sesuatu secara urut. Contohnya adalah petunjuk memasak, cara memakai alat, atau cara merawat tanaman. Tujuannya agar pembaca dapat melakukan kegiatan tersebut dengan benar.

Teks prosedur biasanya memiliki tiga bagian. Bagian pertama adalah tujuan, yaitu kegiatan yang akan dilakukan. Bagian kedua adalah bahan dan alat yang diperlukan. Bagian ketiga adalah langkah-langkah yang harus diikuti secara berurutan.

Teks prosedur memiliki ciri kebahasaan yang khas. Kalimatnya berupa kalimat perintah, misalnya "Basahi tangan dengan air bersih." Teks ini banyak memakai kata kerja tindakan, seperti tuang, aduk, dan potong. Teks ini juga memakai konjungsi urutan, seperti pertama, kemudian, setelah itu, dan terakhir.

Contoh langkah mencuci tangan: pertama, basahi tangan dengan air bersih. Kemudian, gosokkan sabun ke seluruh permukaan tangan. Setelah itu, bilas tangan dengan air mengalir. Terakhir, keringkan tangan dengan kain bersih.`;

export const PROSEDUR_GLOSSARY: GlossaryItem[] = [
  { kata: "teks prosedur", arti: "Teks yang berisi langkah-langkah melakukan sesuatu secara urut." },
  { kata: "berurutan", arti: "Satu per satu sesuai urutan, tidak boleh dilompati." },
  { kata: "kebahasaan", arti: "Hal yang berkaitan dengan bahasa, misalnya jenis kalimat dan kata." },
  { kata: "kalimat perintah", arti: "Kalimat yang meminta orang melakukan sesuatu." },
  { kata: "konjungsi", arti: "Kata penghubung, misalnya kemudian dan setelah itu." },
];

export const PROSEDUR_MUDAH = `## Teks Prosedur

Teks prosedur berisi langkah-langkah. Langkah itu dipakai untuk melakukan sesuatu. Langkahnya harus urut. Contohnya cara memasak atau cara merawat tanaman. Teks ini membantu pembaca melakukan kegiatan dengan benar.

Teks prosedur punya tiga bagian:
- tujuan, yaitu kegiatan yang mau dilakukan
- bahan dan alat yang diperlukan
- langkah-langkah yang diikuti secara berurutan

Teks prosedur memakai kalimat perintah. Contohnya: "Basahi tangan dengan air bersih." Teks ini memakai kata kerja, seperti tuang, aduk, dan potong. Teks ini juga memakai konjungsi urutan. Konjungsi adalah kata penghubung. Contohnya pertama, kemudian, setelah itu, dan terakhir.

Contoh mencuci tangan:
- Pertama, basahi tangan dengan air bersih.
- Kemudian, gosok sabun ke seluruh tangan.
- Setelah itu, bilas tangan dengan air mengalir.
- Terakhir, keringkan tangan dengan kain bersih.`;

export const PROSEDUR_RINGKASAN = `- Teks prosedur berisi langkah-langkah melakukan sesuatu secara urut.
- Tujuannya agar pembaca dapat melakukan kegiatan dengan benar.
- Bagiannya adalah tujuan, bahan dan alat, serta langkah-langkah.
- Kalimatnya berupa kalimat perintah.
- Teks prosedur memakai kata kerja tindakan, seperti tuang, aduk, dan potong.
- Konjungsi urutannya antara lain pertama, kemudian, setelah itu, dan terakhir.`;

export const PROSEDUR_JAWA = `## Tepungan karo Teks Prosedur

Teks prosedur yaiku teks sing isine langkah-langkah kanggo nindakake samubarang kanthi urut. Tuladhane yaiku pituduh masak, carane nganggo piranti, utawa carane ngrumat tanduran. Ancase supaya sing maca bisa nindakake kagiyatan kasebut kanthi bener.

Teks prosedur biasane duwe telung perangan. Perangan kapisan yaiku ancas, yaiku kagiyatan sing arep ditindakake. Perangan kapindho yaiku bahan lan piranti sing dibutuhake. Perangan katelu yaiku langkah-langkah sing kudu dilakoni kanthi urut.

Teks prosedur duwe ciri kebahasaan sing khas. Ukarane awujud kalimat perintah, upamane "Basahi tangan dengan air bersih." Teks iki akeh nganggo tembung kriya, kayata tuang, aduk, lan potong. Teks iki uga nganggo konjungsi urutan, kayata pertama, kemudian, setelah itu, lan terakhir.

Tuladha langkah wisuh tangan: kapisan, telesana tangan nganggo banyu resik. Banjur, gosokna sabun ing kabeh lumahing tangan. Sawise iku, kumbahen tangan nganggo banyu mili. Pungkasan, garingna tangan nganggo kain resik.`;

export const PROSEDUR_JAWA_GLOSSARY: GlossaryItem[] = [
  {
    kata: "teks prosedur",
    arti: "Teks sing isine langkah-langkah nindakake samubarang kanthi urut. (Teks berisi langkah-langkah.)",
  },
  { kata: "kalimat perintah", arti: "Ukara kanggo ngongkon wong nindakake samubarang. (Kalimat untuk menyuruh.)" },
  { kata: "konjungsi", arti: "Tembung panggandheng, upamane banjur lan sawise iku. (Kata penghubung.)" },
];

export const PROSEDUR_SUNDA = `## Wanoh kana Teks Prosedur

Teks prosedur nya éta téks anu eusina léngkah-léngkah pikeun ngalakukeun hiji hal sacara runtuy. Contona nya éta pituduh masak, cara maké alat, atawa cara ngarawat tutuwuhan. Tujuanana sangkan nu maca bisa ngalakukeun éta kagiatan kalayan bener.

Teks prosedur biasana boga tilu bagian. Bagian kahiji nya éta tujuan, nya éta kagiatan anu rék dilakukeun. Bagian kadua nya éta bahan jeung alat anu diperlukeun. Bagian katilu nya éta léngkah-léngkah anu kudu diturutan sacara runtuy.

Teks prosedur boga ciri kebahasaan anu has. Kalimahna mangrupa kalimat perintah, contona "Basahi tangan dengan air bersih." Téks ieu loba maké kecap pagawéan, saperti tuang, aduk, jeung potong. Téks ieu ogé maké konjungsi urutan, saperti pertama, kemudian, setelah itu, jeung terakhir.

Conto léngkah ngumbah leungeun: kahiji, baseuhan leungeun ku cai beresih. Saterusna, gosokkeun sabun kana sakabéh beungeut leungeun. Sanggeus éta, bilas leungeun ku cai ngocor. Pamungkas, garingkeun leungeun ku lap beresih.`;

export const PROSEDUR_SUNDA_GLOSSARY: GlossaryItem[] = [
  {
    kata: "teks prosedur",
    arti: "Téks anu eusina léngkah-léngkah ngalakukeun hiji hal sacara runtuy. (Teks berisi langkah-langkah.)",
  },
  { kata: "kalimat perintah", arti: "Kalimah pikeun miwarang batur ngalakukeun hiji hal. (Kalimat untuk menyuruh.)" },
  { kata: "konjungsi", arti: "Kecap panyambung, contona saterusna jeung sanggeus éta. (Kata penghubung.)" },
];

export const PROSEDUR_QUIZ: QuizQuestion[] = [
  {
    q: "Teks prosedur berisi…",
    options: [
      "Langkah-langkah melakukan sesuatu secara urut",
      "Cerita pengalaman pribadi",
      "Pendapat tentang suatu masalah",
      "Gambaran sebuah tempat",
    ],
    answer: 0,
    explain: "Teks prosedur berisi langkah-langkah untuk melakukan sesuatu secara urut.",
    origin: "guru",
  },
  {
    q: "Manakah bagian-bagian teks prosedur?",
    options: [
      "Orientasi, komplikasi, resolusi",
      "Tujuan, bahan dan alat, langkah-langkah",
      "Pendapat, alasan, penegasan",
      "Judul, bait, rima",
    ],
    answer: 1,
    explain: "Teks prosedur terdiri dari tujuan, bahan dan alat, serta langkah-langkah.",
    origin: "guru",
  },
  {
    q: "Kalimat dalam teks prosedur biasanya berupa kalimat…",
    options: ["Tanya", "Seru", "Perintah", "Pengandaian"],
    answer: 2,
    explain: "Teks prosedur memakai kalimat perintah, misalnya \"Basahi tangan dengan air bersih.\"",
    origin: "guru",
  },
  {
    q: "Kata \"kemudian\" dan \"setelah itu\" termasuk…",
    options: ["Kata sifat", "Kata benda", "Kata seru", "Konjungsi urutan"],
    answer: 3,
    explain: "Kemudian dan setelah itu adalah konjungsi urutan yang menunjukkan urutan langkah.",
    origin: "guru",
  },
  {
    q: "Pada contoh mencuci tangan, apa yang dilakukan paling akhir?",
    options: ["Membasahi tangan", "Menggosokkan sabun", "Membilas tangan", "Mengeringkan tangan dengan kain bersih"],
    answer: 3,
    explain: "Langkah terakhir adalah mengeringkan tangan dengan kain bersih.",
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
