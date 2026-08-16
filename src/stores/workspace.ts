import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { getBackend } from '@/services'
import { isDueSoon, isOverdue, startOfWeekISO } from '@/lib/dates'
import type {
  Activity,
  Comment,
  CreateProjectInput,
  CreateTaskInput,
  DashboardStats,
  Project,
  Task,
  TaskAttachment,
  TaskFilters,
  TaskStatus,
  UpdateTaskInput,
  User,
} from '@/types'

export const useWorkspaceStore = defineStore('workspace', () => {
  const backend = getBackend()
  const users = ref<User[]>([])
  const projects = ref<Project[]>([])
  const tasks = ref<Task[]>([])
  const comments = ref<Comment[]>([])
  const attachments = ref<TaskAttachment[]>([])
  const activities = ref<Activity[]>([])
  const recentActivities = ref<Activity[]>([])
  const activeTaskId = ref<string | null>(null)
  const loading = ref(false)
  const detailLoading = ref(false)
  const error = ref('')

  const filters = ref<Required<TaskFilters>>({
    search: '',
    status: 'all',
    priority: 'all',
    projectId: 'all',
    assigneeId: 'all',
  })

  const activeTask = computed(() => tasks.value.find((task) => task.id === activeTaskId.value) ?? null)

  const filteredTasks = computed(() => {
    const q = filters.value.search.trim().toLowerCase()
    return tasks.value.filter((task) => {
      if (filters.value.status !== 'all' && task.status !== filters.value.status) return false
      if (filters.value.priority !== 'all' && task.priority !== filters.value.priority) return false
      if (filters.value.projectId !== 'all' && task.projectId !== filters.value.projectId) return false
      if (filters.value.assigneeId !== 'all') {
        if (filters.value.assigneeId === 'unassigned') {
          if (task.assigneeId) return false
        } else if (task.assigneeId !== filters.value.assigneeId) {
          return false
        }
      }
      if (q) {
        const hay = `${task.title} ${task.description} ${task.project?.name ?? ''} ${task.assignee?.fullName ?? ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  })

  const stats = computed<DashboardStats>(() => {
    const weekStart = startOfWeekISO()
    const byPriority = { low: 0, medium: 0, high: 0, urgent: 0 }
    const result: DashboardStats = {
      total: tasks.value.length,
      todo: 0,
      inProgress: 0,
      inReview: 0,
      done: 0,
      overdue: 0,
      dueSoon: 0,
      doneThisWeek: 0,
      byPriority,
    }
    for (const task of tasks.value) {
      if (task.status === 'todo') result.todo += 1
      if (task.status === 'in_progress') result.inProgress += 1
      if (task.status === 'in_review') result.inReview += 1
      if (task.status === 'done') {
        result.done += 1
        if (task.updatedAt.slice(0, 10) >= weekStart) result.doneThisWeek += 1
      }
      byPriority[task.priority] += 1
      if (isOverdue(task.dueDate, task.status)) result.overdue += 1
      if (isDueSoon(task.dueDate, task.status)) result.dueSoon += 1
    }
    return result
  })

  const upcoming = computed(() =>
    tasks.value
      .filter((task) => task.dueDate && task.status !== 'done')
      .slice()
      .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''))
      .slice(0, 6),
  )

  function tasksByStatus(status: TaskStatus) {
    return filteredTasks.value
      .filter((task) => task.status === status)
      .slice()
      .sort((a, b) => a.position - b.position)
  }

  function getErrorMessage(err: unknown, fallback: string): string {
    if (err instanceof Error) return err.message
    if (err && typeof err === 'object' && 'message' in err && typeof (err as { message: unknown }).message === 'string') {
      return (err as { message: string }).message
    }
    return fallback
  }

  async function bootstrap() {
    loading.value = true
    error.value = ''
    try {
      const [nextUsers, nextProjects, nextTasks, nextActivity] = await Promise.all([
        backend.listUsers(),
        backend.listProjects(),
        backend.listTasks(),
        backend.listRecentActivities(14),
      ])
      users.value = nextUsers
      projects.value = nextProjects
      tasks.value = nextTasks
      recentActivities.value = nextActivity
    } catch (err) {
      error.value = getErrorMessage(err, 'No se pudieron cargar los datos')
    } finally {
      loading.value = false
    }
  }

  async function createProject(input: CreateProjectInput) {
    error.value = ''
    try {
      const project = await backend.createProject(input)
      projects.value.push(project)
      return project
    } catch (err) {
      error.value = getErrorMessage(err, 'No se pudo crear el proyecto')
      throw err
    }
  }

  async function createTask(input: CreateTaskInput) {
    const task = await backend.createTask(input)
    tasks.value.push(task)
    await refreshRecent()
    return task
  }

  async function updateTask(id: string, input: UpdateTaskInput) {
    const task = await backend.updateTask(id, input)
    const index = tasks.value.findIndex((item) => item.id === id)
    if (index >= 0) tasks.value[index] = task
    else tasks.value.push(task)
    if (activeTaskId.value === id) {
      await loadDetail(id)
    } else {
      await refreshRecent()
    }
    return task
  }

  async function deleteTask(id: string) {
    await backend.deleteTask(id)
    tasks.value = tasks.value.filter((item) => item.id !== id)
    if (activeTaskId.value === id) {
      activeTaskId.value = null
      comments.value = []
      attachments.value = []
      activities.value = []
    }
  }

  async function moveInColumn(status: TaskStatus, orderedIds: string[], movedId?: string) {
    const previous = tasks.value.map((task) => ({ ...task }))
    tasks.value = tasks.value.map((task) => {
      const index = orderedIds.indexOf(task.id)
      if (index === -1) return task
      return { ...task, status, position: index }
    })
    try {
      if (movedId) {
        const current = previous.find((task) => task.id === movedId)
        if (current && current.status !== status) {
          await backend.updateTask(movedId, { status })
        }
      }
      await backend.reorderColumn(status, orderedIds)
      await refreshRecent()
    } catch (err) {
      tasks.value = previous
      error.value = getErrorMessage(err, 'No se pudo mover la tarea')
    }
  }

  async function openTask(id: string) {
    activeTaskId.value = id
    await loadDetail(id)
  }

  function closeTask() {
    activeTaskId.value = null
    comments.value = []
    attachments.value = []
    activities.value = []
  }

  async function loadDetail(id: string) {
    detailLoading.value = true
    try {
      const [task, nextComments, nextAttachments, nextActivities] = await Promise.all([
        backend.getTask(id),
        backend.listComments(id),
        backend.listAttachments(id),
        backend.listActivities(id),
      ])
      const index = tasks.value.findIndex((item) => item.id === id)
      if (index >= 0) tasks.value[index] = task
      comments.value = nextComments
      attachments.value = nextAttachments
      activities.value = nextActivities
    } finally {
      detailLoading.value = false
    }
  }

  async function addComment(body: string) {
    if (!activeTaskId.value) return
    const comment = await backend.addComment(activeTaskId.value, body)
    comments.value.push(comment)
    await loadDetail(activeTaskId.value)
    await refreshRecent()
  }

  async function uploadAttachment(file: File, targetTaskId?: string) {
    const taskId = targetTaskId || activeTaskId.value
    if (!taskId) return
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(file)
    })

    const attachment = await backend.addAttachment(taskId, {
      name: file.name,
      url: dataUrl,
      size: file.size,
      type: file.type || 'application/octet-stream',
    })
    if (activeTaskId.value === taskId) {
      attachments.value.push(attachment)
      await loadDetail(taskId)
    }
    await refreshRecent()
    return attachment
  }

  async function deleteAttachment(id: string) {
    if (!activeTaskId.value) return
    await backend.deleteAttachment(id)
    attachments.value = attachments.value.filter((item) => item.id !== id)
    await loadDetail(activeTaskId.value)
    await refreshRecent()
  }

  async function refreshRecent() {
    recentActivities.value = await backend.listRecentActivities(14)
  }

  function setFilter<K extends keyof TaskFilters>(key: K, value: NonNullable<TaskFilters[K]>) {
    filters.value[key] = value as never
  }

  return {
    users,
    projects,
    tasks,
    comments,
    attachments,
    activities,
    recentActivities,
    activeTaskId,
    activeTask,
    loading,
    detailLoading,
    error,
    filters,
    filteredTasks,
    stats,
    upcoming,
    tasksByStatus,
    bootstrap,
    createProject,
    createTask,
    updateTask,
    deleteTask,
    moveInColumn,
    openTask,
    closeTask,
    addComment,
    uploadAttachment,
    deleteAttachment,
    setFilter,
  }
})
