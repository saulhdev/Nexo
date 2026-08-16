export type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

export type ActivityType =
  | 'task.created'
  | 'task.updated'
  | 'status.changed'
  | 'priority.changed'
  | 'start_date.changed'
  | 'due_date.changed'
  | 'comment.added'
  | 'attachment.added'
  | 'attachment.removed'

export interface User {
  id: string
  email: string
  fullName: string
}

export interface Project {
  id: string
  userId: string
  name: string
  color: string
  createdAt: string
}

export interface Task {
  id: string
  projectId: string
  userId: string
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  startDate: string | null
  dueDate: string | null
  position: number
  createdAt: string
  updatedAt: string
  project?: Pick<Project, 'id' | 'name' | 'color'>
}

export interface Comment {
  id: string
  taskId: string
  userId: string
  body: string
  createdAt: string
  authorName?: string
}

export interface TaskAttachment {
  id: string
  taskId: string
  userId: string
  name: string
  url: string
  size: number
  type: string
  createdAt: string
}

export interface Activity {
  id: string
  taskId: string
  userId: string
  type: ActivityType
  meta: Record<string, unknown>
  createdAt: string
  taskTitle?: string
  authorName?: string
}

export interface TaskFilters {
  search?: string
  status?: TaskStatus | 'all'
  priority?: TaskPriority | 'all'
  projectId?: string | 'all'
}

export interface CreateTaskInput {
  title: string
  description?: string
  status?: TaskStatus
  priority?: TaskPriority
  startDate?: string | null
  dueDate?: string | null
  projectId: string
}

export interface UpdateTaskInput {
  title?: string
  description?: string
  status?: TaskStatus
  priority?: TaskPriority
  startDate?: string | null
  dueDate?: string | null
  projectId?: string
  position?: number
}

export interface CreateProjectInput {
  name: string
  color?: string
}

export interface DashboardStats {
  total: number
  todo: number
  inProgress: number
  inReview: number
  done: number
  overdue: number
  dueSoon: number
  doneThisWeek: number
  byPriority: Record<TaskPriority, number>
}
