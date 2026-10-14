import Link from "next/link";
import { Logo } from "./ui";

export function AuthShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6">
        <Link href="/" aria-label="Selaras, ke halaman depan">
          <Logo />
        </Link>
      </header>
      <main id="isi" className="mx-auto w-full max-w-md flex-1 px-4 pb-16 pt-6">
        <h1 className="mb-6 font-display text-3xl font-extrabold text-papan">{title}</h1>
        {children}
      </main>
    </div>
  );
}
