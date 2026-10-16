/** Diagram pelajaran dalam bahasa visual kapur: cahaya matahari → daun → makanan (fotosintesis). */
export function ChalkLesson() {
  return (
    <figure className="chalk-lesson">
      <svg viewBox="0 0 540 200" role="img" aria-label="Cahaya matahari sampai ke daun tanaman, lalu daun membuat makanan melalui fotosintesis.">
        <g fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          {/* Matahari */}
          <g className="chalk-sun">
            <circle cx="70" cy="64" r="25" />
            <path d="M70 27v-12M70 101v12M33 64H21M107 64h12M44 38l-8-8M96 90l8 8M96 38l8-8M44 90l-8 8" />
          </g>

          {/* Cahaya menuju daun */}
          <g className="chalk-sun">
            <path strokeDasharray="7 8" d="M124 76 220 104M120 100l94 24" />
            <path d="m220 104-12-10m12 10-15 4M214 124l-12-9m12 9-15 5" />
          </g>

          {/* Tanaman dalam pot */}
          <path d="M244 158h76M248 158l7 34h54l7-34" />
          <path d="M282 158c0-22-1-46 0-72" />
          <path d="M281 128c-16-20-36-26-54-22 8 18 30 28 54 22Z" />
          <path d="M281 128c-16-8-32-14-48-19" opacity=".6" />
          <path d="M282 108c14-20 34-28 56-24-8 18-30 28-56 24Z" />
          <path d="M282 108c16-9 32-16 50-21" opacity=".6" />
          <path d="M282 86c-10-10-9-22 2-30 9 9 8 21-2 30Z" />

          {/* Hasil: makanan */}
          <path strokeDasharray="7 8" d="M352 118h46" />
          <path d="m388 108 11 10-11 10" />
        </g>
        <g fill="currentColor" fontFamily="inherit" fontSize="19">
          <text x="70" y="140" textAnchor="middle">Matahari</text>
          <text className="chalk-sun" x="150" y="76" fontSize="15" transform="rotate(16 150 76)">
            cahaya
          </text>
          <text x="408" y="112">Daun membuat</text>
          <text x="408" y="136">makanan.</text>
        </g>
      </svg>
      <figcaption>Pelajaran kecil. Banyak cara memahaminya.</figcaption>
    </figure>
  );
}
