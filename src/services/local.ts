import { addDaysISO, todayISO } from '@/lib/dates'
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
  Team,
  TeamMember,
  UpdateProjectInput,
  UpdateSubtaskInput,
  UpdateTaskInput,
  UpdateTeamInput,
  User,
} from '@/types'
import type { Backend } from '@/services/backend'

const STORAGE_KEY = 'nexo:v1'
const LOCAL_USER_ID = 'local-user'

interface Db {
  user: User
  users: User[]
  projects: Project[]
  tasks: Task[]
  subtasks: Subtask[]
  comments: Comment[]
  attachments: TaskAttachment[]
  activities: Activity[]
  teams: Team[]
  teamMembers: TeamMember[]
}

function nowISO() {
  return new Date().toISOString()
}

function seed(): Db {
  const user: User = {
    id: LOCAL_USER_ID,
    email: 'tu@nexo.local',
    fullName: 'Tú',
  }

  const users: User[] = [
    user,
    { id: 'user-ana', email: 'ana@nexo.local', fullName: 'Ana García' },
    { id: 'user-carlos', email: 'carlos@nexo.local', fullName: 'Carlos Ruiz' },
    { id: 'user-elena', email: 'elena@nexo.local', fullName: 'Elena Torres' },
  ]

  const createdAt = nowISO()
  const projects: Project[] = [
    { id: 'proj-producto', userId: user.id, name: 'Producto', color: '#C45C26', createdAt },
    { id: 'proj-ops', userId: user.id, name: 'Operaciones', color: '#1F6B5A', createdAt },
    { id: 'proj-personal', userId: user.id, name: 'Personal', color: '#2F6FED', createdAt },
  ]

  const tasks: Task[] = [
    t('t1', 'proj-producto', 'Definir alcance del MVP', 'Lista de vistas, campos de tarea y flujo de comentarios.', 'done', 'high', addDaysISO(-5), addDaysISO(-2), 0, user.id, addDaysISO(-2)),
    t('t2', 'proj-producto', 'Diseñar dashboard de estadísticas', 'Tarjetas de estado, vencidas y actividad reciente.', 'in_review', 'medium', addDaysISO(-2), addDaysISO(1), 0, 'user-carlos'),
    t('t3', 'proj-producto', 'Implementar vista de lista', 'Crear, filtrar y editar tareas desde una tabla.', 'in_progress', 'high', addDaysISO(-1), todayISO(), 0, 'user-ana'),
    t('t4', 'proj-producto', 'Tablero kanban con arrastre', 'Mover tarjetas entre columnas actualiza el estado.', 'in_progress', 'urgent', todayISO(), addDaysISO(2), 1, user.id),
    t('t5', 'proj-producto', 'Panel de detalle con actividad', 'Comentarios y bitácora con fecha en cada tarea.', 'todo', 'high', todayISO(), addDaysISO(3), 0, 'user-elena'),
    t('t6', 'proj-ops', 'Conectar proyecto de Supabase', 'Auth, tablas y políticas RLS para datos reales.', 'todo', 'medium', addDaysISO(1), addDaysISO(5), 1, null),
    t('t7', 'proj-ops', 'Revisar políticas de acceso', 'Cada usuario solo ve sus proyectos y tareas.', 'todo', 'low', addDaysISO(2), addDaysISO(8), 2, null),
    t('t8', 'proj-ops', 'Preparar demo para el equipo', 'Datos de ejemplo y recorrido por las tres vistas.', 'todo', 'medium', addDaysISO(-4), addDaysISO(-1), 3, 'user-carlos'),
    t('t9', 'proj-personal', 'Actualizar portafolio', 'Añadir captura de Nexo cuando el MVP esté listo.', 'todo', 'low', addDaysISO(5), addDaysISO(12), 0, user.id),
    t('t10', 'proj-producto', 'Ajustar vacíos y estados de error', 'Lista vacía, sin resultados y fallos de red.', 'in_review', 'medium', addDaysISO(1), addDaysISO(4), 1, 'user-ana'),
    t('t11', 'proj-personal', 'Leer notas de Monday y Asana', 'Tomar ideas de densidad y de la línea de tiempo.', 'done', 'low', addDaysISO(-45), addDaysISO(-40), 1, null, addDaysISO(-38)),
    t('t12', 'proj-ops', 'Documentar cómo levantar el proyecto', 'README con modo local y pasos de Supabase.', 'done', 'medium', addDaysISO(-60), addDaysISO(-50), 0, user.id, addDaysISO(-48)),
    t('t13', 'proj-producto', 'Estudio de arquitectura y dependencias', 'Análisis comparativo de Pinia y composables.', 'done', 'low', addDaysISO(-75), addDaysISO(-70), 0, 'user-carlos', addDaysISO(-70)),
  ]

  const comments: Comment[] = [
    c('c1', 't3', 'La fila rápida de alta debería quedar arriba, como en Asana.'),
    c('c2', 't4', 'Probar el arrastre entre En progreso y En revisión.'),
    c('c3', 't2', 'Las vencidas tienen que destacarse sin gritar.'),
  ]

  const activities: Activity[] = [
    a('a1', 't1', 'task.created', { title: 'Definir alcance del MVP' }, hoursAgo(80)),
    a('a2', 't1', 'status.changed', { from: 'in_review', to: 'done' }, hoursAgo(70)),
    a('a3', 't3', 'task.created', { title: 'Implementar vista de lista' }, hoursAgo(30)),
    a('a4', 't3', 'comment.added', { preview: 'La fila rápida de alta debería quedar arriba, como en Asana.' }, hoursAgo(6)),
    a('a5', 't4', 'priority.changed', { from: 'high', to: 'urgent' }, hoursAgo(4)),
    a('a6', 't2', 'status.changed', { from: 'in_progress', to: 'in_review' }, hoursAgo(3)),
    a('a7', 't8', 'due_date.changed', { from: addDaysISO(2), to: addDaysISO(-1) }, hoursAgo(2)),
  ]

  const attachments: TaskAttachment[] = []

  const subtasks: Subtask[] = [
    st('st1', 't3', 'Crear componente de tabla para tareas', true, 0),
    st('st2', 't3', 'Añadir filtros por proyecto y asignado', true, 1),
    st('st3', 't3', 'Implementar búsqueda rápida', false, 2),
    st('st4', 't4', 'Configurar columnas Kanban por estado', true, 0),
    st('st5', 't4', 'Soportar reordenamiento mediante drag and drop', true, 1),
    st('st6', 't4', 'Sincronizar cambios de estado con el backend', false, 2),
    st('st7', 't5', 'Añadir pestaña de Comentarios', true, 0),
    st('st8', 't5', 'Añadir pestaña de Archivos adjuntos', true, 1),
    st('st9', 't5', 'Añadir sección de Subtareas', false, 2),
  ]

  return { user, users, projects, tasks, subtasks, comments, attachments, activities, teams: [], teamMembers: [] }

  function st(id: string, taskId: string, title: string, completed: boolean, position: number): Subtask {
    return {
      id,
      taskId,
      userId: user.id,
      title,
      completed,
      position,
      createdAt,
      updatedAt: createdAt,
    }
  }

  function t(
    id: string,
    projectId: string,
    title: string,
    description: string,
    status: Task['status'],
    priority: Task['priority'],
    startDate: string | null,
    dueDate: string | null,
    position: number,
    assigneeId: string | null = null,
    completedAt: string | null = null,
  ): Task {
    return {
      id,
      projectId,
      userId: user.id,
      assigneeId,
      title,
      description,
      status,
      priority,
      startDate,
      dueDate,
      position,
      createdAt,
      updatedAt: createdAt,
      completedAt: completedAt || (status === 'done' ? createdAt : null),
    }
  }

  function c(id: string, taskId: string, body: string): Comment {
    return {
      id,
      taskId,
      userId: user.id,
      body,
      createdAt: hoursAgo(5),
      authorName: user.fullName,
    }
  }

  function a(
    id: string,
    taskId: string,
    type: ActivityType,
    meta: Record<string, unknown>,
    createdAt: string,
  ): Activity {
    const task = tasks.find((item) => item.id === taskId)
    return {
      id,
      taskId,
      userId: user.id,
      type,
      meta,
      createdAt,
      taskTitle: task?.title,
      authorName: user.fullName,
    }
  }
}

