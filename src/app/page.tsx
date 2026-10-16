import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { DemoLoginButton } from "@/components/demo-login-button";
import { HeroDemo } from "@/components/hero-demo";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default function Home() {
  return (
    <div className="classroom-home flex min-h-dvh flex-col">
      <SiteHeader />
      <main id="isi" className="flex-1">
        <section className="classroom-board">
          <div className="classroom-hero">
            <div className="classroom-copy">
              <h1>Satu materi.<br />Banyak cara.</h1>
              <p className="classroom-intro">Satu materi dari guru, banyak cara untuk memahami. Ruang belajar yang memberi tempat untuk setiap siswa.</p>
              <div className="classroom-actions">
                <DemoLoginButton label="Coba ruang guru" />
                <Link href="/s">Buka materi siswa <ArrowRight size={18} aria-hidden /></Link>
              </div>
              <p className="classroom-note">Langsung coba tanpa daftar. Data demo fiktif.</p>
            </div>
            <HeroDemo />
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
