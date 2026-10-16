# Logo Selaras — "Tiga Baris"

Huruf S yang tersusun dari tiga goresan kapur bertumpuk, seperti tiga baris materi. Satu materi dari guru
tersusun rapi menjadi satu bentuk yang bisa diikuti setiap siswa. Di ukuran kecil, celahnya menutup dan
bentuknya kembali menjadi S utuh.

Panduan lengkap ada di [`panduan-logo.png`](panduan-logo.png) (sumber: `panduan-logo.html`).

## Isi folder
| Folder | Isi |
|---|---|
| `simbol/` | logomark 256×256: `warna`, `hitam`, `putih`, `hijau`, `gelap` (SVG + PNG 1024), `kecil-*` = potongan kecil tanpa celah untuk < 48 px |
| `horizontal/` | lockup horizontal (SVG + PNG 1200 px), lima varian warna |
| `vertikal/` | lockup vertikal (SVG + PNG), lima varian warna |
| `wordmark/` | tulisan "Selaras" saja (SVG) |
| `web/` | `favicon.ico` (16/32/48), `favicon.svg`, `favicon-16/32/48.png`, `apple-touch-icon.png` (180), `icon-192.png`, `icon-512.png`, `maskable-512.png`, `site.webmanifest`, `head-snippet.html` |
| `og/` | gambar pratinjau link 1200×630 (`selaras-og-1200x630.png`) |
| `presentasi/` | pelat 1920×1080 untuk pitch deck dan video: lockup horizontal, vertikal, dan kartu penutup + tagline, masing-masing di latar putih dan latar hijau gelap |
| `konsep/` | brief, longlist ide, tiga konsep putaran 1, dan lembar uji |
| `sumber/` | skrip Python yang membangun semua file di atas (`kit.py`, `guide.py`, `wm.py`) |

## Varian warna
| Varian | Goresan atas · tengah · bawah | Wordmark | Untuk |
|---|---|---|---|
| `warna` | biru #2453A6 · hijau #1F6E35 · coklat #875225 | tinta #1E2A23 | latar putih/terang (utama) |
| `gelap` | kuning #F2C230 · kapur #F7F3E8 · coklat muda #D8BF94 | kapur | latar papan #163728 |
| `hijau` | #1F6E35 semua | #1F6E35 | satu warna |
| `hitam` / `putih` | #000 / #FFF semua | sama | cetak, fotokopi, foto gelap |

Versi `putih` dan `gelap` digambar sedikit lebih tipis (goresan 42 vs 44 unit) karena bentuk terang di latar gelap
terlihat lebih tebal.

## Aturan singkat
- **Ruang kosong:** minimal x di keempat sisi, dengan x = tebal satu goresan (≈ ¼ tinggi simbol).
- **Ukuran minimum:** horizontal 120 px / 30 mm · vertikal 64 px / 16 mm · simbol bercelah 48 px · di bawah itu pakai
  `simbol-kecil-*` · favicon memakai ubin hijau.
- **Huruf:** wordmark Plus Jakarta Sans ExtraBold (sudah diubah jadi path, jadi tidak perlu font terpasang); tagline
  dan teks pendamping Atkinson Hyperlegible. Keduanya berlisensi SIL OFL dan boleh dipakai untuk logo.

## Hasil tes
- Kontras di latar putih: biru 7,3:1 · hijau 6,3:1 · coklat 6,4:1 · wordmark 14,9:1.
- Kontras di latar papan #163728: kuning 7,8:1 · kapur 11,8:1 · coklat muda 7,3:1.
- Ikon di ubin hijau: kapur 5,7:1 · kuning 3,8:1 · coklat muda 3,5:1. Semua ≥ 3:1.
- Favicon dicek di tab terang, abu-abu, dan gelap.
- Bentuk S terbaca tanpa warna, jadi aman untuk buta warna.
- `svg_audit.py`: semua simbol dan ikon 100/100. Wordmark mendapat peringatan "sudut 17,8°" karena desain asli
  huruf S Plus Jakarta Sans, jadi dibiarkan.

## Pemasangan di aplikasi (sudah dilakukan)
1. `src/app/favicon.ico`, `src/app/icon.svg` (dari `web/favicon.svg`), `src/app/apple-icon.png` (dari
   `web/apple-touch-icon.png`), dan `src/app/manifest.webmanifest` mengikuti konvensi metadata Next.js. Ikon
   manifest (`icon-192.png`, `icon-512.png`, `maskable-512.png`) ada di `public/`.
2. Komponen `Logo` (`src/components/ui.tsx`) memakai simbol `warna`, atau `gelap` untuk `light` (latar papan).
3. `src/app/opengraph-image.png` (dari `og/selaras-og-1200x630.png`) + `opengraph-image.alt.txt`.

## Catatan terbuka
- Belum ada pemeriksaan merek dagang. Sebelum dipakai resmi, cek dulu di PDKI (pdki-indonesia.dgip.go.id) dan
  dengan pencarian gambar terbalik.
- Untuk mesin potong, bordir, atau sablon, gabungkan tiap goresan menjadi satu outline di editor vektor
  (Outline Stroke + Unite).
- Nilai CMYK/Pantone belum ditetapkan. Kalau ada kebutuhan cetak offset, cocokkan dengan proof cetak.
