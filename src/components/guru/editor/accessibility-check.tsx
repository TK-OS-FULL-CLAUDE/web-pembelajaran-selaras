import { auditLesson } from "@/lib/teacher-tools";
import type { EditableLesson, TabKey } from "./lesson-editor";
export function AccessibilityCheck({ lesson, goTo }: { lesson: EditableLesson; goTo: (tab: TabKey) => void }) {
  const issues = auditLesson(lesson);
  return <section className="mt-5 rounded-2xl surface-card bg-kertas p-4" aria-labelledby="cek-akses">
    <h3 id="cek-akses" className="font-bold">Pemeriksaan aksesibilitas materi</h3>
    <p className="mt-1 text-sm text-tinta-2">Pemeriksaan awal berbasis aturan; guru tetap perlu menilai kejelasan isi. Saran ini bukan sertifikasi aksesibilitas.</p>
    {issues.length ? <ul className="mt-3 space-y-3 text-sm">{issues.map((issue, i) => <li key={i}>
      {issue.message}{" "}<button type="button" className="font-bold text-papan underline" onClick={() => goTo(issue.area)}>Periksa</button>
    </li>)}</ul> : <p className="mt-3 text-sm text-berhasil">Tidak ada masalah yang terdeteksi oleh pemeriksaan otomatis.</p>}
  </section>;
}
