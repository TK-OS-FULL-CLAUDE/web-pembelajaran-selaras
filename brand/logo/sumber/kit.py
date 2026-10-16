"""Selaras logo kit — concept A 'Tiga Baris', final geometry, variants, lockups, OG and slides."""
import math, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from wm import outline

ROOT = "C:/Users/ASUS/web-pembelajaran-selaras/brand/logo"
for d in ("simbol", "horizontal", "vertikal", "wordmark", "og", "presentasi"):
    os.makedirs(f"{ROOT}/{d}", exist_ok=True)

# ---- palette -------------------------------------------------------------
HIJAU, BIRU, MERAH, COKLAT = "#1F6E35", "#2453A6", "#B02A31", "#875225"
TINTA, KAPUR, KUNING, TAN = "#1E2A23", "#F7F3E8", "#F2C230", "#D8BF94"
GELAP = "#163728"          # papan-800, latar hijau gelap
SCHEMES = {                # (top, middle, bottom strokes), wordmark
    "warna": ((BIRU, HIJAU, COKLAT), TINTA),
    "hitam": (("#000000",) * 3, "#000000"),
    "putih": (("#FFFFFF",) * 3, "#FFFFFF"),
    "hijau": ((HIJAU,) * 3, HIJAU),
    "gelap": ((KUNING, KAPUR, TAN), KAPUR),
}
REVERSED = {"putih", "gelap", "ikon", "kapur"}
ALL = {**SCHEMES, "ikon": ((KUNING, KAPUR, TAN), KAPUR), "kapur": ((KAPUR,) * 3, KAPUR)}   # light-on-dark: use the slightly thinner drawing


def f(v):
    return ("%.2f" % v).rstrip("0").rstrip(".")


# ---- geometry --------------------------------------------------------------
# Three bars of height t separated by gaps g on a 256 grid; the bends are half-rings whose outer edge is an
# ellipse widened by e, so the vertical parts of the bends read as heavy as the horizontal bars (optical fix).
# The S is cut horizontally (gap s) at the apex of each bend -> three stacked strokes ("tiga baris").
def strokes(t=44, g=28, s=8, e=3):
    top = 128 - (3 * t + 2 * g) / 2
    R, r, cap = (2 * t + g) / 2, g / 2, t / 2
    Rx = R + e
    y1, y2, y3 = top, top + t + g, top + 2 * (t + g)
    lx, rx = top + R, 256 - top - R
    cyl, cyr = y1 + R, y2 + R
    right, left = 256 - top, top
    h = s / 2
    oi = math.sqrt(r * r - h * h)
    oo = Rx * math.sqrt(1 - (h / R) ** 2)
    P = lambda x, y: f"{f(x)} {f(y)}"
    A = lambda a, b, sw, x, y: f"A{f(a)} {f(b)} 0 0 {sw} {P(x, y)}"
    if s == 0:   # small-size cut: one solid S, no slits
        return [f"M{P(lx, y1)}H{f(right - cap)}{A(cap, cap, 1, right - cap, y1 + t)}H{f(lx)}"
                f"{A(r, r, 0, lx, y2)}H{f(rx)}{A(Rx, R, 1, rx, y3 + t)}H{f(left + cap)}"
                f"{A(cap, cap, 1, left + cap, y3)}H{f(rx)}{A(r, r, 0, rx, y2 + t)}H{f(lx)}"
                f"{A(Rx, R, 1, lx, y1)}Z"]
    return [
        f"M{P(lx, y1)}H{f(right - cap)}{A(cap, cap, 1, right - cap, y1 + t)}H{f(lx)}"
        f"{A(r, r, 0, lx - oi, cyl - h)}H{f(lx - oo)}{A(Rx, R, 1, lx, y1)}Z",
        f"M{P(lx - oo, cyl + h)}{A(Rx, R, 0, lx, y2 + t)}H{f(rx)}{A(r, r, 1, rx + oi, cyr - h)}"
        f"H{f(rx + oo)}{A(Rx, R, 0, rx, y2)}H{f(lx)}{A(r, r, 1, lx - oi, cyl + h)}Z",
        f"M{P(rx + oi, cyr + h)}H{f(rx + oo)}{A(Rx, R, 1, rx, y3 + t)}H{f(left + cap)}"
        f"{A(cap, cap, 1, left + cap, y3)}H{f(rx)}{A(r, r, 0, rx + oi, cyr + h)}Z",
    ]


