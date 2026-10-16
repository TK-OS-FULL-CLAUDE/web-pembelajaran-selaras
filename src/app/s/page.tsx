import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { OpenLesson } from "@/components/siswa/open-lesson";
import { ChalkLesson } from "@/components/chalk-lesson";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { DEMO_SHARE_CODE } from "@/lib/demo-content";

export const metadata = { title: "Buka materi siswa" };

export default function StudentEntry() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader current="siswa" />
      <main id="isi" className="student-entry flex-1">
        <div className="student-desk">
          <section className="student-welcome papan-tulis">
            <h1>Belajar dengan<br />caramu sendiri.</h1>
            <p>Siapkan kode dari gurumu. Satu materi bisa kamu baca, dengarkan, dan sesuaikan agar lebih mudah dipahami.</p>
            <ChalkLesson />
            <p className="student-welcome-foot">Tidak perlu akun. Tidak perlu install.</p>
          </section>
          <section className="student-entry-paper" aria-labelledby="buka-materi">
            <div className="paper-binding" aria-hidden><i /><i /><i /><i /><i /></div>
            <h2 id="buka-materi">Buka materi siswa</h2>
            <p>Masukkan kode materi dari gurumu, atau langsung buka link/QR yang dibagikan.</p>
            <OpenLesson />
            <p className="entry-help">Belum menerima kode? Minta kode kepada guru.</p>
            <Link className="entry-demo" href={`/s/${DEMO_SHARE_CODE}`}>
              <span>Ingin mencoba dulu?<strong>Demo siswa · Fotosintesis</strong></span>
              <ArrowRight size={22} aria-hidden />
            </Link>
          </section>
        </div>
      </main>
      <SiteFooter compact />
    </div>
  );
}
