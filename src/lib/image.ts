// Pengolahan gambar di browser: dikecilkan sebelum dikirim ke server/AI supaya hemat kuota dan
// di bawah batas body 4,5 MB Vercel.

import { ApiError } from "./client";

/** Foto untuk AI: sisi terpanjang 1568 px (ukuran yang dipakai Claude), JPEG. */
export async function compressImage(file: Blob, maxSide = 1568, quality = 0.82): Promise<string> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) throw new Error("File ini bukan gambar yang bisa dibaca.");
  const canvas = drawScaled(bitmap, maxSide);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", quality);
}

/** Gambar sumber → kanvas dengan sisi terpanjang paling besar maxSide. */
export function drawScaled(source: CanvasImageSource & { width: number; height: number }, maxSide: number) {
  const scale = Math.min(1, maxSide / Math.max(source.width, source.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(source.width * scale));
  canvas.height = Math.max(1, Math.round(source.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Browser tidak bisa memproses gambar.");
  ctx.fillStyle = "#ffffff"; // PNG transparan → latar putih (diagram buku biasanya di kertas putih)
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/** Potong bagian [x, y, w, h] (piksel sumber) menjadi kanvas baru. */
export function cropToCanvas(
  source: CanvasImageSource & { width: number; height: number },
  box: { x: number; y: number; w: number; h: number },
) {
  const x = Math.max(0, Math.floor(box.x));
  const y = Math.max(0, Math.floor(box.y));
  const w = Math.max(1, Math.min(source.width - x, Math.ceil(box.w)));
  const h = Math.max(1, Math.min(source.height - y, Math.ceil(box.h)));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Browser tidak bisa memproses gambar.");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(source, x, y, w, h, 0, 0, w, h);
  return canvas;
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/** Kanvas → file WebP (atau JPEG bila browser tidak bisa membuat WebP), sisi terpanjang ≤ maxSide. */
export async function canvasToUpload(canvas: HTMLCanvasElement, maxSide = 1600) {
  const scaled = Math.max(canvas.width, canvas.height) > maxSide ? drawScaled(canvas, maxSide) : canvas;
  let blob = await toBlob(scaled, "image/webp", 0.86);
  if (!blob || blob.type !== "image/webp") blob = await toBlob(scaled, "image/jpeg", 0.86);
  if (!blob) throw new Error("Gagal menyiapkan gambar.");
  return { blob, width: scaled.width, height: scaled.height };
}

/** Unggah satu gambar materi. Mengembalikan ID gambar. */
export async function uploadImage(
  file: { blob: Blob; width: number; height: number },
  lessonId?: string | null,
): Promise<string> {
  const params = new URLSearchParams({ w: String(file.width), h: String(file.height) });
  if (lessonId) params.set("materi", lessonId);
  let res: Response;
  try {
    res = await fetch(`/api/gambar?${params}`, {
      method: "POST",
      headers: { "content-type": file.blob.type || "application/octet-stream" },
      body: file.blob,
    });
  } catch {
    throw new ApiError("Tidak bisa mengunggah gambar. Periksa koneksi internet.", 0, {});
  }
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok)
    throw new ApiError((data.error as string) || `Gagal mengunggah gambar (kode ${res.status}).`, res.status, data);
  return data.id as string;
}

/** File gambar dari perangkat guru → diunggah. */
export async function uploadImageFile(file: File, lessonId?: string | null) {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) throw new Error("File ini bukan gambar yang bisa dibaca (pakai JPG, PNG, atau WEBP).");
  const canvas = drawScaled(bitmap, 1600);
  bitmap.close();
  const prepared = await canvasToUpload(canvas);
  const id = await uploadImage(prepared, lessonId);
  return { id, width: prepared.width, height: prepared.height };
}
