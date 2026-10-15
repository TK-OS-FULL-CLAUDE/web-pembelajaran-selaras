"use client";

// Membacakan teks dengan suara bawaan browser (Web Speech API): gratis, tanpa server, tanpa kuota.
// Teks dibacakan per kalimat supaya kalimat yang sedang dibaca bisa disorot.

import { useCallback, useEffect, useRef, useState } from "react";
import { spokenMath } from "@/lib/matematika";

export type SpeechRate = 0.8 | 1 | 1.2;

function pickVoice(lang: string): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  const norm = (l: string) => l.replace("_", "-").toLowerCase();
  const want = norm(lang);
  return (
    voices.find((v) => norm(v.lang) === want) ??
    voices.find((v) => norm(v.lang).startsWith(want.slice(0, 2))) ??
    // Suara Jawa/Sunda jarang tersedia: pakai suara Indonesia sebagai cadangan.
    voices.find((v) => norm(v.lang).startsWith("id")) ??
    null
  );
}

export function useSpeech() {
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [current, setCurrent] = useState(-1);
  const token = useRef(0);
  const queue = useRef<string[]>([]);
  const settings = useRef<{ lang: string; rate: SpeechRate }>({ lang: "id-ID", rate: 1 });

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    setSupported(true);
    // Sebagian browser memuat daftar suara secara asinkron.
    window.speechSynthesis.getVoices();
    const onVoices = () => window.speechSynthesis.getVoices();
    window.speechSynthesis.addEventListener?.("voiceschanged", onVoices);
    return () => {
      window.speechSynthesis.removeEventListener?.("voiceschanged", onVoices);
      window.speechSynthesis.cancel();
    };
  }, []);

  const speakFrom = useCallback((index: number, myToken: number) => {
    if (myToken !== token.current) return;
    if (index >= queue.current.length) {
      setSpeaking(false);
      setCurrent(-1);
      return;
    }
    // Simbol matematika dibacakan sebagai kata ("3 × 4" → "3 kali 4"); teks lain tidak berubah.
    const utter = new SpeechSynthesisUtterance(spokenMath(queue.current[index]));
    const voice = pickVoice(settings.current.lang);
    if (voice) {
      utter.voice = voice;
      utter.lang = voice.lang;
    } else {
      utter.lang = settings.current.lang;
    }
    utter.rate = settings.current.rate;
    utter.onend = () => speakFrom(index + 1, myToken);
    utter.onerror = (e) => {
      if (e.error === "interrupted" || e.error === "canceled") return;
      speakFrom(index + 1, myToken);
    };
    setCurrent(index);
    window.speechSynthesis.speak(utter);
  }, []);

  const stop = useCallback(() => {
    token.current++;
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    setSpeaking(false);
    setCurrent(-1);
  }, []);

  const speak = useCallback(
    (sentences: string[], opts: { startAt?: number; lang?: string; rate?: SpeechRate } = {}) => {
      if (!("speechSynthesis" in window)) return;
      token.current++;
      window.speechSynthesis.cancel();
      queue.current = sentences;
      settings.current = { lang: opts.lang ?? "id-ID", rate: opts.rate ?? 1 };
      setSpeaking(true);
      const myToken = token.current;
      // Jeda kecil: Chrome kadang mengabaikan speak() tepat setelah cancel().
      setTimeout(() => speakFrom(opts.startAt ?? 0, myToken), 60);
    },
    [speakFrom],
  );

  return { supported, speaking, current, speak, stop };
}
