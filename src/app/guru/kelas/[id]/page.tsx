import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil, Plus } from "lucide-react";
import { AccommodationGuide } from "@/components/guru/accommodation-guide";
import { LessonList } from "@/components/guru/lesson-list";
import { NeedsSummary } from "@/components/guru/needs-summary";
import { ButtonLink, EmptyState } from "@/components/ui";
import { requireTeacher } from "@/lib/auth";
import { getClass, listLessons } from "@/lib/data";

export const metadata: Metadata = { title: "Kelas" };

export default async function ClassPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const teacher = await requireTeacher();
  const cls = await getClass(teacher.id, id);
  if (!cls) notFound();
  const lessons = await listLessons(teacher.id, cls.id);
  const special =
    cls.needs.lowVision + cls.needs.tuli + cls.needs.disleksia + cls.needs.sulitFokus + cls.needs.bahasaDaerah;

  return (
    <div className="space-y-10">
      <div>
        <Link
          href="/guru"
          className="inline-flex items-center gap-1 text-[15px] font-bold text-papan-600 hover:underline"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Beranda
        </Link>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-extrabold text-papan">{cls.name}</h1>
            <p className="mt-1 text-tinta-2">
              {[cls.grade, cls.needs.totalSiswa ? `${cls.needs.totalSiswa} siswa` : null].filter(Boolean).join(", ")}
              {special > 0 && `; ${special} kebutuhan tercatat (satu siswa bisa punya lebih dari satu)`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ButtonLink href={`/guru/kelas/${cls.id}/ubah`} variant="secondary">
              <Pencil className="size-4" aria-hidden />
              Ubah profil
            </ButtonLink>
            <ButtonLink href={`/guru/materi/baru?kelas=${cls.id}`}>
              <Plus className="size-5" aria-hidden />
              Materi baru
            </ButtonLink>
          </div>
        </div>
        <div className="mt-4">
          <NeedsSummary needs={cls.needs} />
        </div>
      </div>

      <section aria-labelledby="judul-akomodasi">
        <h2 id="judul-akomodasi" className="font-display text-xl font-extrabold">
          Panduan akomodasi untuk kelas ini
        </h2>
        <p className="mb-4 mt-1 max-w-3xl text-tinta-2">
          Langkah praktis di kelas, sesuai profil di atas. Disusun dari praktik umum pendidikan inklusif; bukan
          pengganti asesmen tenaga profesional atau Guru Pembimbing Khusus.
        </p>
        <AccommodationGuide classId={cls.id} needs={cls.needs} />
      </section>

      <section aria-labelledby="judul-materi-kelas">
        <h2 id="judul-materi-kelas" className="mb-3 font-display text-xl font-extrabold">
          Materi {cls.name}
        </h2>
        {lessons.length === 0 ? (
          <EmptyState
            title="Belum ada materi"
            action={<ButtonLink href={`/guru/materi/baru?kelas=${cls.id}`}>Buat materi pertama</ButtonLink>}
          >
            Tempel teks atau potret halaman buku; Selaras membantu menyiapkan versinya.
          </EmptyState>
        ) : (
          <LessonList lessons={lessons} showClass={false} />
        )}
      </section>
    </div>
  );
}
