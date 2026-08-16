import { t, intlLocale } from '@/i18n'

function getDateFmt() {
  return new Intl.DateTimeFormat(intlLocale.value, {
    day: 'numeric',
    month: 'short',
  })
}

function getDateFullFmt() {
  return new Intl.DateTimeFormat(intlLocale.value, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function getDateTimeFmt() {
  return new Intl.DateTimeFormat(intlLocale.value, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getWeekdayFmt() {
  return new Intl.DateTimeFormat(intlLocale.value, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

export function parseDate(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-').map(Number)
    return new Date(y, m - 1, d)
  }
  return new Date(value)
}

export function toISODate(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function todayISO() {
  return toISODate(new Date())
}

export function addDaysISO(days: number, from = new Date()) {
  const d = new Date(from)
  d.setDate(d.getDate() + days)
  return toISODate(d)
}

export function formatDate(value: string | null | undefined) {
  if (!value) return t('dates.noDate')
  return getDateFmt().format(parseDate(value))
}

export function formatDateFull(value: string) {
  return getDateFullFmt().format(parseDate(value))
}

export function formatDateTime(value: string) {
  return getDateTimeFmt().format(new Date(value))
}

export function formatGreetingDate() {
  const text = getWeekdayFmt().format(new Date())
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export function daysFromToday(value: string) {
  const due = startOfDay(parseDate(value))
  const now = startOfDay(new Date())
  return Math.round((due.getTime() - now.getTime()) / 86_400_000)
}

export function dueLabel(value: string | null | undefined) {
  if (!value) return t('dates.noDate')
  const diff = daysFromToday(value)
  if (diff === 0) return t('dates.today')
  if (diff === 1) return t('dates.tomorrow')
  if (diff === -1) return t('dates.yesterday')
  if (diff < 0) return `${t('dates.overdue')} · ${formatDate(value)}`
  if (diff <= 7) return t('dates.inDays', { n: diff })
  return formatDate(value)
}

export function formatDateRange(startDate: string | null | undefined, dueDate: string | null | undefined) {
  if (startDate && dueDate) {
    return `${formatDate(startDate)} – ${formatDate(dueDate)}`
  }
  if (startDate) return `${t('dates.start')}: ${formatDate(startDate)}`
  if (dueDate) return `${t('dates.due')}: ${formatDate(dueDate)}`
  return t('dates.noDate')
}

export function isOverdue(value: string | null | undefined, status?: string) {
  if (!value || status === 'done') return false
  return daysFromToday(value) < 0
}

export function isDueSoon(value: string | null | undefined, status?: string) {
  if (!value || status === 'done') return false
  const diff = daysFromToday(value)
  return diff >= 0 && diff <= 7
}

export function startOfWeekISO() {
  const now = new Date()
  const day = now.getDay() || 7
  const monday = new Date(now)
  monday.setDate(now.getDate() - day + 1)
  return toISODate(monday)
}
