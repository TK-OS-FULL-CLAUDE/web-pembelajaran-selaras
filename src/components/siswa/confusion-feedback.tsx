"use client";

import { useState } from "react";
import { feedbackSections } from "@/lib/feedback";

export function ConfusionFeedback({ text, sent, onSend }: {
  text: string;
  sent: string[];
  onSend: (section: string) => void;
}) {
  const [section, setSection] = useState("Materi secara keseluruhan");
  const sections = feedbackSections(text);
  const value = sections.includes(section) ? section : sections[0];
  const done = sent.includes(value);
  return <section className="no-print mt-6 rounded-2xl border-2 border-[var(--reader-line)] p-5">
    <h2 className="text-xl font-bold">Ada yang belum kamu pahami?</h2>
    <p className="mt-2">Tidak apa-apa. Beri tahu guru bagian yang perlu dijelaskan lagi.</p>
    <label className="mt-4 block font-bold">Bagian materi
      <select className="mt-2 min-h-12 w-full rounded-xl border border-[var(--reader-line)] bg-[var(--reader-bg)] px-3 font-normal"
        value={value} onChange={(e) => setSection(e.target.value)}>
        {sections.map((s) => <option key={s}>{s}</option>)}
      </select>
    </label>
    <button type="button" disabled={done} onClick={() => onSend(value)}
      className="mt-4 min-h-12 rounded-xl border-2 border-current px-5 font-bold disabled:opacity-60">
      {done ? "Sudah dicatat" : "Aku belum paham"}
    </button>
    <p role="status" className="mt-2 text-base">{done ? "Terima kasih. Lihat status pengiriman di bagian atas halaman. Kamu boleh lanjut belajar." : "Guru melihat laporan ini di rekap. Tidak mengurangi nilai kuismu."}</p>
  </section>;
}
