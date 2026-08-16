-- Migración: Fechas de inicio/vencimiento y adjuntos en tareas

alter table public.tasks
  add column if not exists start_date date;

create index if not exists tasks_start_date_idx on public.tasks (start_date);

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

create index if not exists attachments_task_idx on public.attachments (task_id, created_at);

alter table public.attachments enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where tablename = 'attachments' and policyname = 'attachments_all_own'
  ) then
    create policy "attachments_all_own" on public.attachments
      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;
