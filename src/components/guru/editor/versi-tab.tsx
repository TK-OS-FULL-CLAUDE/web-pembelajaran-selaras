"use client";

// Peran 2: draf versi dari AI + review guru.

import { Check, PenLine, RefreshCw, Sparkles, Trash2, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { api } from "@/lib/client";
import { fingerprint, wordCount } from "@/lib/text";
import {
  LANG_LABEL,
  type ClassNeeds,
  type GlossaryItem,
  type LessonVersion,
  type RegionalLang,
  type VersionKey,
} from "@/lib/types";
import { Badge, Button, Notice, Select, Spinner, Textarea, cx } from "../../ui";
import { useToast } from "../../toast";
import { GlossaryEditor } from "./glossary-editor";
import type { EditableLesson, TabKey, UpdateLesson } from "./lesson-editor";

type Cls = { id: string; name: string; grade: string; needs: ClassNeeds } | null;

const INFO: Record<VersionKey, { title: string; text: string }> = {
  mudah: {
    title: "Teks mudah",
    text: "Kalimat pendek dan kata sehari-hari, untuk siswa disleksia, sulit fokus, atau yang masih belajar Bahasa Indonesia.",
  },
  daerah: {
    title: "Bahasa daerah",
    text: "Materi yang sama dalam bahasa ibu siswa, dengan glosarium dua bahasa.",
  },
};

export function VersiTab({
  lessonId,
  lesson,
  update,
  cls,
  aiOn,
  goTo,
}: {
  lessonId: string;
  lesson: EditableLesson;
  update: UpdateLesson;
  cls: Cls;
  aiOn: boolean;
  goTo: (tab: TabKey) => void;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState<Record<VersionKey, boolean>>({ mudah: false, daerah: false });
  const [lang, setLang] = useState<RegionalLang>(lesson.versions.daerah?.lang ?? cls?.needs.bahasa ?? "jw");
  const bodyPrint = fingerprint(lesson.body);
  const needs = cls?.needs;
  const recommended: Record<VersionKey, boolean> = {
    mudah: !!needs && needs.disleksia + needs.sulitFokus + needs.bahasaDaerah > 0,
    daerah: !!needs && needs.bahasaDaerah > 0,
  };

  const setVersion = (key: VersionKey, version: LessonVersion | undefined) =>
    update((l) => {
      const versions = { ...l.versions };
      if (version) versions[key] = version;
      else delete versions[key];
      return { versions };
    });

  async function generate(key: VersionKey) {
    setBusy((b) => ({ ...b, [key]: true }));
    try {
      const res = await api<{ version: LessonVersion; suggestedGlossary?: GlossaryItem[] }>("/api/ai/versi", {
        method: "POST",
        body: { lessonId, jenis: key, bahasa: key === "daerah" ? lang : undefined, body: lesson.body },
      });
      // Fungsi updater: dua draf yang selesai hampir bersamaan tidak saling menimpa.
      update((l) => ({
        versions: { ...l.versions, [key]: res.version },
        ...(key === "mudah" && l.glossary.length === 0 && res.suggestedGlossary?.length
          ? { glossary: res.suggestedGlossary }
          : {}),
      }));
      toast.ok(
        `Draf ${key === "mudah" ? "teks mudah" : LANG_LABEL[res.version.lang ?? lang]} siap. Baca dan cek dulu.`,
      );
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy((b) => ({ ...b, [key]: false }));
    }
  }

  const tooShort = lesson.body.trim().length < 40;
  const anyBusy = busy.mudah || busy.daerah;

  return (
    <div className="space-y-6">
      <Notice tone="info">
        Huruf besar, kontras tinggi, spasi lega, dan dibacakan berlaku otomatis di layar siswa. Di sini Anda menyiapkan
        <strong> versi teks</strong>. Siswa hanya melihat versi yang sudah Anda tandai &ldquo;Sudah dicek&rdquo;.
      </Notice>

      {tooShort ? (
        <Notice tone="warn" title="Materi asli masih kosong">
          Tulis atau tempel materi di tab Materi dulu.{" "}
          <button type="button" className="font-bold underline" onClick={() => goTo("materi")}>
            Buka tab Materi
          </button>
        </Notice>
      ) : (
        aiOn && (
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="ai"
              disabled={anyBusy}
              onClick={() => {
                generate("mudah");
                generate("daerah");
              }}
            >
              {anyBusy ? <Spinner /> : <Sparkles className="size-4" aria-hidden />}
              {anyBusy ? "AI sedang menulis draf…" : "Buat draf semua versi dengan AI"}
            </Button>
            <span className="text-[14px] text-tinta-2">Sekitar 10–30 detik. Hasilnya draf, bukan versi final.</span>
          </div>
        )
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        {(["mudah", "daerah"] as const).map((key) => {
          const v = lesson.versions[key];
          const stale = !!v?.basedOn && v.basedOn !== bodyPrint;
          return (
            <section
              key={key}
              aria-labelledby={`versi-${key}`}
              className={cx(
                "flex flex-col rounded-2xl border bg-white p-5",
                v && !v.checked && v.text.trim() ? "border-aksen/60" : "border-garis",
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 id={`versi-${key}`} className="font-display text-lg font-bold">
                    {key === "daerah" ? `${INFO.daerah.title}: ${LANG_LABEL[v?.lang ?? lang]}` : INFO.mudah.title}
                  </h2>
                  <p className="mt-0.5 text-[14px] text-tinta-2">{INFO[key].text}</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {recommended[key] && <Badge tone="papan">Disarankan untuk kelas ini</Badge>}
                  {v?.text.trim() ? (
                    v.checked ? (
                      <Badge tone="ok">
                        <Check className="size-3.5" aria-hidden />
                        Sudah dicek
                      </Badge>
                    ) : (
                      <Badge tone="ai">{v.origin === "ai" ? "Draf AI, perlu dicek" : "Perlu dicek"}</Badge>
                    )
                  ) : (
                    <Badge>Belum ada</Badge>
                  )}
                </div>
              </div>

              {key === "daerah" && (
                <div className="mt-4 flex items-center gap-3">
                  <label htmlFor="bahasa-daerah" className="text-[15px] font-bold">
                    Bahasa
                  </label>
                  <Select
                    id="bahasa-daerah"
                    className="w-44"
                    value={v?.lang ?? lang}
                    onChange={(e) => {
                      const next = e.target.value as RegionalLang;
                      setLang(next);
                      if (v) setVersion("daerah", { ...v, lang: next });
                    }}
                  >
                    <option value="jw">Bahasa Jawa</option>
                    <option value="su">Bahasa Sunda</option>
                  </Select>
                </div>
              )}

              {stale && (
                <p className="mt-4 flex gap-2 rounded-lg bg-aksen-50 px-3 py-2 text-[14px] text-aksen">
                  <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                  Materi asli berubah setelah versi ini dibuat. Perbarui versinya atau sesuaikan manual.
                </p>
              )}

              {v ? (
                <>
                  <label htmlFor={`teks-${key}`} className="sr-only">
                    Teks versi {INFO[key].title}
                  </label>
                  <Textarea
                    id={`teks-${key}`}
                    rows={14}
                    className="mt-4"
                    value={v.text}
                    lang={key === "daerah" ? (v.lang === "su" ? "su" : "jv") : "id"}
                    onChange={(e) =>
                      setVersion(key, { ...v, text: e.target.value, updatedAt: new Date().toISOString() })
                    }
                  />
                  <p className="mt-1 text-[14px] text-tinta-2">
                    {wordCount(v.text)} kata, materi asli {wordCount(lesson.body)} kata.
                  </p>
                  {key === "daerah" && (
                    <div className="mt-4">
                      <p className="mb-2 text-[15px] font-bold">Glosarium dua bahasa</p>
                      <GlossaryEditor
                        layout="stack"
                        idPrefix="glos-daerah"
                        termLabel="Istilah"
                        meaningLabel="Arti (bahasa daerah + Indonesia)"
                        items={v.glossary}
                        onChange={(glossary) => setVersion("daerah", { ...v, glossary })}
                      />
                    </div>
                  )}
                  <div className="mt-5 flex flex-wrap gap-2 border-t border-garis pt-4">
                    <Button
                      variant={v.checked ? "secondary" : "primary"}
                      onClick={() =>
                        setVersion(key, { ...v, checked: !v.checked, basedOn: v.checked ? v.basedOn : bodyPrint })
                      }
                      disabled={!v.text.trim()}
                    >
                      <Check className="size-4" aria-hidden />
                      {v.checked ? "Batalkan tanda dicek" : "Tandai sudah dicek"}
                    </Button>
                    {aiOn && (
                      <Button variant="ai" disabled={busy[key] || tooShort} onClick={() => generate(key)}>
                        {busy[key] ? <Spinner /> : <RefreshCw className="size-4" aria-hidden />}
                        Buat ulang dengan AI
                      </Button>
                    )}
                    <Button variant="ghost" onClick={() => setVersion(key, undefined)}>
                      <Trash2 className="size-4" aria-hidden />
                      Hapus versi
                    </Button>
                  </div>
                </>
              ) : (
                <div className="mt-5 flex flex-1 flex-wrap content-end gap-2">
                  {aiOn && (
                    <Button variant="ai" disabled={busy[key] || tooShort} onClick={() => generate(key)}>
                      {busy[key] ? <Spinner /> : <Sparkles className="size-4" aria-hidden />}
                      {busy[key] ? "Menulis draf…" : "Buat draf dengan AI"}
                    </Button>
                  )}
                  <Button
                    variant="secondary"
                    onClick={() =>
                      setVersion(key, {
                        text: "",
                        glossary: [],
                        origin: "guru",
                        checked: false,
                        lang: key === "daerah" ? lang : undefined,
                        basedOn: bodyPrint,
                        updatedAt: new Date().toISOString(),
                      })
                    }
                  >
                    <PenLine className="size-4" aria-hidden />
                    Tulis sendiri
                  </Button>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
