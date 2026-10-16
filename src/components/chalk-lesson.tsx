/** Diagram pelajaran dalam bahasa visual kapur: matahari → daun → makanan (fotosintesis). */
export function ChalkLesson() {
  return (
    <figure className="chalk-lesson">
      <svg viewBox="0 0 530 200" role="img" aria-label="Cahaya matahari sampai ke daun, lalu daun membuat makanan melalui fotosintesis.">
        <g fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          {/* Matahari */}
          <g className="chalk-sun">
            <circle cx="62" cy="66" r="24" />
            <path d="M62 24v-12M62 108v12M20 66H8M104 66h12M32 36l-8-8M92 96l8 8M92 36l8-8M32 96l-8 8" />
          </g>

          {/* Cahaya menuju daun */}
          <g className="chalk-sun" strokeDasharray="6 9">
            <path d="M118 52c34-4 62 4 86 22" />
            <path d="M120 82c28 2 52 10 72 26" />
          </g>
          <g className="chalk-sun">
            <path d="m192 64 13 11-17 3" />
            <path d="m180 99 13 10-17 2" />
          </g>

          {/* Tanaman */}
          <path d="M214 184h116" />
          <path d="M226 184c6-10 14-14 22-14M318 184c-6-10-14-14-22-14" opacity=".7" />
          <path d="M272 184c0-30-2-56 2-92" />
          {/* daun kiri */}
          <path d="M271 140c-22 0-42-10-52-30 24-6 44 4 52 30Z" />
          <path d="M271 140c-14-8-28-18-44-28" opacity=".75" />
          {/* daun kanan */}
          <path d="M273 118c22-2 40-14 46-36-24-2-42 12-46 36Z" />
          <path d="M273 118c12-10 24-22 38-31" opacity=".75" />
          {/* tunas */}
          <path d="M274 92c-8-8-10-18-4-26 8 6 10 16 4 26Z" />

          {/* Hasil: makanan */}
          <path strokeDasharray="6 9" d="M334 112c20 0 36 0 52 0" />
          <path d="m376 102 12 10-12 10" />
        </g>
        <g fill="currentColor" fontFamily="inherit" fontSize="19">
          <text x="62" y="154" textAnchor="middle">Matahari</text>
          <text x="398" y="106">Daun membuat</text>
          <text x="398" y="130">makanan.</text>
        </g>
      </svg>
      <figcaption>Pelajaran kecil. Banyak cara memahaminya.</figcaption>
    </figure>
  );
}
