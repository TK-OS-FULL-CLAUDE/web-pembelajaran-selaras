// Pengujian integrasi dalam skema sementara; seluruh transaksi selalu di-rollback.
// Jalankan dengan: npx tsx --conditions=react-server tests/data-features.test.mts
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import nextEnv from "@next/env";
import postgres from "postgres";
import { SCHEMA_STATEMENTS } from "../src/lib/schema";
import { SCHEMA_VERSION } from "../src/lib/db";
import { createClass, createLesson, updateLesson, duplicateLesson, listLessons, recordStudentEvent, getLessonStats, publishLesson, getPublishedLesson, cleanupImages, listLessonAudiences, setLessonAudience, unpublishLesson } from "../src/lib/data";
import { listRevisions, getRevision, restoreRevision } from "../src/lib/lesson-history";
import { DEFAULT_PREFS, EMPTY_NEEDS } from "../src/lib/types";
import { questionKey } from "../src/lib/quiz";
nextEnv.loadEnvConfig(process.cwd());
const raw = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!raw) throw new Error("DATABASE_URL diperlukan untuk uji integrasi.");
const url = new URL(raw); url.search = "";
const sql = postgres(url.toString(), { max: 1, prepare: false, connect_timeout: 12,
  ssl: /localhost|127\.0\.0\.1/.test(url.hostname) || process.env.DATABASE_SSL === "disable" ? false : "require", onnotice: () => {} });
