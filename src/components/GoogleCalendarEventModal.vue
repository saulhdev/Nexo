<script setup lang="ts">
import { Calendar, Clock, Info, MapPin, X } from '@lucide/vue'
import { useI18n } from '@/i18n'
import { formatDate } from '@/lib/dates'
import type { GoogleCalendarEvent } from '@/services/googleCalendar'

defineProps<{
  event: GoogleCalendarEvent | null
}>()

const emit = defineEmits<{ close: [] }>()
const { t } = useI18n()

function formatEventSchedule(evt: GoogleCalendarEvent) {
  const start = formatDate(evt.startDate)
  if (evt.isAllDay) {
    if (evt.endDate && evt.endDate !== evt.startDate) {
      return `${start} – ${formatDate(evt.endDate)} (${t('gcal.allDay')})`
    }
    return `${start} (${t('gcal.allDay')})`
  }

  const startTime = evt.startTime || ''
  const endTime = evt.endTime || ''
  if (startTime && endTime) {
    return `${start} · ${startTime} - ${endTime}`
  }
  if (startTime) {
    return `${start} · ${startTime}`
  }
  return start
}
</script>

<template>
  <Teleport to="body">
    <div v-if="event" class="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4 backdrop-blur-xs" @click.self="emit('close')">
      <div class="w-full max-w-lg rounded-2xl border border-line bg-surface p-6 shadow-2xl">
        <header class="flex items-start justify-between gap-3 border-b border-line pb-4">
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2 mb-1.5">
              <span class="inline-flex items-center gap-1 rounded-md bg-[#4285F4]/10 px-2 py-0.5 text-[11px] font-bold text-[#4285F4]">
                <Calendar class="size-3" />
                {{ t('gcal.badge') }}
              </span>
            </div>
            <h2 class="text-xl font-semibold text-ink leading-snug">{{ event.title }}</h2>
          </div>
          <button
            type="button"
            class="rounded-lg p-1.5 text-muted hover:bg-canvas hover:text-ink cursor-pointer shrink-0"
            @click="emit('close')"
          >
            <X class="size-5" />
          </button>
        </header>

        <div class="mt-5 space-y-4 text-sm">
          <!-- Schedule -->
          <div class="flex items-start gap-3 rounded-xl bg-canvas p-3">
            <Clock class="size-4 shrink-0 text-[#4285F4] mt-0.5" />
            <div>
              <p class="text-xs font-semibold text-muted uppercase tracking-wider">{{ t('gcal.schedule') }}</p>
              <p class="mt-0.5 font-medium text-ink">{{ formatEventSchedule(event) }}</p>
            </div>
          </div>

          <!-- Location -->
          <div v-if="event.location" class="flex items-start gap-3 rounded-xl bg-canvas p-3">
            <MapPin class="size-4 shrink-0 text-amber-600 mt-0.5" />
            <div>
              <p class="text-xs font-semibold text-muted uppercase tracking-wider">{{ t('gcal.location') }}</p>
              <p class="mt-0.5 font-medium text-ink">{{ event.location }}</p>
            </div>
          </div>

          <!-- Description -->
          <div v-if="event.description" class="rounded-xl border border-line p-3.5">
            <p class="text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">{{ t('drawer.description') }}</p>
            <p class="whitespace-pre-wrap text-xs text-ink/90 leading-relaxed max-h-48 overflow-y-auto scrollbar-thin">
              {{ event.description }}
            </p>
          </div>

          <!-- Notice -->
          <div class="flex items-center gap-2 rounded-xl bg-canvas/60 p-3 text-xs text-muted">
            <Info class="size-4 shrink-0 text-[#4285F4]" />
            <span>{{ t('gcal.readOnlyNote') }}</span>
          </div>
        </div>

        <div class="mt-6 flex justify-end border-t border-line pt-4">
          <button
            type="button"
            class="rounded-xl bg-canvas px-4 py-2 text-sm font-semibold text-ink hover:bg-line/40 transition cursor-pointer"
            @click="emit('close')"
          >
            {{ t('common.close') }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
