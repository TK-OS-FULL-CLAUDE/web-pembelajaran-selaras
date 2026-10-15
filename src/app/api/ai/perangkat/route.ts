import { z } from "zod";
import { fail, ok, readJson, withTeacher } from "@/lib/api";
import { AiError } from "@/lib/ai-common";
import { makeJenjang, makeLkpd, makeLkpdMudah, makeModulAjar, makeRubrik } from "@/lib/ai-perangkat";
import { consumeAiQuota } from "@/lib/ai-quota";
import { getClass, getLesson } from "@/lib/data";
import { defaultAlokasi, modulIdentity } from "@/lib/perangkat";
import { fingerprint } from "@/lib/text";
import type { KitData, KitItem, KitKey } from "@/lib/types";

export const maxDuration = 60;

// Konteks tambahan untuk prompt: dipotong, bukan ditolak, supaya isi editor yang panjang tidak menggagalkan permintaan.
const shortLines = z
  .array(z.string().max(4000).transform((s) => s.trim().slice(0, 400)))
  .max(40)
  .transform((a) => a.filter(Boolean).slice(0, 12));

const schema = z.object({
  lessonId: z.string().uuid(),
  jenis: z.enum(["modul", "lkpd", "lkpdMudah", "rubrik", "jenjang"]),
  // Isi editor terbaru (bisa belum tersimpan); bila kosong dipakai isi di database.
  body: z.string().max(30_000).optional(),
  mudahText: z.string().max(30_000).optional(),
  // Supaya LKPD dan rubrik selaras dengan modul ajar dan LKPD yang sudah ada.
  tujuan: shortLines.optional(),
  aktivitas: shortLines.optional(),
});

/** Membuat DRAF perangkat ajar dengan AI. Draf selalu checked=false sampai guru mengeceknya. */
export async function POST(req: Request) {
  return withTeacher(async (teacher) => {
    const input = await readJson(req, schema);
    const lesson = await getLesson(teacher.id, input.lessonId);
    if (!lesson) return fail("Materi tidak ditemukan.", 404);

    const body = (input.body ?? lesson.body).trim();
    if (body.length < 40) return fail("Materi asli terlalu pendek untuk dibuatkan perangkat ajar.", 422);

    const mudahText = (input.mudahText ?? lesson.versions.mudah?.text ?? "").trim();
    if (input.jenis === "lkpdMudah" && mudahText.length < 40) {
      return fail("Buat versi Teks mudah dulu di tab Versi. LKPD versi sederhana disusun dari versi itu.", 422);
    }

    const cls = lesson.class_id ? await getClass(teacher.id, lesson.class_id) : null;
    const ctx = {
      teacherName: teacher.name,
      school: teacher.school,
      subject: lesson.subject,
      grade: cls?.grade ?? "",
      className: cls?.name ?? null,
      title: lesson.title,
    };
    const base = { body, title: lesson.title, subject: lesson.subject, grade: ctx.grade };
    await consumeAiQuota(teacher.id, "perangkat");

    const meta = (basedOn: string) => ({
      origin: "ai" as const,
      checked: false,
      basedOn,
      updatedAt: new Date().toISOString(),
    });

    try {
      let item: KitItem<KitData[KitKey]>;
      if (input.jenis === "modul") {
        const identitas = modulIdentity(ctx);
        const { data } = await makeModulAjar({
          ...base,
          needs: cls?.needs ?? null,
          menit: defaultAlokasi(ctx.grade).menit,
          fase: identitas.fase,
        });
        item = { data: { identitas, ...data }, ...meta(fingerprint(body)) };
      } else if (input.jenis === "lkpd") {
        const { data } = await makeLkpd({ ...base, tujuan: input.tujuan });
        item = { data, ...meta(fingerprint(body)) };
      } else if (input.jenis === "lkpdMudah") {
        const { data } = await makeLkpdMudah({ ...base, mudahText });
        item = { data, ...meta(fingerprint(mudahText)) };
      } else if (input.jenis === "jenjang") {
        const konsep = [...new Set(lesson.quiz.map((q) => q.concept?.trim()).filter((c): c is string => !!c))];
        const { data } = await makeJenjang({ ...base, tujuan: input.tujuan, konsep });
        item = { data, ...meta(fingerprint(body)) };
      } else {
        const { data } = await makeRubrik({ ...base, tujuan: input.tujuan, aktivitas: input.aktivitas });
        item = { data, ...meta(fingerprint(body)) };
      }
      // Tidak disimpan di sini: editor memasukkan draf ke isinya lalu menyimpan lewat simpan otomatis,
      // sama seperti draf versi (satu jalur tulis ke materi, dengan deteksi konflik).
      return ok({ item });
    } catch (err) {
      if (err instanceof AiError && err.status === 502) {
        throw new AiError("AI sedang tidak bisa dipakai. Coba lagi sebentar lagi, atau isi perangkat ini sendiri.", 502);
      }
      throw err;
    }
  });
}
