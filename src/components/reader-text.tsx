"use client";

import { Fragment, useMemo, type ReactNode } from "react";
import { parseBlocks, splitSentences } from "@/lib/text";
import type { GlossaryItem } from "@/lib/types";

type Group = { type: "heading" | "para"; sentences: number[] } | { type: "list"; items: number[][] };

/** Memecah materi menjadi blok + daftar kalimat bernomor (untuk dibacakan dan disorot). */
export function useReaderStructure(text: string) {
  return useMemo(() => {
    const sentences: string[] = [];
    const add = (s: string) => {
      sentences.push(s.trim());
      return sentences.length - 1;
    };
    const groups: Group[] = parseBlocks(text).map((block) => {
      if (block.type === "heading") return { type: "heading", sentences: [add(block.text)] };
      if (block.type === "para") return { type: "para", sentences: splitSentences(block.text).map(add) };
      return { type: "list", items: block.items.map((item) => splitSentences(item).map(add)) };
    });
    return { sentences, groups };
  }, [text]);
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function ReaderText({
  text,
  glossary,
  activeSentence = -1,
  onTerm,
}: {
  text: string;
  glossary: GlossaryItem[];
  activeSentence?: number;
  onTerm?: (item: GlossaryItem) => void;
}) {
  const { sentences, groups } = useReaderStructure(text);

  const termRegex = useMemo(() => {
    const words = glossary
      .map((g) => g.kata.trim())
      .filter(Boolean)
      .sort((a, b) => b.length - a.length);
    if (!words.length) return null;
    return new RegExp(`(?<![\\p{L}\\p{N}])(${words.map(escapeRegExp).join("|")})(?![\\p{L}\\p{N}])`, "giu");
  }, [glossary]);

  const byWord = useMemo(() => {
    const map = new Map<string, GlossaryItem>();
    for (const g of glossary) map.set(g.kata.trim().toLowerCase(), g);
    return map;
  }, [glossary]);

  // Setiap istilah hanya digarisbawahi pada kemunculan pertama supaya teks tidak ramai.
  const seen = new Set<string>();

  const renderSentence = (index: number): ReactNode => {
    const sentence = sentences[index];
    let content: ReactNode = sentence;
    if (termRegex && onTerm) {
      const nodes: ReactNode[] = [];
      let last = 0;
      for (const match of sentence.matchAll(termRegex)) {
        const word = match[0];
        const key = word.toLowerCase();
        const item = byWord.get(key);
        if (!item || seen.has(key) || match.index === undefined) continue;
        seen.add(key);
        nodes.push(sentence.slice(last, match.index));
        nodes.push(
          <button
            key={`${index}-${match.index}`}
            type="button"
            className="term"
            onClick={() => onTerm(item)}
            aria-label={`${word}: lihat arti`}
          >
            {word}
          </button>,
        );
        last = match.index + word.length;
      }
      nodes.push(sentence.slice(last));
      content = nodes;
    }
    return (
      <span key={index} data-sentence={index} className={index === activeSentence ? "sentence-active" : undefined}>
        {content}{" "}
      </span>
    );
  };

  return (
    <div className="reader-text">
      {groups.map((group, gi) => {
        if (group.type === "list") {
          return (
            <ul key={gi}>
              {group.items.map((item, ii) => (
                <li key={ii}>
                  <Fragment>{item.map(renderSentence)}</Fragment>
                </li>
              ))}
            </ul>
          );
        }
        if (group.type === "heading") return <h2 key={gi}>{group.sentences.map(renderSentence)}</h2>;
        return <p key={gi}>{group.sentences.map(renderSentence)}</p>;
      })}
    </div>
  );
}
