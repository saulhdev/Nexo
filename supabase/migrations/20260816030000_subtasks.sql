-- Subtareas en Nexo
create table if not exists public.subtasks (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  completed boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists subtasks_task_idx on public.subtasks (task_id, position, created_at);

-- Trigger para updated_at
drop trigger if exists subtasks_set_updated_at on public.subtasks;
create trigger subtasks_set_updated_at
before update on public.subtasks
for each row execute function public.set_updated_at();

-- RLS
alter table public.subtasks enable row level security;

drop policy if exists "subtasks_all_own" on public.subtasks;
create policy "subtasks_all_own" on public.subtasks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
