# Peran 2 — Mesin AI & Review

Pemilik: Michael Evan. Dokumen ini menjelaskan bagian AI di atas fondasi Faza (PR #1).

## Ringkasnya

- AI hanya membuat **draf**. Setiap versi berlabel "Draf AI, perlu dicek" dan baru tampil untuk siswa setelah guru menekan **Tandai sudah dicek**. Materi tidak bisa terbit selama masih ada versi yang belum dicek.
- Ada dua penyedia AI, keduanya lewat REST tanpa SDK. Bila keduanya diisi, yang satu menjadi cadangan saat yang lain gagal.
- Ada tiga versi teks: **Teks mudah**, **Bahasa daerah** (Jawa atau Sunda, sesuai profil kelas), dan **Ringkasan** (3–7 poin utama).

## Penyedia dan cadangan

| Tugas | Fungsi (`src/lib/ai-tasks.ts`) | Route | Utama | Cadangan |
|---|---|---|---|---|
| Foto halaman buku → teks | `photoToText` | `POST /api/ai/foto` | Gemini | Claude |
| Teks mudah | `makeSimpleVersion` | `POST /api/ai/versi` (`jenis: "mudah"`) | Claude | Gemini |
| Ringkasan | `makeSummaryVersion` | `POST /api/ai/versi` (`jenis: "ringkasan"`) | Claude | Gemini |
| Bahasa daerah | `makeRegionalVersion` | `POST /api/ai/versi` (`jenis: "daerah"`) | Claude | Gemini |
| Draf kuis | `makeQuizDraft` | `POST /api/ai/kuis` | Gemini | Claude |

Urutan percobaan di dalam satu penyedia:
- Claude: `claude-haiku-5-5`, lalu `claude-sonnet-5-5`.
- Gemini: `gemini-3.6-flash`, lalu `gemini-3.5-flash-lite`.

Bila model menolak parameter (HTTP 400), permintaan diulang dalam bentuk yang lebih sederhana (tanpa skema JSON). Bila jawabannya bukan JSON yang valid, permintaan diulang dengan variasi berikutnya.

Penyedia cadangan dipakai bila penyedia utama gagal karena kunci ditolak, kredit atau kuota habis, sibuk (429/5xx/529), waktu habis, atau model menolak menjawab. Satu permintaan dibatasi 55 detik total (`maxDuration = 60` di route), dan 18 detik di antaranya disisakan untuk cadangan. Galat "materi terlalu panjang" tidak dilempar ke cadangan karena hasilnya akan sama.

File terkait: `src/lib/claude.ts` (klien Claude + pengatur cadangan), `src/lib/gemini.ts` (klien Gemini), `src/lib/ai-common.ts` (tipe dan galat bersama).

## Pengaman di prompt

- Model hanya boleh memakai fakta dari teks guru.
- Teks materi diperlakukan sebagai data, jadi kalimat yang tampak seperti perintah di dalam materi diabaikan.
- Saat membaca foto, gambar atau diagram penting ditulis sebagai `[Gambar: ...]` supaya bisa dibacakan untuk siswa low vision, dan kata yang tidak terbaca ditulis `[tidak terbaca]`.
- Glosarium dari AI disaring: hanya kata yang benar-benar muncul di teksnya yang disimpan, supaya semuanya bisa diketuk siswa.
- Ringkasan selalu dirapikan menjadi daftar butir `- `.

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

Ada 18 uji yang menjalankan kode AI asli terhadap server palsu (`tests/ai/fake-ai-server.mjs`), tanpa kunci API dan tanpa biaya. Yang diuji antara lain urutan penyedia per tugas, cadangan saat kredit habis/kunci ditolak/sibuk/timeout, ulang tanpa skema, penyaringan glosarium, format ringkasan, dan pesan galat. Satu uji timeout memakan sekitar 40 detik.

Untuk mencoba UI tanpa kunci asli, jalankan `node tests/ai/fake-ai-server.mjs`, lalu isi `.env.local` dengan:

```env
ANTHROPIC_BASE_URL=http://127.0.0.1:4599
GEMINI_BASE_URL=http://127.0.0.1:4599
ANTHROPIC_API_KEY=palsu
GEMINI_API_KEY=palsu
```

Setelah deploy, `npm run cek -- https://alamat-app --ai` ikut menguji draf kuis dan draf ringkasan memakai kunci asli.

## Catatan untuk tim

- **Data demo:** materi Fotosintesis sekarang punya versi Ringkasan, dan ada dua sesi siswa demo yang memakai ringkasan. Database yang sudah terisi sebelumnya perlu **Reset data demo** (tombol di halaman guru) supaya ikut berubah.
- **Sabri (ruang siswa):** pilihan "Poin penting saja" muncul di layar pilih cara belajar, dan tombol "Ringkasan" muncul di bilah versi. Di HP, empat tombol versi otomatis disusun 2×2.
- **Aufa (rekap):** `prefCounts.ringkasan` dan baris "Ringkasan" sudah ada di rekap per versi.
