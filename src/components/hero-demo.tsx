"use client";

import {
  AlignLeft,
  Contrast,
  Languages,
  Maximize,
  Pause,
  Volume2,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { HERO_SAMPLE } from "@/lib/demo-content";
import { ReaderText, useReaderStructure } from "./reader-text";
import { useSpeech } from "./use-speech";
import { cx } from "./ui";
import {
  Book,
  Boy,
  Girl,
  Grass,
  Magnifier,
  Paperclip,
  Plane,
  Ring,
  Sparkle,
  Triangle,
} from "./hero-decor";

const GLOSSARY = [
  {
    kata: "klorofil",
    arti: "Zat hijau di daun yang menangkap cahaya matahari.",
  },
];

type Versi = keyof typeof HERO_SAMPLE;

const VERSIONS: {
  key: Versi;
  label: string;
  icon?: LucideIcon;
  active: string;
}[] = [
  { key: "asli", label: "Teks asli", active: "bg-papan text-white" },
  {
    key: "mudah",
    label: "Teks mudah",
    icon: AlignLeft,
    active: "bg-papan text-white",
  },
  {
    key: "jawa",
    label: "Basa Jawa",
    icon: Languages,
    active: "bg-papan text-white",
  },
];

function Doodles() {
  return (
    <>
      <svg
        viewBox="0 0 200 40"
        className="pointer-events-none absolute left-[30%] top-0 hidden w-40 sm:block"
        aria-hidden
      >
        <path
          d="M4 34C50 4 120 0 196 24"
          fill="none"
          stroke="#4f8a6b"
          strokeWidth="1.6"
          strokeLinecap="round"
          opacity=".7"
        />
      </svg>
      <Triangle className="pointer-events-none absolute left-[46%] top-8 hidden w-6 rotate-12 text-[#ee8f33] sm:block" />
      <Sparkle className="pointer-events-none absolute left-[38%] top-12 hidden w-4 text-[#f4b84b] sm:block" />
      <Ring className="pointer-events-none absolute -right-1 top-1/2 hidden w-6 text-[#7bb095] sm:block" />
      <svg
        viewBox="0 0 50 50"
        className="pointer-events-none absolute -bottom-1 right-24 hidden w-10 sm:block"
        aria-hidden
      >
        <text
          x="0"
          y="40"
          fontSize="54"
          fontFamily="Georgia, serif"
          fill="none"
          stroke="#4f8a6b"
          strokeWidth="1.5"
        >
          “
        </text>
      </svg>
    </>
  );
}

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

  const toggles: {
    label: string;
    on: boolean;
    set: (v: boolean) => void;
    icon?: LucideIcon;
  }[] = [
    { label: "Huruf besar", on: besar, set: setBesar },
    { label: "Kontras tinggi", on: kontras, set: setKontras, icon: Contrast },
    { label: "Spasi lega", on: spasi, set: setSpasi, icon: Maximize },
  ];

  const pillBase =
    "inline-flex h-10 items-center gap-1.5 rounded-full px-3.5 text-[14px] font-bold transition-colors";

  return (
    <div className="relative mx-auto w-full max-w-[36rem] pt-20 pb-6 lg:max-w-none lg:pl-6">
      <Doodles />

      <div className="relative z-10 rounded-[1.75rem] border border-white bg-white/70 p-3 shadow-[0_30px_70px_-35px_rgba(27,67,50,0.5)] backdrop-blur-md">
        <div className="space-y-2">
          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-label="Versi teks"
          >
            {VERSIONS.map((v) => {
              const Icon = v.icon;
              const aktif = versi === v.key;
              return (
                <button
                  key={v.key}
                  type="button"
                  aria-pressed={aktif}
                  onClick={() => {
                    speech.stop();
                    setVersi(v.key);
                  }}
                  className={cx(
                    pillBase,
                    aktif
                      ? v.active
                      : "border border-white bg-white/80 text-tinta shadow-sm hover:bg-white",
                  )}
                >
                  {Icon && <Icon className="size-4" aria-hidden />}
                  {v.label}
                </button>
              );
            })}
          </div>

          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-label="Tampilan"
          >
            {toggles.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.label}
                  type="button"
                  aria-pressed={t.on}
                  onClick={() => t.set(!t.on)}
                  className={cx(
                    pillBase,
                    "border shadow-sm",
                    t.on
                      ? "border-papan bg-papan-50 text-papan"
                      : "border-white bg-white/80 text-tinta hover:bg-white",
                  )}
                >
                  {Icon ? (
                    <Icon className="size-4" aria-hidden />
                  ) : (
                    <span aria-hidden className="text-[15px] font-extrabold">
                      Aa
                    </span>
                  )}
                  {t.label}
                </button>
              );
            })}
            <button
              type="button"
              aria-pressed={speech.speaking}
              disabled={!speech.supported}
              onClick={() =>
                speech.speaking
                  ? speech.stop()
                  : speech.speak(sentences, {
                      lang: versi === "jawa" ? "jv-ID" : "id-ID",
                    })
              }
              className={cx(
                pillBase,
                "border shadow-sm disabled:opacity-50",
                speech.speaking
                  ? "border-papan bg-papan-50 text-papan"
                  : "border-white bg-white/80 text-tinta hover:bg-white",
              )}
            >
              {speech.speaking ? (
                <Pause className="size-4" aria-hidden />
              ) : (
                <Volume2 className="size-4" aria-hidden />
              )}
              Dibacakan
            </button>
          </div>
        </div>

        <div
          className="reader relative mt-3 min-h-[16rem] rounded-2xl px-5 pb-24 pt-5 transition-colors sm:px-7"
          data-besar={besar}
          data-kontras={kontras}
          data-spasi={spasi}
          lang={versi === "jawa" ? "jv" : "id"}
        >
          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
            {!kontras && (
              <div className="absolute inset-0 bg-gradient-to-b from-[#f6fbe9] to-[#e3f3da]" />
            )}
            <Grass className="absolute inset-x-0 bottom-0 h-12 w-full" />
          </div>
          <Plane className="pointer-events-none absolute -right-4 -top-7 w-24 rotate-[-6deg]" />
          <Sparkle className="pointer-events-none absolute right-28 top-3 w-4 text-[#f4b84b]" />
          <Sparkle className="pointer-events-none absolute right-2 top-16 w-3 text-[#f2a93b]" />

          <div className="relative">
            <p className="mb-3 text-[14px] font-bold text-[var(--reader-soft)]">
              IPAS kelas 4 — Fotosintesis
            </p>
            <ReaderText
              text={text}
              glossary={GLOSSARY}
              activeSentence={speech.current}
              onTerm={(g) => setTerm(term === g.kata ? null : g.kata)}
            />
            {term && (
              <p
                className="mt-3 rounded-lg bg-[var(--reader-mark)] px-3 py-2 text-[15px] text-tinta"
                role="status"
              >
                <strong>{term}</strong>:{" "}
                {GLOSSARY.find((g) => g.kata === term)?.arti}
              </p>
            )}
            <p className="sr-only">
              Ketuk kata bergaris untuk melihat artinya.
            </p>
          </div>
        </div>

        {/* dekorasi yang menempel di kartu */}
        <Girl className="pointer-events-none absolute bottom-full right-8 z-20 w-28" />
        <Boy className="pointer-events-none absolute -left-10 bottom-6 z-20 hidden h-28 lg:block" />
        <Book className="pointer-events-none absolute -left-2 bottom-2 z-30 w-28 lg:-left-8" />
        <Magnifier className="pointer-events-none absolute -right-3 bottom-2 z-30 w-20" />
      </div>
    </div>
  );
}
