"use client";

// Editor materi (Peran 1 + 2 + 4): satu layar dengan enam tab.
// Perubahan tersimpan otomatis 1 detik setelah guru berhenti mengetik (atau langsung dengan Ctrl/Cmd+S).
// Setiap simpan membawa nomor revisi; bila materi diubah di tab/perangkat lain, simpan ditolak sebagai
// konflik dan guru memilih: muat versi terbaru, atau simpan versi miliknya.

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  CircleAlert,
  ClipboardList,
  Copy,
  ExternalLink,
  FileText,
  Layers,
  ListChecks,
  Presentation,
  Send,
  Settings2,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { LessonStats } from "@/lib/data";
import { api, ApiError } from "@/lib/client";
import { questionProblem } from "@/lib/quiz";
import { figureIds } from "@/lib/text";
import type { ClassNeeds, GlossaryItem, LessonFigures, LessonVersions, QuizQuestion, TeachingKit } from "@/lib/types";
import { Badge, Button, Notice, Select, Spinner, buttonClass, cx } from "../../ui";
import { useToast } from "../../toast";
import { BagikanTab } from "./bagikan-tab";
import { KuisTab } from "./kuis-tab";
import { MateriTab } from "./materi-tab";
import { PerangkatTab } from "./perangkat-tab";
import { RekapTab } from "./rekap-tab";
import { VersiTab } from "./versi-tab";
import { HistoryPanel } from "./history-panel";

export type EditableLesson = {
  topic?: string;
  target_grade?: string;
  is_template?: boolean;
  title: string;
  subject: string;
  body: string;
  glossary: GlossaryItem[];
  versions: LessonVersions;
  quiz: QuizQuestion[];
  figures: LessonFigures;
  teachingKit: TeachingKit;
  practice: QuizQuestion[];
};

/** Perubahan biasa, atau fungsi bila perubahan bergantung pada isi terbaru (mis. hasil AI yang datang belakangan). */
export type LessonPatch = Partial<EditableLesson> | ((current: EditableLesson) => Partial<EditableLesson>);
export type UpdateLesson = (patch: LessonPatch) => void;

type Cls = { id: string; name: string; grade: string; needs: ClassNeeds };

export type EditorProps = {
  lessonId: string;
  initial: EditableLesson;
  revision: number;
  status: "draft" | "published";
  shareCode: string | null;
  cls: Cls | null;
  classes: { id: string; name: string }[];
  teacher: { name: string; school: string | null };
  aiOn: boolean;
  stats: LessonStats;
  initialTab: TabKey;
};

const TABS: { key: "materi" | "versi" | "perangkat" | "kuis" | "bagikan" | "rekap"; label: string; icon: LucideIcon }[] = [
  { key: "materi", label: "Materi", icon: FileText },
  { key: "versi", label: "Versi", icon: Layers },
  { key: "perangkat", label: "Perangkat Ajar", icon: ClipboardList },
  { key: "kuis", label: "Kuis", icon: ListChecks },
  { key: "bagikan", label: "Bagikan", icon: Send },
  { key: "rekap", label: "Rekap", icon: BarChart3 },
];
export type TabKey = (typeof TABS)[number]["key"];

type SaveState = "saved" | "dirty" | "saving" | "error" | "conflict";

