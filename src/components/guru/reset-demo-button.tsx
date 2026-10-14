"use client";

import { RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";
import { Button, Spinner } from "../ui";
import { useToast } from "../toast";

export function ResetDemoButton() {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);

  if (!confirm) {
    return (
      <Button variant="secondary" size="sm" onClick={() => setConfirm(true)}>
        <RotateCcw className="size-4" aria-hidden />
        Reset data demo
      </Button>
    );
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <span className="text-[14px] font-bold">Hapus semua perubahan di akun demo?</span>
      <Button
        variant="danger"
        size="sm"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await api("/api/demo/reset", { method: "POST" });
            toast.ok("Data demo dikembalikan ke kondisi awal.");
            setConfirm(false);
            router.push("/guru");
            router.refresh();
          } catch (err) {
            toast.error((err as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy && <Spinner />}
        Ya, reset
      </Button>
      <Button variant="ghost" size="sm" onClick={() => setConfirm(false)}>
        Batal
      </Button>
    </span>
  );
}
