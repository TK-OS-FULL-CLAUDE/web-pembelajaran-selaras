"use client";

import { CheckCircle2, CircleAlert, X } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useState } from "react";

type Toast = { id: number; tone: "ok" | "error"; message: string };
type ToastApi = { ok: (message: string) => void; error: (message: string) => void };

const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const push = useCallback(
    (tone: Toast["tone"], message: string) => {
      const id = Date.now() + Math.random();
      setToasts((t) => [...t.slice(-2), { id, tone, message }]);
      setTimeout(() => remove(id), tone === "error" ? 7000 : 3500);
    },
    [remove],
  );
  const api = useMemo<ToastApi>(() => ({ ok: (m) => push("ok", m), error: (m) => push("error", m) }), [push]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="no-print pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4"
        aria-live="polite"
        role="status"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex max-w-md items-start gap-2 rounded-xl px-4 py-3 text-[15px] shadow-lg ${
              t.tone === "ok" ? "bg-tinta text-white" : "bg-galat text-white"
            }`}
          >
            {t.tone === "ok" ? (
              <CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden />
            ) : (
              <CircleAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
            )}
            <span>{t.message}</span>
            <button
              type="button"
              onClick={() => remove(t.id)}
              className="-mr-1 ml-1 rounded p-0.5 opacity-80 hover:opacity-100"
              aria-label="Tutup pemberitahuan"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast harus dipakai di dalam ToastProvider");
  return ctx;
}
