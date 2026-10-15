import Link from "next/link";
import { ChevronRight, FileText } from "lucide-react";
import type { LessonSummary } from "@/lib/data";
import { MODE_TONE, TONES, type ToneKey } from "@/lib/modes";
import { VERSION_KEYS, VERSION_LABEL } from "@/lib/types";
import { Badge, IconChip, cx } from "../ui";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(new Date(value));
}

const SUBJECT_TONES: ToneKey[] = ["papan", "biru", "ungu", "mawar", "jingga", "sian", "nila", "hijau"];

/** Warna tetap per mata pelajaran (IPAS selalu sewarna di semua daftar). */
function subjectTone(subject: string): ToneKey {
  let h = 0;
  for (const c of subject.toLowerCase()) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return SUBJECT_TONES[h % SUBJECT_TONES.length];
}

export function LessonList({ lessons, showClass = true }: { lessons: LessonSummary[]; showClass?: boolean }) {
  return (
    <ul className="divide-y divide-garis overflow-hidden rounded-2xl border border-garis bg-white shadow-kartu">
      {lessons.map((l) => {
        const versions = VERSION_KEYS.filter((k) => l.versions?.[k]?.text?.trim());
        const needsCheck = versions.some((k) => !l.versions[k]?.checked);
        return (
          <li key={l.id}>
            <Link
              href={`/guru/materi/${l.id}`}
              className="group flex items-center gap-4 px-4 py-4 hover:bg-kertas sm:px-5"
            >
              <IconChip icon={FileText} tone={subjectTone(l.subject || l.title)} className="hidden sm:flex" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-display text-[17px] font-bold">{l.title}</span>
                  {l.status === "published" ? <Badge tone="ok">Terbit</Badge> : <Badge>Draf</Badge>}
                  {needsCheck && <Badge tone="ai">Versi perlu dicek</Badge>}
                </div>
                <p className="mt-0.5 text-[14px] text-tinta-2">
                  {[l.subject, showClass ? l.class_name : null, `${l.sessions} sesi siswa`].filter(Boolean).join(" · ")}{" "}
                  · Diubah {formatDate(l.updated_at)} WIB
                </p>
                {versions.length > 0 && (
                  <ul className="mt-1.5 flex flex-wrap gap-1" aria-label="Versi tersedia">
                    {versions.map((k) => (
                      <li
                        key={k}
                        className={cx("rounded-md px-1.5 py-0.5 text-[12px] font-bold", TONES[MODE_TONE[k]].chip)}
                      >
                        {VERSION_LABEL[k]}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <ChevronRight className="size-5 shrink-0 text-batas group-hover:text-papan" aria-hidden />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
