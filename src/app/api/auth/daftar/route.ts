import { z } from "zod";
import { setSessionCookie } from "@/lib/auth";
import { fail, handle, ok, readJson } from "@/lib/api";
import { getDb } from "@/lib/db";
import { hashPassword } from "@/lib/password";

const schema = z.object({
  name: z.string().trim().min(2, "Nama minimal 2 huruf").max(100),
  school: z.string().trim().max(150).optional().default(""),
  email: z.string().trim().toLowerCase().email("Email tidak valid").max(200),
  password: z.string().min(8, "Kata sandi minimal 8 karakter").max(200),
});

export async function POST(req: Request) {
  return handle(async () => {
    const input = await readJson(req, schema);
    const sql = await getDb();
    const existing = await sql`select 1 from teachers where email = ${input.email}`;
    if (existing.length) return fail("Email ini sudah terdaftar. Silakan masuk.", 409);
    const [row] = await sql<{ id: string }[]>`
      insert into teachers (email, name, school, password_hash)
      values (${input.email}, ${input.name}, ${input.school || null}, ${hashPassword(input.password)})
      returning id`;
    await setSessionCookie(row.id);
    return ok({ ok: true }, 201);
  });
}
