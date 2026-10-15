import type { Metadata } from "next";
import { PasswordForm, ProfileForm } from "@/components/guru/profile-form";
import { Notice } from "@/components/ui";
import { getLoginMethods, requireTeacher } from "@/lib/auth";

export const metadata: Metadata = { title: "Profil guru" };

export default async function ProfilPage({ searchParams }: { searchParams: Promise<{ baru?: string }> }) {
  const [teacher, { baru }] = await Promise.all([requireTeacher(), searchParams]);
  const methods = await getLoginMethods(teacher.id);
  return (
    <div className="mx-auto max-w-xl">
      <h1 className="font-display text-[1.9rem] font-extrabold">Profil guru</h1>
      {teacher.is_demo ? (
        <Notice tone="info" className="mt-4" title="Akun demo bersama">
          Profil dan kata sandi akun demo tidak bisa diubah supaya akun ini tetap bisa dipakai semua orang. Buat akun
          sendiri untuk mencoba halaman ini.
        </Notice>
      ) : (
        <>
          {baru && (
            <Notice tone="ok" className="mt-4" title="Akun dibuat dengan Google">
              Isi nama sekolah supaya tampil di halaman materi siswa dan di identitas modul ajar. Kalau ingin masuk
              juga dengan email dan kata sandi seperti biasa, buat kata sandi di bawah. Keduanya bisa diubah kapan saja.
            </Notice>
          )}
          <ProfileForm email={teacher.email} name={teacher.name} school={teacher.school ?? ""} isNew={!!baru} />
          <PasswordForm hasPassword={methods.hasPassword} hasGoogle={methods.hasGoogle} />
        </>
      )}
    </div>
  );
}
