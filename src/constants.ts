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

export type EisenhowerQuadrantId = 'q1' | 'q2' | 'q3' | 'q4'

export interface EisenhowerQuadrant {
  id: EisenhowerQuadrantId
  name: string
  action: string
  description: string
  isUrgent: boolean
  isImportant: boolean
  priority: TaskPriority
  tone: string
  bgClass: string
  borderClass: string
  textClass: string
  badgeClass: string
  headerBg: string
}

export const EISENHOWER_QUADRANTS: EisenhowerQuadrant[] = [
  {
    id: 'q1',
    name: 'Cuadrante 1',
    action: 'Hacer ya',
    description: 'Urgente e Importante — Fechas límite inminentes y tareas críticas',
    isUrgent: true,
    isImportant: true,
    priority: 'urgent',
    tone: 'rose',
    bgClass: 'bg-rose-500/5',
    borderClass: 'border-rose-500/25',
    textClass: 'text-rose-600',
    badgeClass: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
    headerBg: 'bg-rose-500/10 text-rose-700',
  },
  {
    id: 'q2',
    name: 'Cuadrante 2',
    action: 'Planificar',
    description: 'No urgente pero Importante — Objetivos estratégicos y desarrollo',
    isUrgent: false,
    isImportant: true,
    priority: 'high',
    tone: 'orange',
    bgClass: 'bg-amber-500/5',
    borderClass: 'border-amber-500/25',
    textClass: 'text-amber-600',
    badgeClass: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    headerBg: 'bg-amber-500/10 text-amber-700',
  },
  {
    id: 'q3',
    name: 'Cuadrante 3',
    action: 'Delegar',
    description: 'Urgente pero No importante — Interrupciones y peticiones rápidas',
    isUrgent: true,
    isImportant: false,
    priority: 'medium',
    tone: 'sky',
    bgClass: 'bg-sky-500/5',
    borderClass: 'border-sky-500/25',
    textClass: 'text-sky-600',
    badgeClass: 'bg-sky-500/10 text-sky-600 border-sky-500/20',
    headerBg: 'bg-sky-500/10 text-sky-700',
  },
  {
    id: 'q4',
    name: 'Cuadrante 4',
    action: 'Eliminar',
    description: 'No urgente y No importante — Distracciones y baja prioridad',
    isUrgent: false,
    isImportant: false,
    priority: 'low',
    tone: 'stone',
    bgClass: 'bg-stone-500/5',
    borderClass: 'border-stone-500/25',
    textClass: 'text-stone-600',
    badgeClass: 'bg-stone-500/10 text-stone-600 border-stone-500/20',
    headerBg: 'bg-stone-500/10 text-stone-700',
  },
]

export function getPriorityFromUrgencyImportance(isUrgent: boolean, isImportant: boolean): TaskPriority {
  if (isUrgent && isImportant) return 'urgent'
  if (!isUrgent && isImportant) return 'high'
  if (isUrgent && !isImportant) return 'medium'
  return 'low'
}

export function getUrgencyImportanceFromPriority(priority: TaskPriority): { isUrgent: boolean; isImportant: boolean } {
  switch (priority) {
    case 'urgent':
      return { isUrgent: true, isImportant: true }
    case 'high':
      return { isUrgent: false, isImportant: true }
    case 'medium':
      return { isUrgent: true, isImportant: false }
    case 'low':
    default:
      return { isUrgent: false, isImportant: false }
  }
}

export function getQuadrantFromTask(task: { isUrgent?: boolean | null; isImportant?: boolean | null; priority: TaskPriority }): EisenhowerQuadrant {
  const isUrgent = task.isUrgent ?? (task.priority === 'urgent' || task.priority === 'medium')
  const isImportant = task.isImportant ?? (task.priority === 'urgent' || task.priority === 'high')

  if (isUrgent && isImportant) return EISENHOWER_QUADRANTS[0]
  if (!isUrgent && isImportant) return EISENHOWER_QUADRANTS[1]
  if (isUrgent && !isImportant) return EISENHOWER_QUADRANTS[2]
  return EISENHOWER_QUADRANTS[3]
}

