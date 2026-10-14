import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { LessonSummary } from "@/lib/data";
import { Badge } from "../ui";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(new Date(value));
}

export function LessonList({ lessons, showClass = true }: { lessons: LessonSummary[]; showClass?: boolean }) {
  return (
    <ul className="divide-y divide-garis overflow-hidden rounded-2xl border border-garis bg-white">
      {lessons.map((l) => {
        const versions = Object.values(l.versions ?? {}).filter((v) => v && v.text?.trim());
        const needsCheck = versions.some((v) => v && !v.checked);
        return (
          <li key={l.id}>
            <Link href={`/guru/materi/${l.id}`} className="flex items-center gap-4 px-4 py-4 hover:bg-papan-50 sm:px-5">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-display text-[17px] font-bold">{l.title}</span>
                  {l.status === "published" ? <Badge tone="ok">Terbit</Badge> : <Badge>Draf</Badge>}
                  {needsCheck && <Badge tone="ai">Versi perlu dicek</Badge>}
                </div>
                <p className="mt-0.5 text-[14px] text-tinta-2">
                  {[l.subject, showClass ? l.class_name : null, `${versions.length} versi`, `${l.sessions} sesi siswa`]
                    .filter(Boolean)
                    .join(", ")}
                  . Diubah {formatDate(l.updated_at)} WIB.
                </p>
              </div>
              <ChevronRight className="size-5 shrink-0 text-batas" aria-hidden />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
