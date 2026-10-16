"use client";

// Tutor siswa: kotak tanya di bawah bacaan. Jawaban hanya dari materi guru dan mengikuti cara belajar
// yang dipilih siswa. Riwayat hanya ada selama halaman terbuka (belum disimpan).

import { Loader2, MessageCircle, Send, Square, Volume2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/client";
import type { StudentPrefs } from "@/lib/types";
import { InlineText } from "../reader-text";
import { cx } from "../ui";

type Turn = { id: number; question: string; answer?: string; found?: boolean; error?: string };

const MAX_LEN = 300;
/** Batas pertanyaan per siswa per materi, supaya kuota API aman. Dihitung di perangkat siswa. */
const MAX_QUESTIONS = 10;

function readCount(key: string): number {
  try {
    return Number(localStorage.getItem(key)) || 0;
  } catch {
    return 0;
  }
}
function writeCount(key: string, n: number) {
  try {
    localStorage.setItem(key, String(n));
  } catch {}
}

export function AskTutor({
  code,
  versi,
  answerSpeaking,
  onSpeak,
  onStopSpeak,
  canSpeak,
}: {
  code: string;
  versi: StudentPrefs["versi"];
  /** Bacaan yang sedang berjalan adalah jawaban tutor (bukan teks materi). */
  answerSpeaking: boolean;
  onSpeak: (text: string) => void;
  onStopSpeak: () => void;
  canSpeak: boolean;
}) {
  const countKey = `selaras:tanya:${code}`;
  const [used, setUsed] = useState(0);
  const [speakingId, setSpeakingId] = useState<number | null>(null);
  const [text, setText] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const nextId = useRef(1);

  useEffect(() => setUsed(readCount(countKey)), [countKey]);
  const left = Math.max(0, MAX_QUESTIONS - used);

  const ask = async () => {
    const question = text.trim();
    if (question.length < 3 || busy || left <= 0) return;
    const id = nextId.current++;
    writeCount(countKey, used + 1);
    setUsed(used + 1);
    setTurns((t) => [...t, { id, question }]);
    setText("");
    setBusy(true);
    try {
      const res = await api<{ found: boolean; answer: string }>(`/api/s/${code}/tanya`, {
        body: { question, versi },
      });
      setTurns((t) => t.map((x) => (x.id === id ? { ...x, answer: res.answer, found: res.found } : x)));
    } catch (err) {
      const error = err instanceof Error ? err.message : "Tidak bisa menjawab sekarang. Coba lagi.";
      setTurns((t) => t.map((x) => (x.id === id ? { ...x, error } : x)));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="no-print mt-10 rounded-2xl border-2 border-[var(--reader-line)] bg-white p-4" aria-labelledby="tanya-judul">
      <h2 id="tanya-judul" className="flex items-center gap-2 text-[20px] font-bold text-tinta">
        <MessageCircle className="size-6 text-papan" aria-hidden />
        Tanya Tutor
      </h2>
      <p className="mt-1 text-[15px] text-tinta/80">
        Tanyakan isi materi ini. Jawabannya hanya dari materi gurumu, dibuat oleh AI. Kamu bisa bertanya {MAX_QUESTIONS} kali.
      </p>

      {turns.length > 0 && (
        <ul className="mt-4 space-y-3" aria-live="polite">
          {turns.map((t) => (
            <li key={t.id} className="space-y-2">
              <p className="ml-auto w-fit max-w-[90%] rounded-2xl rounded-br-sm bg-papan px-4 py-2.5 text-[17px] text-white">
                {t.question}
              </p>
              {t.answer !== undefined ? (
                <div className="max-w-[95%] space-y-1.5">
                  <p
                    className={cx(
                      "w-fit whitespace-pre-line rounded-2xl rounded-bl-sm px-4 py-2.5 text-[17px] leading-relaxed",
                      t.found ? "bg-black/5 text-tinta" : "border-2 border-dashed border-[var(--reader-line)] text-tinta",
                    )}
                  >
                    <InlineText text={t.answer} />
                  </p>
                  {canSpeak && t.answer && (
                    <button
                      type="button"
                      onClick={() => {
                        if (answerSpeaking && speakingId === t.id) {
                          onStopSpeak();
                        } else {
                          setSpeakingId(t.id);
                          onSpeak(t.answer ?? "");
                        }
                      }}
                      className="inline-flex h-11 items-center gap-1.5 rounded-lg border-2 border-[var(--reader-line)] bg-white px-3 text-[15px] font-bold text-tinta hover:border-papan"
                    >
                      {answerSpeaking && speakingId === t.id ? (
                        <>
                          <Square className="size-4" aria-hidden />
                          Berhenti
                        </>
                      ) : (
                        <>
                          <Volume2 className="size-5" aria-hidden />
                          Dengarkan jawaban
                        </>
                      )}
                    </button>
                  )}
                </div>
              ) : t.error ? (
                <p role="alert" className="w-fit max-w-[95%] rounded-2xl bg-red-50 px-4 py-2.5 text-[16px] text-red-800">
                  {t.error}
                </p>
              ) : (
                <p className="flex w-fit items-center gap-2 rounded-2xl bg-black/5 px-4 py-2.5 text-[16px] text-tinta/80">
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  Sedang mencari di materi…
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      {left <= 0 ? (
        <p role="status" className="mt-4 rounded-xl border-2 border-dashed border-[var(--reader-line)] px-4 py-3 text-[17px] text-tinta">
          Batas {MAX_QUESTIONS} pertanyaan sudah habis. Tanyakan ke gurumu ya.
        </p>
      ) : (
      <form
        className="mt-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void ask();
        }}
      >
        <label htmlFor="tanya-isi" className="sr-only">
          Pertanyaanmu tentang materi
        </label>
        <input
          id="tanya-isi"
          value={text}
          maxLength={MAX_LEN}
          onChange={(e) => setText(e.target.value)}
          placeholder="Tulis pertanyaanmu di sini"
          autoComplete="off"
          className="h-12 min-w-0 flex-1 rounded-xl border-2 border-[var(--reader-line)] bg-white px-4 text-[17px] text-tinta placeholder:text-tinta/50 focus:border-papan focus:outline-none"
        />
        <button
          type="submit"
          disabled={busy || text.trim().length < 3}
          className="inline-flex h-12 items-center gap-2 rounded-xl bg-aksen px-4 text-[17px] font-bold text-white hover:brightness-110 disabled:opacity-50"
        >
          <Send className="size-5" aria-hidden />
          Tanya
        </button>
      </form>
      )}
      {left > 0 && left < MAX_QUESTIONS && (
        <p className="mt-2 text-[14px] text-tinta/70">Sisa {left} pertanyaan.</p>
      )}
    </section>
  );
}
