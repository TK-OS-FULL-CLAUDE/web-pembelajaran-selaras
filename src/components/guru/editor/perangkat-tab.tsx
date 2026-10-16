"use client";

// Peran 2 (fitur tambahan): Generator Perangkat Ajar.
// Dari satu materi, AI menyiapkan DRAF modul ajar ringkas, LKPD, LKPD versi sederhana (dari versi teks mudah),
// dan rubrik. Pola review sama dengan tab Versi: guru membaca, mengedit, lalu menandai sudah dicek.
// Cetak/simpan PDF memakai window.print() dengan CSS cetak (globals.css, bagian "Perangkat ajar").
// Perangkat ajar hanya untuk guru; satu-satunya yang tampil di halaman siswa adalah tugas berjenjang yang sudah dicek.

import { Check, PenLine, Plus, Printer, RefreshCw, Sparkles, Trash2, TriangleAlert, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { api } from "@/lib/client";
import { emptyJenjang, emptyLkpd, emptyModul, emptyRubrik, filled, kitPlain, type KitContext } from "@/lib/perangkat";
import { fingerprint } from "@/lib/text";
import {
  KIT_KEYS,
  KIT_LABEL,
  RUBRIK_LEVELS,
  type ClassNeeds,
  type KitData,
  type KitItem,
  type KitKey,
  JENJANG_INFO,
  JENJANG_KEYS,
  type Jenjang,
  type Lkpd,
  type ModulAjar,
  type Rubrik,
} from "@/lib/types";
import { Badge, Button, Field, Input, Notice, Spinner, Textarea, cx } from "../../ui";
import { KartuLipat, LipatSemuaBar } from "../../lipat";
import { useToast } from "../../toast";
import { FaithfulnessCheck } from "./faithfulness-check";
import { JenjangDoc, LkpdDoc, ModulDoc, RubrikDoc } from "./perangkat-doc";
import type { EditableLesson, TabKey, UpdateLesson } from "./lesson-editor";

type Cls = { id: string; name: string; grade: string; needs: ClassNeeds } | null;
type AnyItem = KitItem<KitData[KitKey]>;

const INFO: Record<KitKey, string> = {
  modul: "Identitas, tujuan pembelajaran, kegiatan pendahuluan–inti–penutup, asesmen, dan akomodasi sesuai profil kelas.",
  lkpd: "Lembar kerja siswa: petunjuk, 2–3 aktivitas, dan pertanyaan dengan ruang jawab.",
  lkpdMudah:
    "LKPD dengan kalimat pendek, huruf besar, dan ruang jawab lega, disusun dari versi Teks mudah. Untuk siswa disleksia, sulit fokus, atau yang masih belajar Bahasa Indonesia.",
  rubrik: "Kriteria penilaian LKPD dengan empat tingkat capaian: perlu bimbingan, cukup, baik, sangat baik.",
  jenjang:
    "Pembelajaran berdiferensiasi: tiga tugas lanjutan (penguatan, inti, tantangan). Setelah kuis, setiap siswa otomatis melihat tugas sesuai skornya, dan tab Rekap menunjukkan siapa di kelompok mana.",
};

const NO_FLAGS: Record<KitKey, boolean> = { modul: false, lkpd: false, lkpdMudah: false, rubrik: false, jenjang: false };

/** Batas yang sama dengan validasi server (api.ts), supaya simpan otomatis tidak ditolak. */
const MAX_LINES = 40;
const MAX_LINE = 800;

export function PerangkatTab({
  lessonId,
  lesson,
  update,
  cls,
  teacher,
  aiOn,
  goTo,
}: {
  lessonId: string;
  lesson: EditableLesson;
  update: UpdateLesson;
  cls: Cls;
  teacher: { name: string; school: string | null };
  aiOn: boolean;
  goTo: (tab: TabKey) => void;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState(NO_FLAGS);
  const [editing, setEditing] = useState(NO_FLAGS);
  const [printing, setPrinting] = useState<KitKey[] | null>(null);
  const latest = useRef(lesson);
  latest.current = lesson;

  const kit = lesson.teachingKit;
  const bodyPrint = fingerprint(lesson.body);
  const mudah = lesson.versions.mudah;
  const mudahText = mudah?.text.trim() ?? "";
  const hasMudah = mudahText.length >= 40;
  const tooShort = lesson.body.trim().length < 40;
  const needs = cls?.needs;
  const recommendSimple =
    !!needs && needs.disleksia + needs.sulitFokus + needs.bahasaDaerah + (needs.diskalkulia ?? 0) > 0;

  const ctx: KitContext = {
    teacherName: teacher.name,
    school: teacher.school,
    subject: lesson.subject,
    grade: cls?.grade ?? "",
    className: cls?.name ?? null,
    title: lesson.title,
  };

  const sourcePrint = (key: KitKey) => (key === "lkpdMudah" ? fingerprint(mudahText) : bodyPrint);
  // Perangkat yang sudah dicek dan masih sesuai sumbernya diciutkan; yang perlu tindakan dibuka.
  const [open, setOpen] = useState<Record<KitKey, boolean>>(() =>
    Object.fromEntries(
      KIT_KEYS.map((k) => {
        const it = kit[k];
        return [k, !it || !it.checked || (!!it.basedOn && it.basedOn !== sourcePrint(k))];
      }),
    ) as Record<KitKey, boolean>,
  );
  const canGenerate = (key: KitKey) => !tooShort && (key !== "lkpdMudah" || hasMudah);

  function setItem<K extends KitKey>(key: K, item: KitItem<KitData[K]> | undefined) {
    update((l) => {
      const teachingKit = { ...l.teachingKit };
      if (item) (teachingKit as Record<KitKey, AnyItem>)[key] = item as AnyItem;
      else delete teachingKit[key];
      return { teachingKit };
    });
  }

  function setData<K extends KitKey>(key: K, data: KitData[K]) {
    update((l) => {
      const current = l.teachingKit[key];
      if (!current) return {};
      return {
        teachingKit: { ...l.teachingKit, [key]: { ...current, data, updatedAt: new Date().toISOString() } },
      };
    });
  }

  /** Konteks agar LKPD dan rubrik selaras dengan modul ajar dan LKPD yang sudah ada. */
  function related(override: { modul?: ModulAjar; lkpd?: Lkpd } = {}) {
    const k = latest.current.teachingKit;
    const modul = override.modul ?? k.modul?.data;
    const lkpd = override.lkpd ?? k.lkpd?.data;
    return {
      tujuan: modul ? filled(modul.tujuan) : undefined,
      aktivitas: lkpd
        ? lkpd.aktivitas.map((a, i) => `${a.judul || `Aktivitas ${i + 1}`}: ${filled(a.pertanyaan).join(" ")}`)
        : undefined,
    };
  }

  async function generate<K extends KitKey>(
    key: K,
    override: { modul?: ModulAjar; lkpd?: Lkpd } = {},
  ): Promise<KitItem<KitData[K]> | null> {
    setBusy((b) => ({ ...b, [key]: true }));
    try {
      const l = latest.current;
      const res = await api<{ item: KitItem<KitData[K]> }>("/api/ai/perangkat", {
        method: "POST",
        body: {
          lessonId,
          jenis: key,
          body: l.body,
          mudahText: key === "lkpdMudah" ? l.versions.mudah?.text : undefined,
          ...(key === "lkpd" || key === "rubrik" || key === "jenjang" ? related(override) : {}),
        },
      });
      setItem(key, res.item);
      setEditing((e) => ({ ...e, [key]: false }));
      toast.ok(`Draf ${KIT_LABEL[key]} siap. Baca dan cek dulu.`);
      return res.item;
    } catch (err) {
      toast.error(`${KIT_LABEL[key]}: ${(err as Error).message}`);
      return null;
    } finally {
      setBusy((b) => ({ ...b, [key]: false }));
    }
  }

  const missing = KIT_KEYS.filter((k) => !kit[k] && canGenerate(k));
  const anyBusy = KIT_KEYS.some((k) => busy[k]);

  /**
   * Modul, LKPD, dan LKPD sederhana dibuat bersamaan; rubrik dan tugas berjenjang menyusul supaya mengacu ke
   * tujuan dan aktivitas yang baru dibuat.
   */
  async function generateMissing() {
    const later: KitKey[] = ["rubrik", "jenjang"];
    const first = missing.filter((k) => !later.includes(k));
    const results = await Promise.all(first.map((k) => generate(k)));
    const got = Object.fromEntries(first.map((k, i) => [k, results[i]?.data]));
    const override = { modul: got.modul as ModulAjar | undefined, lkpd: got.lkpd as Lkpd | undefined };
    await Promise.all(missing.filter((k) => later.includes(k)).map((k) => generate(k, override)));
  }

  function regenerate(key: KitKey) {
    const item = kit[key];
    if (
      item &&
      (item.checked || item.origin === "guru") &&
      !window.confirm(`Ganti ${KIT_LABEL[key]} dengan draf AI baru? Perubahan Anda di perangkat ini akan hilang.`)
    ) {
      return;
    }
    generate(key);
  }

  function startManual(key: KitKey) {
    const data =
      key === "modul"
        ? emptyModul(ctx)
        : key === "rubrik"
          ? emptyRubrik(lesson.title)
          : key === "jenjang"
            ? emptyJenjang()
            : emptyLkpd(lesson.title);
    setItem(key, {
      data,
      origin: "guru",
      checked: false,
      basedOn: sourcePrint(key),
      updatedAt: new Date().toISOString(),
    } as AnyItem);
    setEditing((e) => ({ ...e, [key]: true }));
  }

  // ---------- Cetak / simpan PDF ----------
  useEffect(() => {
    if (!printing) return;
    const title = document.title;
    document.title =
      printing.length === 1 ? `${KIT_LABEL[printing[0]]} - ${lesson.title}` : `Perangkat ajar - ${lesson.title}`;
    document.body.classList.add("cetak-perangkat");
    const finish = () => setPrinting(null);
    window.addEventListener("afterprint", finish);
    // Beri waktu area cetak dirender dulu.
    const t = window.setTimeout(() => window.print(), 80);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("afterprint", finish);
      document.body.classList.remove("cetak-perangkat");
      document.title = title;
    };
  }, [printing, lesson.title]);

  const existing = KIT_KEYS.filter((k) => kit[k]);
  const uncheckedExisting = existing.filter((k) => !kit[k]!.checked);

  return (
    <div className="space-y-6">
      <Notice tone="info">
        Perangkat ajar hanya untuk Anda, kecuali <strong>Tugas berjenjang</strong> yang sudah Anda tandai dicek: tugas
        itu tampil di layar hasil kuis siswa. Hasil AI adalah <strong>draf</strong>: baca,
        sesuaikan dengan kelas Anda, lalu tandai &ldquo;Sudah dicek&rdquo;. Perangkat yang belum dicek tetap bisa dicetak,
        dengan tanda &ldquo;Draf AI — wajib dicek guru&rdquo; di kertasnya.
      </Notice>

      {tooShort ? (
        <Notice tone="warn" title="Materi asli masih kosong">
          Perangkat ajar disusun dari materi. Tulis atau tempel materi di tab Materi dulu.{" "}
          <button type="button" className="font-bold underline" onClick={() => goTo("materi")}>
            Buka tab Materi
          </button>
        </Notice>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          {aiOn && (
            <Button variant="ai" disabled={anyBusy || missing.length === 0} onClick={generateMissing}>
              {anyBusy ? <Spinner /> : <Sparkles className="size-4" aria-hidden />}
              {anyBusy
                ? "AI sedang menyusun draf…"
                : missing.length === 0
                  ? "Semua perangkat sudah ada"
                  : missing.length === KIT_KEYS.length
                    ? "Buat draf semua perangkat dengan AI"
                    : `Buat draf ${missing.length} perangkat yang belum ada`}
            </Button>
          )}
          <Button variant="secondary" disabled={existing.length === 0} onClick={() => setPrinting(existing)}>
            <Printer className="size-4" aria-hidden />
            Cetak semua
          </Button>
          <span className="text-[14px] text-tinta-2">
            {aiOn
              ? "Sekitar 20–40 detik. Perangkat yang sudah ada tidak ditimpa; rubrik dibuat terakhir supaya sesuai tujuan dan LKPD."
              : "AI belum aktif. Anda tetap bisa mengisi perangkat sendiri lalu mencetaknya."}
            {uncheckedExisting.length > 0 && ` ${uncheckedExisting.length} perangkat belum dicek.`}
          </span>
        </div>
      )}

      {existing.length > 0 && (
        <div className="flex justify-end">
          <LipatSemuaBar
            label="perangkat"
            onSet={(o) => setOpen(Object.fromEntries(KIT_KEYS.map((k) => [k, o])) as Record<KitKey, boolean>)}
          />
        </div>
      )}
      {KIT_KEYS.map((key) => {
        const item = kit[key];
        const stale = !!item?.basedOn && item.basedOn !== sourcePrint(key);
        return (
          <KartuLipat
            key={key}
            id={`perangkat-${key}`}
            heading={KIT_LABEL[key]}
            highlight={!!item && !item.checked}
            open={open[key]}
            onToggle={() => setOpen((o) => ({ ...o, [key]: !o[key] }))}
            summary={item ? INFO[key] : "Belum ada. Buka untuk membuat draf dengan AI atau mengisinya sendiri."}
            badges={
              <>
                {key === "lkpdMudah" && recommendSimple && <Badge tone="papan">Disarankan untuk kelas ini</Badge>}
                {item ? (
                  item.checked ? (
                    <Badge tone="ok">
                      <Check className="size-3.5" aria-hidden />
                      Sudah dicek
                    </Badge>
                  ) : (
                    <Badge tone="ai">{item.origin === "ai" ? "Draf AI — wajib dicek guru" : "Perlu dicek"}</Badge>
                  )
                ) : (
                  <Badge>Belum ada</Badge>
                )}
                {stale && <Badge tone="ai">Sumber berubah</Badge>}
              </>
            }
          >
            <p className="max-w-2xl text-[14px] text-tinta-2">{INFO[key]}</p>

            {key === "lkpdMudah" && !hasMudah && !item && (
              <p className="mt-4 rounded-lg bg-papan-50 px-3 py-2 text-[14px]">
                LKPD ini disusun dari versi Teks mudah, yang belum ada.{" "}
                <button type="button" className="font-bold text-papan underline" onClick={() => goTo("versi")}>
                  Buat versi Teks mudah di tab Versi
                </button>
              </p>
            )}
            {key === "lkpdMudah" && hasMudah && !mudah?.checked && (
              <p className="mt-4 flex gap-2 rounded-lg bg-aksen-50 px-3 py-2 text-[14px] text-aksen">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                Versi Teks mudah belum Anda tandai sudah dicek. Sebaiknya cek dulu supaya LKPD ini memakai teks yang benar.
              </p>
            )}
            {stale && (
              <p className="mt-4 flex gap-2 rounded-lg bg-aksen-50 px-3 py-2 text-[14px] text-aksen">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                {key === "lkpdMudah" ? "Versi Teks mudah" : "Materi asli"} berubah setelah perangkat ini dibuat. Buat
                ulang atau sesuaikan manual.
              </p>
            )}

            {item ? (
              <>
                <div className="mt-4">
                  {editing[key] ? (
                    <KitEditor kitKey={key} item={item} onChange={(data) => setData(key, data)} />
                  ) : (
                    <div className="rounded-xl surface-card bg-kertas/60 p-4 sm:p-6">
                      <KitDoc kitKey={key} item={item} level={3} />
                    </div>
                  )}
                  <FaithfulnessCheck
                    lessonId={lessonId}
                    target={key}
                    draft={kitPlain(key, item.data)}
                    source={key === "lkpdMudah" ? mudahText : lesson.body}
                    sourceLabel={key === "lkpdMudah" ? "versi Teks mudah" : "materi asli"}
                    aiOn={aiOn}
                    checkNumbers={false}
                  />
                </div>
                <div className="mt-5 flex flex-wrap gap-2 border-t border-garis pt-4">
                  <Button
                    variant={item.checked ? "secondary" : "primary"}
                    onClick={() =>
                      setItem(key, {
                        ...item,
                        checked: !item.checked,
                        basedOn: item.checked ? item.basedOn : sourcePrint(key),
                      } as AnyItem)
                    }
                  >
                    <Check className="size-4" aria-hidden />
                    {item.checked ? "Batalkan tanda dicek" : "Tandai sudah dicek"}
                  </Button>
                  <Button
                    variant="secondary"
                    aria-pressed={editing[key]}
                    onClick={() => setEditing((e) => ({ ...e, [key]: !e[key] }))}
                  >
                    {editing[key] ? <Check className="size-4" aria-hidden /> : <PenLine className="size-4" aria-hidden />}
                    {editing[key] ? "Selesai mengedit" : "Edit"}
                  </Button>
                  <Button variant="secondary" onClick={() => setPrinting([key])}>
                    <Printer className="size-4" aria-hidden />
                    Cetak / simpan PDF
                  </Button>
                  {aiOn && (
                    <Button variant="ai" disabled={busy[key] || !canGenerate(key)} onClick={() => regenerate(key)}>
                      {busy[key] ? <Spinner /> : <RefreshCw className="size-4" aria-hidden />}
                      Buat ulang dengan AI
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    onClick={() => {
                      if (window.confirm(`Hapus ${KIT_LABEL[key]}?`)) {
                        setItem(key, undefined);
                        setEditing((e) => ({ ...e, [key]: false }));
                      }
                    }}
                  >
                    <Trash2 className="size-4" aria-hidden />
                    Hapus
                  </Button>
                </div>
              </>
            ) : (
              <div className="mt-5 flex flex-wrap gap-2">
                {aiOn && (
                  <Button variant="ai" disabled={busy[key] || !canGenerate(key)} onClick={() => generate(key)}>
                    {busy[key] ? <Spinner /> : <Sparkles className="size-4" aria-hidden />}
                    {busy[key] ? "Menyusun draf…" : "Buat draf dengan AI"}
                  </Button>
                )}
                <Button variant="secondary" disabled={busy[key]} onClick={() => startManual(key)}>
                  <PenLine className="size-4" aria-hidden />
                  Isi sendiri
                </Button>
              </div>
            )}
          </KartuLipat>
        );
      })}

      {printing &&
        createPortal(
          <div id="area-cetak">
            {printing.map((key) => {
              const item = kit[key];
              return item ? (
                <div key={key} className="dok-halaman">
                  <KitDoc kitKey={key} item={item} level={1} />
                </div>
              ) : null;
            })}
          </div>,
          document.body,
        )}
    </div>
  );
}

function KitDoc({ kitKey, item, level }: { kitKey: KitKey; item: AnyItem; level: number }) {
  if (kitKey === "modul") return <ModulDoc data={item.data as ModulAjar} checked={item.checked} level={level} />;
  if (kitKey === "rubrik") return <RubrikDoc data={item.data as Rubrik} checked={item.checked} level={level} />;
  if (kitKey === "jenjang") return <JenjangDoc data={item.data as Jenjang} checked={item.checked} level={level} />;
  return <LkpdDoc data={item.data as Lkpd} checked={item.checked} simple={kitKey === "lkpdMudah"} level={level} />;
}

function KitEditor({
  kitKey,
  item,
  onChange,
}: {
  kitKey: KitKey;
  item: AnyItem;
  onChange: (data: KitData[KitKey]) => void;
}) {
  if (kitKey === "modul") return <ModulEditor data={item.data as ModulAjar} onChange={onChange} />;
  if (kitKey === "rubrik") return <RubrikEditor data={item.data as Rubrik} onChange={onChange} />;
  if (kitKey === "jenjang") return <JenjangEditor data={item.data as Jenjang} onChange={onChange} />;
  return <LkpdEditor idPrefix={kitKey} data={item.data as Lkpd} onChange={onChange} />;
}

// ---------- Editor ----------

/** Textarea untuk daftar: satu butir per baris. Baris kosong dibiarkan saat mengetik dan diabaikan saat dicetak. */
function LinesField({
  id,
  label,
  hint = "Satu butir per baris.",
  items,
  onChange,
  minRows = 3,
}: {
  id: string;
  label: string;
  hint?: string;
  items: string[];
  onChange: (items: string[]) => void;
  minRows?: number;
}) {
  const joined = items.join("\n");
  const [text, setText] = useState(joined);
  const [prev, setPrev] = useState(items);
  // Isi berubah dari luar (mis. draf AI baru): ikuti. Perubahan dari ketikan sendiri tidak mereset kursor.
  if (items !== prev) {
    setPrev(items);
    if (joined !== text) setText(joined);
  }
  return (
    <Field label={label} hint={hint} htmlFor={id}>
      <Textarea
        id={id}
        rows={Math.min(12, Math.max(minRows, text.split("\n").length + 1))}
        value={text}
        onChange={(e) => {
          const lines = e.target.value.split("\n").slice(0, MAX_LINES);
          const next = lines.map((s) => s.slice(0, MAX_LINE));
          setText(next.join("\n"));
          onChange(next);
        }}
      />
    </Field>
  );
}

function Fieldset({ legend, children, onRemove }: { legend: string; children: ReactNode; onRemove?: () => void }) {
  return (
    <fieldset className="rounded-xl surface-card p-4">
      <legend className="px-1 font-bold">{legend}</legend>
      <div className="space-y-4">{children}</div>
      {onRemove && (
        <Button variant="ghost" size="sm" className="mt-3" onClick={onRemove}>
          <X className="size-4" aria-hidden />
          Hapus {legend.toLowerCase()}
        </Button>
      )}
    </fieldset>
  );
}

const IDENTITAS_FIELDS: [keyof ModulAjar["identitas"], string, number][] = [
  ["penyusun", "Penyusun", 160],
  ["sekolah", "Satuan pendidikan", 160],
  ["mapel", "Mata pelajaran", 120],
  ["kelas", "Kelas", 160],
  ["fase", "Fase", 20],
  ["topik", "Materi", 200],
  ["alokasi", "Alokasi waktu", 120],
];

function ModulEditor({ data, onChange }: { data: ModulAjar; onChange: (d: ModulAjar) => void }) {
  const set = (patch: Partial<ModulAjar>) => onChange({ ...data, ...patch });
  const total = data.pendahuluan.menit + data.inti.menit + data.penutup.menit;
  const tahap: ["pendahuluan" | "inti" | "penutup", string][] = [
    ["pendahuluan", "Pendahuluan"],
    ["inti", "Kegiatan inti"],
    ["penutup", "Penutup"],
  ];
  return (
    <div className="space-y-5">
      <Fieldset legend="Identitas">
        <div className="grid gap-4 sm:grid-cols-2">
          {IDENTITAS_FIELDS.map(([key, label, max]) => (
            <Field key={key} label={label} htmlFor={`modul-id-${key}`}>
              <Input
                id={`modul-id-${key}`}
                value={data.identitas[key]}
                maxLength={max}
                onChange={(e) => set({ identitas: { ...data.identitas, [key]: e.target.value } })}
              />
            </Field>
          ))}
        </div>
      </Fieldset>
      <LinesField
        id="modul-tujuan"
        label="A. Tujuan pembelajaran"
        items={data.tujuan}
        onChange={(tujuan) => set({ tujuan })}
      />
      <LinesField
        id="modul-sarana"
        label="B. Media, alat, dan bahan"
        items={data.sarana}
        onChange={(sarana) => set({ sarana })}
      />
      <Fieldset legend="C. Kegiatan pembelajaran">
        <p className="text-[14px] text-tinta-2">Total {total} menit. Sesuaikan dengan alokasi waktu ({data.identitas.alokasi || "belum diisi"}).</p>
        {tahap.map(([key, label]) => (
          <div key={key} className="grid gap-3 sm:grid-cols-[8rem_1fr]">
            <Field label={`${label} (menit)`} htmlFor={`modul-${key}-menit`}>
              <Input
                id={`modul-${key}-menit`}
                type="number"
                inputMode="numeric"
                min={0}
                max={600}
                value={data[key].menit}
                onChange={(e) =>
                  set({ [key]: { ...data[key], menit: Math.max(0, Math.min(600, Math.round(Number(e.target.value) || 0))) } })
                }
              />
            </Field>
            <LinesField
              id={`modul-${key}-langkah`}
              label={`Langkah ${label.toLowerCase()}`}
              hint="Satu langkah per baris, berurutan."
              items={data[key].langkah}
              onChange={(langkah) => set({ [key]: { ...data[key], langkah } })}
            />
          </div>
        ))}
      </Fieldset>
      <LinesField id="modul-asesmen" label="D. Asesmen" items={data.asesmen} onChange={(asesmen) => set({ asesmen })} />
      <LinesField
        id="modul-akomodasi"
        label="E. Akomodasi untuk kebutuhan kelas"
        hint="Satu butir per baris. Kosongkan bila tidak perlu; bagian ini tidak dicetak bila kosong."
        items={data.akomodasi}
        onChange={(akomodasi) => set({ akomodasi })}
      />
    </div>
  );
}

function LkpdEditor({ idPrefix, data, onChange }: { idPrefix: string; data: Lkpd; onChange: (d: Lkpd) => void }) {
  const set = (patch: Partial<Lkpd>) => onChange({ ...data, ...patch });
  const setAktivitas = (i: number, patch: Partial<Lkpd["aktivitas"][number]>) =>
    set({ aktivitas: data.aktivitas.map((a, j) => (j === i ? { ...a, ...patch } : a)) });
  return (
    <div className="space-y-5">
      <Field label="Judul LKPD" htmlFor={`${idPrefix}-judul`}>
        <Input
          id={`${idPrefix}-judul`}
          value={data.judul}
          maxLength={200}
          onChange={(e) => set({ judul: e.target.value })}
        />
      </Field>
      <Field label="Tujuan" htmlFor={`${idPrefix}-tujuan`}>
        <Textarea
          id={`${idPrefix}-tujuan`}
          rows={2}
          value={data.tujuan}
          maxLength={600}
          onChange={(e) => set({ tujuan: e.target.value })}
        />
      </Field>
      <LinesField
        id={`${idPrefix}-petunjuk`}
        label="Petunjuk"
        items={data.petunjuk}
        onChange={(petunjuk) => set({ petunjuk })}
      />
      {data.aktivitas.map((a, i) => (
        <Fieldset
          key={i}
          legend={`Aktivitas ${i + 1}`}
          onRemove={
            data.aktivitas.length > 1 ? () => set({ aktivitas: data.aktivitas.filter((_, j) => j !== i) }) : undefined
          }
        >
          <Field label="Judul aktivitas" htmlFor={`${idPrefix}-a${i}-judul`}>
            <Input
              id={`${idPrefix}-a${i}-judul`}
              value={a.judul}
              maxLength={200}
              onChange={(e) => setAktivitas(i, { judul: e.target.value })}
            />
          </Field>
          <LinesField
            id={`${idPrefix}-a${i}-langkah`}
            label="Langkah kegiatan"
            hint="Satu langkah per baris. Boleh dikosongkan."
            minRows={2}
            items={a.langkah}
            onChange={(langkah) => setAktivitas(i, { langkah })}
          />
          <LinesField
            id={`${idPrefix}-a${i}-pertanyaan`}
            label="Pertanyaan"
            hint="Satu pertanyaan per baris. Ruang jawab ditambahkan otomatis saat dicetak."
            items={a.pertanyaan}
            onChange={(pertanyaan) => setAktivitas(i, { pertanyaan })}
          />
        </Fieldset>
      ))}
      {data.aktivitas.length < 10 && (
        <Button
          variant="secondary"
          size="sm"
          onClick={() =>
            set({
              aktivitas: [
                ...data.aktivitas,
                { judul: `Aktivitas ${data.aktivitas.length + 1}`, langkah: [""], pertanyaan: [""] },
              ],
            })
          }
        >
          <Plus className="size-4" aria-hidden />
          Tambah aktivitas
        </Button>
      )}
    </div>
  );
}

function RubrikEditor({ data, onChange }: { data: Rubrik; onChange: (d: Rubrik) => void }) {
  const set = (patch: Partial<Rubrik>) => onChange({ ...data, ...patch });
  const setKriteria = (i: number, patch: Partial<Rubrik["kriteria"][number]>) =>
    set({ kriteria: data.kriteria.map((k, j) => (j === i ? { ...k, ...patch } : k)) });
  return (
    <div className="space-y-5">
      <Field label="Judul rubrik" htmlFor="rubrik-judul">
        <Input id="rubrik-judul" value={data.judul} maxLength={200} onChange={(e) => set({ judul: e.target.value })} />
      </Field>
      {data.kriteria.map((k, i) => (
        <Fieldset
          key={i}
          legend={`Kriteria ${i + 1}`}
          onRemove={
            data.kriteria.length > 1 ? () => set({ kriteria: data.kriteria.filter((_, j) => j !== i) }) : undefined
          }
        >
          <Field label="Aspek yang dinilai" htmlFor={`rubrik-k${i}-nama`}>
            <Input
              id={`rubrik-k${i}-nama`}
              value={k.nama}
              maxLength={200}
              onChange={(e) => setKriteria(i, { nama: e.target.value })}
            />
          </Field>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {RUBRIK_LEVELS.map((label, j) => (
              <Field key={label} label={`${label} (${j + 1})`} htmlFor={`rubrik-k${i}-l${j}`}>
                <Textarea
                  id={`rubrik-k${i}-l${j}`}
                  rows={4}
                  maxLength={MAX_LINE}
                  value={k.level[j] ?? ""}
                  onChange={(e) =>
                    setKriteria(i, {
                      level: RUBRIK_LEVELS.map((_, n) => (n === j ? e.target.value : (k.level[n] ?? ""))),
                    })
                  }
                />
              </Field>
            ))}
          </div>
        </Fieldset>
      ))}
      {data.kriteria.length < 12 && (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => set({ kriteria: [...data.kriteria, { nama: "", level: RUBRIK_LEVELS.map(() => "") }] })}
        >
          <Plus className="size-4" aria-hidden />
          Tambah kriteria
        </Button>
      )}
    </div>
  );
}

function JenjangEditor({ data, onChange }: { data: Jenjang; onChange: (d: Jenjang) => void }) {
  return (
    <div className="space-y-5">
      {JENJANG_KEYS.map((key) => {
        const t = data[key];
        const set = (patch: Partial<Jenjang[typeof key]>) => onChange({ ...data, [key]: { ...t, ...patch } });
        return (
          <Fieldset key={key} legend={`${JENJANG_INFO[key].label} (${JENJANG_INFO[key].range})`}>
            <Field label="Judul tugas" htmlFor={`jenjang-${key}-judul`}>
              <Input
                id={`jenjang-${key}-judul`}
                value={t.judul}
                maxLength={200}
                onChange={(e) => set({ judul: e.target.value })}
              />
            </Field>
            <Field label="Apa yang dikerjakan siswa" htmlFor={`jenjang-${key}-tugas`}>
              <Textarea
                id={`jenjang-${key}-tugas`}
                rows={3}
                maxLength={1200}
                value={t.tugas}
                onChange={(e) => set({ tugas: e.target.value })}
              />
            </Field>
            <LinesField
              id={`jenjang-${key}-langkah`}
              label="Langkah"
              hint="Satu langkah per baris."
              items={t.langkah}
              onChange={(langkah) => set({ langkah })}
            />
          </Fieldset>
        );
      })}
    </div>
  );
}
