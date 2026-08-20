import { getSupabase } from '@/lib/supabase'
import { stripHtml } from '@/lib/text'
import { getUrgencyImportanceFromPriority } from '@/constants'
import type {
  Activity,
  ActivityType,
  Comment,
  CreateProjectInput,
  CreateSubtaskInput,
  CreateTaskInput,
  CreateTeamInput,
  Project,
  Subtask,
  Task,
  TaskAttachment,
  TaskFilters,
  TaskPriority,
  TaskStatus,
  Team,
  TeamMember,
  UpdateProjectInput,
  UpdateSubtaskInput,
  UpdateTaskInput,
  UpdateTeamInput,
  User,
} from '@/types'
import type { Backend } from '@/services/backend'

interface ProfileRow {
  id: string
  email: string
  full_name: string | null
  is_admin?: boolean | null
}

interface TeamRow {
  id: string
  name: string
  owner_id: string
  created_at: string
  member_count?: number
}

interface TeamMemberRow {
  team_id: string
  user_id: string
  role: 'owner' | 'member'
  joined_at: string
  user?: { id: string; email: string; full_name: string | null } | null
}

interface ProjectRow {
  id: string
  user_id: string
  name: string
  color: string
  created_at: string
}

interface TaskRow {
  id: string
  project_id: string
  user_id: string
  assignee_id?: string | null
  team_id?: string | null
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  is_urgent?: boolean | null
  is_important?: boolean | null
  start_date: string | null
  due_date: string | null
  position: number
  created_at: string
  updated_at: string
  project?: { id: string; name: string; color: string } | null
  assignee?: { id: string; email: string; full_name: string | null } | null
  team?: { id: string; name: string } | null
}

interface CommentRow {
  id: string
  task_id: string
  user_id: string
  body: string
  created_at: string
  author?: { full_name: string | null } | null
}

interface AttachmentRow {
  id: string
  task_id: string
  user_id: string
  name: string
  url: string
  size: number
  type: string
  created_at: string
}

interface SubtaskRow {
  id: string
  task_id: string
  user_id: string
  title: string
  completed: boolean
  position: number
  created_at: string
  updated_at?: string
}

interface ActivityRow {
  id: string
  task_id: string
  user_id: string
  type: ActivityType
  meta: Record<string, unknown>
  created_at: string
  task?: { title: string } | null
  author?: { full_name: string | null } | null
}

function mapUser(row: ProfileRow): User {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name || row.email.split('@')[0],
    isAdmin: row.is_admin ?? false,
  }
}

function mapTeam(row: TeamRow): Team {
  return {
    id: row.id,
    name: row.name,
    ownerId: row.owner_id,
    createdAt: row.created_at,
    memberCount: row.member_count,
  }
}

function mapTeamMember(row: TeamMemberRow): TeamMember {
  return {
    teamId: row.team_id,
    userId: row.user_id,
    role: row.role,
    joinedAt: row.joined_at,
    user: row.user
      ? {
          id: row.user.id,
          email: row.user.email,
          fullName: row.user.full_name || row.user.email.split('@')[0],
        }
      : undefined,
  }
}

function mapProject(row: ProjectRow): Project {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    color: row.color,
    createdAt: row.created_at,
  }
}

function mapTask(row: TaskRow & { subtasks?: Array<{ id: string; completed: boolean }> }): Task {
  const defaultUi = getUrgencyImportanceFromPriority(row.priority)
  const subtasksList = row.subtasks || []
  return {
    id: row.id,
    projectId: row.project_id,
    userId: row.user_id,
    assigneeId: row.assignee_id ?? null,
    teamId: row.team_id ?? null,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    isUrgent: row.is_urgent ?? defaultUi.isUrgent,
    isImportant: row.is_important ?? defaultUi.isImportant,
    startDate: row.start_date,
    dueDate: row.due_date,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    project: row.project ?? undefined,
    assignee: row.assignee
      ? {
          id: row.assignee.id,
          email: row.assignee.email,
          fullName: row.assignee.full_name || row.assignee.email.split('@')[0],
        }
      : undefined,
    team: row.team ?? undefined,
    subtaskCount: subtasksList.length,
    completedSubtaskCount: subtasksList.filter((s) => s.completed).length,
  }
}

