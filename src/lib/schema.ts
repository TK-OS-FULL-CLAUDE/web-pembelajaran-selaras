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
  // Catatan percobaan masuk, untuk membatasi tebak-tebakan kata sandi.
  `create table if not exists auth_attempts (
    id bigserial primary key,
    email text not null,
    ok boolean not null,
    created_at timestamptz not null default now()
  )`,
  `create index if not exists auth_attempts_email_idx on auth_attempts(email, created_at)`,
  // Supabase membuka skema public lewat REST API. RLS tanpa policy menutup akses itu;
  // app ini terhubung sebagai pemilik tabel sehingga tetap bisa membaca/menulis.
  `alter table teachers enable row level security`,
  `alter table classes enable row level security`,
  `alter table lessons enable row level security`,
  `alter table student_events enable row level security`,
  `alter table auth_attempts enable row level security`,
];
