<script setup lang="ts">
import { computed, ref } from 'vue'
import { ChevronLeft, ChevronRight, CalendarOff } from 'lucide-vue-next'
import PriorityBadge from '@/components/PriorityBadge.vue'
import TaskComposer from '@/components/TaskComposer.vue'
import { toISODate, isOverdue } from '@/lib/dates'
import { useWorkspaceStore } from '@/stores/workspace'
import type { Task } from '@/types'

const workspace = useWorkspaceStore()

const currentYear = ref(new Date().getFullYear())
const currentMonth = ref(new Date().getMonth())
const transitionDir = ref<'left' | 'right'>('right')
const gridKey = ref(0)

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

const monthLabel = computed(() => {
  const d = new Date(currentYear.value, currentMonth.value, 1)
  const txt = d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
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
}

const calendarDays = computed<CalendarDay[]>(() => {
  const year = currentYear.value
  const month = currentMonth.value
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)

  // Monday-based: 0=Mon ... 6=Sun
  let startWeekday = firstDay.getDay() - 1
  if (startWeekday < 0) startWeekday = 6

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
        <h1 class="text-3xl font-semibold tracking-tight">Calendario</h1>
        <p class="mt-1 text-sm text-muted">Visualiza tus tareas organizadas por fecha de vencimiento.</p>
      </div>
      <TaskComposer @created="open" />
    </div>

    <!-- Month navigation -->
    <div class="mb-4 flex items-center gap-3">
      <div class="flex items-center gap-1">
        <button
          class="grid size-8 cursor-pointer place-items-center rounded-lg border border-line bg-surface text-muted transition hover:bg-canvas hover:text-ink"
          title="Mes anterior"
          @click="prevMonth"
        >
          <ChevronLeft class="size-4" />
        </button>
        <button
          class="grid size-8 cursor-pointer place-items-center rounded-lg border border-line bg-surface text-muted transition hover:bg-canvas hover:text-ink"
          title="Mes siguiente"
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
        Hoy
      </button>

      <div class="ml-auto flex items-center gap-2 text-xs text-muted">
        <CalendarOff class="size-3.5" />
        <span>{{ unscheduledCount }} sin fecha</span>
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
            <!-- Day number -->
            <div class="mb-0.5 flex items-center justify-between">
              <span
                class="inline-flex size-6 items-center justify-center rounded-full text-xs font-medium"
                :class="cell.isToday ? 'bg-accent text-white font-bold' : 'text-ink/70'"
              >
                {{ cell.day }}
              </span>
              <span
                v-if="cell.tasks.length > 0"
                class="text-[10px] font-medium text-muted"
              >
                {{ cell.tasks.length }}
              </span>
            </div>

            <!-- Tasks -->
            <div class="flex-1 space-y-0.5 overflow-y-auto scrollbar-thin">
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
                  :title="`Asignado a: ${task.assignee.fullName}`"
                >
                  {{ getInitials(task.assignee.fullName) }}
                </span>
              </button>
              <p
                v-if="cell.tasks.length > 4"
                class="px-1.5 text-[10px] font-medium text-muted"
              >
                +{{ cell.tasks.length - 4 }} más
              </p>
            </div>
          </div>
        </div>
      </Transition>
    </div>
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
