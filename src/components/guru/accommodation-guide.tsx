"use client";

import { useEffect, useState } from "react";
import { NEEDS } from "@/lib/accommodations";
import { LANG_LABEL, type ClassNeeds } from "@/lib/types";
import { Badge } from "../ui";

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
            className="rounded-2xl border border-garis bg-white p-5"
            aria-labelledby={`akm-${n.key}`}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 id={`akm-${n.key}`} className="text-lg font-bold">
                {title}
              </h3>
              <span className="text-[14px] text-tinta-2">
                {needs[n.key]} siswa, {doneCount}/{n.tips.length} diterapkan
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {n.modes.map((m) => (
                <Badge key={m} tone="papan">
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
                        className="mt-1 size-5 shrink-0 accent-[#0B5C5C]"
                      />
                      <span className={done[id] ? "text-tinta-2 line-through decoration-1" : ""}>{tip}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