BOX = (31, 34, 194, 188)          # symbol bbox x, y, w, h on the 256 grid


def mark(scheme, small=False):
    cols, _ = ALL[scheme]
    if small:
        cols = (cols[1],)
        ds = strokes(t=42, g=31, s=0) if scheme in REVERSED else strokes(s=0)
    else:
        ds = strokes(t=42, g=31) if scheme in REVERSED else strokes()
    # identical colours -> one path, so there is no seam and the file stays small
    if len(set(cols)) == 1:
        return f'<path fill="{cols[0]}" d="{"".join(ds)}"/>'
    return "".join(f'<path fill="{c}" d="{d}"/>' for c, d in zip(cols, ds))


def svg(body, w, h, title, vb=None, bg=None):
    vb = vb or f"0 0 {f(w)} {f(h)}"
    rect = f'<rect width="100%" height="100%" fill="{bg}"/>' if bg else ""
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" width="{f(w)}" height="{f(h)}" '
            f'role="img" aria-labelledby="title"><title id="title">{title}</title>{rect}{body}</svg>\n')


WORD = dict(font="jakarta", wght=800, tracking=-0.02)


def word(cap, x, baseline, color, text="Selaras", **kw):
    o = {**WORD, **kw}
    d, w, lsb = outline(text, o["font"], o["wght"], cap=cap, tracking=o["tracking"])
    return f'<path fill="{color}" transform="translate({f(x - lsb)} {f(baseline)})" d="{d}"/>', w


def place_mark(scheme, x, y, height, small=False):
    """Draw the symbol so its bbox top-left lands at (x, y) with bbox height `height`."""
    k = height / BOX[3]
    return (f'<g transform="translate({f(x - BOX[0] * k)} {f(y - BOX[1] * k)}) scale({f(k)})">'
            f'{mark(scheme, small)}</g>'), BOX[2] * k


# Lockup proportions (in symbol-bbox units: symbol height = 188)
H_CAP, H_GAP = 104, 44             # horizontal: cap height, gap = one bar height
V_CAP, V_GAP = 80, 40              # vertical


def horizontal(scheme, H=188):
    k = H / 188
    m, mw = place_mark(scheme, 0, 0, H)
    wd, ww = word(H_CAP * k, mw + H_GAP * k, H / 2 + H_CAP * k / 2, SCHEMES[scheme][1])
    return m + wd, math.ceil(mw + H_GAP * k + ww), H


def vertical(scheme, H=188):
    k = H / 188
    _, ww = word(V_CAP * k, 0, 0, "#000")
    _, mw = place_mark(scheme, 0, 0, H)
    W = max(ww, mw)
    m, _ = place_mark(scheme, (W - mw) / 2, 0, H)
    wd, _ = word(V_CAP * k, (W - ww) / 2, H + V_GAP * k + V_CAP * k, SCHEMES[scheme][1])
    return m + wd, math.ceil(W), math.ceil(H + (V_GAP + V_CAP) * k)


# ---- write logo files -------------------------------------------------------
for sc in SCHEMES:
    open(f"{ROOT}/simbol/selaras-simbol-{sc}.svg", "w").write(svg(mark(sc), 256, 256, "Selaras"))
    body, w, h = horizontal(sc)
    open(f"{ROOT}/horizontal/selaras-horizontal-{sc}.svg", "w").write(svg(body, w, h, "Selaras"))
    body, w, h = vertical(sc)
    open(f"{ROOT}/vertikal/selaras-vertikal-{sc}.svg", "w").write(svg(body, w, h, "Selaras"))
    wd, ww = word(104, 0, 104, SCHEMES[sc][1])
    open(f"{ROOT}/wordmark/selaras-wordmark-{sc}.svg", "w").write(svg(wd, math.ceil(ww), 104, "Selaras"))
for sc in ("warna", "hijau", "hitam", "putih"):
    open(f"{ROOT}/simbol/selaras-simbol-kecil-{sc}.svg", "w").write(
        svg(mark(sc, small=True), 256, 256, "Selaras"))

# ---- Open Graph 1200x630 ------------------------------------------------------
def tagline(cap, x, baseline, color, text):
    return word(cap, x, baseline, color, text, font="atkinson400", wght=None, tracking=0)


