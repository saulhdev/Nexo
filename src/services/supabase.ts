import { getSupabase } from '@/lib/supabase'
import type {
  Activity,
  ActivityType,
  Comment,
  CreateProjectInput,
  CreateTaskInput,
  Project,
  Task,
  TaskFilters,
  TaskPriority,
  TaskStatus,
  UpdateTaskInput,
  User,
} from '@/types'
import type { Backend } from '@/services/backend'

interface ProfileRow {
  id: string
  email: string
  full_name: string | null
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
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  due_date: string | null
  position: number
  created_at: string
  updated_at: string
  project?: { id: string; name: string; color: string } | null
}

interface CommentRow {
  id: string
  task_id: string
  user_id: string
  body: string
  created_at: string
  author?: { full_name: string | null } | null
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

function mapTask(row: TaskRow): Task {
  return {
    id: row.id,
    projectId: row.project_id,
    userId: row.user_id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    dueDate: row.due_date,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    project: row.project ?? undefined,
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

async function requireUser() {
  const supabase = getSupabase()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) throw new Error('Sesión no válida')
  return data.user
}

async function loadProfile(userId: string): Promise<User> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .eq('id', userId)
    .single()
  if (error || !data) {
    if (error?.code === '42P01' || error?.message?.includes('relation') || error?.message?.includes('does not exist')) {
      throw new Error('La base de datos aún no ha sido creada. Ejecuta el archivo de migración SQL en el SQL Editor de Supabase.')
    }
    throw new Error(error?.message || 'No se pudo cargar el perfil')
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
  if (error) throw error
}

export function createSupabaseBackend(): Backend {
  return {
    kind: 'supabase',

    async getSession() {
      const supabase = getSupabase()
      const { data } = await supabase.auth.getSession()
      if (!data.session?.user) return null
      try {
        return await loadProfile(data.session.user.id)
      } catch {
        return {
          id: data.session.user.id,
          email: data.session.user.email ?? '',
          fullName: data.session.user.user_metadata?.full_name || 'Usuario',
        }
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

    async listProjects() {
      const { data, error } = await getSupabase()
        .from('projects')
        .select('*')
        .order('created_at', { ascending: true })
      if (error) throw error
      return (data as ProjectRow[]).map(mapProject)
    },

    async createProject(input: CreateProjectInput) {
      const user = await requireUser()
      const { data, error } = await getSupabase()
        .from('projects')
        .insert({
          user_id: user.id,
          name: input.name.trim(),
          color: input.color ?? '#C45C26',
        })
        .select()
        .single()
      if (error || !data) throw error ?? new Error('No se pudo crear el proyecto')
      return mapProject(data as ProjectRow)
    },

    async listTasks(filters?: TaskFilters) {
      let query = getSupabase()
        .from('tasks')
        .select('*, project:projects(id, name, color)')
        .order('position', { ascending: true })
        .order('created_at', { ascending: true })

      if (filters?.status && filters.status !== 'all') query = query.eq('status', filters.status)
      if (filters?.priority && filters.priority !== 'all') query = query.eq('priority', filters.priority)
      if (filters?.projectId && filters.projectId !== 'all') {
        query = query.eq('project_id', filters.projectId)
      }
      if (filters?.search) query = query.ilike('title', `%${filters.search}%`)

      const { data, error } = await query
      if (error) throw error
      return (data as TaskRow[]).map(mapTask)
    },

    async getTask(id: string) {
      const { data, error } = await getSupabase()
        .from('tasks')
        .select('*, project:projects(id, name, color)')
        .eq('id', id)
        .single()
      if (error || !data) throw new Error('Tarea no encontrada')
      return mapTask(data as TaskRow)
    },

    async createTask(input: CreateTaskInput) {
      const user = await requireUser()
      const status = input.status ?? 'todo'
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
          title: input.title.trim(),
          description: input.description?.trim() ?? '',
          status,
          priority: input.priority ?? 'medium',
          due_date: input.dueDate ?? null,
          position: (last?.position ?? -1) + 1,
        })
        .select('*, project:projects(id, name, color)')
        .single()
      if (error || !data) throw error ?? new Error('No se pudo crear la tarea')
      const task = mapTask(data as TaskRow)
      await writeActivity(task, 'task.created', { title: task.title })
      return task
    },

    async updateTask(id: string, input: UpdateTaskInput) {
      const current = await this.getTask(id)
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
      if (input.title !== undefined) patch.title = input.title.trim()
      if (input.description !== undefined) patch.description = input.description
      if (input.status !== undefined) patch.status = input.status
      if (input.priority !== undefined) patch.priority = input.priority
      if (input.dueDate !== undefined) patch.due_date = input.dueDate
      if (input.projectId !== undefined) patch.project_id = input.projectId
      if (input.position !== undefined) patch.position = input.position

      const { data, error } = await getSupabase()
        .from('tasks')
        .update(patch)
        .eq('id', id)
        .select('*, project:projects(id, name, color)')
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
      if (input.dueDate !== undefined && input.dueDate !== current.dueDate) {
        await writeActivity(task, 'due_date.changed', { from: current.dueDate, to: task.dueDate })
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
        preview: comment.body.slice(0, 140),
      })
      return comment
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
  }
}
