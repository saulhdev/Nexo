<script setup lang="ts">
import { computed, ref } from 'vue'
import { Calendar as CalendarIcon, CalendarOff, ChevronLeft, ChevronRight, Eye, EyeOff, RefreshCw, Settings } from '@lucide/vue'
import GoogleCalendarEventModal from '@/components/GoogleCalendarEventModal.vue'
import GoogleCalendarSettingsModal from '@/components/GoogleCalendarSettingsModal.vue'
import M365EventModal from '@/components/M365EventModal.vue'
import M365SettingsModal from '@/components/M365SettingsModal.vue'
import TaskComposer from '@/components/TaskComposer.vue'
import { useI18n } from '@/i18n'
import { isOverdue, toISODate } from '@/lib/dates'
import type { GoogleCalendarEvent } from '@/services/googleCalendar'
import type { M365Event } from '@/services/m365'
import { useGoogleCalendarStore } from '@/stores/googleCalendar'
import { useM365CalendarStore } from '@/stores/m365Calendar'
import { useWorkspaceStore } from '@/stores/workspace'
import type { Task } from '@/types'

const { t, tArray, locale } = useI18n()
const workspace = useWorkspaceStore()
const m365 = useM365CalendarStore()
const gcal = useGoogleCalendarStore()

const currentYear = ref(new Date().getFullYear())
const currentMonth = ref(new Date().getMonth())
const transitionDir = ref<'left' | 'right'>('right')
const gridKey = ref(0)

const settingsOpen = ref(false)
const gcalSettingsOpen = ref(false)
const selectedM365Event = ref<M365Event | null>(null)
const selectedGCalEvent = ref<GoogleCalendarEvent | null>(null)

const WEEKDAYS = computed(() => tArray('calendar.weekdays'))

const monthLabel = computed(() => {
  const d = new Date(currentYear.value, currentMonth.value, 1)
  const intlLocale = locale.value === 'en' ? 'en-US' : 'es-ES'
  const txt = d.toLocaleDateString(intlLocale, { month: 'long', year: 'numeric' })
  return txt.charAt(0).toUpperCase() + txt.slice(1)
})

const isCurrentMonth = computed(() => {
  const now = new Date()
  return now.getFullYear() === currentYear.value && now.getMonth() === currentMonth.value
})

interface CalendarDay {
  date: Date
  iso: string
  day: number
  inMonth: boolean
  isToday: boolean
  tasks: Task[]
  m365Events: M365Event[]
  gcalEvents: GoogleCalendarEvent[]
}

const calendarDays = computed<CalendarDay[]>(() => {
  const year = currentYear.value
  const month = currentMonth.value
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)

  // Sunday-based: 0=Sun ... 6=Sat
  const startWeekday = firstDay.getDay()

  const totalCells = Math.ceil((startWeekday + lastDay.getDate()) / 7) * 7
  const today = toISODate(new Date())

  const tasksByDate = new Map<string, Task[]>()
  for (const task of workspace.filteredTasks) {
    if (task.dueDate) {
      const key = task.dueDate.slice(0, 10)
      if (!tasksByDate.has(key)) tasksByDate.set(key, [])
      tasksByDate.get(key)!.push(task)
    }
  }

  const days: CalendarDay[] = []
  for (let i = 0; i < totalCells; i++) {
    const date = new Date(year, month, 1 - startWeekday + i)
    const iso = toISODate(date)
    days.push({
      date,
      iso,
      day: date.getDate(),
      inMonth: date.getMonth() === month,
      isToday: iso === today,
      tasks: tasksByDate.get(iso) ?? [],
      m365Events: m365.eventsByDate.get(iso) ?? [],
      gcalEvents: gcal.eventsByDate.get(iso) ?? [],
    })
  }
  return days
})

const unscheduledCount = computed(() =>
  workspace.filteredTasks.filter((t) => !t.dueDate && !t.startDate).length,
)

function prevMonth() {
  transitionDir.value = 'left'
  if (currentMonth.value === 0) {
    currentMonth.value = 11
    currentYear.value -= 1
  } else {
    currentMonth.value -= 1
  }
  gridKey.value++
}

function nextMonth() {
  transitionDir.value = 'right'
  if (currentMonth.value === 11) {
    currentMonth.value = 0
    currentYear.value += 1
  } else {
    currentMonth.value += 1
  }
  gridKey.value++
}

