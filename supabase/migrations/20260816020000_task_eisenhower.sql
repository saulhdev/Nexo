-- Migración: Matriz de Eisenhower (is_urgent, is_important en tareas)

alter table public.tasks
  add column if not exists is_urgent boolean default false,
  add column if not exists is_important boolean default true;

create index if not exists tasks_eisenhower_idx on public.tasks (is_urgent, is_important);
