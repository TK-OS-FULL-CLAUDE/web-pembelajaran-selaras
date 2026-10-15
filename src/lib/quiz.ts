// Logika kuis bersama (server & browser): merapikan soal, memeriksa jawaban siswa.

import { fingerprint } from "./text";
import type { MatchPair, QuizQuestion, QuizType } from "./types";

export function quizType(q: Pick<QuizQuestion, "type">): QuizType {
  return q.type ?? "pg";
}

export const BS_OPTIONS = ["Benar", "Salah"];

/** Kunci pendek sebuah soal, untuk mencocokkan hasil siswa dengan soal walau urutan soal berubah. */
export function questionKey(q: Pick<QuizQuestion, "q">): string {
  return fingerprint(q.q.trim().toLowerCase());
}

/** Bentuk jawaban siswa per jenis soal. */
export type QuizResponse =
  | { type: "pg" | "bs"; choice: number | null }
  | { type: "pgk"; choices: number[] }
  | { type: "isian"; text: string }
  | { type: "jodoh"; match: (number | null)[] };

export function emptyResponse(q: QuizQuestion): QuizResponse {
  const type = quizType(q);
  switch (type) {
    case "pgk":
      return { type, choices: [] };
    case "isian":
      return { type, text: "" };
    case "jodoh":
      return { type, match: (q.pairs ?? []).map(() => null) };
    default:
      return { type, choice: null };
  }
}

/** Apakah siswa sudah mengisi cukup untuk diperiksa. */
export function isAnswered(r: QuizResponse): boolean {
  switch (r.type) {
    case "pgk":
      return r.choices.length > 0;
    case "isian":
      return r.text.trim().length > 0;
    case "jodoh":
      return r.match.every((m) => m !== null);
    default:
      return r.choice !== null;
  }
}

