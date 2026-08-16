import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { fetchM365CalendarFeed, type M365Event } from '@/services/m365'

const STORAGE_FEED_KEY = 'nexo_m365_feed_url'
const STORAGE_ENABLED_KEY = 'nexo_m365_enabled'
const STORAGE_EVENTS_KEY = 'nexo_m365_events_cache'
const STORAGE_LAST_SYNC_KEY = 'nexo_m365_last_sync'

function loadCachedEvents(): M365Event[] {
  try {
    const cached = localStorage.getItem(STORAGE_EVENTS_KEY)
    return cached ? JSON.parse(cached) : []
  } catch {
    return []
  }
}

export const useM365CalendarStore = defineStore('m365Calendar', () => {
  const feedUrl = ref<string>(localStorage.getItem(STORAGE_FEED_KEY) || '')
  const enabled = ref<boolean>(localStorage.getItem(STORAGE_ENABLED_KEY) !== 'false')
  const lastSync = ref<string | null>(localStorage.getItem(STORAGE_LAST_SYNC_KEY))
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Cached events for instant load
  const events = ref<M365Event[]>(loadCachedEvents())

  const isConfigured = computed(() => feedUrl.value.trim().length > 0)
  const eventCount = computed(() => events.value.length)

  /**
   * Events mapped by date string (YYYY-MM-DD) for fast lookup in CalendarView
   */
  const eventsByDate = computed(() => {
    const map = new Map<string, M365Event[]>()
    if (!enabled.value) return map

    for (const evt of events.value) {
      if (!evt.startDate) continue
      const key = evt.startDate.slice(0, 10)
      if (!map.has(key)) {
        map.set(key, [])
      }
      map.get(key)!.push(evt)
    }
    return map
  })

  async function sync(): Promise<void> {
    if (!feedUrl.value.trim()) return
    loading.value = true
    error.value = null

    try {
      const parsed = await fetchM365CalendarFeed(feedUrl.value)
      events.value = parsed
      lastSync.value = new Date().toISOString()

      localStorage.setItem(STORAGE_EVENTS_KEY, JSON.stringify(parsed))
      localStorage.setItem(STORAGE_LAST_SYNC_KEY, lastSync.value)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al sincronizar el calendario de Microsoft 365'
      error.value = msg
      throw err
    } finally {
      loading.value = false
    }
  }

  function setFeedUrl(url: string) {
    feedUrl.value = url.trim()
    localStorage.setItem(STORAGE_FEED_KEY, feedUrl.value)
  }

  function toggleEnabled() {
    enabled.value = !enabled.value
    localStorage.setItem(STORAGE_ENABLED_KEY, String(enabled.value))
  }

  function clear() {
    feedUrl.value = ''
    events.value = []
    lastSync.value = null
    error.value = null
    localStorage.removeItem(STORAGE_FEED_KEY)
    localStorage.removeItem(STORAGE_EVENTS_KEY)
    localStorage.removeItem(STORAGE_LAST_SYNC_KEY)
  }

  // Auto sync on start if configured
  if (feedUrl.value && events.value.length === 0) {
    void sync()
  }

  return {
    feedUrl,
    enabled,
    events,
    loading,
    error,
    lastSync,
    isConfigured,
    eventCount,
    eventsByDate,
    sync,
    setFeedUrl,
    toggleEnabled,
    clear,
  }
})
