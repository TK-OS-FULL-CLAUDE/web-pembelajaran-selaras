"use client";

import { useEffect, useState } from "react";
import { NEEDS } from "@/lib/accommodations";
import { NEED_TONE, TONES } from "@/lib/modes";
import { LANG_LABEL, type ClassNeeds } from "@/lib/types";
import { Badge, cx } from "../ui";

/** Panduan akomodasi sesuai profil kelas. Centang tersimpan di browser guru (bukan di server). */
export function AccommodationGuide({ classId, needs }: { classId: string; needs: ClassNeeds }) {
  const storageKey = `selaras:akomodasi:${classId}`;
  const [done, setDone] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setDone(JSON.parse(raw));
    } catch {}
  }, [storageKey]);

  const toggle = (id: string) => {
    setDone((d) => {
      const next = { ...d, [id]: !d[id] };
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const active = NEEDS.filter((n) => needs[n.key] > 0);
  if (!active.length) {
    return (
      <p className="rounded-2xl border border-dashed border-batas/60 bg-white px-5 py-6 text-tinta-2">
        Tambahkan kebutuhan siswa di profil kelas untuk melihat panduan akomodasi.
      </p>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {active.map((n) => {
        const title = n.key === "bahasaDaerah" && needs.bahasa ? `${n.label} (${LANG_LABEL[needs.bahasa]})` : n.label;
        const doneCount = n.tips.filter((_, i) => done[`${n.key}-${i}`]).length;
        return (
          <section
            key={n.key}
            className="relative overflow-hidden rounded-2xl surface-card p-5 pl-6"
            aria-labelledby={`akm-${n.key}`}
          >
            <span className={cx("absolute inset-y-0 left-0 w-1.5", TONES[NEED_TONE[n.key]].bar)} aria-hidden />
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 id={`akm-${n.key}`} className={cx("text-lg font-bold", TONES[NEED_TONE[n.key]].text)}>
                {title}
              </h3>
              <span className="text-[14px] text-tinta-2">
                {needs[n.key]} siswa, {doneCount}/{n.tips.length} diterapkan
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {n.modes.map((m) => (
                <Badge key={m} tone={NEED_TONE[n.key]}>
                  {m}
                </Badge>
              ))}
            </div>
            <ul className="mt-4 space-y-2">
              {n.tips.map((tip, i) => {
                const id = `${n.key}-${i}`;
                return (
                  <li key={id}>
                    <label className="flex cursor-pointer gap-3 rounded-lg p-1.5 hover:bg-papan-50">
                      <input
                        type="checkbox"
                        checked={!!done[id]}
                        onChange={() => toggle(id)}
                        className="mt-1 size-5 shrink-0 accent-[#2D6A4F]"
                      />
                      <span className={done[id] ? "text-tinta-2 line-through decoration-1" : ""}>{tip}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 border-t border-garis pt-2 text-[13px] text-tinta-2">Dasar: {n.rujukan}</p>
          </section>
        );
      })}
    </div>
  );
}