function hoursAgo(hours: number) {
  return new Date(Date.now() - hours * 3_600_000).toISOString()
}

function load(): Db {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Db
      if (!parsed.attachments) parsed.attachments = []
      if (!parsed.subtasks) parsed.subtasks = []
      if (!parsed.teams) parsed.teams = []
      if (!parsed.teamMembers) parsed.teamMembers = []
      if (!parsed.users || !parsed.users.length) {
        parsed.users = [
          parsed.user,
          { id: 'user-ana', email: 'ana@nexo.local', fullName: 'Ana García' },
          { id: 'user-carlos', email: 'carlos@nexo.local', fullName: 'Carlos Ruiz' },
          { id: 'user-elena', email: 'elena@nexo.local', fullName: 'Elena Torres' },
        ]
      }
      return parsed
    }
  } catch {
    /* ignore corrupt storage */
  }
  const db = seed()
  save(db)
  return db
}

function save(db: Db) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
}

function withProject(db: Db, task: Task): Task {
  const project = db.projects.find((p) => p.id === task.projectId)
  const assignee = task.assigneeId ? (db.users || []).find((u) => u.id === task.assigneeId) : undefined
  const team = task.teamId ? db.teams.find((t) => t.id === task.teamId) : undefined
  const defaultUi = getUrgencyImportanceFromPriority(task.priority)
  const taskSubtasks = (db.subtasks || []).filter((st) => st.taskId === task.id)
  return {
    ...task,
    isUrgent: task.isUrgent ?? defaultUi.isUrgent,
    isImportant: task.isImportant ?? defaultUi.isImportant,
    project: project ? { id: project.id, name: project.name, color: project.color } : task.project,
    assignee: assignee ? { id: assignee.id, email: assignee.email, fullName: assignee.fullName, avatarUrl: assignee.avatarUrl } : undefined,
    team: team ? { id: team.id, name: team.name } : undefined,
    subtaskCount: taskSubtasks.length,
    completedSubtaskCount: taskSubtasks.filter((st) => st.completed).length,
  }
}

