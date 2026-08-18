-- Nexo — Fix: infinite recursion in team_members RLS policy
--
-- Root cause: the "team_members_select" policy queries team_members itself
-- to decide who can read it, causing PostgreSQL to recurse infinitely.
--
-- Fix: replace all direct subqueries on team_members with a SECURITY DEFINER
-- helper function that bypasses RLS, breaking the recursion.

-- ─── 1. Helper: check team membership without triggering RLS ─────────────────
-- SECURITY DEFINER runs as the function owner (postgres), skipping RLS on
-- team_members, so the policy can call it safely.
create or replace function public.is_team_member(p_team_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.team_members
    where team_id = p_team_id
      and user_id = auth.uid()
  );
$$;

-- Grant execution to authenticated users
grant execute on function public.is_team_member(uuid) to authenticated;

-- ─── 2. Fix team_members policies ────────────────────────────────────────────
drop policy if exists "team_members_select"       on public.team_members;
drop policy if exists "team_members_insert_owner" on public.team_members;
drop policy if exists "team_members_delete_owner" on public.team_members;

-- Use the helper to avoid the self-referencing recursion
create policy "team_members_select" on public.team_members
  for select using (
    public.is_team_member(team_id)
  );

-- Owner check via the teams table (no recursion)
create policy "team_members_insert_owner" on public.team_members
  for insert with check (
    exists (
      select 1 from public.teams t
      where t.id = team_id and t.owner_id = auth.uid()
    )
  );

create policy "team_members_delete_owner" on public.team_members
  for delete using (
    exists (
      select 1 from public.teams t
      where t.id = team_id and t.owner_id = auth.uid()
    )
  );

-- ─── 3. Fix teams policies (also relied on team_members subquery) ─────────────
drop policy if exists "teams_select_member" on public.teams;

create policy "teams_select_member" on public.teams
  for select using (
    auth.uid() = owner_id
    or public.is_team_member(id)
  );

-- ─── 4. Fix tasks policies ────────────────────────────────────────────────────
drop policy if exists "tasks_select" on public.tasks;
drop policy if exists "tasks_update" on public.tasks;

create policy "tasks_select" on public.tasks
  for select using (
    auth.uid() = user_id
    or auth.uid() = assignee_id
    or (team_id is not null and public.is_team_member(team_id))
  );

create policy "tasks_update" on public.tasks
  for update using (
    auth.uid() = user_id
    or (team_id is not null and public.is_team_member(team_id))
  );

-- ─── 5. Fix comments policies ─────────────────────────────────────────────────
drop policy if exists "comments_select" on public.comments;

create policy "comments_select" on public.comments
  for select using (
    exists (
      select 1 from public.tasks tk
      where tk.id = task_id
        and (
          tk.user_id = auth.uid()
          or tk.assignee_id = auth.uid()
          or (tk.team_id is not null and public.is_team_member(tk.team_id))
        )
    )
  );

-- ─── 6. Fix activities policies ───────────────────────────────────────────────
drop policy if exists "activities_select" on public.activities;

create policy "activities_select" on public.activities
  for select using (
    exists (
      select 1 from public.tasks tk
      where tk.id = task_id
        and (
          tk.user_id = auth.uid()
          or tk.assignee_id = auth.uid()
          or (tk.team_id is not null and public.is_team_member(tk.team_id))
        )
    )
  );

-- ─── 7. Fix attachments policies ──────────────────────────────────────────────
drop policy if exists "attachments_select" on public.attachments;

create policy "attachments_select" on public.attachments
  for select using (
    exists (
      select 1 from public.tasks tk
      where tk.id = task_id
        and (
          tk.user_id = auth.uid()
          or tk.assignee_id = auth.uid()
          or (tk.team_id is not null and public.is_team_member(tk.team_id))
        )
    )
  );

-- ─── 8. Fix subtasks policies ─────────────────────────────────────────────────
drop policy if exists "subtasks_select" on public.subtasks;
drop policy if exists "subtasks_update" on public.subtasks;

create policy "subtasks_select" on public.subtasks
  for select using (
    exists (
      select 1 from public.tasks tk
      where tk.id = task_id
        and (
          tk.user_id = auth.uid()
          or tk.assignee_id = auth.uid()
          or (tk.team_id is not null and public.is_team_member(tk.team_id))
        )
    )
  );

create policy "subtasks_update" on public.subtasks
  for update using (
    exists (
      select 1 from public.tasks tk
      where tk.id = task_id
        and (
          tk.user_id = auth.uid()
          or (tk.team_id is not null and public.is_team_member(tk.team_id))
        )
    )
  );
