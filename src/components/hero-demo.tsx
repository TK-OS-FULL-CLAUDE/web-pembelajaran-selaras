"use client";

import Link from "next/link";
import { AlignLeft, ArrowRight, Contrast, Languages, Maximize, Pause, Volume2, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { DEMO_SHARE_CODE, HERO_SAMPLE } from "@/lib/demo-content";
import { ReaderText, useReaderStructure } from "./reader-text";
import { useSpeech } from "./use-speech";
import { cx } from "./ui";

const GLOSSARY = [{ kata: "klorofil", arti: "Zat hijau di daun yang menangkap cahaya matahari." }];
type Versi = keyof typeof HERO_SAMPLE;
const VERSIONS: { key: Versi; label: string; icon?: LucideIcon }[] = [
  { key: "asli", label: "Teks asli" },
  { key: "mudah", label: "Teks mudah", icon: AlignLeft },
  { key: "jawa", label: "Basa Jawa", icon: Languages },
];

/** Lembar materi sungguhan: semua pengaturan tetap langsung dapat dicoba. */
export function HeroDemo() {
  const [versi, setVersi] = useState<Versi>("asli");
  const [besar, setBesar] = useState(false);
  const [kontras, setKontras] = useState(false);
  const [spasi, setSpasi] = useState(false);
  const [term, setTerm] = useState<string | null>(null);
  const speech = useSpeech();
  const text = HERO_SAMPLE[versi];
  const { sentences } = useReaderStructure(text);
  const toggles = [
    { label: "Huruf besar", on: besar, set: setBesar, icon: null },
    { label: "Kontras tinggi", on: kontras, set: setKontras, icon: Contrast },
    { label: "Spasi lega", on: spasi, set: setSpasi, icon: Maximize },
  ];

  return (
    <div className="lesson-board-frame">
    <div className="lesson-notebook" data-ui>
      <div className="notebook-heading">
        <span>Hari ini, kita belajar...</span>
        <span>IPAS · Kelas 4</span>
      </div>
        <svg className="classroom-plane" viewBox="0 0 320 110" fill="none" aria-hidden="true">
          <path d="M8 88C60 109 125 77 103 54C80 31 53 69 92 83C136 99 199 50 251 34" stroke="currentColor" strokeWidth="2" strokeDasharray="6 8" strokeLinecap="round" />
          <path d="m249 22 60-15-23 47-12-20-25-12Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          <path d="m274 34 35-27-44 22m9 5-9 13V29" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        </svg>
      <div className="notebook-tabs" role="group" aria-label="Versi teks">
        {VERSIONS.map((v) => (
          <button key={v.key} type="button" aria-pressed={versi === v.key}
            onClick={() => { speech.stop(); setTerm(null); setVersi(v.key); }}>
            {v.label}
          </button>
        ))}
      </div>
      <div className="notebook-page reader" data-besar={besar} data-kontras={kontras} data-spasi={spasi} lang={versi === "jawa" ? "jv" : "id"}>
        <h2>Bagaimana daun membuat makanan?</h2>
        <div key={versi} className="lesson-text-change">
          <ReaderText text={text} glossary={GLOSSARY} activeSentence={speech.current}
            onTerm={(g) => setTerm(term === g.kata ? null : g.kata)} />
        </div>
        {term && (
          <p className="mt-3 bg-[var(--reader-mark)] px-3 py-2 text-tinta" role="status">
            <strong>{term}</strong>: {GLOSSARY.find((g) => g.kata === term)?.arti}
          </p>
        )}
        <p className="notebook-hint">Ketuk kata bergaris untuk melihat artinya.</p>
      </div>
      <div className="notebook-tools" role="group" aria-label="Tampilan">
        {toggles.map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.label} type="button" aria-pressed={t.on} onClick={() => t.set(!t.on)}>
              {Icon ? <Icon size={17} aria-hidden /> : <span aria-hidden className="font-bold">Aa</span>}
              {t.label}
            </button>
          );
        })}
        <button type="button" aria-pressed={speech.speaking} disabled={!speech.supported}
          onClick={() => speech.speaking ? speech.stop() : speech.speak(sentences, { lang: versi === "jawa" ? "jv-ID" : "id-ID" })}
          className={cx(speech.speaking && "is-speaking")}>
          {speech.speaking ? <Pause size={17} aria-hidden /> : <Volume2 size={17} aria-hidden />}
          Dibacakan
        </button>
      </div>
      <div className="notebook-caption">
        <p>Coba ubah cara bacanya. Materinya tetap sama.</p>
        <Link href={`/s/${DEMO_SHARE_CODE}`}>Buka materi lengkap <ArrowRight size={17} aria-hidden /></Link>
      </div>
    </div>
    <div className="board-tray" aria-hidden="true">
      <span className="board-eraser" />
      <span className="board-chalk board-chalk-white" />
      <span className="board-chalk board-chalk-yellow" />
      <span className="board-dust" />
    </div>
    </div>
  );
}
