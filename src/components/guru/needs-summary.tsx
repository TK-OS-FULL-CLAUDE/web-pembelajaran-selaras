import { NEEDS } from "@/lib/accommodations";
import { LANG_LABEL, type ClassNeeds } from "@/lib/types";

/** Ringkasan profil kebutuhan kelas dalam satu baris chip. */
export function NeedsSummary({ needs, compact = false }: { needs: ClassNeeds; compact?: boolean }) {
  const items = NEEDS.filter((n) => (needs[n.key] ?? 0) > 0).map((n) => ({
    key: n.key,
    label:
      n.key === "bahasaDaerah" && needs.bahasa
        ? `Bahasa ibu: ${LANG_LABEL[needs.bahasa].replace("Bahasa ", "")}`
        : n.label,
    count: needs[n.key],
  }));
  if (!items.length) {
    return <p className="text-[15px] text-tinta-2">Belum ada kebutuhan khusus yang dicatat.</p>;
  }
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Profil kebutuhan kelas">
      {items.map((item) => (
        <li
          key={item.key}
          className={`inline-flex items-center gap-1.5 rounded-full bg-papan-50 text-papan ${compact ? "px-2.5 py-0.5 text-[13px]" : "px-3 py-1 text-[14px]"}`}
        >
          <span className="font-bold">{item.count}</span>
          <span>{item.label}</span>
        </li>
      ))}
    </ul>
  );
}
