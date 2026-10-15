import { fail, ok, withTeacher } from "@/lib/api";
import { insertImage, isUuid, type ImageMime } from "@/lib/data";

// Unggah satu gambar materi (sudah dikecilkan di browser, lihat src/lib/image.ts).
// Body = isi file mentah; ukuran & id materi lewat query: /api/gambar?materi=…&w=…&h=…

const MAX_BYTES = 3 * 1024 * 1024; // di bawah batas body 4,5 MB Vercel

/** Kenali jenis file dari byte awalnya, jangan percaya header content-type. */
function sniff(buf: Buffer): ImageMime | null {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))
    return "image/png";
  if (buf.length > 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP")
    return "image/webp";
  return null;
}

const dim = (v: string | null) => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 && n <= 20_000 ? n : null;
};

export async function POST(req: Request) {
  return withTeacher(async (teacher) => {
    const url = new URL(req.url);
    const declared = Number(req.headers.get("content-length") || 0);
    if (declared > MAX_BYTES) return fail("Gambar terlalu besar (maks. 3 MB).", 413);
    const data = Buffer.from(await req.arrayBuffer());
    if (!data.length) return fail("Gambar kosong.", 400);
    if (data.length > MAX_BYTES) return fail("Gambar terlalu besar (maks. 3 MB).", 413);
    const mime = sniff(data);
    if (!mime) return fail("Format gambar tidak didukung. Pakai JPG, PNG, atau WEBP.", 415);
    const lessonId = url.searchParams.get("materi");
    const id = await insertImage({
      teacherId: teacher.id,
      lessonId: isUuid(lessonId) ? lessonId : null,
      mime,
      data,
      width: dim(url.searchParams.get("w")),
      height: dim(url.searchParams.get("h")),
    });
    return ok({ id }, 201);
  });
}
