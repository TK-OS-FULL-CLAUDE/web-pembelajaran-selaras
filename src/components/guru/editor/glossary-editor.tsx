"use client";

import { Plus, Trash2, TriangleAlert } from "lucide-react";
import type { GlossaryItem } from "@/lib/types";
import { Button, inputClass } from "../../ui";

export function GlossaryEditor({
  items,
  onChange,
  idPrefix,
  termLabel = "Kata",
  meaningLabel = "Arti",
  layout = "row",
  warnings,
}: {
  items: GlossaryItem[];
  onChange: (items: GlossaryItem[]) => void;
  idPrefix: string;
  termLabel?: string;
  meaningLabel?: string;
  layout?: "row" | "stack";
  /** Peringatan per baris (mis. "kata tidak ditemukan di materi"), atau null. */
  warnings?: (string | null)[];
}) {
  const row = layout === "row";
  const set = (i: number, patch: Partial<GlossaryItem>) =>
    onChange(items.map((g, j) => (j === i ? { ...g, ...patch } : g)));

  return (
    <div className="space-y-2">
      {row && items.length > 0 && (
        <div className="hidden grid-cols-[minmax(8rem,12rem)_1fr_2.75rem] gap-2 px-1 text-[14px] font-bold text-tinta-2 sm:grid">
          <span>{termLabel}</span>
          <span>{meaningLabel}</span>
        </div>
      )}
      {items.map((g, i) => (
        <div
          key={i}
          className={
            row
              ? "grid gap-2 rounded-xl border border-garis p-2 sm:grid-cols-[minmax(8rem,12rem)_1fr_2.75rem] sm:border-0 sm:p-0"
              : "grid grid-cols-[1fr_2.75rem] gap-2 rounded-xl border border-garis p-2"
          }
        >
          <input
            aria-label={`${termLabel} ${i + 1}`}
            id={`${idPrefix}-kata-${i}`}
            className={`${inputClass} h-11 font-bold`}
            placeholder={termLabel}
            value={g.kata}
            onChange={(e) => set(i, { kata: e.target.value })}
          />
          <input
            aria-label={`${meaningLabel} ${i + 1}`}
            id={`${idPrefix}-arti-${i}`}
            className={`${inputClass} h-11 ${row ? "" : "col-start-1 row-start-2"}`}
            value={g.arti}
            placeholder={meaningLabel}
            onChange={(e) => set(i, { arti: e.target.value })}
          />
          <button
            type="button"
            onClick={() => onChange(items.filter((_, j) => j !== i))}
            className={`flex size-11 items-center justify-center rounded-lg text-tinta-2 hover:bg-red-50 hover:text-galat ${row ? "" : "col-start-2 row-start-1"}`}
            aria-label={`Hapus ${g.kata || "kata"}`}
          >
            <Trash2 className="size-4" aria-hidden />
          </button>
          {warnings?.[i] && (
            <p
              className={`flex items-start gap-1.5 text-[13px] text-aksen ${row ? "sm:col-span-3" : "col-span-2"}`}
              id={`${idPrefix}-warn-${i}`}
            >
              <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              {warnings[i]}
            </p>
          )}
        </div>
      ))}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          onChange([...items, { kata: "", arti: "" }]);
          setTimeout(() => document.getElementById(`${idPrefix}-kata-${items.length}`)?.focus(), 30);
        }}
      >
        <Plus className="size-4" aria-hidden />
        Tambah kata
      </Button>
    </div>
  );
}
