import { t } from '@/i18n'
import type { TaskPriority, TaskStatus } from '@/types'

export const APP_NAME = 'Nexo'

export interface StatusDef {
  id: TaskStatus
  labelKey: string
  hintKey: string
  tone: string
}

const STATUS_DEFS: StatusDef[] = [
  { id: 'todo', labelKey: 'status.todo', hintKey: 'status.todo.hint', tone: 'stone' },
  { id: 'in_progress', labelKey: 'status.in_progress', hintKey: 'status.in_progress.hint', tone: 'sky' },
  { id: 'in_review', labelKey: 'status.in_review', hintKey: 'status.in_review.hint', tone: 'amber' },
  { id: 'done', labelKey: 'status.done', hintKey: 'status.done.hint', tone: 'emerald' },
]

export interface PriorityDef {
  id: TaskPriority
  labelKey: string
  tone: string
}

const PRIORITY_DEFS: PriorityDef[] = [
  { id: 'low', labelKey: 'priority.low', tone: 'stone' },
  { id: 'medium', labelKey: 'priority.medium', tone: 'sky' },
  { id: 'high', labelKey: 'priority.high', tone: 'orange' },
  { id: 'urgent', labelKey: 'priority.urgent', tone: 'rose' },
]

export const STATUSES = STATUS_DEFS.map((s) => ({
  ...s,
  get label() { return t(s.labelKey) },
  get hint() { return t(s.hintKey) },
}))

export const PRIORITIES = PRIORITY_DEFS.map((p) => ({
  ...p,
  get label() { return t(p.labelKey) },
}))

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

export function statusLabel(id: TaskStatus): string {
  const s = STATUSES.find((s) => s.id === id)
  return s ? s.label : id
}

export function priorityLabel(id: TaskPriority): string {
  const p = PRIORITIES.find((p) => p.id === id)
  return p ? p.label : id
}

/** @deprecated Use statusLabel() instead — kept for backwards compat during migration */
export const STATUS_LABEL = new Proxy({} as Record<TaskStatus, string>, {
  get(_target, prop: string) {
    return statusLabel(prop as TaskStatus)
  },
})

/** @deprecated Use priorityLabel() instead — kept for backwards compat during migration */
export const PRIORITY_LABEL = new Proxy({} as Record<TaskPriority, string>, {
  get(_target, prop: string) {
    return priorityLabel(prop as TaskPriority)
  },
})

export function statusMeta(id: TaskStatus) {
  return STATUSES.find((s) => s.id === id) ?? STATUSES[0]
}

export function priorityMeta(id: TaskPriority) {
  return PRIORITIES.find((p) => p.id === id) ?? PRIORITIES[1]
}

export type EisenhowerQuadrantId = 'q1' | 'q2' | 'q3' | 'q4'

export interface EisenhowerQuadrant {
  id: EisenhowerQuadrantId
  nameKey: string
  actionKey: string
  descriptionKey: string
  isUrgent: boolean
  isImportant: boolean
  priority: TaskPriority
  tone: string
  bgClass: string
  borderClass: string
  textClass: string
  badgeClass: string
  headerBg: string
  get name(): string
  get action(): string
  get description(): string
}

export const EISENHOWER_QUADRANTS: EisenhowerQuadrant[] = [
  {
    id: 'q1',
    nameKey: 'eisenhower.q1.name',
    actionKey: 'eisenhower.q1.action',
    descriptionKey: 'eisenhower.q1.description',
    isUrgent: true,
    isImportant: true,
    priority: 'urgent',
    tone: 'rose',
    bgClass: 'bg-rose-500/5',
    borderClass: 'border-rose-500/25',
    textClass: 'text-rose-600',
    badgeClass: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
    headerBg: 'bg-rose-500/10 text-rose-700',
    get name() { return t(this.nameKey) },
    get action() { return t(this.actionKey) },
    get description() { return t(this.descriptionKey) },
  },
  {
    id: 'q2',
    nameKey: 'eisenhower.q2.name',
    actionKey: 'eisenhower.q2.action',
    descriptionKey: 'eisenhower.q2.description',
    isUrgent: false,
    isImportant: true,
    priority: 'high',
    tone: 'orange',
    bgClass: 'bg-amber-500/5',
    borderClass: 'border-amber-500/25',
    textClass: 'text-amber-600',
    badgeClass: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    headerBg: 'bg-amber-500/10 text-amber-700',
    get name() { return t(this.nameKey) },
    get action() { return t(this.actionKey) },
    get description() { return t(this.descriptionKey) },
  },
  {
    id: 'q3',
    nameKey: 'eisenhower.q3.name',
    actionKey: 'eisenhower.q3.action',
    descriptionKey: 'eisenhower.q3.description',
    isUrgent: true,
    isImportant: false,
    priority: 'medium',
    tone: 'sky',
    bgClass: 'bg-sky-500/5',
    borderClass: 'border-sky-500/25',
    textClass: 'text-sky-600',
    badgeClass: 'bg-sky-500/10 text-sky-600 border-sky-500/20',
    headerBg: 'bg-sky-500/10 text-sky-700',
    get name() { return t(this.nameKey) },
    get action() { return t(this.actionKey) },
    get description() { return t(this.descriptionKey) },
  },
  {
    id: 'q4',
    nameKey: 'eisenhower.q4.name',
    actionKey: 'eisenhower.q4.action',
    descriptionKey: 'eisenhower.q4.description',
    isUrgent: false,
    isImportant: false,
    priority: 'low',
    tone: 'stone',
    bgClass: 'bg-stone-500/5',
    borderClass: 'border-stone-500/25',
    textClass: 'text-stone-600',
    badgeClass: 'bg-stone-500/10 text-stone-600 border-stone-500/20',
    headerBg: 'bg-stone-500/10 text-stone-700',
    get name() { return t(this.nameKey) },
    get action() { return t(this.actionKey) },
    get description() { return t(this.descriptionKey) },
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
