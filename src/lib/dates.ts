const dateFmt = new Intl.DateTimeFormat('es-ES', {
  day: 'numeric',
  month: 'short',
})

const dateFullFmt = new Intl.DateTimeFormat('es-ES', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

const dateTimeFmt = new Intl.DateTimeFormat('es-ES', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})

const weekdayFmt = new Intl.DateTimeFormat('es-ES', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})

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
  if (!value) return 'Sin fecha'
  return dateFmt.format(parseDate(value))
}

export function formatDateFull(value: string) {
  return dateFullFmt.format(parseDate(value))
}

export function formatDateTime(value: string) {
  return dateTimeFmt.format(new Date(value))
}

export function formatGreetingDate() {
  const text = weekdayFmt.format(new Date())
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export function daysFromToday(value: string) {
  const due = startOfDay(parseDate(value))
  const now = startOfDay(new Date())
  return Math.round((due.getTime() - now.getTime()) / 86_400_000)
}

export function dueLabel(value: string | null | undefined) {
  if (!value) return 'Sin fecha'
  const diff = daysFromToday(value)
  if (diff === 0) return 'Hoy'
  if (diff === 1) return 'Mañana'
  if (diff === -1) return 'Ayer'
  if (diff < 0) return `Vencida · ${formatDate(value)}`
  if (diff <= 7) return `En ${diff} días`
  return formatDate(value)
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
