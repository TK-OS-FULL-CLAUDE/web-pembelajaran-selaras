"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";

export function LogoutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={async () => {
        await api("/api/auth/keluar", { method: "POST" }).catch(() => {});
        router.push("/");
        router.refresh();
      }}
      className="inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-lg bg-galat px-3 font-bold text-white transition-colors hover:bg-red-800"
    >
      <LogOut className="size-4" aria-hidden />
      <span className="sr-only sm:not-sr-only">Keluar</span>
    </button>
  );
}
