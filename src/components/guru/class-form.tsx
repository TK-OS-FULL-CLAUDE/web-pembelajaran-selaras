"use client";

import { Minus, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { NEEDS } from "@/lib/accommodations";
import { api } from "@/lib/client";
import { EMPTY_NEEDS, type ClassNeeds, type NeedKey } from "@/lib/types";
import { Button, Field, Input, Notice, Select, Spinner } from "../ui";
import { useToast } from "../toast";

function Stepper({
  id,
  value,
  onChange,
  label,
}: {
  id: string;
  value: number;
  onChange: (v: number) => void;
  label: string;
}) {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        className="flex size-11 items-center justify-center rounded-lg border border-batas bg-white hover:bg-papan-50 disabled:opacity-40"
        onClick={() => onChange(Math.max(0, value - 1))}
        disabled={value <= 0}
        aria-label={`Kurangi ${label}`}
      >
        <Minus className="size-4" aria-hidden />
      </button>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={0}
        max={200}
        value={value}
        onChange={(e) => onChange(Math.max(0, Math.min(200, Number(e.target.value) || 0)))}
        className="h-11 w-16 rounded-lg border border-batas bg-white text-center text-[17px] font-bold"
      />
      <button
        type="button"
        className="flex size-11 items-center justify-center rounded-lg border border-batas bg-white hover:bg-papan-50"
        onClick={() => onChange(Math.min(200, value + 1))}
        aria-label={`Tambah ${label}`}
      >
        <Plus className="size-4" aria-hidden />
      </button>
    </div>
  );
}

export function ClassForm({
  initial,
  classId,
}: {
  initial?: { name: string; grade: string; needs: ClassNeeds };
  classId?: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState(initial?.name ?? "");
  const [grade, setGrade] = useState(initial?.grade ?? "");
  const [needs, setNeeds] = useState<ClassNeeds>(initial?.needs ?? EMPTY_NEEDS);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setNeed = (key: NeedKey | "totalSiswa", value: number) => setNeeds((n) => ({ ...n, [key]: value }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const payload = {
      name,
      grade,
      needs: { ...needs, bahasa: needs.bahasaDaerah > 0 ? (needs.bahasa ?? "jw") : needs.bahasa },
    };
    try {
      const res = await api<{ id: string }>(classId ? `/api/kelas/${classId}` : "/api/kelas", {
        method: classId ? "PATCH" : "POST",
        body: payload,
      });
      toast.ok(classId ? "Profil kelas disimpan." : "Kelas dibuat.");
      router.push(`/guru/kelas/${res.id}`);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nama kelas" htmlFor="name">
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Contoh: Kelas 4B"
          />
        </Field>
        <Field label="Jenjang" htmlFor="grade" hint="Dipakai AI untuk menyesuaikan bahasa.">
          <Input id="grade" value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="Contoh: Kelas 4 SD" />
        </Field>
      </div>

      <fieldset className="space-y-3">
        <legend className="font-display text-lg font-bold">Profil kebutuhan kelas</legend>
        <p className="text-tinta-2">
          Isi jumlah siswa saja, tanpa nama. Tidak perlu diagnosis resmi: cukup perkiraan dari pengamatan Anda.
        </p>
        <div className="divide-y divide-garis rounded-2xl border border-garis bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <label htmlFor="need-total" className="font-bold">
              Jumlah siswa di kelas
            </label>
            <Stepper
              id="need-total"
              label="jumlah siswa"
              value={needs.totalSiswa}
              onChange={(v) => setNeed("totalSiswa", v)}
            />
          </div>
          {NEEDS.map((n) => (
            <div key={n.key} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div>
                <label htmlFor={`need-${n.key}`} className="font-bold">
                  {n.label}
                </label>
                <p className="text-[14px] text-tinta-2">{n.short}</p>
              </div>
              <Stepper id={`need-${n.key}`} label={n.label} value={needs[n.key]} onChange={(v) => setNeed(n.key, v)} />
            </div>
          ))}
          {needs.bahasaDaerah > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 bg-papan-50/60 px-4 py-3">
              <label htmlFor="bahasa" className="font-bold">
                Bahasa ibu yang paling banyak dipakai
              </label>
              <Select
                id="bahasa"
                className="w-48"
                value={needs.bahasa ?? "jw"}
                onChange={(e) => setNeeds((n) => ({ ...n, bahasa: e.target.value as "jw" | "su" }))}
              >
                <option value="jw">Bahasa Jawa</option>
                <option value="su">Bahasa Sunda</option>
              </Select>
            </div>
          )}
        </div>
      </fieldset>

      {error && <Notice tone="error">{error}</Notice>}
      <div className="flex flex-wrap gap-3">
        <Button type="submit" size="lg" disabled={busy}>
          {busy && <Spinner />}
          {classId ? "Simpan profil kelas" : "Buat kelas"}
        </Button>
        <Button variant="ghost" size="lg" onClick={() => router.back()}>
          Batal
        </Button>
      </div>
    </form>
  );
}
