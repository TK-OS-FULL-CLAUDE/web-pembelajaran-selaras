// Tipe data bersama untuk seluruh aplikasi Selaras.

export type RegionalLang = "jw" | "su";

/** Profil kebutuhan kelas. Hanya jumlah, tanpa nama atau data pribadi siswa. */
export type ClassNeeds = {
  totalSiswa: number;
  lowVision: number;
  tuli: number;
  disleksia: number;
  sulitFokus: number;
  bahasaDaerah: number;
  bahasa: RegionalLang | null;
};

export type NeedKey = "lowVision" | "tuli" | "disleksia" | "sulitFokus" | "bahasaDaerah";

export type GlossaryItem = { kata: string; arti: string };

/** Versi teks materi. Basa Jawa dan Basa Sunda adalah dua versi terpisah. */
export type VersionKey = "mudah" | "ringkasan" | "jawa" | "sunda";

/** Urutan tampil versi di tab Versi, layar siswa, dan rekap. */
export const VERSION_KEYS: VersionKey[] = ["mudah", "ringkasan", "jawa", "sunda"];

export type RegionalVersionKey = "jawa" | "sunda";

export function isRegionalVersion(key: string): key is RegionalVersionKey {
  return key === "jawa" || key === "sunda";
}

/** Bahasa daerah di profil kelas → versi yang cocok. */
export const VERSION_FOR_LANG: Record<RegionalLang, RegionalVersionKey> = { jw: "jawa", su: "sunda" };
export const LANG_FOR_VERSION: Record<RegionalVersionKey, RegionalLang> = { jawa: "jw", sunda: "su" };

export const VERSION_LABEL: Record<"asli" | VersionKey, string> = {
  asli: "Teks asli",
  mudah: "Teks mudah",
  ringkasan: "Ringkasan",
  jawa: "Basa Jawa",
  sunda: "Basa Sunda",
};

/** Atribut lang HTML untuk teks tiap versi. */
export const VERSION_HTML_LANG: Record<"asli" | VersionKey, string> = {
  asli: "id",
  mudah: "id",
  ringkasan: "id",
  jawa: "jv",
  sunda: "su",
};

/** Bahasa suara (Web Speech API) untuk membacakan tiap versi. */
export const VERSION_SPEECH_LANG: Record<"asli" | VersionKey, string> = {
  asli: "id-ID",
  mudah: "id-ID",
  ringkasan: "id-ID",
  jawa: "jv-ID",
  sunda: "su-ID",
};

export type LessonVersion = {
  text: string;
  glossary: GlossaryItem[];
  /** "ai" = draf dari AI, "guru" = ditulis guru sendiri */
  origin: "ai" | "guru";
  /** Guru sudah membaca dan menyetujui versi ini */
  checked: boolean;
  /** Sidik materi asli saat versi dibuat, untuk mendeteksi materi asli yang berubah */
  basedOn?: string;
  updatedAt: string;
};

export type LessonVersions = Partial<Record<VersionKey, LessonVersion>>;

export type QuizQuestion = {
  q: string;
  options: string[];
  answer: number;
  explain: string;
  origin?: "ai" | "guru";
};

// ---------- Perangkat ajar (modul ajar, LKPD, rubrik) ----------
// Hanya untuk guru: disimpan di lessons.teaching_kit dan tidak pernah dikirim ke halaman siswa.

export type KitKey = "modul" | "lkpd" | "lkpdMudah" | "rubrik";

/** Urutan tampil dan urutan cetak "Cetak semua". */
export const KIT_KEYS: KitKey[] = ["modul", "lkpd", "lkpdMudah", "rubrik"];

export const KIT_LABEL: Record<KitKey, string> = {
  modul: "Modul ajar",
  lkpd: "LKPD",
  lkpdMudah: "LKPD versi sederhana",
  rubrik: "Rubrik penilaian",
};

export type KegiatanTahap = { menit: number; langkah: string[] };

export type ModulAjar = {
  identitas: {
    penyusun: string;
    sekolah: string;
    mapel: string;
    kelas: string;
    fase: string;
    topik: string;
    alokasi: string;
  };
  tujuan: string[];
  /** Media, alat, dan bahan */
  sarana: string[];
  pendahuluan: KegiatanTahap;
  inti: KegiatanTahap;
  penutup: KegiatanTahap;
  asesmen: string[];
  /** Akomodasi sesuai profil kebutuhan kelas */
  akomodasi: string[];
};

export type LkpdAktivitas = { judul: string; langkah: string[]; pertanyaan: string[] };

/** Lembar Kerja Peserta Didik. Dipakai juga untuk LKPD versi sederhana. */
export type Lkpd = {
  judul: string;
  tujuan: string;
  petunjuk: string[];
  aktivitas: LkpdAktivitas[];
};

/** Empat tingkat capaian, dari skor 1 sampai 4. */
export const RUBRIK_LEVELS = ["Perlu bimbingan", "Cukup", "Baik", "Sangat baik"] as const;

export type RubrikKriteria = { nama: string; level: string[] };

export type Rubrik = { judul: string; kriteria: RubrikKriteria[] };

export type KitData = { modul: ModulAjar; lkpd: Lkpd; lkpdMudah: Lkpd; rubrik: Rubrik };

export type KitItem<T> = {
  data: T;
  /** "ai" = draf dari AI, "guru" = diisi guru sendiri */
  origin: "ai" | "guru";
  /** Guru sudah membaca dan menyetujui perangkat ini */
  checked: boolean;
  /** Sidik teks sumber saat dibuat (materi asli; untuk LKPD sederhana: versi teks mudah) */
  basedOn?: string;
  updatedAt: string;
};

export type TeachingKit = { [K in KitKey]?: KitItem<KitData[K]> };

export type ClassRow = {
  id: string;
  teacher_id: string;
  name: string;
  grade: string;
  needs: ClassNeeds;
  created_at: string;
};

export type LessonRow = {
  id: string;
  teacher_id: string;
  class_id: string | null;
  title: string;
  subject: string;
  body: string;
  glossary: GlossaryItem[];
  versions: LessonVersions;
  quiz: QuizQuestion[];
  teaching_kit: TeachingKit;
  status: "draft" | "published";
  share_code: string | null;
  /** Bertambah setiap kali isi materi disimpan; dipakai untuk mendeteksi simpan yang bertabrakan. */
  revision: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type TeacherRow = {
  id: string;
  email: string;
  name: string;
  school: string | null;
  is_demo: boolean;
};

/** Pilihan cara belajar siswa. */
export type StudentPrefs = {
  versi: "asli" | VersionKey;
  besar: boolean;
  kontras: boolean;
  spasi: boolean;
  dengar: boolean;
};

export const DEFAULT_PREFS: StudentPrefs = {
  versi: "asli",
  besar: false,
  kontras: false,
  spasi: false,
  dengar: false,
};

export const EMPTY_NEEDS: ClassNeeds = {
  totalSiswa: 0,
  lowVision: 0,
  tuli: 0,
  disleksia: 0,
  sulitFokus: 0,
  bahasaDaerah: 0,
  bahasa: null,
};

export const LANG_LABEL: Record<RegionalLang, string> = {
  jw: "Bahasa Jawa",
  su: "Bahasa Sunda",
};

export const LANG_SHORT: Record<RegionalLang, string> = {
  jw: "Basa Jawa",
  su: "Basa Sunda",
};
