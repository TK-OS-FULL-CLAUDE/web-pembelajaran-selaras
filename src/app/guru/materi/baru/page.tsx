import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { NewLessonForm } from "@/components/guru/new-lesson-form";
import { requireTeacher } from "@/lib/auth";
import { listClasses } from "@/lib/data";
import { aiEnabled } from "@/lib/claude";

export const metadata: Metadata = { title: "Materi baru" };

export default async function NewLessonPage({ searchParams }: { searchParams: Promise<{ kelas?: string }> }) {
  const { kelas } = await searchParams;
  const teacher = await requireTeacher();
  const classes = await listClasses(teacher.id);
  if (classes.length === 0) redirect("/guru/kelas/baru");
  const defaultClassId = classes.find((c) => c.id === kelas)?.id ?? null;
  return (
    <div className="max-w-4xl">
      <h1 className="mb-6 font-display text-[2rem] font-extrabold leading-tight">Materi baru</h1>
      <NewLessonForm
        classes={classes.map((c) => ({ id: c.id, name: c.name }))}
        defaultClassId={defaultClassId}
        aiOn={aiEnabled()}
      />
    </div>
  );
}