const namespace = `selaras_test_${randomBytes(8).toString("hex")}`;
const rollback = new Error("ROLLBACK_TEST_OK");
let passed = 0;
const previousSql = globalThis.__selarasSql;
const previousReady = globalThis.__selarasReady;
const previousVersion = globalThis.__selarasSchemaVersion;
try {
  await sql.begin(async (tx) => {
    await tx.unsafe(`create schema "${namespace}"`);
    await tx.unsafe(`set local search_path to "${namespace}", public`);
    for (let run = 0; run < 2; run++) for (const statement of SCHEMA_STATEMENTS) await tx.unsafe(statement);
    globalThis.__selarasSql = tx as unknown as typeof sql;
    globalThis.__selarasReady = Promise.resolve();
    globalThis.__selarasSchemaVersion = SCHEMA_VERSION;
    const [teacher] = await tx`insert into teachers(email, name, school, password_hash) values ('uji@example.invalid', 'Guru uji', 'Sekolah uji', 'not-a-password') returning id`;
    const [other] = await tx`insert into teachers(email, name, password_hash) values ('lain@example.invalid', 'Guru lain', 'not-a-password') returning id`;
    const cls = await createClass(teacher.id, { name: "6A", grade: "SD 6", needs: EMPTY_NEEDS });
    const lesson = await createLesson(teacher.id, { title: "Pecahan", subject: "Matematika", body: "Materi awal yang cukup panjang untuk diterbitkan.", classId: cls.id });
    const question = { q: "Setengah adalah?", concept: "Pecahan", options: ["1/2", "1/3"], answer: 0, explain: "Satu dari dua bagian." };
    const saved = await updateLesson(teacher.id, lesson.id, { body: "Materi diperbarui untuk belajar pecahan.", topic: "Bilangan", target_grade: "SD 6", is_template: true, quiz: [question] }, { baseRevision: 1 });
    assert.equal(saved.ok, true); assert.equal((await listRevisions(teacher.id, lesson.id)).length, 1);
    assert.equal((await getRevision(teacher.id, lesson.id, 1))?.body, lesson.body);
    assert.equal(await getRevision(other.id, lesson.id, 1), null);
    assert.equal((await listRevisions(other.id, lesson.id)).length, 0);
    assert.equal(await restoreRevision(other.id, lesson.id, 1, 2), null);
    passed++; console.log("✓ Riwayat atomik dan akses antar-guru terpisah");
    const conflict = await updateLesson(teacher.id, lesson.id, { title: "Tidak boleh tersimpan" }, { baseRevision: 1 });
    assert.equal(conflict.ok, false);
    assert.equal((await listRevisions(teacher.id, lesson.id)).length, 1);
    passed++; console.log("✓ Konflik revisi tidak mengubah materi atau riwayat");
    const copy = await duplicateLesson(teacher.id, lesson.id, cls.id);
    assert.equal(copy?.topic, "Bilangan"); assert.equal(copy?.status, "draft"); assert.equal(copy?.is_template, false); assert.equal(copy?.share_code, null);
    assert.equal((await listLessons(teacher.id)).find((l) => l.id === lesson.id)?.grade, "SD 6");
    passed++; console.log("✓ Templat disalin sebagai materi baru tanpa sesi/rekap");
    const pub = await publishLesson(teacher.id, lesson.id);
    assert.equal((await getPublishedLesson(pub!.share_code!))?.school_name, "Sekolah uji");
    const event = { lessonId: lesson.id, sessionId: "siswa-A", kind: "quiz" as const, alias: "A", prefs: DEFAULT_PREFS, total: 1 };
    const first = { ...event, eventId: "attempt-A1", occurredAt: "2026-01-01T01:00:00.000Z", score: 0, detail: [{ k: questionKey(question), b: false }] };
    const second = { ...event, eventId: "attempt-A2", occurredAt: "2026-01-01T02:00:00.000Z", score: 1, detail: [{ k: questionKey(question), b: true }] };
    await recordStudentEvent(second); await recordStudentEvent(first); await recordStudentEvent(second);
    await recordStudentEvent({ ...first, sessionId: "siswa-B", eventId: "attempt-B1", alias: "B" });
    for (const sessionId of ["siswa-A", "siswa-B"]) await recordStudentEvent({ lessonId: lesson.id, sessionId, kind: "open", alias: null, prefs: DEFAULT_PREFS, eventId: randomUUID() });
    const stats = await getLessonStats(lesson.id);
    assert.equal(stats.sessions, 2); assert.equal(stats.quizAttempts, 2); assert.equal(stats.totalQuizAttempts, 3);
    assert.equal(stats.avgScorePct, 50); assert.equal(stats.byConcept[0].sessions, 2); assert.equal(stats.byConcept[0].pct, 50);
    passed++; console.log("✓ Dua siswa terpisah; retry idempoten; hasil terlambat tidak menimpa percobaan terbaru");
    const restored = await restoreRevision(teacher.id, lesson.id, 1, 2);
    assert.ok(restored?.ok); assert.equal(restored.lesson.status, "published"); assert.equal(restored.lesson.body, lesson.body);
    assert.equal(restored.lesson.revision, 3); assert.equal((await getLessonStats(lesson.id)).totalQuizAttempts, 3);
    assert.equal((await getPublishedLesson(pub!.share_code!))?.body, "Materi diperbarui untuk belajar pecahan.");
    passed++; console.log("✓ Pemulihan menjadi draf perubahan; siswa tetap melihat terbitan sebelumnya dan hasil kuis tersimpan");
    const imageId = randomUUID();
    await tx`insert into lesson_images(id, teacher_id, mime, data, bytes, created_at) values (${imageId}, ${teacher.id}, 'image/png', ${Buffer.from([1, 2])}, 2, now() - interval '3 hours')`;
    await updateLesson(teacher.id, lesson.id, { body: `![contoh](gambar:${imageId})` }, { baseRevision: 3 });
    await updateLesson(teacher.id, lesson.id, { body: "Tanpa gambar" }, { baseRevision: 4 });
    await cleanupImages(teacher.id);
    assert.equal((await tx`select id from lesson_images where id = ${imageId}`).length, 1);
    passed++; console.log("✓ Gambar dalam riwayat tetap tersedia untuk pemulihan");
    await recordStudentEvent({ ...first, sessionId: "siswa-C", eventId: "attempt-C1", alias: "C" });
    assert.equal((await getLessonStats(lesson.id)).sessions, 3);
    passed++; console.log("✓ Sesi kuis tetap dihitung jika catatan membuka materi belum tiba");

    const clsB = await createClass(teacher.id, { name: "6B", grade: "SD 6", needs: { ...EMPTY_NEEDS, tuli: 1 } });
    const foreignClass = await createClass(other.id, { name: "Kelas guru lain", grade: "SD 6", needs: EMPTY_NEEDS });
    assert.equal(await setLessonAudience(other.id, lesson.id, clsB.id, true), null);
    assert.equal(await setLessonAudience(teacher.id, lesson.id, foreignClass.id, true), null);
    const audienceB = await setLessonAudience(teacher.id, lesson.id, clsB.id, true);
    assert.ok(audienceB);
    const audienceA = (await listLessonAudiences(teacher.id, lesson.id)).find((a) => a.class_id === cls.id)!;
    assert.notEqual(audienceA.share_code, audienceB.share_code);
    assert.equal((await getPublishedLesson(audienceB.share_code))?.class_name, "6B");
    assert.equal((await getPublishedLesson(audienceB.share_code))?.body, "Materi diperbarui untuk belajar pecahan.");
    assert.ok((await listLessons(teacher.id, clsB.id)).some((l) => l.id === lesson.id));
    passed++; console.log("✓ Satu materi masuk dua kelas dengan kode sendiri; kelas guru lain ditolak");

    await recordStudentEvent({ ...second, audienceId: audienceB.id, eventId: "attempt-B-class", sessionId: "siswa-A", score: 0 });
    assert.equal((await getLessonStats(lesson.id, { audienceId: audienceA.id })).sessions, 3);
    assert.equal((await getLessonStats(lesson.id, { audienceId: audienceB.id })).sessions, 1);
    assert.equal((await getLessonStats(lesson.id)).sessions, 4);
    assert.equal((await getLessonStats(lesson.id, { audienceId: audienceA.id })).totalQuizAttempts, 4);
    assert.equal((await getLessonStats(lesson.id, { audienceId: audienceB.id })).totalQuizAttempts, 1);
    assert.equal((await listLessons(teacher.id, clsB.id)).find((l) => l.id === lesson.id)?.sessions, 1);
    passed++; console.log("✓ Rekap per kelas terpisah, termasuk saat ID sesi sama pada dua kelas");

    const feedback = { ...event, kind: "confused" as const, audienceId: audienceB.id, eventId: "feedback-B1", feedback: { section: "Membandingkan pecahan", revision: 2 } };
    await recordStudentEvent(feedback); await recordStudentEvent(feedback);
    await recordStudentEvent({ ...feedback, eventId: "feedback-B2" });
    const confused = await getLessonStats(lesson.id, { audienceId: audienceB.id });
    assert.equal(confused.confusion.length, 1); assert.equal(confused.confusion[0].sessions, 1);
    assert.equal((await getLessonStats(lesson.id, { audienceId: audienceA.id })).confusion.length, 0);
    assert.equal(confused.totalQuizAttempts, 1);
    passed++; console.log("✓ Belum paham dihitung sekali per sesi/bagian/versi dan tidak mengubah hasil kuis");

    assert.equal(await publishLesson(teacher.id, lesson.id, 2), null);
    assert.equal((await getPublishedLesson(pub!.share_code!))?.body, "Materi diperbarui untuk belajar pecahan.");
    const republished = await publishLesson(teacher.id, lesson.id, 5);
    assert.equal(republished?.published_revision, 5);
    assert.equal((await getPublishedLesson(audienceA.share_code))?.body, "Tanpa gambar");
    assert.equal((await getPublishedLesson(audienceB.share_code))?.body, "Tanpa gambar");
    assert.equal(republished?.share_code, pub?.share_code);
    passed++; console.log("✓ Revisi lama gagal terbit; satu penerbitan memperbarui semua kelas dengan link tetap");

    await setLessonAudience(teacher.id, lesson.id, clsB.id, false);
    assert.equal(await getPublishedLesson(audienceB.share_code), null);
    assert.ok(await getPublishedLesson(audienceA.share_code));
    assert.equal((await getLessonStats(lesson.id, { audienceId: audienceB.id })).totalQuizAttempts, 1);
    assert.ok(!(await listLessons(teacher.id, clsB.id)).some((l) => l.id === lesson.id));
    const enabledB = await setLessonAudience(teacher.id, lesson.id, clsB.id, true);
    assert.equal(enabledB?.share_code, audienceB.share_code);
    await unpublishLesson(teacher.id, lesson.id);
    assert.equal(await getPublishedLesson(audienceA.share_code), null);
    assert.equal(await getPublishedLesson(audienceB.share_code), null);
    passed++; console.log("✓ Nonaktif per kelas mempertahankan rekap/kode; tarik materi menutup semua kelas");

    await publishLesson(teacher.id, lesson.id, 5);
    await updateLesson(teacher.id, lesson.id, { body: "Draf belum boleh tampil" }, { baseRevision: 5 });
    for (const statement of SCHEMA_STATEMENTS) await tx.unsafe(statement);
    assert.equal((await getPublishedLesson(audienceA.share_code))?.body, "Tanpa gambar");
    assert.equal((await getLessonStats(lesson.id, { audienceId: audienceB.id })).sessions, 1);
    passed++; console.log("✓ Migrasi berulang tidak menerbitkan draf atau mencampur ulang data antarkelas");
    throw rollback;
  });
} catch (error) {
  if (error !== rollback) { console.error("Uji integrasi gagal:", (error as Error).message); process.exitCode = 1; }
  else console.log(`${passed} uji integrasi lulus; semua data uji di-rollback.`);
} finally {
  globalThis.__selarasSql = previousSql;
  globalThis.__selarasReady = previousReady;
  globalThis.__selarasSchemaVersion = previousVersion;
  await sql.end();
}
