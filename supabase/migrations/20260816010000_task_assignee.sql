-- Migración: Asignación de tareas a usuarios (assignee_id)

alter table public.tasks
  add column if not exists assignee_id uuid references public.profiles(id) on delete set null;

create index if not exists tasks_assignee_idx on public.tasks (assignee_id);
