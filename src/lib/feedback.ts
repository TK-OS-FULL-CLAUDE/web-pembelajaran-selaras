import { parseBlocks, parseInline } from "./text";

/** Judul bagian mengikuti versi yang benar-benar sedang dibaca siswa. */
export function feedbackSections(text: string): string[] {
  const headings = parseBlocks(text).filter((b) => b.type === "heading").map((b) =>
    b.type === "heading" ? parseInline(b.text).plain.slice(0, 180) : "");
  return ["Materi secara keseluruhan", ...[...new Set(headings)].filter(Boolean)];
}
