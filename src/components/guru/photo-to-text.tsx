"use client";

import { Camera } from "lucide-react";
import { useRef, useState } from "react";
import { api } from "@/lib/client";
import { compressImage } from "@/lib/image";
import { Badge, Button, Spinner } from "../ui";
import { useToast } from "../toast";

/** Foto halaman buku → teks (AI). Hasil selalu masuk ke editor supaya guru bisa merapikannya. */
export function PhotoToText({
  aiOn,
  onText,
  label = "Ambil teks dari foto buku",
}: {
  aiOn: boolean;
  onText: (result: { text: string; title: string }) => void;
  label?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      const dataUrl = await compressImage(file);
      setPreview(dataUrl);
      const res = await api<{ text: string; title: string }>("/api/ai/foto", {
        method: "POST",
        body: { image: dataUrl },
      });
      onText(res);
      toast.ok("Teks dari foto sudah masuk. Periksa dan rapikan sebelum dipakai.");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => onFile(e.target.files?.[0])}
      />
      <Button variant="ai" onClick={() => input.current?.click()} disabled={!aiOn || busy}>
        {busy ? <Spinner /> : <Camera className="size-4" aria-hidden />}
        {busy ? "Membaca halaman… (±15 detik)" : label}
      </Button>
      {!aiOn && <span className="text-[14px] text-tinta-2">Butuh ANTHROPIC_API_KEY atau GEMINI_API_KEY.</span>}
      {aiOn && !busy && <Badge tone="ai">AI</Badge>}
      {preview && busy && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview}
          alt="Foto halaman yang sedang dibaca"
          className="h-14 w-11 rounded border border-garis object-cover"
        />
      )}
    </div>
  );
}
