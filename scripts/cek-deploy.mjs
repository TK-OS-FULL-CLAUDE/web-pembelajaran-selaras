#!/usr/bin/env node
// Cek cepat setelah deploy. Menjalankan alur guru yang paling penting terhadap app yang sudah online,
// memakai akun demo, lalu menghapus lagi data uji yang dibuatnya.
//
// Pakai:  npm run cek -- https://selaras-xxx.vercel.app
//         npm run cek -- https://selaras-xxx.vercel.app --ai   (ikut uji API AI Claude/Gemini; memakai sedikit kredit)
//         npm run cek                                          (default http://localhost:3000)

const args = process.argv.slice(2);
const withAi = args.includes("--ai");
const base = (args.find((a) => !a.startsWith("--")) || "http://localhost:3000").replace(/\/+$/, "");

let cookie = "";
let failed = 0;
const cleanup = [];

const green = (s) => `\x1b[32m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;
const dim = (s) => `\x1b[2m${s}\x1b[0m`;

async function call(method, path, body) {
  const res = await fetch(base + path, {
    method,
    redirect: "manual",
    headers: {
      ...(body ? { "content-type": "application/json" } : {}),
      ...(cookie ? { cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const set = res.headers.getSetCookie?.() ?? [];
  const session = set.find((c) => c.startsWith("selaras_sesi="));
  if (session) cookie = session.split(";")[0];
  const text = await res.text();
  let data = null;
  try {
    data = JSON.parse(text);
  } catch {
    data = text.slice(0, 200);
  }
  return { status: res.status, data };
}

async function step(name, fn) {
  const t = Date.now();
  try {
    const note = await fn();
    console.log(`${green("✓")} ${name}${note ? dim(` — ${note}`) : ""} ${dim(`(${Date.now() - t} ms)`)}`);
    return true;
  } catch (err) {
    failed++;
    console.log(`${red("✗")} ${name}\n    ${red(err.message)}`);
    return false;
  }
}

function expect(res, status, what) {
  if (res.status !== status) {
    const msg = typeof res.data === "object" && res.data?.error ? res.data.error : JSON.stringify(res.data);
    throw new Error(`${what}: diharapkan HTTP ${status}, dapat ${res.status}. ${msg ?? ""}`);
  }
  return res.data;
}

console.log(`\nCek deploy Selaras → ${base}\n`);

const dbOk = await step("Database terhubung (/api/status)", async () => {
  const d = expect(await call("GET", "/api/status"), 200, "status");
  if (d.database !== "ok") throw new Error(`database: ${d.database}${d.detail ? ` (${d.detail})` : ""}`);
  return `AI ${d.ai}; SESSION_SECRET ${d.sessionSecret}`;
});

if (dbOk) {
  await step("Masuk sebagai guru demo", async () => {
    expect(await call("POST", "/api/auth/demo"), 200, "login demo");
    if (!cookie) throw new Error("cookie sesi tidak diterima");
  });

  await step("Halaman guru terbuka setelah login", async () => {
    expect(await call("GET", "/guru"), 200, "/guru");
  });

  let classId, lessonId, copyId;
  await step("Buat kelas uji", async () => {
    const d = expect(
      await call("POST", "/api/kelas", {
        name: "Cek deploy (otomatis dihapus)",
        grade: "Kelas 4 SD",
        needs: { totalSiswa: 10, lowVision: 0, tuli: 0, disleksia: 1, sulitFokus: 0, bahasaDaerah: 0, bahasa: null },
      }),
      201,
      "buat kelas",
    );
    classId = d.id;
    cleanup.push(["DELETE", `/api/kelas/${classId}`]);
  });

  if (classId) {
    await step("Buat materi di kelas itu", async () => {
      const d = expect(
        await call("POST", "/api/materi", {
          classId,
          title: "Cek deploy",
          subject: "IPA",
          body: "Air di bumi selalu bergerak. Matahari memanaskan air laut.",
        }),
        201,
        "buat materi",
      );
      lessonId = d.id;
      cleanup.unshift(["DELETE", `/api/materi/${lessonId}`]);
    });
  }

  if (lessonId) {
    await step("Simpan perubahan materi (revisi 1 → 2)", async () => {
      const d = expect(
        await call("PATCH", `/api/materi/${lessonId}`, { title: "Cek deploy (diubah)", baseRevision: 1 }),
        200,
        "simpan",
      );
      if (d.revision !== 2) throw new Error(`revisi seharusnya 2, dapat ${d.revision}`);
    });

    await step("Simpanan dari tab lama ditolak (deteksi bentrok)", async () => {
      const r = await call("PATCH", `/api/materi/${lessonId}`, { title: "tab lama", baseRevision: 1 });
      expect(r, 409, "simpan versi lama");
    });

    await step("Salin materi", async () => {
      const d = expect(await call("POST", `/api/materi/${lessonId}/salin`, { classId }), 201, "salin");
      copyId = d.id;
      cleanup.unshift(["DELETE", `/api/materi/${copyId}`]);
    });

    if (withAi) {
      await step("AI membuat 1 draf soal (Gemini dulu, cadangan Claude)", async () => {
        const d = expect(await call("POST", "/api/ai/kuis", { lessonId, count: 1 }), 200, "AI kuis");
        return d.questions?.[0]?.q?.slice(0, 50);
      });
      await step("AI membuat draf ringkasan (Claude dulu, cadangan Gemini)", async () => {
        const d = expect(await call("POST", "/api/ai/versi", { lessonId, jenis: "ringkasan" }), 200, "AI ringkasan");
        if (d.version?.checked !== false) throw new Error("draf AI seharusnya belum dicek");
        return d.version?.text?.split("\n")[0]?.slice(0, 50);
      });
    }
  }

  // Bersihkan data uji (materi dulu, lalu kelas).
  for (const [method, path] of cleanup) {
    await step(`Hapus data uji ${dim(path)}`, async () => {
      expect(await call(method, path), 200, "hapus");
    });
  }

  await step("Halaman siswa demo terbuka (/s/DEMO01)", async () => {
    expect(await call("GET", "/s/DEMO01"), 200, "/s/DEMO01");
  });
}

console.log(
  failed
    ? `\n${red(`${failed} pemeriksaan gagal.`)} Lihat pesan di atas, lalu cek Environment Variables di Vercel.\n`
    : `\n${green("Semua pemeriksaan lolos.")}${withAi ? "" : dim(" Tambahkan --ai untuk ikut menguji API AI.")}\n`,
);
process.exit(failed ? 1 : 0);
