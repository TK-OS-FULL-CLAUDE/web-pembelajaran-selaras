import { getImage } from "@/lib/data";
import { MissingDatabaseError } from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

/** Menampilkan gambar materi. ID gambar acak (UUID) dan isinya tidak pernah berubah, jadi boleh di-cache lama. */
export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  try {
    const img = await getImage(id);
    if (!img) return new Response("Gambar tidak ditemukan.", { status: 404 });
    return new Response(new Uint8Array(img.data), {
      headers: {
        "content-type": img.mime,
        "cache-control": "public, max-age=31536000, immutable",
        "x-content-type-options": "nosniff",
        // Gambar SVG (hanya dari data demo) tidak boleh menjalankan skrip.
        "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      },
    });
  } catch (err) {
    if (err instanceof MissingDatabaseError) return new Response(err.message, { status: 503 });
    console.error(err);
    return new Response("Gagal memuat gambar.", { status: 500 });
  }
}