/** Penyamaan jawaban isian: huruf kecil, tanpa tanda baca, spasi rapi; "1.000" = "1000". */
export function normalizeAnswer(s: string): string {
  return s
    .normalize("NFKC")
    .toLowerCase()
    .replace(/(\d)[.,](?=\d{3}\b)/g, "$1")
    .replace(/[^\p{L}\p{N}\s.,]/gu, " ")
    .replace(/[.,](?!\d)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isCorrect(q: QuizQuestion, r: QuizResponse): boolean {
  const type = quizType(q);
  if (r.type !== type && !(type === "bs" && r.type === "pg")) return false;
  switch (r.type) {
    case "pg":
    case "bs":
      return r.choice === q.answer;
    case "pgk": {
      const want = [...new Set(q.answers ?? [])].sort();
      const got = [...new Set(r.choices)].sort();
      return want.length === got.length && want.every((v, i) => v === got[i]);
    }
    case "isian": {
      const got = normalizeAnswer(r.text);
      return !!got && (q.accepted ?? []).some((a) => normalizeAnswer(a) === got);
    }
    case "jodoh": {
      const pairs = q.pairs ?? [];
      return (
        pairs.length > 0 &&
        r.match.length === pairs.length &&
        r.match.every(
          (m, i) => m !== null && pairs[m]?.kanan.trim().toLowerCase() === pairs[i].kanan.trim().toLowerCase(),
        )
      );
    }
  }
}

/**
 * Soal yang siap dikerjakan siswa: pilihan/pasangan kosong dibuang dan indeks jawaban disesuaikan.
 * null bila soal belum lengkap (tidak ditampilkan ke siswa).
 */
export function playableQuestion(q: QuizQuestion): QuizQuestion | null {
  const type = quizType(q);
  const text = q.q.trim();
  const explain = (q.explain ?? "").trim();
  if (!text) return null;

  if (type === "pg" || type === "pgk") {
    const kept = q.options.map((o, i) => ({ o: o.trim(), i })).filter((x) => x.o);
    if (kept.length < 2) return null;
    if (type === "pg") {
      const answer = kept.findIndex((x) => x.i === q.answer);
      if (answer < 0) return null;
      return { type, q: text, options: kept.map((x) => x.o), answer, explain };
    }
    const answers = [...new Set(q.answers ?? [])]
      .map((a) => kept.findIndex((x) => x.i === a))
      .filter((i) => i >= 0)
      .sort((a, b) => a - b);
    if (!answers.length) return null;
    return { type, q: text, options: kept.map((x) => x.o), answer: answers[0], answers, explain };
  }
  if (type === "bs") {
    return { type, q: text, options: BS_OPTIONS, answer: q.answer === 1 ? 1 : 0, explain };
  }
  if (type === "isian") {
    const accepted = [...new Set((q.accepted ?? []).map((a) => a.trim()).filter(Boolean))];
    if (!accepted.length) return null;
    return { type, q: text, options: [], answer: 0, accepted, explain };
  }
  const pairs: MatchPair[] = (q.pairs ?? [])
    .map((p) => ({ kiri: p.kiri.trim(), kanan: p.kanan.trim() }))
    .filter((p) => p.kiri && p.kanan);
  if (pairs.length < 2) return null;
  return { type: "jodoh", q: text, options: [], answer: 0, pairs, explain };
}

/** Penjelasan singkat apa yang kurang dari sebuah soal (untuk guru). null = lengkap. */
export function questionProblem(q: QuizQuestion): string | null {
  if (!q.q.trim()) return "Pertanyaan masih kosong.";
  const type = quizType(q);
  const filled = q.options.filter((o) => o.trim()).length;
  if ((type === "pg" || type === "pgk") && filled < 2) return "Isi minimal dua pilihan jawaban.";
  if (type === "pg" && !q.options[q.answer]?.trim()) return "Pilihan yang ditandai benar masih kosong.";
  if (type === "pgk" && !(q.answers ?? []).some((a) => q.options[a]?.trim()))
    return "Tandai minimal satu jawaban benar.";
  if (type === "isian" && !(q.accepted ?? []).some((a) => a.trim())) return "Tulis minimal satu jawaban yang diterima.";
  if (type === "jodoh" && (q.pairs ?? []).filter((p) => p.kiri.trim() && p.kanan.trim()).length < 2)
    return "Isi minimal dua pasangan.";
  return null;
}

/** Pengacakan yang selalu sama untuk teks yang sama (urutan pilihan menjodohkan di layar siswa). */
export function stableShuffle<T>(items: T[], seedText: string): T[] {
  let seed = parseInt(fingerprint(seedText), 16) || 1;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  // Hindari urutan acak yang kebetulan sama persis dengan urutan benar.
  if (out.length > 1 && out.every((x, i) => x === items[i])) out.push(out.shift()!);
  return out;
}

/** Ubah soal ke jenis lain sambil mempertahankan isi yang masih masuk akal. */
export function convertQuestion(q: QuizQuestion, to: QuizType): QuizQuestion {
  const base = { q: q.q, explain: q.explain, concept: q.concept, origin: "guru" as const };
  const opts = q.options.length && quizType(q) !== "bs" ? q.options : ["", "", "", ""];
  switch (to) {
    case "pg":
      return { ...base, type: "pg", options: opts, answer: Math.min(q.answer, opts.length - 1) };
    case "pgk":
      return { ...base, type: "pgk", options: opts, answer: 0, answers: q.answers?.length ? q.answers : [q.answer] };
    case "bs":
      return { ...base, type: "bs", options: BS_OPTIONS, answer: 0 };
    case "isian":
      return {
        ...base,
        type: "isian",
        options: [],
        answer: 0,
        accepted: quizType(q) === "pg" && q.options[q.answer]?.trim() ? [q.options[q.answer].trim()] : [""],
      };
    case "jodoh":
      return {
        ...base,
        type: "jodoh",
        options: [],
        answer: 0,
        pairs: q.pairs?.length
          ? q.pairs
          : [
              { kiri: "", kanan: "" },
              { kiri: "", kanan: "" },
              { kiri: "", kanan: "" },
            ],
      };
  }
}

export function blankQuestion(type: QuizType = "pg"): QuizQuestion {
  return convertQuestion({ q: "", options: ["", "", "", ""], answer: 0, explain: "" }, type);
}
