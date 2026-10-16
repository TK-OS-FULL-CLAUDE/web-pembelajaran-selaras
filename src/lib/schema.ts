// Skema database. Dijalankan otomatis (idempoten) saat app pertama kali terhubung ke database,
// jadi tim tidak perlu menjalankan SQL manual di Supabase.
// Salinan yang sama ada di docs/schema.sql untuk dibaca juri.

export const SCHEMA_STATEMENTS: string[] = [
  `create table if not exists teachers (
    id uuid primary key default gen_random_uuid(),
    email text not null unique,
    name text not null,
    school text,
    password_hash text not null,
    is_demo boolean not null default false,
    created_at timestamptz not null default now()
  )`,
  `create table if not exists classes (
    id uuid primary key default gen_random_uuid(),
    teacher_id uuid not null references teachers(id) on delete cascade,
    name text not null,
    grade text not null default '',
    needs jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
  )`,
  `create index if not exists classes_teacher_idx on classes(teacher_id)`,
  `create table if not exists lessons (
    id uuid primary key default gen_random_uuid(),
    teacher_id uuid not null references teachers(id) on delete cascade,
    class_id uuid references classes(id) on delete set null,
    title text not null,
    subject text not null default '',
    body text not null default '',
    glossary jsonb not null default '[]'::jsonb,
    versions jsonb not null default '{}'::jsonb,
    quiz jsonb not null default '[]'::jsonb,
    status text not null default 'draft',
    share_code text unique,
    published_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  )`,
  // Ditambahkan setelah versi pertama; "if not exists" aman untuk database yang sudah ada.
  `alter table lessons add column if not exists revision integer not null default 1`,
  // Perangkat ajar guru (modul ajar, LKPD, LKPD sederhana, rubrik). Tidak pernah dikirim ke halaman siswa.
  `alter table lessons add column if not exists teaching_kit jsonb not null default '{}'::jsonb`,
  // Bank latihan adaptif: soal tambahan per konsep untuk siswa yang salah di konsep itu (hanya yang dicek guru dikirim).
  `alter table lessons add column if not exists practice jsonb not null default '[]'::jsonb`,
  `create index if not exists lessons_teacher_idx on lessons(teacher_id)`,
  `create index if not exists lessons_class_idx on lessons(class_id)`,
  `create table if not exists student_events (
    id bigserial primary key,
    lesson_id uuid not null references lessons(id) on delete cascade,
    session_id text not null,
    kind text not null,
    student_alias text,
    prefs jsonb not null default '{}'::jsonb,
    score int,
    total int,
    created_at timestamptz not null default now()
  )`,
  `create index if not exists student_events_lesson_idx on student_events(lesson_id)`,
  // Lama pengerjaan kuis (detik), sesuai rencana: attempt menyimpan skor, mode, dan durasi.
  `alter table student_events add column if not exists duration_sec integer`,
  // Migrasi: dulu satu versi "daerah" (+ lang jw/su); sekarang Basa Jawa dan Basa Sunda terpisah.
  // Pilihan siswa lama dipindah lebih dulu karena masih membaca bahasa dari versi "daerah".
  `update student_events e
    set prefs = jsonb_set(e.prefs, '{versi}',
      to_jsonb(case when l.versions->'daerah'->>'lang' = 'su' then 'sunda' else 'jawa' end))
    from lessons l
    where l.id = e.lesson_id and e.prefs->>'versi' = 'daerah'`,
  `update lessons
    set versions = (versions - 'daerah') || jsonb_build_object(
      case when versions->'daerah'->>'lang' = 'su' then 'sunda' else 'jawa' end,
      (versions->'daerah') - 'lang')
    where versions ? 'daerah'`,
  // Deskripsi gambar (alt text) per gambar di materi: { [idGambar]: { alt, altOrigin, altChecked } }.
  `alter table lessons add column if not exists figures jsonb not null default '{}'::jsonb`,
  // Benar/salah tiap soal per siswa, untuk "soal yang paling sulit" di Rekap.
  `alter table student_events add column if not exists detail jsonb`,
  // Gambar dan diagram materi (dari foto buku, PDF, Word, atau unggahan guru).
  // Disimpan di Postgres supaya tidak butuh layanan penyimpanan lain; ukuran sudah dikecilkan di browser.
  `create table if not exists lesson_images (
    id uuid primary key default gen_random_uuid(),
    teacher_id uuid not null references teachers(id) on delete cascade,
    lesson_id uuid,
    mime text not null,
    data bytea not null,
    width int,
    height int,
    bytes int not null,
    created_at timestamptz not null default now()
  )`,
  `create index if not exists lesson_images_teacher_idx on lesson_images(teacher_id, created_at)`,
  // Catatan percobaan masuk, untuk membatasi tebak-tebakan kata sandi.
  `create table if not exists auth_attempts (
    id bigserial primary key,
    email text not null,
    ok boolean not null,
    created_at timestamptz not null default now()
  )`,
  `create index if not exists auth_attempts_email_idx on auth_attempts(email, created_at)`,
  // Catatan permintaan AI per guru, untuk batas pemakaian per jam (src/lib/ai-quota.ts).
  `create table if not exists ai_usage (
    id bigserial primary key,
    teacher_id uuid not null references teachers(id) on delete cascade,
    kind text not null,
    created_at timestamptz not null default now()
  )`,
  `create index if not exists ai_usage_teacher_idx on ai_usage(teacher_id, created_at)`,
  `alter table student_events add column if not exists event_id text`,
  `alter table student_events add column if not exists occurred_at timestamptz`,
  `create unique index if not exists student_events_delivery_idx on student_events(lesson_id, event_id)`,
  `alter table lessons add column if not exists topic text not null default ''`,
  `alter table lessons add column if not exists target_grade text not null default ''`,
  `alter table lessons add column if not exists is_template boolean not null default false`,
  `create table if not exists lesson_revisions (
    lesson_id uuid not null references lessons(id) on delete cascade,
    revision integer not null,
    snapshot jsonb not null,
    saved_at timestamptz not null default now(),
    primary key (lesson_id, revision)
  )`,
  // Trigger dan update berada dalam transaksi yang sama, termasuk simpan paksa/pemulihan.
  `create or replace function selaras_keep_revision() returns trigger language plpgsql as $$
    begin
      if new.revision <> old.revision then
        insert into lesson_revisions(lesson_id, revision, snapshot, saved_at)
          values (old.id, old.revision, to_jsonb(old), old.updated_at)
          on conflict do nothing;
        delete from lesson_revisions where lesson_id = old.id and revision not in (
          select revision from lesson_revisions where lesson_id = old.id order by revision desc limit 50
        );
      end if;
      return new;
    end;
  $$`,
  `drop trigger if exists selaras_revision_history on lessons`,
  `create trigger selaras_revision_history before update on lessons for each row execute function selaras_keep_revision()`,
  `alter table lesson_revisions enable row level security`,
  // Masuk dengan Google: akun guru dari Google tidak punya kata sandi Selaras.
  `alter table teachers add column if not exists google_sub text`,
  `create unique index if not exists teachers_google_sub_idx on teachers(google_sub)`,
  `alter table teachers alter column password_hash drop not null`,
  // Isi kerja guru dipisahkan dari salinan yang terakhir diterbitkan.
  `alter table lessons add column if not exists published_content jsonb`,
  `alter table lessons add column if not exists published_revision integer`,
  `update lessons l set published_content = to_jsonb(l) - 'published_content', published_revision = revision
    where status = 'published' and published_content is null`,
  `create table if not exists lesson_audiences (
    id uuid primary key default gen_random_uuid(),
    lesson_id uuid not null references lessons(id) on delete cascade,
    class_id uuid references classes(id) on delete set null,
    class_name text,
    share_code text not null unique,
    active boolean not null default true,
    unique (lesson_id, class_id)
  )`,
  `insert into lesson_audiences(lesson_id, class_id, class_name, share_code)
    select l.id, l.class_id, c.name, l.share_code from lessons l left join classes c on c.id = l.class_id
    where l.share_code is not null on conflict do nothing`,
  `alter table student_events add column if not exists audience_id uuid references lesson_audiences(id) on delete set null`,
  `alter table student_events add column if not exists feedback jsonb`,
  `update student_events e set audience_id = a.id from lesson_audiences a join lessons l on l.id = a.lesson_id
    where e.lesson_id = l.id and a.share_code = l.share_code and e.audience_id is null`,
  `create index if not exists student_events_audience_idx on student_events(lesson_id, audience_id)`,
  `alter table lesson_audiences enable row level security`,
  // Supabase membuka skema public lewat REST API. RLS tanpa policy menutup akses itu;
  // app ini terhubung sebagai pemilik tabel sehingga tetap bisa membaca/menulis.
  `alter table teachers enable row level security`,
  `alter table classes enable row level security`,
  `alter table lessons enable row level security`,
  `alter table student_events enable row level security`,
  `alter table auth_attempts enable row level security`,
  `alter table ai_usage enable row level security`,
  `alter table lesson_images enable row level security`,
];
