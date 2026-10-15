import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ClassForm } from "@/components/guru/class-form";
import { DeleteClass } from "@/components/guru/delete-class";
import { requireTeacher } from "@/lib/auth";
import { countLessonsInClass, getClass } from "@/lib/data";

export const metadata: Metadata = { title: "Ubah kelas" };

export default async function EditClassPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const teacher = await requireTeacher();
  const cls = await getClass(teacher.id, id);
  if (!cls) notFound();
  const lessonCount = await countLessonsInClass(teacher.id, cls.id);
  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 font-display text-[2rem] font-extrabold leading-tight">Ubah {cls.name}</h1>
      <ClassForm classId={cls.id} initial={{ name: cls.name, grade: cls.grade, needs: cls.needs }} />
      <DeleteClass classId={cls.id} name={cls.name} lessonCount={lessonCount} />
    </div>
  );
}
