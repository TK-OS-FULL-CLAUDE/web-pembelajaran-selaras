import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

export function AuthShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader showLogin={false} />
      <main id="isi" className="auth-page flex-1">
        <div className="auth-card">
          <h1 className="mb-7 font-display text-[1.9rem] font-extrabold">{title}</h1>
          {children}
        </div>
      </main>
      <SiteFooter compact />
    </div>
  );
}
