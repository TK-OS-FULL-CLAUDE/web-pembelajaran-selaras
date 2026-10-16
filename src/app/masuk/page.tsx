import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";
import { AuthShell } from "@/components/auth-shell";
import { googleEnabled } from "@/lib/google-auth";
import { GOOGLE_ERRORS, type GoogleErrorCode } from "@/lib/google-token";

export const metadata: Metadata = { title: "Masuk" };

export default async function MasukPage({ searchParams }: { searchParams: Promise<{ galat?: string }> }) {
  const { galat } = await searchParams;
  const error = galat && Object.hasOwn(GOOGLE_ERRORS, galat) ? GOOGLE_ERRORS[galat as GoogleErrorCode] : null;
  return (
    <AuthShell title="Masuk sebagai guru">
      <AuthForm mode="masuk" google={googleEnabled()} initialError={error} />
    </AuthShell>
  );
}
