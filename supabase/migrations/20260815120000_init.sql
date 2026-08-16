-- Nexo — esquema inicial
-- Ejecuta este archivo en el SQL Editor de Supabase o con `supabase db push`.

create extension if not exists "pgcrypto";

-- Crear tipos ENUM de forma idempotente
create or replace function public.__temp_init_types() returns void language plpgsql as $$
begin
  if not exists (select 1 from pg_type where typname = 'task_status') then
    create type public.task_status as enum ('todo', 'in_progress', 'in_review', 'done');
  end if;
  if not exists (select 1 from pg_type where typname = 'task_priority') then
    create type public.task_priority as enum ('low', 'medium', 'high', 'urgent');
  end if;
end;
$$;
select public.__temp_init_types();
drop function if exists public.__temp_init_types();

-- Tablas
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  color text not null default '#C45C26',
  created_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  description text not null default '',
  status public.task_status not null default 'todo',
  priority public.task_priority not null default 'medium',
  start_date date,
  due_date date,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  url text not null,
  size integer not null default 0,
  type text not null default 'application/octet-stream',
  created_at timestamptz not null default now()
);

-- Índices
create index if not exists tasks_user_status_idx on public.tasks (user_id, status);
create index if not exists tasks_project_idx on public.tasks (project_id);
create index if not exists tasks_start_date_idx on public.tasks (start_date);
create index if not exists tasks_due_date_idx on public.tasks (due_date);
create index if not exists comments_task_idx on public.comments (task_id, created_at);
create index if not exists activities_task_idx on public.activities (task_id, created_at desc);
create index if not exists activities_user_idx on public.activities (user_id, created_at desc);
create index if not exists attachments_task_idx on public.attachments (task_id, created_at);

-- Función para actualizar updated_at automáticamente
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at
before update on public.tasks
for each row execute function public.set_updated_at();

-- Función y trigger para crear perfil y proyecto por defecto al registrar usuario en Auth
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(coalesce(new.email, 'usuario'), '@', 1))
  )
  on conflict (id) do nothing;

  if not exists (select 1 from public.projects where user_id = new.id) then
    insert into public.projects (user_id, name, color)
    values (new.id, 'General', '#C45C26');
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Habilitar Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.comments enable row level security;
alter table public.activities enable row level security;
alter table public.attachments enable row level security;

-- Políticas RLS
-- profiles: Lectura pública/autenticada (para poder mostrar nombres de autores/asignados en comentarios y tareas)
drop policy if exists "profiles_all_own" on public.profiles;
drop policy if exists "profiles_select_all" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_delete_own" on public.profiles;

create policy "profiles_select_all" on public.profiles
  for select using (true);

create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "profiles_delete_own" on public.profiles
  for delete using (auth.uid() = id);

-- projects
drop policy if exists "projects_all_own" on public.projects;
create policy "projects_all_own" on public.projects
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- tasks
drop policy if exists "tasks_all_own" on public.tasks;
create policy "tasks_all_own" on public.tasks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- comments
drop policy if exists "comments_all_own" on public.comments;
create policy "comments_all_own" on public.comments
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- activities
drop policy if exists "activities_all_own" on public.activities;
create policy "activities_all_own" on public.activities
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- attachments
drop policy if exists "attachments_all_own" on public.attachments;
create policy "attachments_all_own" on public.attachments
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

