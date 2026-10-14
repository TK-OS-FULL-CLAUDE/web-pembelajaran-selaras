import { z } from "zod";
import { fail, ok, readJson, withTeacher } from "@/lib/api";
import { photoToText } from "@/lib/ai-tasks";

export const maxDuration = 60;

const schema = z.object({
  // data URL dari browser, sudah dikecilkan di sisi klien (lihat src/lib/image.ts)
  image: z.string().max(6_000_000),
});

export async function POST(req: Request) {
  return withTeacher(async () => {
    const { image } = await readJson(req, schema);
    const match = image.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
    if (!match) return fail("Format foto tidak didukung. Pakai JPG, PNG, atau WEBP.", 400);
    const result = await photoToText({ mimeType: match[1], base64: match[2] });
    if (!result.terbaca || result.teks.trim().length < 10) {
      return fail("Teks di foto tidak terbaca. Coba foto ulang dengan cahaya cukup dan halaman lurus.", 422);
    }
    return ok({ title: result.judul, text: result.teks.trim(), model: result.model });
  });
}
