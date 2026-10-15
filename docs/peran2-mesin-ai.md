# Peran 2 — Mesin AI & Review

Pemilik: Michael Evan. Dokumen ini menjelaskan bagian AI di atas fondasi Faza (PR #1).

## Ringkasnya

- AI hanya membuat **draf**. Setiap versi berlabel "Draf AI — wajib dicek guru" dan baru tampil untuk siswa setelah guru menekan **Tandai sudah dicek**. Materi tidak bisa terbit selama masih ada versi yang belum dicek.
- Ada dua penyedia AI, keduanya lewat REST tanpa SDK. Bila keduanya diisi, yang satu menjadi cadangan saat yang lain gagal.
- Ada empat versi teks, sesuai rencana build: **Teks mudah**, **Ringkasan** (3–7 poin utama), **Basa Jawa**, dan **Basa Sunda**. Bahasa ibu di profil kelas menentukan versi daerah yang diberi label "Disarankan untuk kelas ini".
- Fitur tambahan **Generator Perangkat Ajar** (tab Perangkat Ajar): modul ajar ringkas, LKPD, LKPD versi sederhana, dan rubrik dari materi yang sama, lalu dicetak atau disimpan PDF. Lihat bagian [Generator Perangkat Ajar](#generator-perangkat-ajar).

## Penyedia dan cadangan

| Tugas | Fungsi (`src/lib/ai-tasks.ts`) | Route | Utama | Cadangan |
|---|---|---|---|---|
| Foto halaman buku → teks | `photoToText` | `POST /api/ai/foto` | Gemini | Claude |
| Teks mudah | `makeSimpleVersion` | `POST /api/ai/versi` (`jenis: "mudah"`) | Claude | Gemini |
| Ringkasan | `makeSummaryVersion` | `POST /api/ai/versi` (`jenis: "ringkasan"`) | Claude | Gemini |
| Basa Jawa | `makeRegionalVersion` | `POST /api/ai/versi` (`jenis: "jawa"`) | Claude | Gemini |
| Basa Sunda | `makeRegionalVersion` | `POST /api/ai/versi` (`jenis: "sunda"`) | Claude | Gemini |
| Draf kuis | `makeQuizDraft` | `POST /api/ai/kuis` | Gemini | Claude |
| Modul ajar ringkas | `makeModulAjar` (`ai-perangkat.ts`) | `POST /api/ai/perangkat` (`jenis: "modul"`) | Claude | Gemini |
| LKPD | `makeLkpd` | `POST /api/ai/perangkat` (`jenis: "lkpd"`) | Claude | Gemini |
| LKPD versi sederhana | `makeLkpdMudah` | `POST /api/ai/perangkat` (`jenis: "lkpdMudah"`) | Claude | Gemini |
| Rubrik (kriteria × 4 tingkat) | `makeRubrik` | `POST /api/ai/perangkat` (`jenis: "rubrik"`) | Claude | Gemini |

Urutan percobaan di dalam satu penyedia:
- Claude: `claude-haiku-5-5`, lalu `claude-sonnet-5-5`.
- Gemini: `gemini-3.6-flash`, lalu `gemini-3.5-flash-lite`.

Bila model menolak parameter (HTTP 400), permintaan diulang dalam bentuk yang lebih sederhana (tanpa skema JSON). Bila jawabannya bukan JSON yang valid, permintaan diulang dengan variasi berikutnya.

Penyedia cadangan dipakai bila penyedia utama gagal karena kunci ditolak, kredit atau kuota habis, sibuk (429/5xx/529), waktu habis, atau model menolak menjawab. Satu permintaan dibatasi 55 detik total (`maxDuration = 60` di route), dan 18 detik di antaranya disisakan untuk cadangan. Galat "materi terlalu panjang" tidak dilempar ke cadangan karena hasilnya akan sama.

File terkait: `src/lib/claude.ts` (klien Claude + pengatur cadangan), `src/lib/gemini.ts` (klien Gemini), `src/lib/ai-common.ts` (tipe dan galat bersama).

## Batas pemakaian

Setiap akun guru dibatasi `AI_LIMIT_PER_HOUR` permintaan AI per jam (default 100). Satu klik "Buat draf semua versi" memakai 4 permintaan, begitu juga "Buat draf semua perangkat dengan AI". Tombol itu hanya mengisi versi yang masih kosong, jadi versi yang sudah diedit atau dicek tidak tertimpa; "Buat ulang dengan AI" pada versi yang sudah dicek meminta konfirmasi dulu. Bila batas tercapai, route AI menjawab HTTP 429 dengan pesan berapa menit lagi bisa dicoba. Catatannya disimpan di tabel `ai_usage` (`src/lib/ai-quota.ts`). Tujuannya supaya kredit tidak habis bila akun demo dipakai bersama saat penjurian.

## Pengaman di prompt

- Model hanya boleh memakai fakta dari teks guru.
- Teks materi diperlakukan sebagai data, jadi kalimat yang tampak seperti perintah di dalam materi diabaikan.
- Saat membaca foto, gambar atau diagram penting ditulis sebagai `[Gambar: ...]` supaya bisa dibacakan untuk siswa low vision, dan kata yang tidak terbaca ditulis `[tidak terbaca]`.
- Versi bahasa daerah berlabel **Perlu dicek penutur asli**, disertai catatan agar guru meminta penutur asli membacanya sebelum menandai sudah dicek.
- Glosarium dari AI disaring: hanya kata yang benar-benar muncul di teksnya yang disimpan, supaya semuanya bisa diketuk siswa.
- Ringkasan selalu dirapikan menjadi daftar butir `- `.

## Generator Perangkat Ajar

Tab **Perangkat Ajar** ada di editor materi, di samping tab Versi. Dari satu materi guru mendapat empat draf:

| Perangkat | Isi | Sumber teks |
|---|---|---|
| Modul ajar ringkas | identitas, tujuan pembelajaran, media/alat/bahan, kegiatan pendahuluan–inti–penutup (dengan menit), asesmen, akomodasi untuk kebutuhan kelas | materi asli |
| LKPD | judul, tujuan, petunjuk, 2–3 aktivitas berisi langkah dan pertanyaan; ruang jawab ditambahkan saat dicetak | materi asli + tujuan dari modul ajar |
| LKPD versi sederhana | sama, dengan kalimat ≤ 10 kata, pertanyaan yang bisa dijawab dengan melingkari/menggambar/satu kata, huruf lebih besar saat dicetak | versi **Teks mudah** yang sudah ada |
| Rubrik | 3–5 kriteria × 4 tingkat (Perlu bimbingan, Cukup, Baik, Sangat baik) dan cara menghitung nilai | materi asli + tujuan modul + aktivitas LKPD |

Cara kerjanya:
- **Identitas modul tidak dibuat AI.** Penyusun, sekolah, mata pelajaran, kelas, dan topik diambil dari data guru, kelas, dan materi. Fase dihitung dari kelas (1–2 A, 3–4 B, 5–6 C, 7–9 D, 10 E, 11–12 F) dan alokasi awal 2 JP (35/40/45 menit untuk SD/SMP/SMA). Semuanya bisa diedit. Kode: `src/lib/perangkat.ts`.
- **Akomodasi** memakai profil kebutuhan kelas yang hanya berisi jumlah siswa per kebutuhan, ditambah panduan umum dari `accommodations.ts`. Tidak ada nama atau data pribadi siswa yang dikirim ke AI.
- **"Buat draf semua perangkat"** membuat modul ajar, LKPD, dan LKPD sederhana bersamaan, lalu rubrik setelahnya supaya rubrik mengacu ke tujuan dan aktivitas yang baru dibuat. Perangkat yang sudah ada tidak ditimpa. LKPD sederhana hanya bisa dibuat bila versi Teks mudah sudah ada.
- **Review** memakai pola tab Versi: badge **Draf AI — wajib dicek guru**, mode Edit (daftar ditulis satu butir per baris), **Tandai sudah dicek**, **Buat ulang dengan AI** (minta konfirmasi bila sudah dicek atau diisi guru), **Isi sendiri** tanpa AI, dan peringatan bila materi asli (atau teks mudah, untuk LKPD sederhana) berubah setelah perangkat dibuat.
- **Cetak / simpan PDF** memakai `window.print()`. Hanya dokumen yang dipilih yang dicetak (`#area-cetak` + `body.cetak-perangkat` di `globals.css`), A4, satu perangkat per halaman baru. Perangkat yang belum dicek tetap bisa dicetak, dengan tanda "Draf AI — wajib dicek guru" di kertasnya. Nama file PDF bawaan mengikuti judul, misalnya "Modul ajar - Fotosintesis".
- **Penyimpanan:** kolom `lessons.teaching_kit` (jsonb), lewat simpan otomatis editor yang sama dengan versi dan kuis (dengan deteksi konflik). Route AI tidak menyimpan apa pun. Salin materi ikut menyalin perangkat ajarnya. Kolom ini tidak pernah dipilih oleh query halaman siswa.

Di luar cakupan (sesuai rencana build): ekspor Word dan templat sekolah.

## Environment

| Variabel | Keterangan |
|---|---|
| `ANTHROPIC_API_KEY` | Kunci Claude (console.anthropic.com). |
| `GEMINI_API_KEY` | Kunci Gemini (aistudio.google.com). Ada kuota gratis. |
| `ANTHROPIC_MODEL`, `GEMINI_MODEL` | Opsional, memaksa satu model dicoba lebih dulu. |

Isi minimal salah satu kunci. `GET /api/status` menampilkan penyedia yang aktif, misalnya `aktif: claude + gemini`.

## Pengujian

```bash
npm run test:ai
```

Ada 27 uji yang menjalankan kode AI asli terhadap server palsu (`tests/ai/fake-ai-server.mjs`), tanpa kunci API dan tanpa biaya. `ai.test.mts` (18 uji) menguji urutan penyedia per tugas, cadangan saat kredit habis/kunci ditolak/sibuk/timeout, ulang tanpa skema, penyaringan glosarium, format ringkasan, dan pesan galat; satu uji timeout memakan sekitar 40 detik. `perangkat.test.mts` (9 uji) menguji fase dan alokasi waktu, identitas modul, isi prompt (profil kelas, alokasi, tujuan, teks mudah), perapian butir, rubrik 4 tingkat, dan cadangan Gemini.

Untuk mencoba UI tanpa kunci asli, jalankan `node tests/ai/fake-ai-server.mjs`, lalu isi `.env.local` dengan:

```env
ANTHROPIC_BASE_URL=http://127.0.0.1:4599
GEMINI_BASE_URL=http://127.0.0.1:4599
ANTHROPIC_API_KEY=palsu
GEMINI_API_KEY=palsu
```

Setelah deploy, `npm run cek -- https://alamat-app --ai` ikut menguji draf kuis, draf ringkasan, dan draf rubrik memakai kunci asli.

## Catatan untuk tim

- **Migrasi data:** materi lama dengan satu versi `daerah` otomatis dipindah ke `jawa` atau `sunda` (sesuai `lang`-nya) saat app terhubung ke database, begitu juga pilihan siswa lama di `student_events`. Tidak perlu SQL manual.
- **Data demo:** 2 kelas, 3 materi terbit (`DEMO01`–`DEMO03`) dengan 4 versi + kuis 5 soal, 1 draf "Daur Air", dan sekitar 60 hasil kuis. Database yang sudah terisi sebelumnya perlu **Reset data demo** (tombol di halaman guru) supaya ikut berubah. Teks Basa Jawa dan Basa Sunda demo tetap perlu dibaca penutur asli.
- **Sabri (ruang siswa):** pilihan "Pakai Basa Jawa" dan "Pakai Basa Sunda" muncul terpisah di layar pilih cara belajar. Di HP, bilah versi otomatis disusun 2 atau 3 kolom.
- **Faza (fondasi):** kolom baru `lessons.teaching_kit` dibuat otomatis saat startup (`alter table … add column if not exists`), tidak perlu SQL manual. Editor kini punya 6 tab (`?tab=perangkat`).
- **Aufa (kuis & rekap):** lama pengerjaan kuis kini dicatat (`student_events.duration_sec`) dan tampil di rekap: rata-rata keseluruhan, per versi teks, dan per siswa. Versi yang tidak ada di materi tidak ditampilkan di rekap.
