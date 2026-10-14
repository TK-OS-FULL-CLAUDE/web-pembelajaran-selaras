import type { Metadata } from "next";
import { ClassForm } from "@/components/guru/class-form";

export const metadata: Metadata = { title: "Kelas baru" };

export default function NewClassPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 font-display text-3xl font-extrabold text-papan">Kelas baru</h1>
      <ClassForm />
    </div>
  );
}
