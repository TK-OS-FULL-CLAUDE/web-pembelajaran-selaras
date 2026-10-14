import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { LessonList } from "@/components/guru/lesson-list";
import { NeedsSummary } from "@/components/guru/needs-summary";
import { ResetDemoButton } from "@/components/guru/reset-demo-button";
import { ButtonLink, EmptyState, Notice } from "@/components/ui";
import { requireTeacher } from "@/lib/auth";
import { getTeacherOverview, listClasses, listLessons } from "@/lib/data";
import { aiEnabled } from "@/lib/claude";

export const metadata: Metadata = { title: "Beranda guru" };

export default async function GuruHome() {
  const teacher = await requireTeacher();
  const [classes, lessons, overview] = await Promise.all([
    listClasses(teacher.id),
    listLessons(teacher.id),
    getTeacherOverview(teacher.id),
  ]);
  const firstName = teacher.name.replace(/\s*\(.*\)$/, "");

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-papan">Halo, {firstName}</h1>
          <p className="mt-1 text-tinta-2">
            {overview.published} materi terbit, {overview.drafts} draf, {overview.sessions} sesi siswa.
          </p>
        </div>
        <ButtonLink href={classes[0] ? `/guru/materi/baru?kelas=${classes[0].id}` : "/guru/kelas/baru"}>
          <Plus className="size-5" aria-hidden />
          Materi baru
        </ButtonLink>
      </div>

      {teacher.is_demo && (
        <Notice tone="warn" title="Ini akun demo bersama">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>Siapa pun bisa mengubah datanya. Reset sebelum presentasi supaya demo kembali rapi.</span>
            <ResetDemoButton />
          </div>
        </Notice>
      )}

      {!aiEnabled() && (
        <Notice tone="info" title="Fitur AI belum aktif">
          Isi <code className="rounded bg-white px-1">ANTHROPIC_API_KEY</code> dan/atau{" "}
          <code className="rounded bg-white px-1">GEMINI_API_KEY</code> di environment variables untuk memakai foto buku →
          teks dan draf versi otomatis. Semua fitur lain tetap jalan.
        </Notice>
      )}

      <section aria-labelledby="judul-kelas">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="judul-kelas" className="font-display text-xl font-extrabold">
            Kelas
          </h2>
          <Link
            href="/guru/kelas/baru"
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-bold text-papan-600 hover:bg-papan-50"
          >
            <Plus className="size-4" aria-hidden />
            Kelas baru
          </Link>
        </div>
        {classes.length === 0 ? (
          <EmptyState
            title="Mulai dengan membuat kelas"
            action={<ButtonLink href="/guru/kelas/baru">Buat kelas</ButtonLink>}
          >
            Catat jumlah siswa per kebutuhan. Selaras memakai profil ini untuk menyarankan versi materi dan akomodasi.
          </EmptyState>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {classes.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/guru/kelas/${c.id}`}
                  className="block h-full rounded-2xl border border-garis bg-white p-5 transition-colors hover:border-papan"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-display text-lg font-bold">{c.name}</p>
                      <p className="text-[14px] text-tinta-2">
                        {[
                          c.grade,
                          c.needs.totalSiswa ? `${c.needs.totalSiswa} siswa` : null,
                          `${c.lesson_count} materi`,
                        ]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    </div>
                    <Users className="size-5 text-papan" aria-hidden />
                  </div>
                  <div className="mt-3">
                    <NeedsSummary needs={c.needs} compact />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="judul-materi">
        <h2 id="judul-materi" className="mb-3 font-display text-xl font-extrabold">
          Materi terbaru
        </h2>
        {lessons.length === 0 ? (
          <EmptyState title="Belum ada materi">Buat kelas dulu, lalu tambahkan materi pertama Anda.</EmptyState>
        ) : (
          <LessonList lessons={lessons.slice(0, 8)} />
        )}
      </section>
    </div>
  );
}
