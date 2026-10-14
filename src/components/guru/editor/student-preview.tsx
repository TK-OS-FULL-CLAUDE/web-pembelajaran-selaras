"use client";

// Pratinjau langsung: materi seperti yang akan dilihat siswa di HP, ikut berubah saat guru mengetik.

import { useMemo, useState } from "react";
import { LANG_SHORT, type GlossaryItem, type LessonVersions, type StudentPrefs } from "@/lib/types";
import { ReaderText } from "../../reader-text";
import { cx } from "../../ui";

export function StudentPreview({
  title,
  body,
  glossary,
  versions,
}: {
  title: string;
  body: string;
  glossary: GlossaryItem[];
  versions: LessonVersions;
}) {
  const [versi, setVersi] = useState<StudentPrefs["versi"]>("asli");
  const [besar, setBesar] = useState(false);
  const [kontras, setKontras] = useState(false);
  const [spasi, setSpasi] = useState(false);
  const [term, setTerm] = useState<GlossaryItem | null>(null);

  const options: { key: StudentPrefs["versi"]; label: string }[] = [
    { key: "asli", label: "Asli" },
    ...(versions.mudah?.text.trim() ? [{ key: "mudah" as const, label: "Mudah" }] : []),
    ...(versions.daerah?.text.trim()
      ? [{ key: "daerah" as const, label: LANG_SHORT[versions.daerah.lang ?? "jw"].replace("Basa ", "") }]
      : []),
  ];
  const current = versi === "asli" ? null : versions[versi];
  const text = current?.text ?? body;
  const terms = useMemo(
    () => (versi === "daerah" ? (versions.daerah?.glossary ?? []) : [...(current?.glossary ?? []), ...glossary]),
    [versi, versions, current, glossary],
  );
  const draft = current && !current.checked;

  const toggle = (label: string, on: boolean, set: (v: boolean) => void) => (
    <button
      type="button"
      aria-pressed={on}
      onClick={() => set(!on)}
      className={cx(
        "h-8 rounded-md border px-2 text-[13px] font-bold",
        on ? "border-papan bg-papan text-white" : "border-garis bg-white text-tinta hover:border-papan",
      )}
    >
      {label}
    </button>
  );

  return (
    <div>
      <div className="flex flex-wrap gap-1" role="group" aria-label="Versi yang dipratinjau">
        {options.map((o) => (
          <button
            key={o.key}
            type="button"
            aria-pressed={versi === o.key}
            onClick={() => {
              setVersi(o.key);
              setTerm(null);
            }}
            className={cx(
              "h-8 rounded-md px-2.5 text-[13px] font-bold",
              versi === o.key ? "bg-papan text-white" : "bg-slate-100 text-tinta hover:bg-papan-50",
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
      <div className="mt-1.5 flex flex-wrap gap-1" role="group" aria-label="Tampilan yang dipratinjau">
        {toggle("Huruf besar", besar, setBesar)}
        {toggle("Kontras", kontras, setKontras)}
        {toggle("Spasi lega", spasi, setSpasi)}
      </div>

      <div className="mx-auto mt-3 w-full max-w-[22rem] rounded-[2rem] border-[6px] border-tinta bg-tinta p-0.5 shadow-lg">
        <div
          className="reader relative flex h-[30rem] flex-col overflow-y-auto rounded-[1.6rem] px-4 pt-4"
          data-besar={besar}
          data-kontras={kontras}
          data-spasi={spasi}
          lang={versi === "daerah" ? (versions.daerah?.lang === "su" ? "su" : "jv") : "id"}
          aria-label="Pratinjau layar siswa"
        >
          {draft && (
            <p className="mb-2 rounded-md bg-aksen-50 px-2 py-1 text-[12px] font-bold text-aksen">
              Draf: siswa belum melihat versi ini sampai ditandai “Sudah dicek”.
            </p>
          )}
          <p className="mb-2 text-[12px] font-bold text-[var(--reader-soft)]">{title}</p>
          {text.trim() ? (
            <div className="[&_.reader-text]:text-[calc(var(--reader-size)*0.82)]">
              <ReaderText text={text} glossary={terms} onTerm={setTerm} />
            </div>
          ) : (
            <p className="text-[14px] text-[var(--reader-soft)]">Materi masih kosong.</p>
          )}
          <div className="min-h-6 flex-1" aria-hidden />
          {term && (
            <div className="sticky bottom-0 -mx-4 mt-3 rounded-t-2xl border-t-2 border-papan bg-white px-4 pb-5 pt-3 text-tinta shadow-[0_-6px_16px_rgba(15,23,42,0.12)]">
              <p className="font-bold text-papan">{term.kata}</p>
              <p className="text-[14px]">{term.arti || "Arti belum diisi."}</p>
              <button type="button" onClick={() => setTerm(null)} className="mt-1 text-[13px] font-bold underline">
                Tutup
              </button>
            </div>
          )}
        </div>
      </div>
      <p className="mt-2 text-center text-[13px] text-tinta-2">Ketuk kata bergaris untuk mencoba glosarium.</p>
    </div>
  );
}
