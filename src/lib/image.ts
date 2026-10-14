// Mengecilkan foto di browser sebelum dikirim ke AI: sisi terpanjang 1568 px (ukuran yang dipakai Claude),
// hemat biaya token gambar dan di bawah batas body 4,5 MB Vercel.
export async function compressImage(file: File, maxSide = 1568, quality = 0.82): Promise<string> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) throw new Error("File ini bukan gambar yang bisa dibaca.");
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Browser tidak bisa memproses gambar.");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", quality);
}