export function LessonEditor(props: EditorProps) {
  const [lesson, setLesson] = useState<EditableLesson>(props.initial);
  const [tab, setTab] = useState<TabKey>(props.initialTab);
  const [status, setStatus] = useState(props.status);
  const [shareCode, setShareCode] = useState(props.shareCode);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [manageOpen, setManageOpen] = useState(false);
  const [openingProjector, setOpeningProjector] = useState(false);
  const router = useRouter();
  const toast = useToast();

  const changeCount = useRef(0); // bertambah setiap ada perubahan di editor
  const savedChangeCount = useRef(0); // perubahan terakhir yang sudah tersimpan
  const serverRevision = useRef(props.revision); // revisi materi di database yang kita kenal
  const skipUnloadWarning = useRef(false);
  const latest = useRef(lesson);
  latest.current = lesson;
  const saving = useRef<Promise<void> | null>(null);

  const update = useCallback((patch: LessonPatch) => {
    setLesson((l) => ({ ...l, ...(typeof patch === "function" ? patch(l) : patch) }));
    changeCount.current++;
    setSaveState((s) => (s === "conflict" ? s : "dirty"));
  }, []);

  const save = useCallback(
    async (opts: { force?: boolean } = {}) => {
      if (saving.current) await saving.current;
      if (savedChangeCount.current === changeCount.current && !opts.force) return;
      const target = changeCount.current;
      setSaveState("saving");
      const run = (async () => {
        try {
          const res = await api<{ revision: number }>(`/api/materi/${props.lessonId}`, {
            method: "PATCH",
            body: { ...latest.current, baseRevision: serverRevision.current, force: opts.force || undefined },
          });
          serverRevision.current = res.revision;
          savedChangeCount.current = target;
          setSaveError(null);
          setSaveState(changeCount.current === target ? "saved" : "dirty");
        } catch (err) {
          if (err instanceof ApiError && err.status === 409) {
            setSaveState("conflict");
            return;
          }
          setSaveError((err as Error).message);
          setSaveState("error");
        }
      })();
      saving.current = run;
      await run;
      saving.current = null;
    },
    [props.lessonId],
  );

  // Simpan otomatis
  useEffect(() => {
    if (saveState !== "dirty") return;
    const t = setTimeout(() => save(), 1000);
    return () => clearTimeout(t);
  }, [lesson, saveState, save]);

  // Ctrl/Cmd+S = simpan sekarang
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        save();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [save]);

  // Peringatan bila menutup halaman sebelum tersimpan
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!skipUnloadWarning.current && savedChangeCount.current !== changeCount.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  const selectTab = (key: TabKey) => {
    setTab(key);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", key);
    window.history.replaceState(null, "", url);
  };

  const reloadLatest = () => {
    skipUnloadWarning.current = true;
    window.location.reload();
  };

  const flushOrThrow = async () => {
    await save();
    if (savedChangeCount.current !== changeCount.current) throw new Error("Perubahan belum tersimpan. Selesaikan konflik atau coba simpan lagi.");
    return serverRevision.current;
  };

  /** Mode proyektor membaca materi dari server, jadi simpan dulu perubahan yang belum tersimpan. */
  const openProjector = async (from: TabKey) => {
    setOpeningProjector(true);
    try {
      await flushOrThrow();
      router.push(`/proyektor/${props.lessonId}?dari=${from}`);
    } catch (err) {
      toast.error((err as Error).message);
      setOpeningProjector(false);
    }
  };

  const uncheckedVersions = Object.values(lesson.versions).filter((v) => v && v.text.trim() && !v.checked).length;
  const uncheckedFigures = figureIds(lesson.body).filter(
    (id) => !lesson.figures[id]?.alt?.trim() || !lesson.figures[id]?.altChecked,
  ).length;
  const incompleteQuestions = lesson.quiz.filter((q) => questionProblem(q) !== null).length;
  const uncheckedKit = Object.values(lesson.teachingKit ?? {}).filter((k) => k && !k.checked).length;
  const badges: Partial<Record<TabKey, { n: number; label: string }>> = {
    materi: uncheckedFigures ? { n: uncheckedFigures, label: `${uncheckedFigures} gambar perlu deskripsi` } : undefined,
    versi: uncheckedVersions ? { n: uncheckedVersions, label: `${uncheckedVersions} versi perlu dicek` } : undefined,
    perangkat: uncheckedKit ? { n: uncheckedKit, label: `${uncheckedKit} perangkat ajar perlu dicek` } : undefined,
    kuis: incompleteQuestions
      ? { n: incompleteQuestions, label: `${incompleteQuestions} soal belum lengkap` }
      : undefined,
  };

  /** Pindah tab dengan panah kiri/kanan (pola tab WAI-ARIA). */
  const onTabKey = (e: React.KeyboardEvent, i: number) => {
    const next =
      e.key === "ArrowRight"
        ? i + 1
        : e.key === "ArrowLeft"
          ? i - 1
          : e.key === "Home"
            ? 0
            : e.key === "End"
              ? TABS.length - 1
              : null;
    if (next === null) return;
    e.preventDefault();
    const t = TABS[(next + TABS.length) % TABS.length];
    selectTab(t.key);
    document.getElementById(`tab-${t.key}`)?.focus();
  };

  return (
    <div>
      <div className="no-print">
        <Link
          href={props.cls ? `/guru/kelas/${props.cls.id}` : "/guru"}
          className="inline-flex items-center gap-1 text-[15px] font-bold text-papan-600 hover:underline"
        >
          <ArrowLeft className="size-4" aria-hidden />
          {props.cls ? props.cls.name : "Beranda"}
        </Link>
      </div>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-[1.9rem] font-extrabold leading-tight text-tinta">
            {lesson.title || "Tanpa judul"}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[14px]">
            {status === "published" ? <Badge tone="ok">Terbit</Badge> : <Badge>Draf</Badge>}
            {lesson.subject && <Badge tone="papan">{lesson.subject}</Badge>}
            {props.cls && <span className="text-tinta-2">{props.cls.name}</span>}
            <SaveIndicator state={saveState} error={saveError} onRetry={() => save()} />
          </div>
        </div>
        <div className="no-print flex flex-wrap gap-2">
          <Button variant="ghost" aria-expanded={manageOpen} onClick={() => setManageOpen((o) => !o)}>
            <Settings2 className="size-4" aria-hidden />
            Kelola materi
          </Button>
          <Button variant="secondary" onClick={() => openProjector(tab)} disabled={openingProjector}>
            {openingProjector ? <Spinner /> : <Presentation className="size-4" aria-hidden />}
            Mode proyektor
          </Button>
          {status === "published" && shareCode && (
            <a href={`/s/${shareCode}`} target="_blank" rel="noreferrer" className={buttonClass("secondary")}>
              <ExternalLink className="size-4" aria-hidden />
              Lihat sebagai siswa
            </a>
          )}
        </div>
      </div>

      {manageOpen && (
        <ManagePanel
          lessonId={props.lessonId}
          title={lesson.title}
          currentClassId={props.cls?.id ?? null}
          classes={props.classes}
          flush={async () => { await flushOrThrow(); }}
          onClose={() => setManageOpen(false)}
          onDeleted={() => (skipUnloadWarning.current = true)}
        />
      )}

      {manageOpen && <section className="mt-4 rounded-2xl border border-garis bg-white p-5">
        <h2 className="font-bold">Kategori dan templat</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-bold">Topik
            <input className="mt-1 h-11 w-full rounded-xl border border-batas px-3 font-normal" maxLength={120}
              value={lesson.topic ?? ""} onChange={(e) => update({ topic: e.target.value })} placeholder="Contoh: Pecahan" />
          </label>
          <label className="text-sm font-bold">Jenjang / kelas sasaran
            <input className="mt-1 h-11 w-full rounded-xl border border-batas px-3 font-normal" maxLength={80}
              value={lesson.target_grade ?? ""} onChange={(e) => update({ target_grade: e.target.value })} placeholder={props.cls?.grade || "Contoh: SD kelas 6"} />
          </label>
        </div>
        <label className="mt-4 flex min-h-11 items-center gap-2"><input type="checkbox" checked={!!lesson.is_template}
          onChange={(e) => update({ is_template: e.target.checked })} />Simpan juga sebagai templat di perpustakaan</label>
        <Link href="/guru/pustaka" className="mt-2 inline-block font-bold text-papan underline">Buka perpustakaan materi</Link>
      </section>}

      {manageOpen && <HistoryPanel lessonId={props.lessonId} prepare={flushOrThrow} restored={reloadLatest} />}

      {saveState === "conflict" && (
        <Notice tone="warn" className="no-print mt-4" title="Materi ini baru saja diubah di tab atau perangkat lain">
          <p>Perubahan Anda belum disimpan supaya tidak menimpa perubahan itu. Pilih salah satu:</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={reloadLatest}>
              Muat versi terbaru (perubahan saya dibuang)
            </Button>
            <Button size="sm" onClick={() => save({ force: true })}>
              Simpan versi saya
            </Button>
          </div>
        </Notice>
      )}

      <div className="no-print sticky top-0 z-20 -mx-4 mt-6 bg-kertas/95 px-4 py-2 backdrop-blur sm:mx-0 sm:px-0">
        <div
          role="tablist"
          aria-label="Bagian materi"
          className="flex gap-1 overflow-x-auto rounded-2xl border border-garis bg-white p-1.5 shadow-kartu"
        >
          {TABS.map((t, i) => {
            const active = tab === t.key;
            const badge = badges[t.key];
            return (
              <button
                key={t.key}
                role="tab"
                id={`tab-${t.key}`}
                aria-selected={active}
                aria-controls={`panel-${t.key}`}
                tabIndex={active ? 0 : -1}
                onClick={() => selectTab(t.key)}
                onKeyDown={(e) => onTabKey(e, i)}
                className={cx(
                  "relative flex h-11 shrink-0 items-center gap-2 rounded-xl px-4 font-bold transition-colors sm:flex-1 sm:justify-center",
                  active ? "bg-papan text-white shadow-kartu" : "text-tinta-2 hover:bg-papan-50 hover:text-papan",
                )}
              >
                <t.icon className="size-4" aria-hidden />
                {t.label}
                {badge && (
                  <span
                    className={cx(
                      "min-w-5 rounded-full px-1.5 text-[12px] leading-5",
                      active ? "bg-white text-aksen" : "bg-aksen text-white",
                    )}
                    aria-label={badge.label}
                    title={badge.label}
                  >
                    {badge.n}
                  </span>
                )}
                {t.key === "kuis" && !badge && lesson.quiz.length > 0 && (
                  <span className={cx("text-[13px] font-normal", active ? "text-white/85" : "text-tinta-2")}>
                    {lesson.quiz.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="pt-5">
        {tab === "materi" && (
          <MateriTab lessonId={props.lessonId} lesson={lesson} update={update} aiOn={props.aiOn} cls={props.cls} />
        )}
        {tab === "versi" && (
          <VersiTab
            lessonId={props.lessonId}
            lesson={lesson}
            update={update}
            cls={props.cls}
            aiOn={props.aiOn}
            goTo={selectTab}
          />
        )}
        {tab === "perangkat" && (
          <PerangkatTab
            lessonId={props.lessonId}
            lesson={lesson}
            update={update}
            cls={props.cls}
            teacher={props.teacher}
            aiOn={props.aiOn}
            goTo={selectTab}
          />
        )}
        {tab === "kuis" && <KuisTab lessonId={props.lessonId} lesson={lesson} update={update} aiOn={props.aiOn} />}
        {tab === "bagikan" && (
          <BagikanTab
            lessonId={props.lessonId}
            lesson={lesson}
            status={status}
            shareCode={shareCode}
            flush={async () => { await flushOrThrow(); }}
            onPublished={(code) => {
              setStatus("published");
              setShareCode(code);
            }}
            onUnpublished={() => setStatus("draft")}
            goTo={selectTab}
            onProjector={() => openProjector("bagikan")}
            projectorBusy={openingProjector}
          />
        )}
        {tab === "rekap" && (
          <RekapTab
            lessonId={props.lessonId}
            stats={props.stats}
            published={status === "published"}
            quiz={lesson.quiz}
            lesson={lesson}
            update={update}
            aiOn={props.aiOn}
            goTo={selectTab}
          />
        )}
      </div>
    </div>
  );
}

/** Salin materi ke kelas lain, atau hapus materi. */
function ManagePanel({
  lessonId,
  title,
  currentClassId,
  classes,
  flush,
  onClose,
  onDeleted,
}: {
  lessonId: string;
  title: string;
  currentClassId: string | null;
  classes: { id: string; name: string }[];
  flush: () => Promise<void>;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const [target, setTarget] = useState(classes.find((c) => c.id !== currentClassId)?.id ?? currentClassId ?? "");
  const [busy, setBusy] = useState<"copy" | "delete" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function copy() {
    setBusy("copy");
    try {
      await flush();
      const res = await api<{ id: string }>(`/api/materi/${lessonId}/salin`, {
        method: "POST",
        body: { classId: target || null },
      });
      toast.ok("Materi disalin sebagai draf baru.");
      router.push(`/guru/materi/${res.id}`);
    } catch (err) {
      toast.error((err as Error).message);
      setBusy(null);
    }
  }

  async function remove() {
    setBusy("delete");
    try {
      await api(`/api/materi/${lessonId}`, { method: "DELETE" });
      onDeleted();
      toast.ok(`"${title}" dihapus.`);
      router.push(currentClassId ? `/guru/kelas/${currentClassId}` : "/guru");
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
      setBusy(null);
    }
  }

  return (
    <section
      aria-label="Kelola materi"
      className="muncul no-print mt-4 grid gap-4 rounded-2xl border border-garis bg-white p-5 shadow-kartu md:grid-cols-2"
    >
      <div>
        <h2 className="font-bold">Salin materi</h2>
        <p className="mt-0.5 text-[14px] text-tinta-2">
          Untuk kelas paralel atau tahun depan. Salinan berupa draf baru beserta versi, glosarium, kuis, dan perangkat ajarnya.
        </p>
        <div className="mt-3 flex items-center gap-2">
          <label htmlFor="salin-ke" className="sr-only">
            Salin ke kelas
          </label>
          <div className="min-w-0 flex-1">
            <Select id="salin-ke" value={target} onChange={(e) => setTarget(e.target.value)}>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.id === currentClassId ? " (kelas ini)" : ""}
                </option>
              ))}
              <option value="">Tanpa kelas</option>
            </Select>
          </div>
          <Button variant="secondary" onClick={copy} disabled={busy !== null}>
            {busy === "copy" ? <Spinner /> : <Copy className="size-4" aria-hidden />}
            Salin
          </Button>
        </div>
      </div>
      <div className="md:border-l md:border-garis md:pl-4">
        <h2 className="font-bold">Hapus materi</h2>
        <p className="mt-0.5 text-[14px] text-tinta-2">
          Materi, versi, kuis, dan rekapnya terhapus permanen. Link siswa berhenti bekerja.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {confirmDelete ? (
            <>
              <Button variant="danger" onClick={remove} disabled={busy !== null}>
                {busy === "delete" ? <Spinner /> : <Trash2 className="size-4" aria-hidden />}
                Ya, hapus permanen
              </Button>
              <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
                Batal
              </Button>
            </>
          ) : (
            <Button variant="danger" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="size-4" aria-hidden />
              Hapus materi
            </Button>
          )}
        </div>
      </div>
      <div className="md:col-span-2">
        <button type="button" onClick={onClose} className="text-[14px] font-bold text-papan-600 underline">
          Tutup panel
        </button>
      </div>
    </section>
  );
}

function SaveIndicator({ state, error, onRetry }: { state: SaveState; error: string | null; onRetry: () => void }) {
  if (state === "saving" || state === "dirty")
    return (
      <span className="inline-flex items-center gap-1.5 text-tinta-2" role="status">
        <Spinner className="size-3.5" />
        Menyimpan…
      </span>
    );
  if (state === "conflict")
    return (
      <span className="inline-flex items-center gap-1.5 text-aksen" role="status">
        <CircleAlert className="size-4" aria-hidden />
        Belum disimpan: ada perubahan dari tempat lain
      </span>
    );
  if (state === "error")
    return (
      <span className="inline-flex items-center gap-1.5 text-galat" role="alert">
        <CircleAlert className="size-4" aria-hidden />
        Gagal menyimpan{error ? `: ${error}` : ""}.
        <button type="button" onClick={onRetry} className="font-bold underline">
          Coba lagi
        </button>
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 text-berhasil" role="status">
      <CheckCircle2 className="size-4" aria-hidden />
      Tersimpan
    </span>
  );
}
