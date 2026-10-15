// Diagram untuk materi demo, digambar sendiri oleh tim (SVG). Disimpan ke tabel lesson_images saat seed
// dengan ID tetap, jadi materi demo langsung menampilkan gambar + deskripsi yang sudah dicek guru.

import type { LessonFigure } from "./types";

export const DEMO_FIG_FOTOSINTESIS = "0a7e5e1a-5e1a-4a5a-9f00-000000000001";
export const DEMO_FIG_TUMBUHAN = "0a7e5e1a-5e1a-4a5a-9f00-000000000002";

const FONT = `font-family="Arial, Helvetica, sans-serif"`;

const FOTOSINTESIS_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 680 440" width="680" height="440">
<defs>
<marker id="pa" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="#b45309"/></marker>
<marker id="pb" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="#475569"/></marker>
<marker id="pc" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="#1d4ed8"/></marker>
<marker id="pd" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="#0f766e"/></marker>
<marker id="pe" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="#be123c"/></marker>
</defs>
<rect width="680" height="440" rx="24" fill="#f8fafc"/>
<text x="32" y="44" ${FONT} font-size="22" font-weight="700" fill="#0f172a">Fotosintesis pada daun</text>
<g transform="translate(96 112)">
<g stroke="#f59e0b" stroke-width="5" stroke-linecap="round">
<path d="M0 -58V-46M0 46V58M-58 0H-46M46 0H58M-41 -41L-33 -33M33 33L41 41M-41 41L-33 33M33 -33L41 -41"/>
</g>
<circle r="34" fill="#fbbf24" stroke="#f59e0b" stroke-width="4"/>
</g>
<path d="M150 150 C 210 170, 250 190, 286 210" fill="none" stroke="#b45309" stroke-width="5" stroke-linecap="round" stroke-dasharray="2 10" marker-end="url(#pa)"/>
<text x="168" y="138" ${FONT} font-size="17" font-weight="700" fill="#b45309">Cahaya matahari</text>
<g transform="translate(360 250) rotate(-24)">
<path d="M-120 0 C -70 -78, 60 -86, 118 0 C 60 86, -70 78, -120 0 Z" fill="#22c55e" stroke="#15803d" stroke-width="4"/>
<path d="M-140 0 H112" stroke="#15803d" stroke-width="5" stroke-linecap="round"/>
<path d="M-60 0 L-24 -40 M-60 0 L-24 40 M0 0 L34 -38 M0 0 L34 38 M56 0 L82 -26 M56 0 L82 26" stroke="#15803d" stroke-width="3.5" stroke-linecap="round" fill="none"/>
</g>
<text x="318" y="262" ${FONT} font-size="16" font-weight="700" fill="#ffffff">DAUN</text>
<path d="M40 300 H210" fill="none" stroke="#475569" stroke-width="5" stroke-linecap="round" marker-end="url(#pb)"/>
<text x="36" y="282" ${FONT} font-size="17" font-weight="700" fill="#334155">Karbon dioksida</text>
<text x="36" y="326" ${FONT} font-size="15" fill="#475569">dari udara, lewat stomata</text>
<path d="M280 420 C 284 390, 290 360, 300 330" fill="none" stroke="#1d4ed8" stroke-width="5" stroke-linecap="round" marker-end="url(#pc)"/>
<text x="120" y="398" ${FONT} font-size="17" font-weight="700" fill="#1d4ed8">Air</text>
<text x="120" y="420" ${FONT} font-size="15" fill="#1d4ed8">dari akar, lewat batang</text>
<path d="M470 190 C 510 160, 548 140, 590 128" fill="none" stroke="#0f766e" stroke-width="5" stroke-linecap="round" marker-end="url(#pd)"/>
<text x="520" y="104" ${FONT} font-size="17" font-weight="700" fill="#0f766e">Oksigen</text>
<text x="520" y="124" ${FONT} font-size="15" fill="#0f766e">ke udara</text>
<path d="M470 300 C 510 320, 548 336, 590 344" fill="none" stroke="#be123c" stroke-width="5" stroke-linecap="round" marker-end="url(#pe)"/>
<text x="520" y="376" ${FONT} font-size="17" font-weight="700" fill="#be123c">Gula</text>
<text x="520" y="396" ${FONT} font-size="15" fill="#be123c">makanan tumbuhan</text>
</svg>`;

const TUMBUHAN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 560" width="600" height="560">
<rect width="600" height="560" rx="24" fill="#f8fafc"/>
<text x="32" y="44" ${FONT} font-size="22" font-weight="700" fill="#0f172a">Bagian-bagian tumbuhan</text>
<rect x="24" y="400" width="552" height="136" rx="18" fill="#f5e6d3"/>
<path d="M24 400 H576" stroke="#a16207" stroke-width="4"/>
<g stroke="#92400e" stroke-width="5" stroke-linecap="round" fill="none">
<path d="M300 400 V470 M300 430 C 280 450, 262 470, 240 500 M300 440 C 322 462, 342 480, 366 506 M300 470 C 292 490, 288 506, 286 520 M262 470 L238 478 M340 476 L362 470"/>
</g>
<path d="M300 400 V150" stroke="#15803d" stroke-width="12" stroke-linecap="round"/>
<path d="M300 300 C 260 280, 210 286, 176 312 C 214 330, 262 330, 300 300 Z" fill="#22c55e" stroke="#15803d" stroke-width="4"/>
<path d="M300 250 C 340 226, 394 232, 428 258 C 390 278, 338 278, 300 250 Z" fill="#22c55e" stroke="#15803d" stroke-width="4"/>
<path d="M300 210 C 330 200, 352 190, 370 176" stroke="#15803d" stroke-width="7" stroke-linecap="round" fill="none"/>
<circle cx="378" cy="186" r="20" fill="#ef4444" stroke="#b91c1c" stroke-width="4"/>
<path d="M378 166 L372 156" stroke="#15803d" stroke-width="4" stroke-linecap="round"/>
<g transform="translate(300 128)">
<g fill="#f472b6" stroke="#db2777" stroke-width="3">
<ellipse cx="0" cy="-26" rx="15" ry="24"/><ellipse cx="0" cy="26" rx="15" ry="24"/>
<ellipse cx="-26" cy="0" rx="24" ry="15"/><ellipse cx="26" cy="0" rx="24" ry="15"/>
</g>
<circle r="15" fill="#facc15" stroke="#ca8a04" stroke-width="3"/>
</g>
<g ${FONT} font-size="20" font-weight="700" fill="#0f172a">
<path d="M330 120 H452" stroke="#64748b" stroke-width="2.5"/><text x="460" y="127">Bunga</text>
<path d="M400 186 H452" stroke="#64748b" stroke-width="2.5"/><text x="460" y="193">Buah</text>
<path d="M410 254 H452" stroke="#64748b" stroke-width="2.5"/><text x="460" y="261">Daun</text>
<path d="M190 312 H120" stroke="#64748b" stroke-width="2.5"/><text x="50" y="319">Daun</text>
<path d="M294 360 H120" stroke="#64748b" stroke-width="2.5"/><text x="40" y="367">Batang</text>
<path d="M360 494 H452" stroke="#64748b" stroke-width="2.5"/><text x="460" y="501">Akar</text>
</g>
<text x="40" y="430" ${FONT} font-size="15" fill="#78350f">tanah</text>
</svg>`;

export const DEMO_IMAGES: { id: string; svg: string; figure: LessonFigure }[] = [
  {
    id: DEMO_FIG_FOTOSINTESIS,
    svg: FOTOSINTESIS_SVG,
    figure: {
      alt: "Diagram sebuah daun hijau. Panah dari matahari menunjukkan cahaya matahari masuk ke daun. Dari kiri, karbon dioksida dari udara masuk lewat stomata; dari bawah, air dari akar naik lewat batang. Dari daun keluar dua panah: oksigen ke udara dan gula sebagai makanan tumbuhan.",
      altOrigin: "guru",
      altChecked: true,
      width: 680,
      height: 440,
    },
  },
  {
    id: DEMO_FIG_TUMBUHAN,
    svg: TUMBUHAN_SVG,
    figure: {
      alt: "Gambar tumbuhan berbunga dengan label. Dari atas ke bawah: bunga merah muda di ujung batang, buah merah di cabang samping, dua daun di kiri dan kanan batang, batang hijau tegak di tengah, dan akar bercabang di dalam tanah.",
      altOrigin: "guru",
      altChecked: true,
      width: 600,
      height: 560,
    },
  },
];
