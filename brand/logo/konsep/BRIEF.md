# Logo Selaras — brief & eksplorasi konsep

## Brief
- **Nama:** Selaras · **Tagline:** "Satu materi dari guru, setiap siswa bisa mengikuti."
- **Produk:** guru menulis materi sekali; siswa membuka lewat link/QR di HP dan memilih cara belajar
  (teks mudah, Basa Jawa/Sunda, huruf besar, kontras tinggi, spasi lega, dibacakan).
- **Pengguna:** guru honorer & guru kelas gabungan (utama); siswa SD–SMP termasuk siswa disabilitas dan
  berbahasa ibu daerah.
- **Kata sifat:** hangat · jelas · bisa dipercaya · ramah anak · tenang/rapi.
- **Warna:** hijau papan tulis #1F6E35 (utama); krayon biru #2453A6, merah #B02A31, kuning #F2C230 (bidang saja),
  coklat #875225, coklat muda #D8BF94.
- **Huruf:** judul aplikasi Plus Jakarta Sans (ExtraBold 800); teks bacaan Atkinson Hyperlegible. Keduanya OFL,
  jadi boleh dipakai untuk logo.
- **Pakai di:** aplikasi, favicon, pitch deck, video demo, README GitHub, proyektor kelas.

### Asumsi
- Wordmark ditulis "Selaras" (huruf S kapital), kecuali konsep C yang sengaja memakai huruf kecil semua.
- Logo cukup memakai 1–2 warna; hijau tetap jadi warna pemilik.

### Kritik logo lama (`src/components/ui.tsx`)
Logo lama berupa kotak hijau berisi tiga garis, putih/merah/biru di layar terang dan kuning di versi papan.
- Bentuknya terbaca sebagai ikon generik "dokumen/catatan" atau menu hamburger. Tidak ada yang bisa
  dimiliki, dan tidak ada S atau gagasan "selaras".
- Dua garis hanya dibedakan lewat warna merah vs biru. Panjang garisnya juga mirip, jadi di 16 px ketiganya
  menyatu menjadi blok.
- Hijaunya #2D6A4F, bukan hijau papan #1F6E35 yang dipakai di aplikasi.
- **Yang layak dipertahankan:** gagasan "baris-baris materi" dan wadah papan tulis hijau. Gagasan ini
  dilanjutkan di konsep A.

## Riset kategori (pustaka 23 logo edtech + pengetahuan umum)
- Biru mendominasi (43 %). Bentuk yang sering muncul: segi enam, monoline, kurung kode `< >`, panah, dan
  inisial dalam sans geometris.
- **Klise yang dihindari:** toga, buku terbuka, bola lampu, pensil, burung hantu, apel, roket, segi enam,
  biru, S dengan "swoosh", kursi roda, puzzle, otak, tangan menggenggam, kilau AI.
- **Peluang:** hijau papan + warna krayon yang hangat, bentuk membulat, dan makna lokal (laras gamelan, papan
  tulis) belum dipakai pemain lain.

## Peta kata
laras/tangga nada · bilah saron · garpu tala (menyetel nada) · baris tulisan · papan tulis & kapur · satu → banyak ·
berdiri di garis yang sama · tidak tertinggal · menyesuaikan · anak bersorak

## Longlist ide (satu kalimat)
1. **Tiga Baris** — huruf S yang tersusun dari tiga goresan kapur bertumpuk seperti tiga baris materi. ✅
2. **Garpu Tala** — garpu tala, alat penyetel nada agar *selaras*, yang sekaligus terbaca sebagai anak
   mengangkat kedua tangan. ✅
3. **Sepijak** — tiga lingkaran berbeda ukuran berdiri di satu garis yang sama: berbeda, tapi tidak ada yang
   tertinggal. ✅
4. Bilah Laras — lima bilah saron bertingkat yang puncaknya membentuk satu lengkung rapi (terlalu mirip
   grafik batang atau equalizer).
5. Cabang Satu Sumber — satu batang tebal bercabang menjadi tiga jalur berbeda (mirip ikon git branch).
6. Kipas — jari-jari kipas tari dari satu poros (terbaca sebagai matahari terbit).
7. Gong Pencu — lingkaran gong dengan tonjolan di tengah (terbaca sebagai sasaran tembak).
8. Anyaman — tiga pita krayon dianyam menjadi satu bidang (terlalu mirip tagar).
9. Huruf "a" kembar — wordmark yang dua huruf a-nya berbeda bentuk, a bertingkat dan ɑ huruf sekolah
   (berisiko dikira salah ketik).
10. Baris yang membesar — tiga baris yang sama dalam tiga ukuran, seperti fitur huruf besar (terlalu mirip
    ikon zoom).
11. Not angka — titik-titik notasi kepatihan di atas garis (terlalu samar untuk orang awam).

Skor singkat (kejelasan ide, beda dari kompetitor, sederhana, relevan, kuat di 16 px): ide 1–3 tertinggi
dan tipenya berbeda-beda (letterform, piktorial-metafora, abstrak).

## Iterasi
- **A v1:** S geometris utuh. Jelas, tapi generik dan gagasan "tiga baris" tidak terlihat.
- **A v2:** S dipotong tegak di batang tengah. Hasilnya mirip mata rantai atau "$", jadi ditolak.
- **A v3 (dipakai):** S dipotong mendatar di puncak kedua tikungan sehingga menjadi tiga goresan. Di 16 px
  celahnya menutup dan tetap terbaca S.
- **C v1:** lingkaran tengah paling besar. Mirip ikon "grup pengguna" dan mahkota, jadi urutan ukuran diubah
  menjadi besar–kecil–sedang.

## Hasil tes (putaran ini)
| | 16 px | Satu warna | Latar gelap | Shelf test edtech | Catatan |
|---|---|---|---|---|---|
| A | ✅ terbaca S | ✅ | ✅ | ✅ beda (bukan biru/segi enam) | celah hilang di < 24 px, sesuai rencana |
| B | ✅ siluet unik | ✅ | ✅ | ✅ paling beda | bisa terbaca ketapel atau Ψ |
| C | ⚠️ jadi "titik-titik" | ✅ | ✅ | ⚠️ lemah di header | mirip ikon pesan suara/kaset |

Audit SVG (`svg_audit.py`): ketiga simbol 1 warna, tanpa gradien/teks/raster, 16–23 titik, skor 100/100.
Wordmark di lockup sudah berupa path (Plus Jakarta Sans 800/700 dan Atkinson Hyperlegible Bold).
Logo-logo pustaka adalah merek dagang pemiliknya dan hanya dipakai sebagai pembanding.
Pemeriksaan merek dagang profesional tetap disarankan sebelum dipakai resmi.
