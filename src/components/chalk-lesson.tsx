/** Diagram pelajaran dalam bahasa visual kapur. */
export function ChalkLesson() {
  return (
    <figure className="chalk-lesson">
      <svg viewBox="0 0 480 170" role="img" aria-label="Cahaya matahari membantu daun membuat makanan melalui fotosintesis.">
        <g fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <g className="chalk-sun">
            <circle cx="64" cy="55" r="23" />
            <path d="M64 18v-9M64 92v9M27 55h-9M101 55h9M38 29l-7-7M90 81l7 7M90 29l7-7M38 81l-7 7" />
          </g>
          <path strokeDasharray="5 8" d="M120 56c39-16 63-12 93 11" />
          <path d="m202 51 12 17-21 1M254 142c-2-40 2-76 21-106M260 94c-40 0-63-17-63-47 34-2 59 10 63 47Zm4-21c38-2 63-25 61-54-34 0-59 17-61 54ZM200 50l53 38M318 25l-48 43M232 143h45" />
          <path strokeDasharray="5 8" d="M331 88c26 5 43 2 61-11" />
          <path d="m377 75 17 1-4 16" />
        </g>
        <g fill="currentColor" fontFamily="inherit" fontSize="17">
          <text x="18" y="133">Matahari</text>
          <text x="324" y="127">Daun membuat</text>
          <text x="324" y="150">makanan.</text>
        </g>
      </svg>
      <figcaption>Pelajaran kecil. Banyak cara memahaminya.</figcaption>
    </figure>
  );
}
