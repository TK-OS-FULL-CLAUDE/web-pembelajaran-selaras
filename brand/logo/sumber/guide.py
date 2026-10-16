"""One-page usage guide for the Selaras logo (HTML, A4 proportion), rendered to PNG separately."""
import re

ROOT = "C:/Users/ASUS/web-pembelajaran-selaras/brand/logo"


def load(p):
    s = open(f"{ROOT}/{p}").read()
    s = re.sub(r"<title[^>]*>.*?</title>", "", s)
    return re.sub(r' width="[\d.]+" height="[\d.]+"', "", s, count=1)


def recolor(s, mapping):
    for a, b in mapping.items():
        s = s.replace(f'fill="{a}"', f'fill="{b}"')
    return s


H = load("horizontal/selaras-horizontal-warna.svg")
HG = load("horizontal/selaras-horizontal-gelap.svg")
HB = load("horizontal/selaras-horizontal-hitam.svg")
HW = load("horizontal/selaras-horizontal-putih.svg")
HH = load("horizontal/selaras-horizontal-hijau.svg")
V = load("vertikal/selaras-vertikal-warna.svg")
SYM = load("simbol/selaras-simbol-warna.svg")
SMALL = load("simbol/selaras-simbol-kecil-hijau.svg")
FAV = load("web/favicon.svg")

colors = [
    ("Hijau papan", "#1F6E35", "31 110 53", "6,3:1", "warna utama · goresan tengah"),
    ("Biru krayon", "#2453A6", "36 83 166", "7,3:1", "goresan atas"),
    ("Coklat meja", "#875225", "135 82 37", "6,4:1", "goresan bawah"),
    ("Tinta", "#1E2A23", "30 42 35", "14,9:1", "wordmark"),
    ("Papan gelap", "#163728", "22 55 40", "—", "latar untuk versi gelap"),
    ("Kapur", "#F7F3E8", "247 243 232", "11,8:1*", "goresan tengah & teks di latar gelap"),
    ("Kuning", "#F2C230", "242 194 48", "7,8:1*", "goresan atas di latar gelap, bukan teks"),
    ("Coklat muda", "#D8BF94", "216 191 148", "7,3:1*", "goresan bawah di latar gelap"),
]
sw = "".join(
    f'<div class="sw"><i style="background:{h}"></i><b>{n}</b><span>{h} · RGB {r}</span>'
    f'<span>{"kontras " + c + " — " if c != "—" else ""}{u}</span></div>' for n, h, r, c, u in colors)

wrong = [
    ('<div style="transform:scaleX(1.45)">' + H + "</div>", "Jangan ditarik/dipipihkan"),
    ('<div style="transform:rotate(-12deg)">' + H + "</div>", "Jangan dimiringkan"),
    (recolor(H, {"#2453A6": "#E8487A", "#1F6E35": "#F2C230", "#875225": "#7B3FD0"}), "Jangan ganti warna goresan"),
    ('<div style="filter:drop-shadow(6px 8px 4px rgba(0,0,0,.45))">' + H + "</div>", "Tanpa bayangan, glow, atau 3D"),
    ('<div class="dk">' + H + "</div>", "Versi warna jangan di latar gelap"),
    ('<div style="display:flex;align-items:center;gap:8px"><div style="width:28%">' + SYM +
     '</div><span style="font:italic 700 34px Georgia,serif;color:#1E2A23">Selaras</span></div>',
     "Jangan ganti huruf wordmark"),
    (recolor(recolor(recolor(H, {"#2453A6": "#000001"}), {"#875225": "#2453A6"}), {"#000001": "#875225"}),
     "Jangan tukar urutan warna goresan"),
    ('<div class="busy">' + HW + "</div>", "Jangan di latar ramai/foto tanpa bidang polos"),
]
wr = "".join(f'<div class="wr"><div class="art">{a}</div><p>✕ {t}</p></div>' for a, t in wrong)

