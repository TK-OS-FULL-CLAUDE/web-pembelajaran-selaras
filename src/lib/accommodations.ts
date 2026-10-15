// Panduan akomodasi untuk guru, disusun dari praktik umum pendidikan inklusif.
// Ini bantuan praktis di kelas, bukan pengganti asesmen tenaga profesional atau Guru Pembimbing Khusus.
//
// Rujukan regulasi (ditampilkan apa adanya di app, jangan dilebih-lebihkan):
// - Permendikbudristek No. 48 Tahun 2023 tentang Akomodasi yang Layak untuk Peserta Didik Penyandang
//   Disabilitas (Lampiran II memuat bentuk akomodasi per ragam disabilitas, termasuk netra/low vision dan rungu).
//   Akomodasi resmi ditetapkan sekolah lewat asesmen fungsional bersama Unit Layanan Disabilitas (Pasal 12).
//   Disleksia, sulit fokus, dan bahasa ibu daerah tidak disebut khusus di peraturan ini.
// - Perpres No. 63 Tahun 2019 Pasal 23 ayat (3): bahasa daerah boleh menjadi bahasa pengantar
//   di tahun pertama dan kedua SD/MI untuk mendukung pembelajaran.

export const PERMEN_AYL = {
  label: "Permendikbudristek No. 48 Tahun 2023 tentang Akomodasi yang Layak",
  url: "https://peraturan.bpk.go.id/Details/285711",
};

import type { NeedKey } from "./types";

export type NeedInfo = {
  key: NeedKey;
  label: string;
  short: string;
  /** Mode Selaras yang membantu kebutuhan ini */
  modes: string[];
  tips: string[];
  /** Dasar panduan ini, ditampilkan di kartu panduan. */
  rujukan: string;
};

export const NEEDS: NeedInfo[] = [
  {
    key: "lowVision",
    label: "Low vision",
    short: "Penglihatan terbatas, sulit membaca huruf kecil",
    modes: ["Huruf besar", "Kontras tinggi", "Dibacakan"],
    tips: [
      "Dudukkan siswa di dekat papan dan jauh dari silau jendela.",
      "Bacakan dengan suara jelas setiap tulisan yang Anda tulis di papan.",
      "Pakai spidol gelap yang tebal; hindari tulisan kecil atau warna pucat.",
      "Beri waktu lebih lama untuk membaca dan menulis.",
      "Jangan menyampaikan informasi penting hanya lewat warna atau gambar.",
    ],
    rujukan:
      "Sejalan dengan Permendikbudristek 48/2023, Lampiran II (disabilitas netra, termasuk low vision): media di papan/layar yang bisa diakses.",
  },
  {
    key: "tuli",
    label: "Tuli atau sulit mendengar",
    short: "Sulit menangkap penjelasan lisan",
    modes: ["Materi tertulis lengkap", "Glosarium"],
    tips: [
      "Hadapkan wajah ke kelas saat berbicara; jangan menjelaskan sambil menulis di papan.",
      "Tulis instruksi kunci, tugas, dan tenggat di papan atau di materi.",
      "Pakai gambar, benda nyata, dan isyarat sederhana untuk menjelaskan.",
      "Pastikan siswa melihat Anda sebelum mulai berbicara.",
      "Pasangkan dengan teman yang bisa membantu menyampaikan informasi lisan.",
    ],
    rujukan:
      "Sejalan dengan Permendikbudristek 48/2023, Lampiran II (disabilitas rungu): kalimat sederhana lewat tulisan, tuturan, atau isyarat, dan materi multisensorik.",
  },
  {
    key: "disleksia",
    label: "Disleksia / kesulitan membaca",
    short: "Membaca lambat, mudah kehilangan baris",
    modes: ["Teks mudah", "Spasi lega", "Dibacakan"],
    tips: [
      "Jangan meminta siswa membaca keras di depan kelas tanpa persiapan.",
      "Beri versi teks dengan kalimat pendek dan spasi lega.",
      "Izinkan siswa mendengarkan materi sambil mengikuti teksnya.",
      "Nilai pemahaman lewat jawaban lisan atau gambar, bukan hanya tulisan.",
      "Beri waktu tambahan untuk tugas membaca dan menulis.",
    ],
    rujukan: "Praktik umum pendidikan inklusif. Disleksia tidak disebut khusus di Permendikbudristek 48/2023.",
  },
  {
    key: "sulitFokus",
    label: "Sulit fokus",
    short: "Perhatian mudah teralih, sulit menyelesaikan tugas panjang",
    modes: ["Teks mudah", "Ringkasan", "Kuis satu soal per layar"],
    tips: [
      "Pecah tugas panjang menjadi langkah kecil dengan target yang jelas.",
      "Berikan instruksi satu per satu dan minta siswa mengulanginya.",
      "Sisipkan jeda singkat atau kegiatan bergerak di tengah pelajaran.",
      "Dudukkan siswa jauh dari pintu dan sumber keramaian.",
      "Puji usaha saat siswa menyelesaikan satu langkah.",
    ],
    rujukan: "Praktik umum pendidikan inklusif.",
  },
  {
    key: "bahasaDaerah",
    label: "Berbahasa ibu daerah",
    short: "Lebih paham bahasa daerah daripada Bahasa Indonesia",
    modes: ["Versi bahasa daerah", "Glosarium dua bahasa"],
    tips: [
      "Kenalkan kosakata kunci dalam Bahasa Indonesia dan bahasa daerah sebelum pelajaran.",
      "Izinkan siswa bertanya atau menjawab dengan bahasa daerah di awal, lalu bantu menyusun jawabannya dalam Bahasa Indonesia.",
      "Pasangkan dengan teman sebahasa yang lebih lancar berbahasa Indonesia.",
      "Di kelas 1–2 SD, bahasa daerah boleh dipakai sebagai bahasa pengantar (Perpres 63/2019 Pasal 23).",
    ],
    rujukan: "Praktik umum pendidikan multibahasa; Perpres No. 63 Tahun 2019 Pasal 23 ayat (3).",
  },
];

export const NEED_BY_KEY: Record<NeedKey, NeedInfo> = Object.fromEntries(NEEDS.map((n) => [n.key, n])) as Record<
  NeedKey,
  NeedInfo
>;