function mapSubtask(row: SubtaskRow): Subtask {
  return {
    id: row.id,
    taskId: row.task_id,
    userId: row.user_id,
    title: row.title,
    completed: row.completed,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapComment(row: CommentRow): Comment {
  return {
    id: row.id,
    taskId: row.task_id,
    userId: row.user_id,
    body: row.body,
    createdAt: row.created_at,
    authorName: row.author?.full_name ?? undefined,
  }
}

function mapAttachment(row: AttachmentRow): TaskAttachment {
  return {
    id: row.id,
    taskId: row.task_id,
    userId: row.user_id,
    name: row.name,
    url: row.url,
    size: row.size,
    type: row.type,
    createdAt: row.created_at,
  }
}

function mapActivity(row: ActivityRow): Activity {
  return {
    id: row.id,
    taskId: row.task_id,
    userId: row.user_id,
    type: row.type,
    meta: row.meta ?? {},
    createdAt: row.created_at,
    taskTitle: row.task?.title,
    authorName: row.author?.full_name ?? undefined,
  }
}

function toError(err: unknown, fallback: string): Error {
  if (err instanceof Error) return err
  if (err && typeof err === 'object' && 'message' in err && typeof (err as { message: unknown }).message === 'string') {
    const msg = (err as { message: string }).message
    const code = (err as { code?: string }).code
    if (code === '42P01' || msg.includes('relation') || msg.includes('does not exist')) {
      return new Error('La base de datos aún no ha sido creada. Ejecuta el archivo de migración SQL en el SQL Editor de Supabase.')
    }
    if (code === '42501' || msg.includes('row-level security policy')) {
      if (msg.includes('profiles')) {
        return new Error('Falta la política RLS de inserción en "profiles". Ejecuta en Supabase SQL Editor: CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);')
      }
      return new Error('La política RLS de Supabase bloqueó la operación. Revisa los permisos en Supabase Dashboard.')
    }
    if (code === '23503' || msg.includes('violates foreign key constraint')) {
      return new Error('El usuario no tiene un perfil registrado en la tabla "profiles".')
    }
    return new Error(msg)
  }
  return new Error(fallback)
}

async function requireUser() {
  const supabase = getSupabase()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) throw new Error('Sesión no válida')
  return data.user
}

async function ensureProfile(user: { id: string; email?: string | null; user_metadata?: Record<string, any> }) {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  if (error) {
    if (error.code === '42P01' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
      throw new Error('La base de datos aún no ha sido creada. Ejecuta el archivo de migración SQL en el SQL Editor de Supabase.')
    }
    throw toError(error, 'No se pudo verificar el perfil de usuario')
  }

  if (!data) {
    const email = user.email ?? ''
    const fullName = (user.user_metadata?.full_name as string | undefined) || (email ? email.split('@')[0] : 'Usuario')
    const { error: insertErr } = await supabase.from('profiles').upsert({
      id: user.id,
      email,
      full_name: fullName,
    })
    if (insertErr) {
      throw toError(insertErr, 'No se pudo registrar el perfil de usuario')
    }
  }
}

async function loadProfile(userId: string): Promise<User> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, is_admin')
    .eq('id', userId)
    .single()
  if (error || !data) {
    if (error?.code === '42P01' || error?.message?.includes('relation') || error?.message?.includes('does not exist')) {
      throw new Error('La base de datos aún no ha sido creada. Ejecuta el archivo de migración SQL en el SQL Editor de Supabase.')
    }
    throw toError(error, 'No se pudo cargar el perfil')
  }
  return mapUser(data as ProfileRow)
}