function goToday() {
  const now = new Date()
  transitionDir.value = now.getMonth() >= currentMonth.value ? 'right' : 'left'
  currentYear.value = now.getFullYear()
  currentMonth.value = now.getMonth()
  gridKey.value++
}

function open(id: string) {
  void workspace.openTask(id)
}

function openM365(event: M365Event) {
  selectedM365Event.value = event
}

function openGCal(event: GoogleCalendarEvent) {
  selectedGCalEvent.value = event
}

function getInitials(name?: string) {
  if (!name) return '?'
  return name
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}
</script>

<template>
  <div class="flex h-[calc(100vh-5.5rem)] flex-col">
    <!-- Header -->
    <div class="mb-5 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="text-3xl font-semibold tracking-tight">{{ t('calendar.title') }}</h1>
        <p class="mt-1 text-sm text-muted">{{ t('calendar.subtitle') }}</p>
      </div>

      <div class="flex flex-wrap items-center gap-2.5">
        <!-- Google Calendar Control Bar -->
        <div class="flex items-center gap-1 rounded-xl border border-line bg-surface p-1 shadow-xs">
          <button
            type="button"
            class="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition cursor-pointer"
            :class="gcal.isConfigured ? 'bg-[#4285F4]/10 text-[#4285F4] hover:bg-[#4285F4]/20' : 'text-muted hover:text-ink hover:bg-canvas'"
            :title="t('gcal.modalTitle')"
            @click="gcalSettingsOpen = true"
          >
            <CalendarIcon class="size-3.5" />
            <span>{{ t('gcal.button') }}</span>
            <span v-if="gcal.isConfigured" class="ml-0.5 rounded-full bg-[#4285F4] px-1.5 py-0.2 text-[9px] font-bold text-white">
              {{ gcal.events.length }}
            </span>
          </button>

          <button
            v-if="gcal.isConfigured"
            type="button"
            class="rounded-lg p-1 text-muted hover:bg-canvas hover:text-ink transition cursor-pointer"
            :title="gcal.enabled ? t('gcal.toggle') : t('gcal.toggle')"
            @click="gcal.toggleEnabled"
          >
            <Eye v-if="gcal.enabled" class="size-3.5 text-[#4285F4]" />
            <EyeOff v-else class="size-3.5" />
          </button>

          <button
            v-if="gcal.isConfigured"
            type="button"
            class="rounded-lg p-1 text-muted hover:bg-canvas hover:text-ink transition cursor-pointer"
            :disabled="gcal.loading"
            :title="t('gcal.syncNow')"
            @click="gcal.sync"
          >
            <RefreshCw class="size-3.5" :class="gcal.loading && 'animate-spin text-[#4285F4]'" />
          </button>

          <button
            type="button"
            class="rounded-lg p-1 text-muted hover:bg-canvas hover:text-ink transition cursor-pointer"
            :title="t('gcal.modalTitle')"
            @click="gcalSettingsOpen = true"
          >
            <Settings class="size-3.5" />
          </button>
        </div>

        <!-- Microsoft 365 Control Bar -->
        <div class="flex items-center gap-1 rounded-xl border border-line bg-surface p-1 shadow-xs">
          <button
            type="button"
            class="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition cursor-pointer"
            :class="m365.isConfigured ? 'bg-[#0078D4]/10 text-[#0078D4] hover:bg-[#0078D4]/20' : 'text-muted hover:text-ink hover:bg-canvas'"
            :title="t('m365.modalTitle')"
            @click="settingsOpen = true"
          >
            <CalendarIcon class="size-3.5" />
            <span>{{ t('m365.button') }}</span>
            <span v-if="m365.isConfigured" class="ml-0.5 rounded-full bg-[#0078D4] px-1.5 py-0.2 text-[9px] font-bold text-white">
              {{ m365.events.length }}
            </span>
          </button>

          <button
            v-if="m365.isConfigured"
            type="button"
            class="rounded-lg p-1 text-muted hover:bg-canvas hover:text-ink transition cursor-pointer"
            :title="m365.enabled ? t('m365.toggle') : t('m365.toggle')"
            @click="m365.toggleEnabled"
          >
            <Eye v-if="m365.enabled" class="size-3.5 text-[#0078D4]" />
            <EyeOff v-else class="size-3.5" />
          </button>

          <button
            v-if="m365.isConfigured"
            type="button"
            class="rounded-lg p-1 text-muted hover:bg-canvas hover:text-ink transition cursor-pointer"
            :disabled="m365.loading"
            :title="t('m365.syncNow')"
            @click="m365.sync"
          >
            <RefreshCw class="size-3.5" :class="m365.loading && 'animate-spin text-[#0078D4]'" />
          </button>

          <button
            type="button"
            class="rounded-lg p-1 text-muted hover:bg-canvas hover:text-ink transition cursor-pointer"
            :title="t('m365.modalTitle')"
            @click="settingsOpen = true"
          >
            <Settings class="size-3.5" />
          </button>
        </div>

        <TaskComposer @created="open" />
      </div>
    </div>

    <!-- Month navigation -->
    <div class="mb-4 flex items-center gap-3">
      <div class="flex items-center gap-1">
        <button
          class="grid size-8 cursor-pointer place-items-center rounded-lg border border-line bg-surface text-muted transition hover:bg-canvas hover:text-ink"
          :title="t('calendar.prevMonth')"
          @click="prevMonth"
        >
          <ChevronLeft class="size-4" />
        </button>
        <button
          class="grid size-8 cursor-pointer place-items-center rounded-lg border border-line bg-surface text-muted transition hover:bg-canvas hover:text-ink"
          :title="t('calendar.nextMonth')"
          @click="nextMonth"
        >
          <ChevronRight class="size-4" />
        </button>
      </div>

      <h2 class="text-lg font-semibold tracking-tight select-none">{{ monthLabel }}</h2>

      <button
        v-if="!isCurrentMonth"
        class="ml-1 cursor-pointer rounded-lg border border-line bg-surface px-2.5 py-1 text-xs font-medium text-muted transition hover:bg-canvas hover:text-ink"
        @click="goToday"
      >
        {{ t('calendar.today') }}
      </button>

      <div class="ml-auto flex items-center gap-2 text-xs text-muted">
        <CalendarOff class="size-3.5" />
        <span>{{ unscheduledCount }} {{ t('calendar.unscheduled') }}</span>
      </div>
    </div>

    <!-- Calendar grid -->
    <div class="min-h-0 flex-1 overflow-hidden rounded-2xl border border-line bg-surface/80">
      <!-- Weekday header -->
      <div class="grid grid-cols-7 border-b border-line bg-canvas/60">
        <div
          v-for="wd in WEEKDAYS"
          :key="wd"
          class="px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-widest text-muted"
        >
          {{ wd }}
        </div>
      </div>

      <!-- Days grid -->
      <Transition :name="transitionDir === 'right' ? 'cal-slide-right' : 'cal-slide-left'" mode="out-in">
        <div
          :key="gridKey"
          class="grid grid-cols-7"
          :class="calendarDays.length > 35 ? 'grid-rows-6' : 'grid-rows-5'"
          :style="{ height: 'calc(100% - 34px)' }"
        >
          <div
            v-for="(cell, idx) in calendarDays"
            :key="cell.iso"
            class="calendar-cell group relative flex flex-col border-b border-r border-line/50 px-1.5 py-1 transition-colors"
            :class="{
              'bg-accent/[0.04]': cell.isToday,
              'opacity-40': !cell.inMonth,
              'border-r-0': (idx + 1) % 7 === 0,
            }"
          >
            <!-- Day number & item counter -->
            <div class="mb-0.5 flex items-center justify-between">
              <span
                class="inline-flex size-6 items-center justify-center rounded-full text-xs font-medium"
                :class="cell.isToday ? 'bg-accent text-white font-bold' : 'text-ink/70'"
              >
                {{ cell.day }}
              </span>
              <span
                v-if="(cell.tasks.length + cell.m365Events.length + cell.gcalEvents.length) > 0"
                class="text-[10px] font-medium text-muted"
              >
                {{ cell.tasks.length + cell.m365Events.length + cell.gcalEvents.length }}
              </span>
            </div>

            <!-- Items: Google Calendar Events + Microsoft 365 Events + Native tasks -->
            <div class="flex-1 space-y-0.5 overflow-y-auto scrollbar-thin">
              <!-- Google Calendar Events -->
              <button
                v-for="gEvent in cell.gcalEvents"
                :key="gEvent.id"
                class="group/gcal flex w-full cursor-pointer items-center gap-1 rounded-md bg-[#4285F4]/10 hover:bg-[#4285F4]/20 border border-[#4285F4]/25 px-1.5 py-[3px] text-left transition"
                :title="`Google Calendar: ${gEvent.title}${gEvent.startTime ? ` (${gEvent.startTime})` : ''}`"
                @click="openGCal(gEvent)"
              >
                <span class="size-1.5 shrink-0 rounded-full bg-[#4285F4]" />
                <span class="min-w-0 flex-1 truncate text-[11px] font-medium leading-tight text-[#4285F4]">
                  {{ gEvent.title }}
                </span>
                <span v-if="gEvent.startTime" class="text-[9px] font-semibold text-[#4285F4]/70 shrink-0">
                  {{ gEvent.startTime }}
                </span>
              </button>

              <!-- Microsoft 365 Events -->
              <button
                v-for="mEvent in cell.m365Events"
                :key="mEvent.id"
                class="group/m365 flex w-full cursor-pointer items-center gap-1 rounded-md bg-[#0078D4]/10 hover:bg-[#0078D4]/20 border border-[#0078D4]/25 px-1.5 py-[3px] text-left transition"
                :title="`Microsoft 365: ${mEvent.title}${mEvent.startTime ? ` (${mEvent.startTime})` : ''}`"
                @click="openM365(mEvent)"
              >
                <span class="size-1.5 shrink-0 rounded-full bg-[#0078D4]" />
                <span class="min-w-0 flex-1 truncate text-[11px] font-medium leading-tight text-[#0078D4]">
                  {{ mEvent.title }}
                </span>
                <span v-if="mEvent.startTime" class="text-[9px] font-semibold text-[#0078D4]/70 shrink-0">
                  {{ mEvent.startTime }}
                </span>
              </button>

              <!-- Nexo Tasks -->
              <button
                v-for="task in cell.tasks.slice(0, 4)"
                :key="task.id"
                class="group/task flex w-full cursor-pointer items-center gap-1 rounded-md px-1.5 py-[3px] text-left transition hover:bg-accent/10"
                :class="isOverdue(task.dueDate, task.status) && 'ring-1 ring-rose-400/40'"
                @click="open(task.id)"
              >
                <span
                  class="size-1.5 shrink-0 rounded-full"
                  :style="{ background: task.project?.color ?? '#94a3b8' }"
                />
                <span class="min-w-0 flex-1 truncate text-[11px] leading-tight group-hover/task:text-accent transition">
                  {{ task.title }}
                </span>
                <span
                  v-if="task.assignee"
                  class="flex size-4 shrink-0 items-center justify-center rounded-full bg-accent/15 text-[8px] font-bold text-accent"
                  :title="`${t('board.assignedTo')}: ${task.assignee.fullName}`"
                >
                  {{ getInitials(task.assignee.fullName) }}
                </span>
              </button>

              <p
                v-if="(cell.tasks.length + cell.m365Events.length + cell.gcalEvents.length) > 4"
                class="px-1.5 text-[10px] font-medium text-muted"
              >
                +{{ (cell.tasks.length + cell.m365Events.length + cell.gcalEvents.length) - 4 }} {{ t('calendar.more') }}
              </p>
            </div>
          </div>
        </div>
      </Transition>
    </div>

    <!-- Modals -->
    <GoogleCalendarSettingsModal v-model:open="gcalSettingsOpen" />
    <GoogleCalendarEventModal :event="selectedGCalEvent" @close="selectedGCalEvent = null" />

    <M365SettingsModal v-model:open="settingsOpen" />
    <M365EventModal :event="selectedM365Event" @close="selectedM365Event = null" />
  </div>
</template>

<style scoped>
.calendar-cell {
  min-height: 0;
}

/* Slide right (next month) */
.cal-slide-right-enter-active,
.cal-slide-right-leave-active {
  transition: transform 220ms cubic-bezier(0.22, 1, 0.36, 1), opacity 220ms ease;
}
.cal-slide-right-enter-from {
  transform: translateX(16px);
  opacity: 0;
}
.cal-slide-right-leave-to {
  transform: translateX(-16px);
  opacity: 0;
}

/* Slide left (previous month) */
.cal-slide-left-enter-active,
.cal-slide-left-leave-active {
  transition: transform 220ms cubic-bezier(0.22, 1, 0.36, 1), opacity 220ms ease;
}
.cal-slide-left-enter-from {
  transform: translateX(-16px);
  opacity: 0;
}
.cal-slide-left-leave-to {
  transform: translateX(16px);
  opacity: 0;
}
</style>
