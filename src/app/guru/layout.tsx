import { GuruHeader } from "@/components/guru/guru-header";
import { SiteFooter } from "@/components/site-footer";
import { requireTeacher } from "@/lib/auth";

export default async function GuruLayout({ children }: { children: React.ReactNode }) {
  const teacher = await requireTeacher();
  const name = teacher.name.replace(/\s*\(.*\)$/, "");
  const initials = name
    .replace(/^(bu|pak|bapak|ibu)\s+/i, "")
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  return (
    <div className="flex min-h-dvh flex-col">
      <GuruHeader name={name} school={teacher.school} initials={initials} />
      <main id="isi" className="mx-auto w-full max-w-6xl flex-1 px-4 pb-20 pt-8 sm:px-6">
        {children}
      </main>
      <SiteFooter compact />
    </div>
  );
}
