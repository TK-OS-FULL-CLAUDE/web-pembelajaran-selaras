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
      className="inline-flex h-10 items-center gap-2 rounded-xl border border-garis px-3 font-bold text-tinta-2 hover:border-papan/40 hover:bg-papan-50 hover:text-papan"
    >
      <LogOut className="size-4" aria-hidden />
      Keluar
    </button>
  );
}