html = f"""<!doctype html><html lang="id"><head><meta charset="utf-8"><title>Panduan Logo Selaras</title>
<style>
@font-face{{font-family:J;src:url("../../node_modules/@fontsource-variable/plus-jakarta-sans/files/plus-jakarta-sans-latin-wght-normal.woff2");font-weight:200 800}}
@font-face{{font-family:A;src:url("../../node_modules/@fontsource/atkinson-hyperlegible/files/atkinson-hyperlegible-latin-400-normal.woff2")}}
@font-face{{font-family:A;font-weight:700;src:url("../../node_modules/@fontsource/atkinson-hyperlegible/files/atkinson-hyperlegible-latin-700-normal.woff2")}}
*{{box-sizing:border-box;margin:0}} svg{{display:block;width:100%;height:auto}}
body{{width:1240px;padding:56px 64px;font:15px/1.45 A,system-ui,sans-serif;color:#1E2A23;background:#fff}}
h1{{font:800 34px J,sans-serif;letter-spacing:-.02em}} h2{{font:800 17px J,sans-serif;margin:0 0 12px;
  text-transform:uppercase;letter-spacing:.06em;color:#1F6E35}}
.lead{{color:#4A5850;max-width:760px;margin-top:6px}}
.top{{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid #1E2A23;padding-bottom:20px}}
.top .lg{{width:300px}}
.g2{{display:grid;grid-template-columns:1fr 1fr;gap:28px 40px;margin-top:36px}}
.box{{background:#F7F7F4;border-radius:14px;padding:28px}}
.cs{{position:relative;margin:44px auto 48px;width:400px}}
.cs .z{{position:absolute;inset:-24px;border:2px dashed #B02A31;border-radius:4px}}
.cs .x{{position:absolute;top:-24px;left:-24px;width:24px;height:24px;background:rgba(176,42,49,.18);
  font:700 12px A;color:#B02A31;display:grid;place-items:center}}
.note{{font-size:13.5px;color:#4A5850;margin-top:14px}}
.min{{display:flex;gap:24px;align-items:flex-end;margin-top:28px;min-height:150px}} .min>div>div{{margin:0 auto 8px}}
.min div{{text-align:center;font-size:12.5px;color:#4A5850}}
.sws{{display:grid;grid-template-columns:1fr 1fr;gap:10px 18px}}
.sw{{display:grid;grid-template-columns:38px 1fr;column-gap:10px;font-size:12.5px;line-height:1.35}}
.sw i{{grid-row:span 3;width:38px;height:38px;border-radius:8px;border:1px solid #0002}}
.sw b{{font-size:13.5px}} .sw span{{color:#4A5850}}
.vars{{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}}
.vars div{{border-radius:10px;padding:16px;display:grid;place-items:center;height:96px;border:1px solid #0001}} .vars div svg{{max-height:64px;width:auto;max-width:100%}}
.vars p{{font-size:12px;color:#4A5850;margin-top:4px}}
.wrs{{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-top:4px}}
.wr .art{{height:120px;border-radius:10px;background:#F7F7F4;display:grid;place-items:center;padding:16px 20px;overflow:hidden}}
.wr .art svg,.wr .art>div{{width:100%}}
.wr p{{font-size:12.5px;color:#B02A31;font-weight:700;margin-top:6px}}
.dk{{background:#163728;padding:10px;border-radius:6px}}
.busy{{padding:10px;border-radius:6px;background:repeating-linear-gradient(45deg,#F2C230 0 10px,#2453A6 10px 20px,#fff 20px 30px)}}
.foot{{margin-top:28px;font-size:12.5px;color:#4A5850;border-top:1px solid #0002;padding-top:12px;display:flex;justify-content:space-between}}
code{{font:12px ui-monospace,Consolas,monospace;background:#F1F1EC;padding:1px 5px;border-radius:4px}}
</style></head><body>
<div class="top"><div><h1>Panduan Logo Selaras</h1>
<p class="lead">Huruf S dari tiga goresan kapur yang bertumpuk seperti tiga baris materi. Satu materi dari guru,
tersusun rapi, dan bisa diikuti setiap siswa.</p></div><div class="lg">{H}</div></div>

<div class="g2">
 <div class="box"><h2>Ruang kosong minimal</h2>
  <div class="cs"><div class="z"></div><div class="x">x</div>{H}</div>
  <p class="note"><b>x = tebal satu goresan</b> (≈ ¼ tinggi simbol). Sisakan minimal x di keempat sisi logo. Jangan
  taruh teks, tepi layar, atau gambar lain di dalam area ini.</p></div>
 <div class="box"><h2>Ukuran minimum</h2>
  <div class="min">
   <div><div style="width:120px">{H}</div>120 px / 30 mm<br>horizontal</div>
   <div><div style="width:64px">{V}</div>64 px / 16 mm<br>vertikal</div>
   <div><div style="width:48px">{SYM}</div>48 px<br>simbol bercelah</div>
   <div><div style="width:24px">{SMALL}</div>24 px<br>potongan kecil</div>
   <div><div style="width:16px">{FAV}</div>16 px<br>favicon</div>
  </div>
  <p class="note">Di bawah 48 px, pakai <b>potongan kecil</b> (S utuh tanpa celah, satu warna) karena celahnya akan
  menutup. Favicon memakai ubin hijau supaya tetap terlihat di tab terang maupun gelap.</p></div>
</div>

<div class="g2">
 <div class="box"><h2>Warna</h2><div class="sws">{sw}</div>
  <p class="note">Kontras diukur terhadap putih; tanda * berarti terhadap papan gelap #163728. Semua elemen grafis ≥ 3:1
  dan wordmark ≥ 4,5:1. Warna goresan hanya hiasan, sebab bentuk S sudah terbaca tanpa warna, jadi aman untuk
  buta warna.</p></div>
 <div class="box"><h2>Varian yang boleh dipakai</h2>
  <div class="vars">
   <div style="background:#fff">{H}</div><div style="background:#163728">{HG}</div><div style="background:#fff">{HH}</div>
  </div>
  <div class="vars" style="margin-top:4px"><p>Warna penuh — latar putih/terang</p><p>Gelap — latar papan #163728</p><p>Satu warna hijau</p></div>
  <div class="vars" style="margin-top:8px">
   <div style="background:#fff">{HB}</div><div style="background:#1E2A23">{HW}</div><div style="background:#fff">{V}</div>
  </div>
  <div class="vars" style="margin-top:4px"><p>Hitam — cetak/fotokopi</p><p>Putih — latar gelap/foto</p><p>Lockup vertikal</p></div>
  <p class="note">Wordmark: <b>Plus Jakarta Sans ExtraBold</b> (sudah diubah jadi path). Tagline dan teks pendamping:
  <b>Atkinson Hyperlegible</b>.</p></div>
</div>

<div class="box" style="margin-top:36px"><h2>Pemakaian yang salah</h2><div class="wrs">{wr}</div></div>

<div class="foot"><span>File: <code>brand/logo/</code> → simbol · horizontal · vertikal · wordmark · web · og · presentasi</span>
<span>Selaras · Hackathon Joints UGM</span></div>
</body></html>"""
open(f"{ROOT}/panduan-logo.html", "w", encoding="utf-8").write(html)
print("ok")
