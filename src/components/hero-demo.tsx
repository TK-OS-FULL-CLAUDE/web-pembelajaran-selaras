"use client";

import { Pause, Volume2 } from "lucide-react";
import { useState } from "react";
import { HERO_SAMPLE } from "@/lib/demo-content";
import { ReaderText, useReaderStructure } from "./reader-text";
import { useSpeech } from "./use-speech";
import { cx } from "./ui";

const GLOSSARY = [{ kata: "klorofil", arti: "Zat hijau di daun yang menangkap cahaya matahari." }];

type Versi = keyof typeof HERO_SAMPLE;

const VERSIONS: { key: Versi; label: string }[] = [
  { key: "asli", label: "Teks asli" },
  { key: "mudah", label: "Teks mudah" },
  { key: "jawa", label: "Basa Jawa" },
];

/** Contoh interaktif di halaman depan: satu paragraf yang bisa diganti cara bacanya. */
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
    { label: "Huruf besar", on: besar, set: setBesar },
    { label: "Kontras tinggi", on: kontras, set: setKontras },
    { label: "Spasi lega", on: spasi, set: setSpasi },
  ];

  return (
    <div className="rounded-3xl border border-garis bg-white p-2 shadow-[0_24px_60px_-30px_rgba(11,92,92,0.45)]">
      <div className="space-y-1.5 rounded-2xl bg-kertas p-2">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Versi teks">
          {VERSIONS.map((v) => (
            <button
              key={v.key}
              type="button"
              aria-pressed={versi === v.key}
              onClick={() => {
                speech.stop();
                setVersi(v.key);
              }}
              className={cx(
                "h-10 rounded-lg px-3 text-[15px] font-bold transition-colors",
                versi === v.key ? "bg-papan text-white" : "text-tinta hover:bg-papan-50",
              )}
            >
              {v.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Tampilan">
          {toggles.map((t) => (
            <button
              key={t.label}
              type="button"
              aria-pressed={t.on}
              onClick={() => t.set(!t.on)}
              className={cx(
                "h-10 rounded-lg border px-3 text-[15px] font-bold transition-colors",
                t.on ? "border-papan bg-papan-50 text-papan" : "border-transparent text-tinta hover:bg-papan-50",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div
        className="reader mt-2 min-h-[16rem] rounded-2xl px-5 py-5 transition-colors sm:px-7"
        data-besar={besar}
        data-kontras={kontras}
        data-spasi={spasi}
        lang={versi === "jawa" ? "jv" : "id"}
      >
        <p className="mb-3 text-[14px] font-bold text-[var(--reader-soft)]">IPAS kelas 4 — Fotosintesis</p>
        <ReaderText
          text={text}
          glossary={GLOSSARY}
          activeSentence={speech.current}
          onTerm={(g) => setTerm(term === g.kata ? null : g.kata)}
        />
        {term && (
          <p className="mt-3 rounded-lg bg-[var(--reader-mark)] px-3 py-2 text-[15px] text-tinta" role="status">
            <strong>{term}</strong>: {GLOSSARY.find((g) => g.kata === term)?.arti}
          </p>
        )}
      </div>

      {speech.supported && (
        <div className="flex items-center justify-between gap-3 px-3 py-2">
          <p className="text-[14px] text-tinta-2">Ketuk kata bergaris untuk melihat artinya.</p>
          <button
            type="button"
            onClick={() =>
              speech.speaking ? speech.stop() : speech.speak(sentences, { lang: versi === "jawa" ? "jv-ID" : "id-ID" })
            }
            className="inline-flex h-10 items-center gap-2 rounded-lg px-3 font-bold text-papan hover:bg-papan-50"
          >
            {speech.speaking ? <Pause className="size-5" aria-hidden /> : <Volume2 className="size-5" aria-hidden />}
            {speech.speaking ? "Berhenti" : "Dengarkan"}
          </button>
        </div>
      )}
    </div>
  );
}
