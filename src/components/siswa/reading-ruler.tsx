"use client";

// Garis bantu baca untuk siswa disleksia atau sulit fokus: pita terang yang mengikuti jari
// atau kursor, sementara bagian lain layar sedikit diredupkan.

import { useEffect, useState } from "react";

const TINGGI = 72;

export function ReadingRuler() {
  const [y, setY] = useState<number | null>(null);

  useEffect(() => {
    setY(Math.round(window.innerHeight * 0.45));
    const onPointer = (e: PointerEvent) => setY(e.clientY);
    const onTouch = (e: TouchEvent) => {
      const t = e.touches[0];
      if (t) setY(t.clientY);
    };
    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("pointerdown", onPointer, { passive: true });
    window.addEventListener("touchmove", onTouch, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("touchmove", onTouch);
    };
  }, []);

  if (y === null) return null;
  const top = Math.max(0, y - TINGGI / 2);

  return (
    <div aria-hidden className="no-print pointer-events-none fixed inset-0 z-30">
      <div className="absolute inset-x-0 top-0 bg-black/25" style={{ height: top }} />
      <div className="absolute inset-x-0 border-y-2 border-amber-500/80" style={{ top, height: TINGGI }} />
      <div className="absolute inset-x-0 bottom-0 bg-black/25" style={{ top: top + TINGGI }} />
    </div>
  );
}
