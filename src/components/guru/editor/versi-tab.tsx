"use client";

// Peran 2: draf versi dari AI + review guru.

import {
  BookOpen,
  Check,
  Eye,
  Languages,
  PenLine,
  RefreshCw,
  ScrollText,
  Sparkles,
  SquarePen,
  Trash2,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { api } from "@/lib/client";
import { fingerprint, wordCount } from "@/lib/text";
import {
  VERSION_HTML_LANG,
  VERSION_KEYS,
  isRegionalVersion,
  type ClassNeeds,
  type GlossaryItem,
  type LessonVersion,
  type VersionKey,
} from "@/lib/types";
import { MODE_TONE, TONES } from "@/lib/modes";
import { ReaderText } from "../../reader-text";
import { Badge, Button, IconChip, Notice, Spinner, Textarea, cx } from "../../ui";
import { useToast } from "../../toast";
import { GlossaryEditor } from "./glossary-editor";
import type { EditableLesson, TabKey, UpdateLesson } from "./lesson-editor";
import { VersionComparison } from "./version-comparison";

type Cls = { id: string; name: string; grade: string; needs: ClassNeeds } | null;

const INFO: Record<VersionKey, { title: string; text: string }> = {
  mudah: {
    title: "Teks mudah",
    text: "Kalimat pendek dan kata sehari-hari, untuk siswa disleksia, sulit fokus, atau yang masih belajar Bahasa Indonesia.",
  },
  ringkasan: {
    title: "Ringkasan",
    text: "3–7 poin utama materi, untuk siswa yang sulit fokus pada teks panjang atau ingin mengulang dengan cepat.",
  },
  jawa: {
    title: "Basa Jawa",
    text: "Materi yang sama dalam Bahasa Jawa ragam ngoko yang sopan, dengan glosarium dua bahasa.",
  },
  sunda: {
    title: "Basa Sunda",
    text: "Materi yang sama dalam Bahasa Sunda ragam loma yang sopan, dengan glosarium dua bahasa.",
  },
};

const NO_BUSY: Record<VersionKey, boolean> = { mudah: false, ringkasan: false, jawa: false, sunda: false };

const ICON: Record<VersionKey, LucideIcon> = { mudah: BookOpen, ringkasan: ScrollText, jawa: Languages, sunda: Languages };

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
  const [busy, setBusy] = useState<Record<VersionKey, boolean>>(NO_BUSY);
  const [preview, setPreview] = useState<Record<VersionKey, boolean>>(NO_BUSY);
  const bodyPrint = fingerprint(lesson.body);
  const needs = cls?.needs;
  const regional = !!needs && needs.bahasaDaerah > 0;
  const recommended: Record<VersionKey, boolean> = {
    mudah: !!needs && needs.disleksia + needs.sulitFokus + needs.bahasaDaerah > 0,
    ringkasan: !!needs && needs.sulitFokus + needs.disleksia > 0,
    // Bahasa ibu di profil kelas menentukan versi daerah yang disarankan; bila belum dipilih, keduanya.
    jawa: regional && needs.bahasa !== "su",
    sunda: regional && needs.bahasa !== "jw",
  };

  const setVersion = (key: VersionKey, version: LessonVersion | undefined) =>
    update((l) => {
      const versions = { ...l.versions };
      if (version) {
        const before = l.versions[key];
        const changed = before && (before.text !== version.text || JSON.stringify(before.glossary) !== JSON.stringify(version.glossary));
        versions[key] = changed ? { ...version, checked: false } : version;
      }
      else delete versions[key];
      return { versions };
    });

  async function generate(key: VersionKey) {
    setBusy((b) => ({ ...b, [key]: true }));
    try {
      const res = await api<{ version: LessonVersion; suggestedGlossary?: GlossaryItem[] }>("/api/ai/versi", {
        method: "POST",
        body: { lessonId, jenis: key, body: lesson.body },
      });
      // Fungsi updater: dua draf yang selesai hampir bersamaan tidak saling menimpa.
      update((l) => ({
        versions: { ...l.versions, [key]: res.version },
        ...(key === "mudah" && l.glossary.length === 0 && res.suggestedGlossary?.length
          ? { glossary: res.suggestedGlossary }
          : {}),
      }));
      toast.ok(`Draf ${INFO[key].title} siap. Baca dan cek dulu.`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy((b) => ({ ...b, [key]: false }));
    }
  }

  const tooShort = lesson.body.trim().length < 40;
  const anyBusy = VERSION_KEYS.some((k) => busy[k]);
  // Tombol besar hanya mengisi versi yang masih kosong, supaya versi yang sudah diedit atau dicek tidak tertimpa.
  const missing = VERSION_KEYS.filter((k) => !lesson.versions[k]?.text.trim());

  /** Buat ulang satu versi; minta konfirmasi bila isinya sudah dicek atau ditulis guru. */
  function regenerate(key: VersionKey) {
    const v = lesson.versions[key];
    if (
      v?.text.trim() &&
      (v.checked || v.origin === "guru") &&
      !window.confirm(`Ganti isi versi ${INFO[key].title} dengan draf AI baru? Perubahan Anda di versi ini akan hilang.`)
    ) {
      return;
    }
    generate(key);
  }

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
            <Button variant="ai" disabled={anyBusy || missing.length === 0} onClick={() => missing.forEach(generate)}>
              {anyBusy ? <Spinner /> : <Sparkles className="size-4" aria-hidden />}
              {anyBusy
                ? "AI sedang menulis draf…"
                : missing.length === VERSION_KEYS.length
                  ? "Buat draf semua versi dengan AI"
                  : missing.length > 0
                    ? `Buat draf ${missing.length} versi yang belum ada`
                    : "Semua versi sudah ada"}
            </Button>
            <span className="text-[14px] text-tinta-2">
              Sekitar 10–30 detik. Hasilnya draf, bukan versi final. Versi yang sudah ada tidak ditimpa.
            </span>
          </div>
        )
      )}

      <VersionComparison body={lesson.body} versions={lesson.versions} />
      <div className="grid gap-6 xl:grid-cols-2">
        {VERSION_KEYS.map((key) => {
          const v = lesson.versions[key];
          const stale = !!v?.basedOn && v.basedOn !== bodyPrint;
          return (
            <section
              key={key}
              aria-labelledby={`versi-${key}`}
              className={cx(
                "flex flex-col overflow-hidden rounded-2xl border bg-white shadow-kartu",
                v && !v.checked && v.text.trim() ? "border-aksen/60" : "border-garis",
              )}
            >
              <div className={cx("h-1.5", TONES[MODE_TONE[key]].bar)} aria-hidden />
              <div className="flex flex-1 flex-col p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <IconChip icon={ICON[key]} tone={MODE_TONE[key]} />
                  <div className="min-w-0">
                    <h2 id={`versi-${key}`} className="font-display text-lg font-bold">
                      {INFO[key].title}
                    </h2>
                    <p className="mt-0.5 text-[14px] text-tinta-2">{INFO[key].text}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {recommended[key] && <Badge tone="papan">Disarankan untuk kelas ini</Badge>}
                  {isRegionalVersion(key) && v?.text.trim() && <Badge tone="info">Perlu dicek penutur asli</Badge>}
                  {v?.text.trim() ? (
                    v.checked ? (
                      <Badge tone="ok">
                        <Check className="size-3.5" aria-hidden />
                        Sudah dicek
                      </Badge>
                    ) : (
                      <Badge tone="ai">{v.origin === "ai" ? "Draf AI — wajib dicek guru" : "Perlu dicek"}</Badge>
                    )
                  ) : (
                    <Badge>Belum ada</Badge>
                  )}
                </div>
              </div>

              {isRegionalVersion(key) && v?.text.trim() && (
                <p className="mt-4 flex gap-2 rounded-xl bg-biru-50 px-3 py-2 text-[14px] text-info">
                  <Languages className="mt-0.5 size-4 shrink-0" aria-hidden />
                  Terjemahan {v.origin === "ai" ? "AI" : "ini"} bisa keliru dalam ragam bahasa atau istilah. Minta penutur
                  asli, misalnya guru bahasa daerah atau orang tua siswa, membacanya sebelum Anda menandai sudah dicek.
                </p>
              )}

              {stale && (
                <p className="mt-4 flex gap-2 rounded-xl bg-aksen-50 px-3 py-2 text-[14px] text-aksen">
                  <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                  Materi asli berubah setelah versi ini dibuat. Perbarui versinya atau sesuaikan manual.
                </p>
              )}

              {v ? (
                <>
                  <div className="mt-4 flex items-center justify-between gap-2">
                    <label htmlFor={`teks-${key}`} className="text-[14px] font-bold">
                      Teks versi {INFO[key].title}
                    </label>
                    <div className="flex rounded-lg bg-slate-100 p-0.5" role="group" aria-label={`Tampilan ${INFO[key].title}`}>
                      {(
                        [
                          [false, "Ubah", SquarePen],
                          [true, "Lihat hasil", Eye],
                        ] as const
                      ).map(([on, label, Icon]) => (
                        <button
                          key={label}
                          type="button"
                          aria-pressed={preview[key] === on}
                          onClick={() => setPreview((p) => ({ ...p, [key]: on }))}
                          className={cx(
                            "inline-flex h-8 items-center gap-1 rounded-md px-2.5 text-[13px] font-bold",
                            preview[key] === on ? "bg-white text-papan shadow-kartu" : "text-tinta-2",
                          )}
                        >
                          <Icon className="size-3.5" aria-hidden />
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {preview[key] ? (
                    <div
                      className="reader mt-2 max-h-[26rem] overflow-y-auto rounded-xl border border-garis px-4 py-4"
                      style={{ background: "#fff" }}
                      lang={VERSION_HTML_LANG[key]}
                    >
                      {v.text.trim() ? (
                        <div className="[&_.reader-text]:text-[17px]">
                          <ReaderText
                            text={v.text}
                            glossary={isRegionalVersion(key) ? v.glossary : [...v.glossary, ...lesson.glossary]}
                            figures={lesson.figures}
                          />
                        </div>
                      ) : (
                        <p className="text-tinta-2">Masih kosong.</p>
                      )}
                    </div>
                  ) : (
                    <Textarea
                      id={`teks-${key}`}
                      rows={14}
                      className="mt-2"
                      value={v.text}
                      lang={VERSION_HTML_LANG[key]}
                      onChange={(e) =>
                        setVersion(key, { ...v, text: e.target.value, updatedAt: new Date().toISOString() })
                      }
                    />
                  )}
                  <p className="mt-1 text-[14px] text-tinta-2">
                    {wordCount(v.text)} kata, materi asli {wordCount(lesson.body)} kata.
                  </p>
                  {isRegionalVersion(key) && (
                    <div className="mt-4">
                      <p className="mb-2 text-[15px] font-bold">Glosarium dua bahasa</p>
                      <GlossaryEditor
                        layout="stack"
                        idPrefix={`glos-${key}`}
                        termLabel="Istilah"
                        meaningLabel={`Arti (${INFO[key].title} + Indonesia)`}
                        items={v.glossary}
                        onChange={(glossary) => setVersion(key, { ...v, glossary })}
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
                      <Button variant="ai" disabled={busy[key] || tooShort} onClick={() => regenerate(key)}>
                        {busy[key] ? <Spinner /> : <RefreshCw className="size-4" aria-hidden />}
                        Buat ulang dengan AI
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      onClick={() => {
                        if (!v.text.trim() || window.confirm(`Hapus versi ${INFO[key].title}?`)) setVersion(key, undefined);
                      }}
                    >
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
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
