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

export type VersionKey = "mudah" | "daerah" | "ringkasan";

export type LessonVersion = {
  text: string;
  glossary: GlossaryItem[];
  /** "ai" = draf dari AI, "guru" = ditulis guru sendiri */
  origin: "ai" | "guru";
  /** Guru sudah membaca dan menyetujui versi ini */
  checked: boolean;
  lang?: RegionalLang;
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
