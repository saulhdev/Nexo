-- Nexo — Teams feature migration
-- Adds team management and updates task visibility to support team sharing.

-- ─── 1. Add is_admin column to profiles ───────────────────────────────────────
alter table public.profiles
  add column if not exists is_admin boolean not null default false;

-- ─── 2. Create teams table ────────────────────────────────────────────────────
create table if not exists public.teams (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  owner_id   uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ─── 3. Create team_members table ────────────────────────────────────────────
create table if not exists public.team_members (
  team_id   uuid not null references public.teams (id) on delete cascade,
  user_id   uuid not null references public.profiles (id) on delete cascade,
  role      text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (team_id, user_id)
);

-- ─── 4. Add team_id to tasks ─────────────────────────────────────────────────
alter table public.tasks
  add column if not exists team_id uuid references public.teams (id) on delete set null;

-- ─── 5. Indexes ───────────────────────────────────────────────────────────────
create index if not exists tasks_team_idx          on public.tasks (team_id) where team_id is not null;
create index if not exists team_members_user_idx   on public.team_members (user_id);
create index if not exists team_members_team_idx   on public.team_members (team_id);

-- ─── 6. Enable RLS ───────────────────────────────────────────────────────────
alter table public.teams        enable row level security;
alter table public.team_members enable row level security;

-- ─── 7. RLS policies for teams ───────────────────────────────────────────────
drop policy if exists "teams_select_member"  on public.teams;
drop policy if exists "teams_insert_admin"   on public.teams;
drop policy if exists "teams_update_owner"   on public.teams;
drop policy if exists "teams_delete_owner"   on public.teams;

-- Any authenticated user who is a member (or owner) can read the team.
create policy "teams_select_member" on public.teams
  for select using (
    auth.uid() = owner_id
    or exists (
      select 1 from public.team_members tm
      where tm.team_id = id and tm.user_id = auth.uid()
    )
  );

-- Only admins can create teams (owner_id must be themselves).
create policy "teams_insert_admin" on public.teams
  for insert with check (
    auth.uid() = owner_id
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

-- Only the team owner can update.
create policy "teams_update_owner" on public.teams
  for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- Only the team owner can delete.
create policy "teams_delete_owner" on public.teams
  for delete using (auth.uid() = owner_id);

-- ─── 8. RLS policies for team_members ────────────────────────────────────────
drop policy if exists "team_members_select"        on public.team_members;
drop policy if exists "team_members_insert_owner"  on public.team_members;
drop policy if exists "team_members_delete_owner"  on public.team_members;

-- Members can see the member list of any team they belong to.
create policy "team_members_select" on public.team_members
  for select using (
    exists (
      select 1 from public.team_members tm2
      where tm2.team_id = team_id and tm2.user_id = auth.uid()
    )
  );

-- Only the team owner can add members.
create policy "team_members_insert_owner" on public.team_members
  for insert with check (
    exists (
      select 1 from public.teams t
      where t.id = team_id and t.owner_id = auth.uid()
    )
  );

-- Only the team owner can remove members.
create policy "team_members_delete_owner" on public.team_members
  for delete using (
    exists (
      select 1 from public.teams t
      where t.id = team_id and t.owner_id = auth.uid()
    )
  );

-- ─── 9. Update tasks RLS ─────────────────────────────────────────────────────
-- Replace the simple own-only policy with one that also grants access via team membership.

drop policy if exists "tasks_all_own"    on public.tasks;
drop policy if exists "tasks_select"     on public.tasks;
drop policy if exists "tasks_insert"     on public.tasks;
drop policy if exists "tasks_update"     on public.tasks;
drop policy if exists "tasks_delete"     on public.tasks;

-- Helper: user can see a task if they are creator, assignee, or a team member.
create policy "tasks_select" on public.tasks
  for select using (
    auth.uid() = user_id
    or auth.uid() = assignee_id
    or (
      team_id is not null
      and exists (
        select 1 from public.team_members tm
        where tm.team_id = tasks.team_id and tm.user_id = auth.uid()
      )
    )
  );

-- Only the creator can INSERT a task.
create policy "tasks_insert" on public.tasks
  for insert with check (auth.uid() = user_id);

-- Creator or any team member can UPDATE a task.
create policy "tasks_update" on public.tasks
  for update using (
    auth.uid() = user_id
    or (
      team_id is not null
      and exists (
        select 1 from public.team_members tm
        where tm.team_id = tasks.team_id and tm.user_id = auth.uid()
      )
    )
  );

-- Only the creator can DELETE a task.
create policy "tasks_delete" on public.tasks
  for delete using (auth.uid() = user_id);

-- ─── 10. Update related tables RLS to match task visibility ──────────────────
-- Comments, activities, attachments, subtasks: visible if the user can see the task.

drop policy if exists "comments_all_own"     on public.comments;
drop policy if exists "comments_select"      on public.comments;
drop policy if exists "comments_insert"      on public.comments;
drop policy if exists "comments_delete_own"  on public.comments;

create policy "comments_select" on public.comments
  for select using (
    exists (
      select 1 from public.tasks tk
      where tk.id = task_id
        and (
          tk.user_id = auth.uid()
          or tk.assignee_id = auth.uid()
          or (
            tk.team_id is not null
            and exists (
              select 1 from public.team_members tm
              where tm.team_id = tk.team_id and tm.user_id = auth.uid()
            )
          )
        )
    )
  );

create policy "comments_insert" on public.comments
  for insert with check (auth.uid() = user_id);

create policy "comments_delete_own" on public.comments
  for delete using (auth.uid() = user_id);

-- Activities
drop policy if exists "activities_all_own"   on public.activities;
drop policy if exists "activities_select"    on public.activities;
drop policy if exists "activities_insert"    on public.activities;

create policy "activities_select" on public.activities
  for select using (
    exists (
      select 1 from public.tasks tk
      where tk.id = task_id
        and (
          tk.user_id = auth.uid()
          or tk.assignee_id = auth.uid()
          or (
            tk.team_id is not null
            and exists (
              select 1 from public.team_members tm
              where tm.team_id = tk.team_id and tm.user_id = auth.uid()
            )
          )
        )
    )
  );

create policy "activities_insert" on public.activities
  for insert with check (auth.uid() = user_id);

-- Attachments
drop policy if exists "attachments_all_own"  on public.attachments;
drop policy if exists "attachments_select"   on public.attachments;
drop policy if exists "attachments_insert"   on public.attachments;
drop policy if exists "attachments_delete"   on public.attachments;

create policy "attachments_select" on public.attachments
  for select using (
    exists (
      select 1 from public.tasks tk
      where tk.id = task_id
        and (
          tk.user_id = auth.uid()
          or tk.assignee_id = auth.uid()
          or (
            tk.team_id is not null
            and exists (
              select 1 from public.team_members tm
              where tm.team_id = tk.team_id and tm.user_id = auth.uid()
            )
          )
        )
    )
  );

create policy "attachments_insert" on public.attachments
  for insert with check (auth.uid() = user_id);

create policy "attachments_delete" on public.attachments
  for delete using (auth.uid() = user_id);

-- Subtasks
drop policy if exists "subtasks_all_own"  on public.subtasks;
drop policy if exists "subtasks_select"   on public.subtasks;
drop policy if exists "subtasks_insert"   on public.subtasks;
drop policy if exists "subtasks_update"   on public.subtasks;
drop policy if exists "subtasks_delete"   on public.subtasks;

create policy "subtasks_select" on public.subtasks
  for select using (
    exists (
      select 1 from public.tasks tk
      where tk.id = task_id
        and (
          tk.user_id = auth.uid()
          or tk.assignee_id = auth.uid()
          or (
            tk.team_id is not null
            and exists (
              select 1 from public.team_members tm
              where tm.team_id = tk.team_id and tm.user_id = auth.uid()
            )
          )
        )
    )
  );

create policy "subtasks_insert" on public.subtasks
  for insert with check (auth.uid() = user_id);

create policy "subtasks_update" on public.subtasks
  for update using (
    exists (
      select 1 from public.tasks tk
      where tk.id = task_id
        and (
          tk.user_id = auth.uid()
          or (
            tk.team_id is not null
            and exists (
              select 1 from public.team_members tm
              where tm.team_id = tk.team_id and tm.user_id = auth.uid()
            )
          )
        )
    )
  );

create policy "subtasks_delete" on public.subtasks
  for delete using (auth.uid() = user_id);
