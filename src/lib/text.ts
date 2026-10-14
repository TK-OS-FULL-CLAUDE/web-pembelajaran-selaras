// Utilitas teks yang dipakai di server dan browser.

/** Sidik pendek sebuah teks (djb2). Dipakai untuk tahu apakah materi asli berubah setelah versi dibuat. */
export function fingerprint(text: string): string {
  let h = 5381;
  const s = text.trim();
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(16);
}

export type TextBlock =
  | { type: "heading"; text: string }
  | { type: "para"; text: string }
  | { type: "list"; items: string[] };

/**
 * Format materi yang sangat sederhana supaya mudah ditulis guru:
 * - baris diawali "## " atau "# " = judul bagian
 * - baris diawali "- " atau "• " = butir daftar
 * - baris kosong = paragraf baru
 */
export function parseBlocks(text: string): TextBlock[] {
  const blocks: TextBlock[] = [];
  let para: string[] = [];
  let list: string[] = [];

  const flushPara = () => {
    if (para.length) blocks.push({ type: "para", text: para.join(" ").trim() });
    para = [];
  };
  const flushList = () => {
    if (list.length) blocks.push({ type: "list", items: list });
    list = [];
  };

  for (const raw of text.replace(/\r\n/g, "\n").split("\n")) {
    const line = raw.trim();
    if (!line) {
      flushPara();
      flushList();
      continue;
    }
    const heading = line.match(/^#{1,3}\s+(.*)$/);
    if (heading) {
      flushPara();
      flushList();
      blocks.push({ type: "heading", text: heading[1].trim() });
      continue;
    }
    const bullet = line.match(/^[-•*]\s+(.*)$/);
    if (bullet) {
      flushPara();
      list.push(bullet[1].trim());
      continue;
    }
    flushList();
    para.push(line);
  }
  flushPara();
  flushList();
  return blocks;
}

/** Memecah teks menjadi kalimat untuk dibacakan satu per satu. */
export function splitSentences(text: string): string[] {
  const parts = text.match(/[^.!?]+(?:[.!?]+["'”’)]*|$)\s*/g) ?? [text];
  return parts.map((p) => p).filter((p) => p.trim().length > 0);
}

export function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

/** Menghapus penanda format supaya teks enak dibacakan suara. */
export function plainText(text: string): string {
  return parseBlocks(text)
    .map((b) => (b.type === "list" ? b.items.join(". ") : b.text))
    .join("\n");
}
