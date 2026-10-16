"""Outline a word from a font file into SVG path data (y-down)."""
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen

NM = "C:/Users/ASUS/web-pembelajaran-selaras/node_modules/"
FONTS = {
    "jakarta": NM + "@fontsource-variable/plus-jakarta-sans/files/plus-jakarta-sans-latin-wght-normal.woff2",
    "atkinson400": NM + "@fontsource/atkinson-hyperlegible/files/atkinson-hyperlegible-latin-400-normal.woff2",
    "atkinson": NM + "@fontsource/atkinson-hyperlegible/files/atkinson-hyperlegible-latin-700-normal.woff2",
}
_cache = {}


def load(name, wght=None):
    key = (name, wght)
    if key in _cache:
        return _cache[key]
    f = TTFont(FONTS[name])
    if "fvar" in f and wght:
        from fontTools.varLib.instancer import instantiateVariableFont
        f = instantiateVariableFont(f, {"wght": wght})
    _cache[key] = f
    return f


def outline(text, font="jakarta", wght=800, cap=100, tracking=0.0, x0=0, baseline=0):
    """Return (d, width, cap_height_units) with cap height scaled to `cap` px."""
    f = load(font, wght)
    gs = f.getGlyphSet()
    cmap = f.getBestCmap()
    capH = getattr(f["OS/2"], "sCapHeight", 0) or f["head"].unitsPerEm * 0.7
    s = cap / capH
    upm = f["head"].unitsPerEm
    pen = SVGPathPen(gs, ntos=lambda v: ("%.1f" % v).rstrip("0").rstrip("."))
    x = 0.0
    names = [cmap[ord(c)] for c in text]
    for i, g in enumerate(names):
        tp = TransformPen(pen, (s, 0, 0, -s, x0 + x * s, baseline))
        gs[g].draw(tp)
        x += gs[g].width
        if i < len(names) - 1:
            x += tracking * upm
    # trim right side bearing of last glyph using real bounds
    bp = BoundsPen(gs)
    gs[names[-1]].draw(bp)
    last_rsb = gs[names[-1]].width - bp.bounds[2]
    bp0 = BoundsPen(gs)
    gs[names[0]].draw(bp0)
    first_lsb = bp0.bounds[0]
    width = (x - last_rsb) * s
    return pen.getCommands(), width, first_lsb * s
