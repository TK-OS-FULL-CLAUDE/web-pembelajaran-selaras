import Link from "next/link";
import { requireTeacher } from "@/lib/auth";
import { listClasses, listLessons } from "@/lib/data";
import { Library } from "@/components/guru/library";
import { buttonClass } from "@/components/ui";
export const metadata = { title: "Perpustakaan materi" };
export default async function LibraryPage() {
  const teacher = await requireTeacher();
  const [lessons, classes] = await Promise.all([listLessons(teacher.id), listClasses(teacher.id)]);
  return <div>
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4"><div>
      <h1 className="text-3xl font-extrabold">Perpustakaan materi</h1>
      <p className="mt-2 text-tinta-2">Cari materi milik Anda dan gunakan kembali templat untuk kelas berikutnya.</p>
    </div><Link href="/guru/materi/baru" className={buttonClass("primary")}>Buat materi</Link></div>
    <Library lessons={lessons} classes={classes.map((c) => ({ id: c.id, name: c.name }))} />
  </div>;
}
