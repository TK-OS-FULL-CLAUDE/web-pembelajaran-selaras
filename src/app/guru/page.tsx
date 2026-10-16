import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, PenLine, Plus, School, Send, Users } from "lucide-react";
import { LessonList } from "@/components/guru/lesson-list";
import { NeedsSummary } from "@/components/guru/needs-summary";
import { ResetDemoButton } from "@/components/guru/reset-demo-button";
import { ButtonLink, EmptyState, IconChip, Notice, SectionTitle, StatCard } from "@/components/ui";
import { requireTeacher } from "@/lib/auth";
import { getTeacherOverview, listClasses, listLessons } from "@/lib/data";
import { aiEnabled } from "@/lib/claude";
import { TONES, classTone } from "@/lib/modes";

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
      <section className="relative overflow-hidden rounded-[1.75rem] border border-garis bg-white shadow-kartu">
        <div className="pita-warna" aria-hidden />
        <div className="p-6 sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-[15px] font-bold text-papan">Beranda guru</p>
            <h1 className="mt-1 font-display text-[2rem] font-extrabold leading-tight">Halo, {firstName}</h1>
            <p className="mt-1 max-w-xl text-tinta-2">
              Tulis materi sekali, siapkan versinya, lalu bagikan satu link. Setiap siswa memilih cara belajarnya
              sendiri.
            </p>
          </div>
          <ButtonLink size="lg" href={classes[0] ? `/guru/materi/baru?kelas=${classes[0].id}` : "/guru/kelas/baru"}>
            <Plus className="size-5" aria-hidden />
            Materi baru
          </ButtonLink>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard icon={School} tone="biru" label="Kelas" value={classes.length} />
          <StatCard icon={Send} tone="hijau" label="Materi terbit" value={overview.published} />
          <StatCard icon={PenLine} tone="kuning" label="Draf" value={overview.drafts} />
          <StatCard icon={Users} tone="merah" label="Sesi siswa" value={overview.sessions} />
        </div>
        </div>
      </section>

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
          Isi <code>ANTHROPIC_API_KEY</code> dan/atau <code>GEMINI_API_KEY</code> di environment variables untuk memakai
          foto buku → teks, deskripsi gambar, dan draf versi otomatis. Semua fitur lain tetap jalan (termasuk impor PDF
          dan Word).
        </Notice>
      )}

      <section aria-labelledby="judul-kelas">
        <SectionTitle
          id="judul-kelas"
          tone="biru"
          action={
            <Link
              href="/guru/kelas/baru"
              className="inline-flex h-10 items-center gap-1 rounded-xl px-3 font-bold text-papan-600 hover:bg-papan-50"
            >
              <Plus className="size-4" aria-hidden />
              Kelas baru
            </Link>
          }
        >
          Kelas
        </SectionTitle>
        {classes.length === 0 ? (
          <EmptyState
            title="Mulai dengan membuat kelas"
            icon={School}
            tone="papan"
            action={<ButtonLink href="/guru/kelas/baru">Buat kelas</ButtonLink>}
          >
            Catat jumlah siswa per kebutuhan. Selaras memakai profil ini untuk menyarankan versi materi dan akomodasi.
          </EmptyState>
        ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {classes.map((c, i) => (
              <li key={c.id}>
                <Link
                  href={`/guru/kelas/${c.id}`}
                  className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-garis bg-white p-5 pt-6 shadow-kartu transition-[box-shadow,border-color,transform] hover:-translate-y-0.5 hover:border-batas/60 hover:shadow-angkat"
                >
                  <span className={`absolute inset-x-0 top-0 h-1.5 ${TONES[classTone(i)].bar}`} aria-hidden />
                  <div className="flex items-start gap-4">
                    <IconChip icon={Users} tone={classTone(i)} size="lg" />
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-lg font-extrabold">{c.name}</p>
                      <p className="text-[14px] text-tinta-2">
                        {[
                          c.grade,
                          c.needs.totalSiswa ? `${c.needs.totalSiswa} siswa` : null,
                          `${c.lesson_count} materi`,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    <ArrowRight
                      className="mt-1 size-5 shrink-0 text-batas transition-transform group-hover:translate-x-0.5 group-hover:text-papan"
                      aria-hidden
                    />
                  </div>
                  <div className="mt-4 border-t border-garis pt-3">
                    <NeedsSummary needs={c.needs} compact />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="judul-materi">
        <SectionTitle id="judul-materi" tone="merah">
          Materi terbaru
        </SectionTitle>
        {lessons.length === 0 ? (
          <EmptyState title="Belum ada materi" icon={BookOpen}>
            Buat kelas dulu, lalu tambahkan materi pertama Anda.
          </EmptyState>
        ) : (
          <LessonList lessons={lessons.slice(0, 8)} />
        )}
      </section>
    </div>
  );
}