async function writeActivity(
  task: Pick<Task, 'id' | 'userId'>,
  type: ActivityType,
  meta: Record<string, unknown>,
) {
  const supabase = getSupabase()
  const { error } = await supabase.from('activities').insert({
    task_id: task.id,
    user_id: task.userId,
    type,
    meta,
  })
  if (error) throw toError(error, 'No se pudo registrar la actividad')
}

export function createSupabaseBackend(): Backend {
  return {
    kind: 'supabase',

    async getSession() {
      try {
        const supabase = getSupabase()
        const { data, error } = await supabase.auth.getSession()
        if (error || !data.session?.user) return null
        try {
          return await loadProfile(data.session.user.id)
        } catch {
          return {
            id: data.session.user.id,
            email: data.session.user.email ?? '',
            fullName: data.session.user.user_metadata?.full_name || 'Usuario',
          }
        }
      } catch {
        return null
      }
    },

    async signIn(email, password) {
      const supabase = getSupabase()
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error || !data.user) throw new Error(error?.message || 'No se pudo iniciar sesión')
      return loadProfile(data.user.id)
    },

    async signUp(email, password, fullName) {
      const supabase = getSupabase()
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      })
      if (error || !data.user) throw new Error(error?.message || 'No se pudo crear la cuenta')
      if (!data.session) {
        const signResult = await supabase.auth.signInWithPassword({ email, password })
        if (signResult.data.session?.user) {
          return loadProfile(signResult.data.session.user.id)
        }
        throw new Error('Cuenta creada. Si activaste confirmación por correo en Supabase, revisa tu bandeja de entrada para ingresar.')
      }
      return loadProfile(data.user.id)
    },

    async signOut() {
      const { error } = await getSupabase().auth.signOut()
      if (error) throw error
    },

    async updateProfile(input) {
      const user = await requireUser()
      const supabase = getSupabase()

      if (input.fullName !== undefined) {
        const fullName = input.fullName.trim()
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ full_name: fullName })
          .eq('id', user.id)
        if (profileError) throw profileError

        await supabase.auth.updateUser({ data: { full_name: fullName } })
      }

      if (input.password !== undefined && input.password.length > 0) {
        const { error: authError } = await supabase.auth.updateUser({ password: input.password })
        if (authError) throw authError
      }

      return loadProfile(user.id)
    },

    onAuthChange(cb) {
      const supabase = getSupabase()
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!session?.user) {
          cb(null)
          return
        }
        void loadProfile(session.user.id)
          .then(cb)
          .catch(() =>
            cb({
              id: session.user.id,
              email: session.user.email ?? '',
              fullName: session.user.user_metadata?.full_name || 'Usuario',
            }),
          )
      })
      return () => data.subscription.unsubscribe()
    },

    async listUsers() {
      const { data, error } = await getSupabase()
        .from('profiles')
        .select('id, email, full_name, is_admin')
        .order('full_name', { ascending: true })
      if (error) throw toError(error, 'No se pudieron obtener los usuarios')
      return (data as ProfileRow[]).map(mapUser)
    },

    async listProjects() {
      const { data, error } = await getSupabase()
        .from('projects')
        .select('*')
        .order('created_at', { ascending: true })
      if (error) throw toError(error, 'No se pudieron obtener los proyectos')
      return (data as ProjectRow[]).map(mapProject)
    },

    async createProject(input: CreateProjectInput) {
      const user = await requireUser()
      await ensureProfile(user)
      const { data, error } = await getSupabase()
        .from('projects')
        .insert({
          user_id: user.id,
          name: input.name.trim(),
          color: input.color ?? '#C45C26',
        })
        .select()
        .single()
      if (error || !data) throw toError(error, 'No se pudo crear el proyecto')
      return mapProject(data as ProjectRow)
    },

    async updateProject(id: string, input: UpdateProjectInput) {
      const updateData: Record<string, any> = {}
      if (input.name !== undefined) updateData.name = input.name.trim()
      if (input.color !== undefined) updateData.color = input.color

      const { data, error } = await getSupabase()
        .from('projects')
        .update(updateData)
        .eq('id', id)
        .select('*')
        .single()
      if (error || !data) throw toError(error, 'No se pudo actualizar el proyecto')
      return mapProject(data as ProjectRow)
    },

    async listTasks(filters?: TaskFilters) {
      let query = getSupabase()
        .from('tasks')
        .select('*, project:projects(id, name, color), assignee:profiles!assignee_id(id, email, full_name), team:teams(id, name)')
        .order('position', { ascending: true })
        .order('created_at', { ascending: true })

      if (filters?.status && filters.status !== 'all') query = query.eq('status', filters.status)
      if (filters?.priority && filters.priority !== 'all') query = query.eq('priority', filters.priority)
      if (filters?.projectId && filters.projectId !== 'all') {
        query = query.eq('project_id', filters.projectId)
      }
      if (filters?.assigneeId && filters.assigneeId !== 'all') {
        if (filters.assigneeId === 'unassigned') {
          query = query.is('assignee_id', null)
        } else {
          query = query.eq('assignee_id', filters.assigneeId)
        }
      }
      if (filters?.teamId && filters.teamId !== 'all') {
        query = query.eq('team_id', filters.teamId)
      }
      if (filters?.search) query = query.ilike('title', `%${filters.search}%`)

      const { data, error } = await query
      if (error) throw toError(error, 'No se pudieron obtener las tareas')
      return (data as TaskRow[]).map(mapTask)
    },

    async getTask(id: string) {
      const { data, error } = await getSupabase()
        .from('tasks')
        .select('*, project:projects(id, name, color), assignee:profiles!assignee_id(id, email, full_name), team:teams(id, name)')
        .eq('id', id)
        .single()
      if (error || !data) throw toError(error, 'Tarea no encontrada')
      return mapTask(data as TaskRow)
    },

    async createTask(input: CreateTaskInput) {
      const user = await requireUser()
      await ensureProfile(user)
      const status = input.status ?? 'todo'
      const priority = input.priority ?? 'medium'
      const defaultUi = getUrgencyImportanceFromPriority(priority)
      const isUrgent = input.isUrgent ?? defaultUi.isUrgent
      const isImportant = input.isImportant ?? defaultUi.isImportant

      const { data: last } = await getSupabase()
        .from('tasks')
        .select('position')
        .eq('status', status)
        .order('position', { ascending: false })
        .limit(1)
        .maybeSingle()

      const { data, error } = await getSupabase()
        .from('tasks')
        .insert({
          project_id: input.projectId,
          user_id: user.id,
          assignee_id: input.assigneeId ?? null,
          team_id: input.teamId ?? null,
          title: input.title.trim(),
          description: input.description?.trim() ?? '',
          status,
          priority,
          is_urgent: isUrgent,
          is_important: isImportant,
          start_date: input.startDate ?? null,
          due_date: input.dueDate ?? null,
          position: (last?.position ?? -1) + 1,
        })
        .select('*, project:projects(id, name, color), assignee:profiles!assignee_id(id, email, full_name), team:teams(id, name)')
        .single()
      if (error || !data) throw toError(error, 'No se pudo crear la tarea')
      const task = mapTask(data as TaskRow)
      await writeActivity(task, 'task.created', { title: task.title })
      if (task.assigneeId) {
        await writeActivity(task, 'assignee.changed', { toId: task.assigneeId, toName: task.assignee?.fullName ?? null })
      }
      return task
    },

    async updateTask(id: string, input: UpdateTaskInput) {
      const current = await this.getTask(id)
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
      if (input.title !== undefined) patch.title = input.title.trim()
      if (input.description !== undefined) patch.description = input.description
      if (input.status !== undefined) patch.status = input.status
      if (input.priority !== undefined) patch.priority = input.priority
      if (input.isUrgent !== undefined) patch.is_urgent = input.isUrgent
      if (input.isImportant !== undefined) patch.is_important = input.isImportant
      if (input.startDate !== undefined) patch.start_date = input.startDate
      if (input.dueDate !== undefined) patch.due_date = input.dueDate
      if (input.projectId !== undefined) patch.project_id = input.projectId
      if (input.position !== undefined) patch.position = input.position
      if (input.assigneeId !== undefined) patch.assignee_id = input.assigneeId
      if (input.teamId !== undefined) patch.team_id = input.teamId

      const { data, error } = await getSupabase()
        .from('tasks')
        .update(patch)
        .eq('id', id)
        .select('*, project:projects(id, name, color), assignee:profiles!assignee_id(id, email, full_name), team:teams(id, name)')
        .single()
      if (error || !data) throw error ?? new Error('No se pudo actualizar la tarea')
      const task = mapTask(data as TaskRow)

      if (input.title !== undefined && input.title !== current.title) {
        await writeActivity(task, 'task.updated', { field: 'title', from: current.title, to: task.title })
      }
      if (input.description !== undefined && input.description !== current.description) {
        await writeActivity(task, 'task.updated', { field: 'description' })
      }
      if (input.status !== undefined && input.status !== current.status) {
        await writeActivity(task, 'status.changed', { from: current.status, to: task.status })
      }
      if (input.priority !== undefined && input.priority !== current.priority) {
        await writeActivity(task, 'priority.changed', { from: current.priority, to: task.priority })
      }
      if (input.startDate !== undefined && input.startDate !== current.startDate) {
        await writeActivity(task, 'start_date.changed', { from: current.startDate, to: task.startDate })
      }
      if (input.dueDate !== undefined && input.dueDate !== current.dueDate) {
        await writeActivity(task, 'due_date.changed', { from: current.dueDate, to: task.dueDate })
      }
      if (input.assigneeId !== undefined && input.assigneeId !== current.assigneeId) {
        await writeActivity(task, 'assignee.changed', {
          fromId: current.assigneeId ?? null,
          toId: task.assigneeId ?? null,
          fromName: current.assignee?.fullName ?? null,
          toName: task.assignee?.fullName ?? null,
        })
      }
      return task
    },

    async deleteTask(id: string) {
      const { error } = await getSupabase().from('tasks').delete().eq('id', id)
      if (error) throw error
    },

    async reorderColumn(status, orderedIds) {
      const supabase = getSupabase()
      await Promise.all(
        orderedIds.map((id, index) =>
          supabase.from('tasks').update({ status, position: index, updated_at: new Date().toISOString() }).eq('id', id),
        ),
      )
    },

    async listSubtasks(taskId: string) {
      const { data, error } = await getSupabase()
        .from('subtasks')
        .select('*')
        .eq('task_id', taskId)
        .order('position', { ascending: true })
        .order('created_at', { ascending: true })
      if (error) throw toError(error, 'No se pudieron obtener las subtareas')
      return (data as SubtaskRow[]).map(mapSubtask)
    },

    async createSubtask(taskId: string, input: CreateSubtaskInput | string) {
      const user = await requireUser()
      const title = typeof input === 'string' ? input : input.title
      const completed = typeof input === 'string' ? false : (input.completed ?? false)

      const { data: existing } = await getSupabase()
        .from('subtasks')
        .select('position')
        .eq('task_id', taskId)
        .order('position', { ascending: false })
        .limit(1)

      const nextPosition = existing && existing.length > 0 ? (existing[0].position ?? 0) + 1 : 0

      const { data, error } = await getSupabase()
        .from('subtasks')
        .insert({
          task_id: taskId,
          user_id: user.id,
          title: title.trim(),
          completed,
          position: nextPosition,
        })
        .select('*')
        .single()

      if (error || !data) throw toError(error, 'No se pudo crear la subtarea')
      const subtask = mapSubtask(data as SubtaskRow)
      await writeActivity({ id: taskId, userId: user.id }, 'subtask.added', { title: subtask.title })
      return subtask
    },

    async updateSubtask(id: string, input: UpdateSubtaskInput) {
      const user = await requireUser()
      const supabase = getSupabase()

      const { data: current } = await supabase
        .from('subtasks')
        .select('*')
        .eq('id', id)
        .single()

      if (!current) throw new Error('Subtarea no encontrada')

      const updatePayload: Record<string, any> = { updated_at: new Date().toISOString() }
      if (input.title !== undefined) updatePayload.title = input.title.trim()
      if (input.completed !== undefined) updatePayload.completed = input.completed
      if (input.position !== undefined) updatePayload.position = input.position

      const { data, error } = await supabase
        .from('subtasks')
        .update(updatePayload)
        .eq('id', id)
        .select('*')
        .single()

      if (error || !data) throw toError(error, 'No se pudo actualizar la subtarea')
      const subtask = mapSubtask(data as SubtaskRow)

      if (input.completed !== undefined && input.completed !== current.completed) {
        await writeActivity(
          { id: current.task_id, userId: user.id },
          input.completed ? 'subtask.completed' : 'subtask.uncompleted',
          { title: subtask.title },
        )
      }
      return subtask
    },

    async deleteSubtask(id: string) {
      const user = await requireUser()
      const supabase = getSupabase()

      const { data: current } = await supabase
        .from('subtasks')
        .select('task_id, title')
        .eq('id', id)
        .maybeSingle()

      const { error } = await supabase.from('subtasks').delete().eq('id', id)
      if (error) throw toError(error, 'No se pudo eliminar la subtarea')

      if (current) {
        await writeActivity({ id: current.task_id, userId: user.id }, 'subtask.deleted', { title: current.title })
      }
    },

    async listComments(taskId: string) {
      const { data, error } = await getSupabase()
        .from('comments')
        .select('*, author:profiles(full_name)')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true })
      if (error) throw error
      return (data as CommentRow[]).map(mapComment)
    },

    async addComment(taskId: string, body: string) {
      const user = await requireUser()
      const { data, error } = await getSupabase()
        .from('comments')
        .insert({ task_id: taskId, user_id: user.id, body: body.trim() })
        .select('*, author:profiles(full_name)')
        .single()
      if (error || !data) throw error ?? new Error('No se pudo publicar el comentario')
      const comment = mapComment(data as CommentRow)
      await writeActivity({ id: taskId, userId: user.id }, 'comment.added', {
        preview: stripHtml(comment.body).slice(0, 140),
      })
      return comment
    },

    async listAttachments(taskId: string) {
      const { data, error } = await getSupabase()
        .from('attachments')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true })
      if (error) throw error
      return (data as AttachmentRow[]).map(mapAttachment)
    },

    async addAttachment(taskId: string, file: { name: string; url: string; size: number; type: string }) {
      const user = await requireUser()
      const { data, error } = await getSupabase()
        .from('attachments')
        .insert({
          task_id: taskId,
          user_id: user.id,
          name: file.name,
          url: file.url,
          size: file.size,
          type: file.type,
        })
        .select('*')
        .single()
      if (error || !data) throw error ?? new Error('No se pudo agregar el adjunto')
      const attachment = mapAttachment(data as AttachmentRow)
      await writeActivity({ id: taskId, userId: user.id }, 'attachment.added', {
        name: attachment.name,
      })
      return attachment
    },

    async deleteAttachment(id: string) {
      const user = await requireUser()
      const { data: item } = await getSupabase()
        .from('attachments')
        .select('task_id, name')
        .eq('id', id)
        .maybeSingle()

      const { error } = await getSupabase().from('attachments').delete().eq('id', id)
      if (error) throw error

      if (item) {
        await writeActivity({ id: item.task_id, userId: user.id }, 'attachment.removed', {
          name: item.name,
        })
      }
    },

    async listActivities(taskId: string) {
      const { data, error } = await getSupabase()
        .from('activities')
        .select('*, task:tasks(title), author:profiles(full_name)')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data as ActivityRow[]).map(mapActivity)
    },

    async listRecentActivities(limit = 12) {
      const { data, error } = await getSupabase()
        .from('activities')
        .select('*, task:tasks(title), author:profiles(full_name)')
        .order('created_at', { ascending: false })
        .limit(limit)
      if (error) throw error
      return (data as ActivityRow[]).map(mapActivity)
    },

    // ── Teams ──────────────────────────────────────────────────────────────────

    async listTeams() {
      const { data, error } = await getSupabase()
        .from('teams')
        .select('id, name, owner_id, created_at, member_count:team_members(count)')
        .order('created_at', { ascending: true })
      if (error) throw toError(error, 'No se pudieron obtener los equipos')
      return (data as Array<TeamRow & { member_count: Array<{ count: number }> }>).map((row) => ({
        id: row.id,
        name: row.name,
        ownerId: row.owner_id,
        createdAt: row.created_at,
        memberCount: row.member_count?.[0]?.count ?? 0,
      }))
    },

    async createTeam(input: CreateTeamInput) {
      const user = await requireUser()
      const supabase = getSupabase()

      const { data: teamData, error: teamErr } = await supabase
        .from('teams')
        .insert({ name: input.name.trim(), owner_id: user.id })
        .select('id, name, owner_id, created_at')
        .single()
      if (teamErr || !teamData) throw toError(teamErr, 'No se pudo crear el equipo')

      // Insert owner as member
      const memberRows: { team_id: string; user_id: string; role: string }[] = [
        { team_id: teamData.id, user_id: user.id, role: 'owner' },
        ...(input.memberIds ?? []).map((uid) => ({ team_id: teamData.id, user_id: uid, role: 'member' })),
      ]
      await supabase.from('team_members').insert(memberRows)

      return mapTeam(teamData as TeamRow)
    },

    async updateTeam(id: string, input: UpdateTeamInput) {
      const updateData: Record<string, unknown> = {}
      if (input.name !== undefined) updateData.name = input.name.trim()
      const { data, error } = await getSupabase()
        .from('teams')
        .update(updateData)
        .eq('id', id)
        .select('id, name, owner_id, created_at')
        .single()
      if (error || !data) throw toError(error, 'No se pudo actualizar el equipo')
      return mapTeam(data as TeamRow)
    },

    async deleteTeam(id: string) {
      const { error } = await getSupabase().from('teams').delete().eq('id', id)
      if (error) throw toError(error, 'No se pudo eliminar el equipo')
    },

    async listTeamMembers(teamId: string) {
      const { data, error } = await getSupabase()
        .from('team_members')
        .select('team_id, user_id, role, joined_at, user:profiles(id, email, full_name)')
        .eq('team_id', teamId)
        .order('joined_at', { ascending: true })
      if (error) throw toError(error, 'No se pudieron obtener los miembros')
      return (data as unknown as TeamMemberRow[]).map(mapTeamMember)
    },

    async addTeamMember(teamId: string, userId: string) {
      const { data, error } = await getSupabase()
        .from('team_members')
        .insert({ team_id: teamId, user_id: userId, role: 'member' })
        .select('team_id, user_id, role, joined_at, user:profiles(id, email, full_name)')
        .single()
      if (error || !data) throw toError(error, 'No se pudo agregar el miembro')
      return mapTeamMember(data as unknown as TeamMemberRow)
    },

    async removeTeamMember(teamId: string, userId: string) {
      const { error } = await getSupabase()
        .from('team_members')
        .delete()
        .eq('team_id', teamId)
        .eq('user_id', userId)
      if (error) throw toError(error, 'No se pudo remover el miembro')
    },
  }
}