function matches(task: Task, filters?: TaskFilters, projectName = '') {
  if (!filters) return true
  if (filters.status && filters.status !== 'all' && task.status !== filters.status) return false
  if (filters.priority && filters.priority !== 'all' && task.priority !== filters.priority) return false
  if (filters.projectId && filters.projectId !== 'all' && task.projectId !== filters.projectId) {
    return false
  }
  if (filters.assigneeId && filters.assigneeId !== 'all') {
    if (filters.assigneeId === 'unassigned') {
      if (task.assigneeId) return false
    } else if (task.assigneeId !== filters.assigneeId) {
      return false
    }
  }
  if (filters.search) {
    const q = filters.search.toLowerCase()
    const hay = `${task.title} ${task.description} ${projectName} ${task.assignee?.fullName ?? ''}`.toLowerCase()
    if (!hay.includes(q)) return false
  }
  return true
}

function pushActivity(
  db: Db,
  task: Task,
  type: ActivityType,
  meta: Record<string, unknown>,
) {
  db.activities.unshift({
    id: crypto.randomUUID(),
    taskId: task.id,
    userId: db.user.id,
    type,
    meta,
    createdAt: nowISO(),
    taskTitle: task.title,
    authorName: db.user.fullName,
  })
}

export function createLocalBackend(): Backend {
  const listeners = new Set<(user: User | null) => void>()

  return {
    kind: 'local',

    async getSession() {
      return load().user
    },

    async signIn() {
      return load().user
    },

    async signUp() {
      return load().user
    },

    async signOut() {
      /* local mode stays signed in */
    },

    async updateProfile(input) {
      const db = load()
      if (input.fullName) {
        db.user.fullName = input.fullName.trim()
        save(db)
        for (const cb of listeners) cb(db.user)
      }
      return db.user
    },

    onAuthChange(cb) {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },

    async listUsers() {
      return load().users || []
    },

    async listProjects() {
      return load().projects
    },

    async createProject(input: CreateProjectInput) {
      const db = load()
      const project: Project = {
        id: crypto.randomUUID(),
        userId: db.user.id,
        name: input.name.trim(),
        color: input.color ?? '#C45C26',
        createdAt: nowISO(),
      }
      db.projects.push(project)
      save(db)
      return project
    },

    async updateProject(id: string, input: UpdateProjectInput) {
      const db = load()
      const project = db.projects.find((p) => p.id === id)
      if (!project) throw new Error('Proyecto no encontrado')
      if (input.name !== undefined) project.name = input.name.trim()
      if (input.color !== undefined) project.color = input.color
      save(db)
      return project
    },

    async listTasks(filters?: TaskFilters) {
      const db = load()
      return db.tasks
        .map((task) => withProject(db, task))
        .filter((task) => {
          const project = db.projects.find((p) => p.id === task.projectId)
          return matches(task, filters, project?.name)
        })
        .sort((a, b) => a.position - b.position || a.createdAt.localeCompare(b.createdAt))
    },

    async getTask(id: string) {
      const db = load()
      const task = db.tasks.find((item) => item.id === id)
      if (!task) throw new Error('Tarea no encontrada')
      return withProject(db, task)
    },

    async createTask(input: CreateTaskInput) {
      const db = load()
      const status = input.status ?? 'todo'
      const siblings = db.tasks.filter((item) => item.status === status)
      const priority = input.priority ?? 'medium'
      const defaultUi = getUrgencyImportanceFromPriority(priority)
      const now = nowISO()
      const task: Task = {
        id: crypto.randomUUID(),
        projectId: input.projectId,
        userId: db.user.id,
        assigneeId: input.assigneeId ?? null,
        teamId: input.teamId ?? null,
        title: input.title.trim(),
        description: input.description?.trim() ?? '',
        status,
        priority,
        isUrgent: input.isUrgent ?? defaultUi.isUrgent,
        isImportant: input.isImportant ?? defaultUi.isImportant,
        startDate: input.startDate ?? null,
        dueDate: input.dueDate ?? null,
        position: siblings.length,
        createdAt: now,
        updatedAt: now,
        completedAt: status === 'done' ? (input.completedAt ?? now) : null,
      }
      db.tasks.push(task)
      pushActivity(db, task, 'task.created', { title: task.title })
      if (task.assigneeId) {
        const assignee = (db.users || []).find((u) => u.id === task.assigneeId)
        pushActivity(db, task, 'assignee.changed', { toId: task.assigneeId, toName: assignee?.fullName ?? null })
      }
      save(db)
      return withProject(db, task)
    },

    async updateTask(id: string, input: UpdateTaskInput) {
      const db = load()
      const task = db.tasks.find((item) => item.id === id)
      if (!task) throw new Error('Tarea no encontrada')
      const now = nowISO()

      if (input.title !== undefined && input.title !== task.title) {
        pushActivity(db, task, 'task.updated', { field: 'title', from: task.title, to: input.title })
        task.title = input.title.trim()
      }
      if (input.description !== undefined && input.description !== task.description) {
        pushActivity(db, task, 'task.updated', { field: 'description' })
        task.description = input.description
      }
      if (input.status !== undefined && input.status !== task.status) {
        pushActivity(db, task, 'status.changed', { from: task.status, to: input.status })
        task.status = input.status
        if (input.status === 'done') {
          task.completedAt = input.completedAt ?? now
        } else {
          task.completedAt = null
        }
      }
      if (input.completedAt !== undefined) {
        task.completedAt = input.completedAt
      }
      if (input.priority !== undefined && input.priority !== task.priority) {
        pushActivity(db, task, 'priority.changed', { from: task.priority, to: input.priority })
        task.priority = input.priority
      }
      if (input.isUrgent !== undefined) {
        task.isUrgent = input.isUrgent
      }
      if (input.isImportant !== undefined) {
        task.isImportant = input.isImportant
      }
      if (input.startDate !== undefined && input.startDate !== task.startDate) {
        pushActivity(db, task, 'start_date.changed', { from: task.startDate, to: input.startDate })
        task.startDate = input.startDate
      }
      if (input.dueDate !== undefined && input.dueDate !== task.dueDate) {
        pushActivity(db, task, 'due_date.changed', { from: task.dueDate, to: input.dueDate })
        task.dueDate = input.dueDate
      }
      if (input.assigneeId !== undefined && input.assigneeId !== task.assigneeId) {
        const users = db.users || []
        const prevAssignee = users.find((u) => u.id === task.assigneeId)
        const nextAssignee = input.assigneeId ? users.find((u) => u.id === input.assigneeId) : null
        pushActivity(db, task, 'assignee.changed', {
          fromId: task.assigneeId ?? null,
          toId: input.assigneeId ?? null,
          fromName: prevAssignee?.fullName ?? null,
          toName: nextAssignee?.fullName ?? null,
        })
        task.assigneeId = input.assigneeId
      }
      if (input.projectId !== undefined) task.projectId = input.projectId
      if (input.position !== undefined) task.position = input.position
      if (input.teamId !== undefined) task.teamId = input.teamId
      task.updatedAt = now
      save(db)
      return withProject(db, task)
    },

    async deleteTask(id: string) {
      const db = load()
      db.tasks = db.tasks.filter((item) => item.id !== id)
      db.subtasks = (db.subtasks || []).filter((item) => item.taskId !== id)
      db.comments = db.comments.filter((item) => item.taskId !== id)
      db.attachments = (db.attachments || []).filter((item) => item.taskId !== id)
      db.activities = db.activities.filter((item) => item.taskId !== id)
      save(db)
    },

    async reorderColumn(status, orderedIds) {
      const db = load()
      const now = nowISO()
      orderedIds.forEach((id, index) => {
        const task = db.tasks.find((item) => item.id === id)
        if (!task) return
        if (task.status !== status) {
          if (status === 'done') task.completedAt = now
          else task.completedAt = null
        }
        task.status = status
        task.position = index
        task.updatedAt = now
      })
      save(db)
    },

    async listSubtasks(taskId: string) {
      return (load().subtasks || [])
        .filter((item) => item.taskId === taskId)
        .sort((a, b) => a.position - b.position || a.createdAt.localeCompare(b.createdAt))
    },

    async createSubtask(taskId: string, input: CreateSubtaskInput | string) {
      const db = load()
      const task = db.tasks.find((item) => item.id === taskId)
      if (!task) throw new Error('Tarea no encontrada')
      if (!db.subtasks) db.subtasks = []

      const title = typeof input === 'string' ? input : input.title
      const completed = typeof input === 'string' ? false : (input.completed ?? false)
      const existing = db.subtasks.filter((st) => st.taskId === taskId)

      const subtask: Subtask = {
        id: crypto.randomUUID(),
        taskId,
        userId: db.user.id,
        title: title.trim(),
        completed,
        position: existing.length,
        createdAt: nowISO(),
        updatedAt: nowISO(),
      }
      db.subtasks.push(subtask)
      pushActivity(db, task, 'subtask.added', { title: subtask.title })
      save(db)
      return subtask
    },

    async updateSubtask(id: string, input: UpdateSubtaskInput) {
      const db = load()
      if (!db.subtasks) db.subtasks = []
      const subtask = db.subtasks.find((st) => st.id === id)
      if (!subtask) throw new Error('Subtarea no encontrada')

      const task = db.tasks.find((t) => t.id === subtask.taskId)
      const now = nowISO()

      if (input.completed !== undefined && input.completed !== subtask.completed) {
        subtask.completed = input.completed
        if (task) {
          pushActivity(db, task, input.completed ? 'subtask.completed' : 'subtask.uncompleted', {
            title: subtask.title,
          })
        }
      }

      if (input.title !== undefined) {
        subtask.title = input.title.trim()
      }

      if (input.position !== undefined) {
        subtask.position = input.position
      }

      subtask.updatedAt = now
      save(db)
      return subtask
    },

    async deleteSubtask(id: string) {
      const db = load()
      if (!db.subtasks) db.subtasks = []
      const subtask = db.subtasks.find((st) => st.id === id)
      if (!subtask) return

      const task = db.tasks.find((t) => t.id === subtask.taskId)
      db.subtasks = db.subtasks.filter((st) => st.id !== id)

      if (task) {
        pushActivity(db, task, 'subtask.deleted', { title: subtask.title })
      }
      save(db)
    },

    async listComments(taskId: string) {
      return load()
        .comments.filter((item) => item.taskId === taskId)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    },

    async addComment(taskId: string, body: string) {
      const db = load()
      const task = db.tasks.find((item) => item.id === taskId)
      if (!task) throw new Error('Tarea no encontrada')
      const comment: Comment = {
        id: crypto.randomUUID(),
        taskId,
        userId: db.user.id,
        body: body.trim(),
        createdAt: nowISO(),
        authorName: db.user.fullName,
      }
      db.comments.push(comment)
      pushActivity(db, task, 'comment.added', { preview: stripHtml(comment.body).slice(0, 140) })
      save(db)
      return comment
    },

    async listAttachments(taskId: string) {
      return (load().attachments || [])
        .filter((item) => item.taskId === taskId)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    },

    async addAttachment(taskId: string, file: { name: string; url: string; size: number; type: string }) {
      const db = load()
      const task = db.tasks.find((item) => item.id === taskId)
      if (!task) throw new Error('Tarea no encontrada')
      if (!db.attachments) db.attachments = []
      const attachment: TaskAttachment = {
        id: crypto.randomUUID(),
        taskId,
        userId: db.user.id,
        name: file.name,
        url: file.url,
        size: file.size,
        type: file.type,
        createdAt: nowISO(),
      }
      db.attachments.push(attachment)
      pushActivity(db, task, 'attachment.added', { name: attachment.name })
      save(db)
      return attachment
    },

    async deleteAttachment(id: string) {
      const db = load()
      if (!db.attachments) db.attachments = []
      const attachment = db.attachments.find((item) => item.id === id)
      if (!attachment) return
      const task = db.tasks.find((item) => item.id === attachment.taskId)
      db.attachments = db.attachments.filter((item) => item.id !== id)
      if (task) {
        pushActivity(db, task, 'attachment.removed', { name: attachment.name })
      }
      save(db)
    },

    async listActivities(taskId: string) {
      return load()
        .activities.filter((item) => item.taskId === taskId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    },

    async listRecentActivities(limit = 12) {
      return load()
        .activities.slice()
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, limit)
    },

    // ── Teams (local stubs) ────────────────────────────────────────────────

    async listTeams() {
      const db = load()
      const myId = db.user.id
      return db.teams.filter((t) =>
        t.ownerId === myId || db.teamMembers.some((m) => m.teamId === t.id && m.userId === myId),
      )
    },

    async createTeam(input: CreateTeamInput) {
      const db = load()
      const now = nowISO()
      const team: Team = {
        id: crypto.randomUUID(),
        name: input.name.trim(),
        ownerId: db.user.id,
        createdAt: now,
        memberCount: 1 + (input.memberIds?.length ?? 0),
      }
      db.teams.push(team)
      db.teamMembers.push({ teamId: team.id, userId: db.user.id, role: 'owner', joinedAt: now })
      for (const uid of input.memberIds ?? []) {
        db.teamMembers.push({ teamId: team.id, userId: uid, role: 'member', joinedAt: now })
      }
      save(db)
      return team
    },

    async updateTeam(id: string, input: UpdateTeamInput) {
      const db = load()
      const team = db.teams.find((t) => t.id === id)
      if (!team) throw new Error('Equipo no encontrado')
      if (input.name !== undefined) team.name = input.name.trim()
      save(db)
      return team
    },

    async deleteTeam(id: string) {
      const db = load()
      db.teams = db.teams.filter((t) => t.id !== id)
      db.teamMembers = db.teamMembers.filter((m) => m.teamId !== id)
      db.tasks = db.tasks.map((t) => (t.teamId === id ? { ...t, teamId: null } : t))
      save(db)
    },

    async listTeamMembers(teamId: string) {
      const db = load()
      return db.teamMembers
        .filter((m) => m.teamId === teamId)
        .map((m) => ({
          ...m,
          user: (db.users || []).find((u) => u.id === m.userId),
        }))
    },

    async addTeamMember(teamId: string, userId: string) {
      const db = load()
      const existing = db.teamMembers.find((m) => m.teamId === teamId && m.userId === userId)
      if (existing) return existing
      const member: TeamMember = { teamId, userId, role: 'member', joinedAt: nowISO() }
      db.teamMembers.push(member)
      const team = db.teams.find((t) => t.id === teamId)
      if (team) team.memberCount = (team.memberCount ?? 0) + 1
      save(db)
      const user = (db.users || []).find((u) => u.id === userId)
      return { ...member, user }
    },

    async removeTeamMember(teamId: string, userId: string) {
      const db = load()
      db.teamMembers = db.teamMembers.filter((m) => !(m.teamId === teamId && m.userId === userId))
      const team = db.teams.find((t) => t.id === teamId)
      if (team && (team.memberCount ?? 0) > 0) team.memberCount = (team.memberCount ?? 1) - 1
      save(db)
    },
  }
}
