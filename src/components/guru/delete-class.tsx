"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";
import { Button, Spinner } from "../ui";
import { useToast } from "../toast";

/** Hapus kelas tanpa menghapus materi bersama atau hasil belajar. */
export function DeleteClass({ classId, name, lessonCount }: { classId: string; name: string; lessonCount: number }) {
  const router = useRouter();
  const toast = useToast();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  return (
    <section aria-labelledby="hapus-kelas" className="mt-12 rounded-2xl border border-galat/30 bg-white p-5">
      <h2 id="hapus-kelas" className="font-display text-lg font-bold text-galat">
        Hapus kelas
      </h2>
      <p className="mt-1 text-tinta-2">
        {lessonCount > 0
          ? `${name} terhapus permanen dan link khusus kelas ini dinonaktifkan. ${lessonCount} materi beserta rekap tetap tersedia di perpustakaan; kelas lain tetap bisa belajar.`
          : `${name} terhapus permanen.`}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {confirm ? (
          <>
            <Button
              variant="danger"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await api(`/api/kelas/${classId}`, { method: "DELETE" });
                  toast.ok(`${name} dihapus.`);
                  router.push("/guru");
                  router.refresh();
                } catch (err) {
                  toast.error((err as Error).message);
                  setBusy(false);
                }
              }}
            >
              {busy ? <Spinner /> : <Trash2 className="size-4" aria-hidden />}
              Ya, hapus {name}
            </Button>
            <Button variant="ghost" onClick={() => setConfirm(false)}>
              Batal
            </Button>
          </>
        ) : (
          <Button variant="danger" onClick={() => setConfirm(true)}>
            <Trash2 className="size-4" aria-hidden />
            Hapus kelas
          </Button>
        )}
      </div>
    </section>
  );
}