og = ""
lk, lw, lh = horizontal("warna", H=150)
x0 = (1200 - lw) / 2
og += f'<g transform="translate({f(x0)} 180)">{lk}</g>'
t1, w1 = tagline(30, 0, 0, TINTA, "Satu materi dari guru,")
t2, w2 = tagline(30, 0, 0, TINTA, "setiap siswa bisa mengikuti.")
og += f'<g transform="translate({f((1200 - w1) / 2)} 420)">{t1}</g>'
og += f'<g transform="translate({f((1200 - w2) / 2)} 470)">{t2}</g>'
# crayon band along the bottom edge
og += (f'<rect x="0" y="606" width="400" height="24" fill="{BIRU}"/>'
       f'<rect x="400" y="606" width="400" height="24" fill="{HIJAU}"/>'
       f'<rect x="800" y="606" width="400" height="24" fill="{COKLAT}"/>')
open(f"{ROOT}/og/selaras-og.svg", "w").write(svg(og, 1200, 630, "Selaras", bg="#FFFFFF"))

# ---- pitch deck / video plates 1920x1080 --------------------------------------
for bgname, bg, sc in (("putih", "#FFFFFF", "warna"), ("hijau-gelap", GELAP, "gelap")):
    lk, lw, lh = horizontal(sc, H=220)
    body = f'<g transform="translate({f((1920 - lw) / 2)} {f((1080 - lh) / 2)})">{lk}</g>'
    open(f"{ROOT}/presentasi/selaras-horizontal-latar-{bgname}.svg", "w").write(
        svg(body, 1920, 1080, "Selaras", bg=bg))
    lk, lw, lh = vertical(sc, H=300)
    body = f'<g transform="translate({f((1920 - lw) / 2)} {f((1080 - lh) / 2)})">{lk}</g>'
    open(f"{ROOT}/presentasi/selaras-vertikal-latar-{bgname}.svg", "w").write(
        svg(body, 1920, 1080, "Selaras", bg=bg))
    # end-card for the demo video: lockup + tagline
    lk, lw, lh = horizontal(sc, H=200)
    tc = TINTA if sc == "warna" else KAPUR
    t1, w1 = tagline(40, 0, 0, tc, "Satu materi dari guru, setiap siswa bisa mengikuti.")
    body = (f'<g transform="translate({f((1920 - lw) / 2)} 380)">{lk}</g>'
            f'<g transform="translate({f((1920 - w1) / 2)} 700)">{t1}</g>')
    open(f"{ROOT}/presentasi/selaras-penutup-latar-{bgname}.svg", "w").write(
        svg(body, 1920, 1080, "Selaras", bg=bg))


# ---- app / web icons -------------------------------------------------------------
os.makedirs(f"{ROOT}/web", exist_ok=True)


def tile(scheme, small, scale, rx=0, title="Selaras"):
    w = 256 * scale
    h = w * BOX[3] / BOX[2]
    m, _ = place_mark(scheme, (256 - w) / 2, (256 - h) / 2 - 3, h, small)
    return svg(f'<rect width="256" height="256" rx="{rx}" fill="{HIJAU}"/>' + m, 256, 256, title)


open(f"{ROOT}/web/favicon.svg", "w").write(tile("kapur", True, 0.68, rx=56))
open(f"{ROOT}/web/ikon-aplikasi.svg", "w").write(tile("ikon", False, 0.62))
open(f"{ROOT}/web/ikon-maskable.svg", "w").write(tile("ikon", False, 0.5))

# ---- contrast report -----------------------------------------------------------
def lum(hx):
    c = [int(hx[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    c = [v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4 for v in c]
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]


def cr(a, b):
    la, lb = sorted((lum(a), lum(b)), reverse=True)
    return (la + 0.05) / (lb + 0.05)


for name, c in (("biru", BIRU), ("hijau", HIJAU), ("coklat", COKLAT), ("tinta", TINTA)):
    print(f"{name:6} on white {cr(c, '#FFFFFF'):.2f}")
for name, c in (("kuning", KUNING), ("kapur", KAPUR), ("tan", TAN)):
    print(f"{name:6} on gelap {cr(c, GELAP):.2f}")
for name, c in (("kuning", KUNING), ("kapur", KAPUR), ("tan", TAN)):
    print(f"{name:6} on hijau {cr(c, HIJAU):.2f}")
print(f"putih  on hijau {cr('#FFFFFF', HIJAU):.2f}")
print("ok")
