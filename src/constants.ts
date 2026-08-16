import type { TaskPriority, TaskStatus } from '@/types'

export const APP_NAME = 'Nexo'

export const STATUSES: {
  id: TaskStatus
  label: string
  hint: string
  tone: string
}[] = [
  { id: 'todo', label: 'Por hacer', hint: 'Aún no empezó', tone: 'stone' },
  { id: 'in_progress', label: 'En progreso', hint: 'Se está trabajando', tone: 'sky' },
  { id: 'in_review', label: 'En revisión', hint: 'Pendiente de validar', tone: 'amber' },
  { id: 'done', label: 'Hecho', hint: 'Cerrada', tone: 'emerald' },
]

export const PRIORITIES: {
  id: TaskPriority
  label: string
  tone: string
}[] = [
  { id: 'low', label: 'Baja', tone: 'stone' },
  { id: 'medium', label: 'Media', tone: 'sky' },
  { id: 'high', label: 'Alta', tone: 'orange' },
  { id: 'urgent', label: 'Urgente', tone: 'rose' },
]

export const PROJECT_COLORS = [
  '#C45C26',
  '#1F6B5A',
  '#2F6FED',
  '#7C3AED',
  '#BE185D',
  '#0F766E',
  '#B45309',
  '#334155',
]

export const STATUS_LABEL: Record<TaskStatus, string> = Object.fromEntries(
  STATUSES.map((s) => [s.id, s.label]),
) as Record<TaskStatus, string>

export const PRIORITY_LABEL: Record<TaskPriority, string> = Object.fromEntries(
  PRIORITIES.map((p) => [p.id, p.label]),
) as Record<TaskPriority, string>

export function statusMeta(id: TaskStatus) {
  return STATUSES.find((s) => s.id === id) ?? STATUSES[0]
}

export function priorityMeta(id: TaskPriority) {
  return PRIORITIES.find((p) => p.id === id) ?? PRIORITIES[1]
}
