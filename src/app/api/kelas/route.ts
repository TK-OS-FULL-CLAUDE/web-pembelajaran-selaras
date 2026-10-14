import { classInput, ok, readJson, withTeacher } from "@/lib/api";
import { createClass } from "@/lib/data";

export async function POST(req: Request) {
  return withTeacher(async (teacher) => {
    const input = await readJson(req, classInput);
    const row = await createClass(teacher.id, input);
    return ok({ id: row.id }, 201);
  });
}
