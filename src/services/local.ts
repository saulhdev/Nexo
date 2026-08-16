import { addDaysISO, todayISO } from '@/lib/dates'
import type {
  Activity,
  ActivityType,
  Comment,
  CreateProjectInput,
  CreateTaskInput,
  Project,
  Task,
  TaskFilters,
  UpdateTaskInput,
  User,
} from '@/types'
import type { Backend } from '@/services/backend'

const STORAGE_KEY = 'nexo:v1'
const LOCAL_USER_ID = 'local-user'

interface Db {
  user: User
  projects: Project[]
  tasks: Task[]
  comments: Comment[]
  activities: Activity[]
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

  const createdAt = nowISO()
  const projects: Project[] = [
    { id: 'proj-producto', userId: user.id, name: 'Producto', color: '#C45C26', createdAt },
    { id: 'proj-ops', userId: user.id, name: 'Operaciones', color: '#1F6B5A', createdAt },
    { id: 'proj-personal', userId: user.id, name: 'Personal', color: '#2F6FED', createdAt },
  ]

  const tasks: Task[] = [
    t('t1', 'proj-producto', 'Definir alcance del MVP', 'Lista de vistas, campos de tarea y flujo de comentarios.', 'done', 'high', addDaysISO(-2), 0),
    t('t2', 'proj-producto', 'Diseñar dashboard de estadísticas', 'Tarjetas de estado, vencidas y actividad reciente.', 'in_review', 'medium', addDaysISO(1), 0),
    t('t3', 'proj-producto', 'Implementar vista de lista', 'Crear, filtrar y editar tareas desde una tabla.', 'in_progress', 'high', todayISO(), 0),
    t('t4', 'proj-producto', 'Tablero kanban con arrastre', 'Mover tarjetas entre columnas actualiza el estado.', 'in_progress', 'urgent', addDaysISO(2), 1),
    t('t5', 'proj-producto', 'Panel de detalle con actividad', 'Comentarios y bitácora con fecha en cada tarea.', 'todo', 'high', addDaysISO(3), 0),
    t('t6', 'proj-ops', 'Conectar proyecto de Supabase', 'Auth, tablas y políticas RLS para datos reales.', 'todo', 'medium', addDaysISO(5), 1),
    t('t7', 'proj-ops', 'Revisar políticas de acceso', 'Cada usuario solo ve sus proyectos y tareas.', 'todo', 'low', addDaysISO(8), 2),
    t('t8', 'proj-ops', 'Preparar demo para el equipo', 'Datos de ejemplo y recorrido por las tres vistas.', 'todo', 'medium', addDaysISO(-1), 3),
    t('t9', 'proj-personal', 'Actualizar portafolio', 'Añadir captura de Nexo cuando el MVP esté listo.', 'todo', 'low', addDaysISO(12), 0),
    t('t10', 'proj-producto', 'Ajustar vacíos y estados de error', 'Lista vacía, sin resultados y fallos de red.', 'in_review', 'medium', addDaysISO(4), 1),
    t('t11', 'proj-personal', 'Leer notas de Monday y Asana', 'Tomar ideas de densidad y de la línea de tiempo.', 'done', 'low', addDaysISO(-6), 1),
    t('t12', 'proj-ops', 'Documentar cómo levantar el proyecto', 'README con modo local y pasos de Supabase.', 'done', 'medium', addDaysISO(-3), 0),
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

  return { user, projects, tasks, comments, activities }

  function t(
    id: string,
    projectId: string,
    title: string,
    description: string,
    status: Task['status'],
    priority: Task['priority'],
    dueDate: string | null,
    position: number,
  ): Task {
    return {
      id,
      projectId,
      userId: user.id,
      title,
      description,
      status,
      priority,
      dueDate,
      position,
      createdAt,
      updatedAt: createdAt,
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
    if (raw) return JSON.parse(raw) as Db
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
  return project
    ? { ...task, project: { id: project.id, name: project.name, color: project.color } }
    : task
}

function matches(task: Task, filters?: TaskFilters, projectName = '') {
  if (!filters) return true
  if (filters.status && filters.status !== 'all' && task.status !== filters.status) return false
  if (filters.priority && filters.priority !== 'all' && task.priority !== filters.priority) return false
  if (filters.projectId && filters.projectId !== 'all' && task.projectId !== filters.projectId) {
    return false
  }
  if (filters.search) {
    const q = filters.search.toLowerCase()
    const hay = `${task.title} ${task.description} ${projectName}`.toLowerCase()
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

    async listTasks(filters?: TaskFilters) {
      const db = load()
      return db.tasks
        .filter((task) => {
          const project = db.projects.find((p) => p.id === task.projectId)
          return matches(task, filters, project?.name)
        })
        .map((task) => withProject(db, task))
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
      const siblings = db.tasks.filter((item) => item.status === (input.status ?? 'todo'))
      const task: Task = {
        id: crypto.randomUUID(),
        projectId: input.projectId,
        userId: db.user.id,
        title: input.title.trim(),
        description: input.description?.trim() ?? '',
        status: input.status ?? 'todo',
        priority: input.priority ?? 'medium',
        dueDate: input.dueDate ?? null,
        position: siblings.length,
        createdAt: nowISO(),
        updatedAt: nowISO(),
      }
      db.tasks.push(task)
      pushActivity(db, task, 'task.created', { title: task.title })
      save(db)
      return withProject(db, task)
    },

    async updateTask(id: string, input: UpdateTaskInput) {
      const db = load()
      const task = db.tasks.find((item) => item.id === id)
      if (!task) throw new Error('Tarea no encontrada')

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
      }
      if (input.priority !== undefined && input.priority !== task.priority) {
        pushActivity(db, task, 'priority.changed', { from: task.priority, to: input.priority })
        task.priority = input.priority
      }
      if (input.dueDate !== undefined && input.dueDate !== task.dueDate) {
        pushActivity(db, task, 'due_date.changed', { from: task.dueDate, to: input.dueDate })
        task.dueDate = input.dueDate
      }
      if (input.projectId !== undefined) task.projectId = input.projectId
      if (input.position !== undefined) task.position = input.position
      task.updatedAt = nowISO()
      save(db)
      return withProject(db, task)
    },

    async deleteTask(id: string) {
      const db = load()
      db.tasks = db.tasks.filter((item) => item.id !== id)
      db.comments = db.comments.filter((item) => item.taskId !== id)
      db.activities = db.activities.filter((item) => item.taskId !== id)
      save(db)
    },

    async reorderColumn(status, orderedIds) {
      const db = load()
      orderedIds.forEach((id, index) => {
        const task = db.tasks.find((item) => item.id === id)
        if (!task) return
        task.status = status
        task.position = index
        task.updatedAt = nowISO()
      })
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
      pushActivity(db, task, 'comment.added', { preview: comment.body.slice(0, 140) })
      save(db)
      return comment
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
  }
}
