/* Ilustrasi dekoratif untuk hero (SVG inline). Semuanya aria-hidden. */

type P = { className?: string };

export function Girl({ className }: P) {
  return (
    <svg viewBox="0 0 120 72" className={className} aria-hidden>
      <circle cx="60" cy="62" r="57" fill="#f6b445" />
      <circle cx="33" cy="42" r="10" fill="#3b2a22" />
      <circle cx="87" cy="42" r="10" fill="#3b2a22" />
      <ellipse cx="60" cy="48" rx="23" ry="24" fill="#f2c4a0" />
      <path d="M36 48C32 12 88 12 84 48C77 31 43 31 36 48z" fill="#3b2a22" />
      <circle cx="51" cy="51" r="2.6" fill="#3b2a22" />
      <circle cx="69" cy="51" r="2.6" fill="#3b2a22" />
      <circle cx="45" cy="59" r="4.5" fill="#f09a86" opacity=".55" />
      <circle cx="75" cy="59" r="4.5" fill="#f09a86" opacity=".55" />
      <path
        d="M53 61c3 4.5 11 4.5 14 0"
        stroke="#3b2a22"
        strokeWidth="2.2"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Boy({ className }: P) {
  return (
    <svg viewBox="0 0 80 112" className={className} aria-hidden>
      {/* badan & kemeja */}
      <path d="M4 112C4 86 22 76 42 76s38 10 38 36z" fill="#2b5797" />
      <path d="M30 76l12 15 12-15z" fill="#fff" />
      <rect x="36" y="64" width="12" height="14" rx="5" fill="#d9a077" />
      {/* kepala */}
      <circle cx="17" cy="46" r="6" fill="#dca37a" />
      <circle cx="67" cy="46" r="6" fill="#dca37a" />
      <circle cx="42" cy="44" r="26" fill="#e8b48c" />
      <path
        d="M16 42C12 8 74 6 68 42c-4-10-12-16-26-16S20 32 16 42z"
        fill="#2b1d15"
      />
      <path
        d="M30 36c3-2 6-2 9 0M45 36c3-2 6-2 9 0"
        stroke="#2b1d15"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
      <circle cx="34" cy="45" r="3" fill="#2b1d15" />
      <circle cx="52" cy="45" r="3" fill="#2b1d15" />
      <circle cx="28" cy="53" r="4.5" fill="#f09a86" opacity=".5" />
      <circle cx="58" cy="53" r="4.5" fill="#f09a86" opacity=".5" />
      <path d="M33 54q9 14 18 0z" fill="#8a3b30" />
      <path d="M36 54h12v3H36z" fill="#fff" />
    </svg>
  );
}

export function Plane({ className }: P) {
  return (
    <svg viewBox="0 0 120 90" className={className} aria-hidden>
      <path
        d="M2 82C20 74 30 56 52 56"
        stroke="#f2a93b"
        strokeWidth="2.5"
        fill="none"
        strokeDasharray="2 7"
        strokeLinecap="round"
      />
      <path d="M30 40L116 6 62 62z" fill="#f9c04c" />
      <path d="M116 6L62 62 60 84 50 58z" fill="#ee8f33" />
      <path d="M62 62L60 84 50 58z" fill="#d7761f" />
      <path d="M30 40L116 6 50 58z" fill="#fbd57a" />
    </svg>
  );
}

export function Sparkle({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        d="M12 0c1 7 5 11 12 12-7 1-11 5-12 12-1-7-5-11-12-12 7-1 11-5 12-12z"
        fill="currentColor"
      />
    </svg>
  );
}

export function Book({ className }: P) {
  return (
    <svg viewBox="0 0 120 84" className={className} aria-hidden>
      <path d="M2 26v50c22-6 42-4 58 6 16-10 36-12 58-6V26z" fill="#2d6a4f" />
      <path d="M8 14c20-4 38-2 52 8v52C46 64 28 62 8 66z" fill="#fffdf5" />
      <path d="M112 14c-20-4-38-2-52 8v52c14-10 32-12 52-8z" fill="#f1eedd" />
      <g stroke="#b9d6bf" strokeWidth="2.5" strokeLinecap="round">
        <path d="M18 28c10-2 20-1 30 3M18 38c10-2 20-1 30 3M18 48c10-2 20-1 30 3" />
        <path d="M102 28c-10-2-20-1-30 3M102 38c-10-2-20-1-30 3" />
      </g>
      <path d="M86 12h10v22l-5-4-5 4z" fill="#ee6f57" />
    </svg>
  );
}

export function Magnifier({ className }: P) {
  return (
    <svg viewBox="0 0 90 90" className={className} aria-hidden>
      <path
        d="M58 58l24 24"
        stroke="#ee8f33"
        strokeWidth="10"
        strokeLinecap="round"
      />
      <circle
        cx="37"
        cy="37"
        r="26"
        fill="#dce6f4"
        fillOpacity=".6"
        stroke="#2d6a4f"
        strokeWidth="7"
      />
      <path
        d="M22 34c2-8 8-12 15-12"
        stroke="#fff"
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Paperclip({ className }: P) {
  return (
    <svg viewBox="0 0 24 44" className={className} aria-hidden>
      <path
        d="M18 10v24a8 8 0 0 1-16 0V12a5.5 5.5 0 0 1 11 0v21a2.5 2.5 0 0 1-5 0V14"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Triangle({ className }: P) {
  return (
    <svg viewBox="0 0 40 36" className={className} aria-hidden>
      <path
        d="M20 4L37 32H3z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Ring({ className }: P) {
  return (
    <svg viewBox="0 0 30 30" className={className} aria-hidden>
      <circle
        cx="15"
        cy="15"
        r="11"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
      />
    </svg>
  );
}

export function Grass({ className }: P) {
  return (
    <svg
      viewBox="0 0 400 40"
      preserveAspectRatio="none"
      className={className}
      aria-hidden
    >
      <path
        d="M0 22C40 8 80 8 120 20s80 14 120 2 80-14 120-2l40 8v12H0z"
        fill="#cfe8c4"
        opacity=".75"
      />
    </svg>
  );
}
