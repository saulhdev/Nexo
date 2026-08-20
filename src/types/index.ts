export type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

export type ActivityType =
  | 'task.created'
  | 'task.updated'
  | 'status.changed'
  | 'priority.changed'
  | 'start_date.changed'
  | 'due_date.changed'
  | 'assignee.changed'
  | 'comment.added'
  | 'attachment.added'
  | 'attachment.removed'
  | 'subtask.added'
  | 'subtask.completed'
  | 'subtask.uncompleted'
  | 'subtask.deleted'

export interface User {
  id: string
  email: string
  fullName: string
  avatarUrl?: string
  isAdmin?: boolean
}

export interface Project {
  id: string
  userId: string
  name: string
  color: string
  createdAt: string
}

// ── Teams ──────────────────────────────────────────────────────────────────────

export interface Team {
  id: string
  name: string
  ownerId: string
  createdAt: string
  memberCount?: number
}

export type TeamMemberRole = 'owner' | 'member'

export interface TeamMember {
  teamId: string
  userId: string
  role: TeamMemberRole
  joinedAt: string
  user?: Pick<User, 'id' | 'email' | 'fullName' | 'avatarUrl'>
}

export interface CreateTeamInput {
  name: string
  /** User IDs to add as members (in addition to the owner) */
  memberIds?: string[]
}

export interface UpdateTeamInput {
  name?: string
}

// ── Subtasks ───────────────────────────────────────────────────────────────────

export interface Subtask {
  id: string
  taskId: string
  userId: string
  title: string
  completed: boolean
  position: number
  createdAt: string
  updatedAt?: string
}

export interface CreateSubtaskInput {
  title: string
  completed?: boolean
}

export interface UpdateSubtaskInput {
  title?: string
  completed?: boolean
  position?: number
}

// ── Tasks ──────────────────────────────────────────────────────────────────────

export type AutoArchiveDays = 15 | 30 | 45 | 60

export interface Task {
  id: string
  projectId: string
  userId: string
  assigneeId?: string | null
  /** Optional team the task is shared with. All team members can see it. */
  teamId?: string | null
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  isUrgent?: boolean
  isImportant?: boolean
  startDate: string | null
  dueDate: string | null
  position: number
  createdAt: string
  updatedAt: string
  completedAt?: string | null
  project?: Pick<Project, 'id' | 'name' | 'color'>
  assignee?: Pick<User, 'id' | 'email' | 'fullName' | 'avatarUrl'>
  team?: Pick<Team, 'id' | 'name'>
  subtaskCount?: number
  completedSubtaskCount?: number
  subtasks?: Subtask[]
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
  assigneeId?: string | 'all' | 'unassigned'
  teamId?: string | 'all'
}

export interface CreateTaskInput {
  title: string
  description?: string
  status?: TaskStatus
  priority?: TaskPriority
  isUrgent?: boolean
  isImportant?: boolean
  startDate?: string | null
  dueDate?: string | null
  projectId: string
  assigneeId?: string | null
  teamId?: string | null
  completedAt?: string | null
}

export interface UpdateTaskInput {
  title?: string
  description?: string
  status?: TaskStatus
  priority?: TaskPriority
  isUrgent?: boolean
  isImportant?: boolean
  startDate?: string | null
  dueDate?: string | null
  projectId?: string
  position?: number
  assigneeId?: string | null
  teamId?: string | null
  completedAt?: string | null
}

export interface CreateProjectInput {
  name: string
  color?: string
}

export interface UpdateProjectInput {
  name?: string
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
