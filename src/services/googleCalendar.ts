export interface GoogleCalendarEvent {
  id: string
  title: string
  description?: string
  location?: string
  startDate: string // YYYY-MM-DD
  startTime?: string // HH:mm
  endDate: string // YYYY-MM-DD
  endTime?: string // HH:mm
  isAllDay: boolean
  status?: string
}

/**
 * Normalizes iCal date string (e.g. 20260815T143000Z or 20260815)
 */
function parseICalDate(val: string): { dateStr: string; timeStr?: string; isAllDay: boolean } {
  // Clean parameter prefixes if any (e.g., VALUE=DATE:20260815)
  const cleanVal = val.includes(':') ? val.split(':').pop()! : val
  const match = cleanVal.trim().match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?/)

  if (!match) {
    return { dateStr: '', isAllDay: true }
  }

  const [, year, month, day, hours, minutes, , isUtc] = match
  const dateStr = `${year}-${month}-${day}`

  if (!hours || !minutes) {
    return { dateStr, isAllDay: true }
  }

  if (isUtc) {
    // Convert UTC to local time
    const d = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hours), Number(minutes)))
    const localYear = d.getFullYear()
    const localMonth = String(d.getMonth() + 1).padStart(2, '0')
    const localDay = String(d.getDate()).padStart(2, '0')
    const localHours = String(d.getHours()).padStart(2, '0')
    const localMins = String(d.getMinutes()).padStart(2, '0')
    return {
      dateStr: `${localYear}-${localMonth}-${localDay}`,
      timeStr: `${localHours}:${localMins}`,
      isAllDay: false,
    }
  }

  return {
    dateStr,
    timeStr: `${hours}:${minutes}`,
    isAllDay: false,
  }
}

/**
 * Unescapes iCalendar text values (commas, newlines, semicolons)
 */
function unescapeICalText(text: string): string {
  return text
    .replace(/\\n/g, '\n')
    .replace(/\\N/g, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\')
}

/**
 * Parses raw iCalendar (.ics) string content into GoogleCalendarEvent objects
 */
export function parseICalendar(icsContent: string): GoogleCalendarEvent[] {
  const events: GoogleCalendarEvent[] = []

  // Unfold folded lines (RFC 5545: lines starting with space or tab continue previous line)
  const unfolded = icsContent.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '')
  const lines = unfolded.split(/\r?\n/)

  let inEvent = false
  let currentEvent: Partial<GoogleCalendarEvent> = {}

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) continue

    if (line === 'BEGIN:VEVENT') {
      inEvent = true
      currentEvent = { id: `gcal-${Math.random().toString(36).slice(2, 9)}` }
      continue
    }

    if (line === 'END:VEVENT') {
      if (inEvent && currentEvent.title && currentEvent.startDate) {
        events.push({
          id: currentEvent.id || `gcal-${Date.now()}-${Math.random()}`,
          title: currentEvent.title,
          description: currentEvent.description || '',
          location: currentEvent.location || '',
          startDate: currentEvent.startDate,
          startTime: currentEvent.startTime,
          endDate: currentEvent.endDate || currentEvent.startDate,
          endTime: currentEvent.endTime,
          isAllDay: currentEvent.isAllDay ?? true,
          status: currentEvent.status,
        })
      }
      inEvent = false
      currentEvent = {}
      continue
    }

    if (!inEvent) continue

    // Property line parse: NAME;PARAMS:VALUE or NAME:VALUE
    const colonIndex = line.indexOf(':')
    if (colonIndex === -1) continue

    const propHeader = line.substring(0, colonIndex).toUpperCase()
    const propValue = line.substring(colonIndex + 1)
    const propName = propHeader.split(';')[0]

    switch (propName) {
      case 'UID':
        currentEvent.id = `gcal-${propValue}`
        break
      case 'SUMMARY':
        currentEvent.title = unescapeICalText(propValue)
        break
      case 'DESCRIPTION':
        currentEvent.description = unescapeICalText(propValue)
        break
      case 'LOCATION':
        currentEvent.location = unescapeICalText(propValue)
        break
      case 'STATUS':
        currentEvent.status = propValue
        break
      case 'DTSTART': {
        const parsed = parseICalDate(line)
        currentEvent.startDate = parsed.dateStr
        currentEvent.startTime = parsed.timeStr
        currentEvent.isAllDay = parsed.isAllDay
        break
      }
      case 'DTEND': {
        const parsed = parseICalDate(line)
        currentEvent.endDate = parsed.dateStr
        currentEvent.endTime = parsed.timeStr
        break
      }
    }
  }

  return events
}

/**
 * Fetches a Google Calendar iCal feed URL with CORS fallback strategy
 */
export async function fetchGoogleCalendarFeed(url: string): Promise<GoogleCalendarEvent[]> {
  // Normalize webcal:// to https://
  let httpUrl = url.trim()
  if (httpUrl.startsWith('webcal://')) {
    httpUrl = 'https://' + httpUrl.slice(9)
  }

  let textData = ''

  // Attempt 1: Direct fetch
  try {
    const res = await fetch(httpUrl, { cache: 'no-store' })
    if (res.ok) {
      textData = await res.text()
    }
  } catch {
    // Direct fetch failed (likely CORS restriction on Google domain)
  }

  // Attempt 2: CORS Proxy fallback if direct fetch was blocked
  if (!textData || !textData.includes('BEGIN:VCALENDAR')) {
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(httpUrl)}`
    const res = await fetch(proxyUrl)
    if (!res.ok) {
      throw new Error(`No se pudo descargar el calendario de Google (Error ${res.status}).`)
    }
    textData = await res.text()
  }

  if (!textData.includes('BEGIN:VCALENDAR')) {
    throw new Error('El enlace proporcionado no contiene un formato de calendario iCal / ICS válido.')
  }

  return parseICalendar(textData)
}
