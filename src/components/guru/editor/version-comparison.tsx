"use client";
import { useState } from "react";
import { comparisonTokens } from "@/lib/teacher-tools";
import { VERSION_HTML_LANG, VERSION_LABEL, type LessonVersions, type VersionKey } from "@/lib/types";
import { Select } from "../../ui";
import { KartuLipatMandiri } from "../../lipat";
export function VersionComparison({ body, versions }: { body: string; versions: LessonVersions }) {
  const keys = (Object.keys(versions) as VersionKey[]).filter((k) => versions[k]?.text.trim());
  const [choice, setChoice] = useState<VersionKey>("mudah");
  const key = keys.includes(choice) ? choice : keys[0];
  if (!key) return null;
  const adapted = versions[key]!.text;
  return <KartuLipatMandiri id="banding" heading="Bandingkan sumber dan versi" defaultOpen={false}
    summary="Lihat baris yang berubah, ditambah, atau dihapus antara materi asli dan satu versi.">
    <label htmlFor="banding-versi" className="block text-sm font-bold">Versi yang diperiksa</label>
    <Select id="banding-versi" value={key} onChange={(e) => setChoice(e.target.value as VersionKey)}>
      {keys.map((k) => <option key={k} value={k}>{VERSION_LABEL[k]}</option>)}
    </Select>
    <p className="mt-2 text-sm text-tinta-2">Sorotan dan garis bawah menunjukkan baris yang berubah, ditambah, dihapus, atau berpindah; bukan penilaian benar atau salah. Terjemahan dapat memiliki banyak sorotan.</p>
    <div className="mt-4 grid gap-4 lg:grid-cols-2">
      {[["Materi asli", body, adapted, "id"], [VERSION_LABEL[key], adapted, body, VERSION_HTML_LANG[key]]].map(([label, text, other, lang]) => <div key={label}>
        <h3 className="mb-2 font-bold">{label}</h3>
        <div lang={lang} tabIndex={0} role="region" aria-label={label} className="max-h-96 overflow-auto whitespace-pre-wrap rounded-xl border border-garis p-4 leading-relaxed">
          {comparisonTokens(text, other).map((token, i) => token.changed ? <mark key={i} className="bg-amber-100 text-tinta underline decoration-dotted">{token.text}</mark> : token.text)}
        </div>
      </div>)}
    </div>
  </KartuLipatMandiri>;
}
