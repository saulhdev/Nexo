<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { AlertTriangle, CheckCircle2, Clock3, ListTodo } from 'lucide-vue-next'
import ActivityItem from '@/components/ActivityItem.vue'
import PriorityBadge from '@/components/PriorityBadge.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import TaskComposer from '@/components/TaskComposer.vue'
import { PRIORITIES } from '@/constants'
import { useI18n } from '@/i18n'
import { formatDateRange, formatGreetingDate, isOverdue } from '@/lib/dates'
import { useAuthStore } from '@/stores/auth'
import { useWorkspaceStore } from '@/stores/workspace'

const { t } = useI18n()
const router = useRouter()
const auth = useAuthStore()
const workspace = useWorkspaceStore()

const firstName = computed(() => auth.user?.fullName.split(' ')[0] ?? t('dashboard.greeting').toLowerCase())
const maxPriority = computed(() => Math.max(1, ...Object.values(workspace.stats.byPriority)))
const statusCounts = computed(() => [
  { id: 'todo', label: t('status.todo'), value: workspace.stats.todo },
  { id: 'in_progress', label: t('status.in_progress'), value: workspace.stats.inProgress },
  { id: 'in_review', label: t('status.in_review'), value: workspace.stats.inReview },
  { id: 'done', label: t('status.done'), value: workspace.stats.done },
])
const maxStatus = computed(() => Math.max(1, ...statusCounts.value.map((item) => item.value)))

const cards = computed(() => [
  { label: t('dashboard.openTasks'), value: workspace.stats.total - workspace.stats.done, hint: `${workspace.stats.total} ${t('dashboard.totalSuffix')}`, icon: ListTodo },
  { label: t('dashboard.inMotion'), value: workspace.stats.inProgress + workspace.stats.inReview, hint: t('dashboard.inMotionHint'), icon: Clock3 },
  { label: t('dashboard.overdue'), value: workspace.stats.overdue, hint: t('dashboard.overdueHint'), icon: AlertTriangle, warn: workspace.stats.overdue > 0 },
  { label: t('dashboard.doneThisWeek'), value: workspace.stats.doneThisWeek, hint: t('dashboard.doneThisWeekHint'), icon: CheckCircle2 },
])

function openTask(id: string) {
  void workspace.openTask(id)
}

function goList(status?: string) {
  if (status) workspace.setFilter('status', status as never)
  void router.push({ name: 'list' })
}
</script>

<template>
  <div class="mx-auto max-w-6xl">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="text-sm text-muted">{{ formatGreetingDate() }}</p>
        <h1 class="mt-1 text-3xl font-semibold tracking-tight">{{ t('dashboard.greeting') }}, {{ firstName }}</h1>
        <p class="mt-1 text-sm text-muted">
          {{ workspace.stats.overdue ? `${workspace.stats.overdue} ${t('dashboard.overdueSuffix')} · ` : '' }}
          {{ workspace.stats.dueSoon }} {{ t('dashboard.dueSoonSuffix') }}
        </p>
      </div>
      <TaskComposer @created="openTask" />
    </div>

    <section class="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <button
        v-for="card in cards"
        :key="card.label"
        class="rounded-2xl border border-line bg-surface p-4 text-left shadow-sm transition hover:-translate-y-0.5"
        @click="goList()"
      >
        <div class="flex items-center justify-between">
          <p class="text-sm text-muted">{{ card.label }}</p>
          <component :is="card.icon" class="size-4" :class="card.warn ? 'text-rose-600' : 'text-muted'" />
        </div>
        <p class="mt-3 text-3xl font-semibold" :class="card.warn && 'text-rose-700'">{{ card.value }}</p>
        <p class="mt-1 text-xs text-muted">{{ card.hint }}</p>
      </button>
    </section>

    <div class="mt-6 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
      <section class="rounded-2xl border border-line bg-surface p-5 shadow-sm">
        <div class="flex items-center justify-between">
          <h2 class="text-sm font-semibold">{{ t('dashboard.distribution') }}</h2>
          <button class="text-xs font-medium text-accent" @click="router.push({ name: 'board' })">
            {{ t('dashboard.viewBoard') }}
          </button>
        </div>
        <div class="mt-4 space-y-3">
          <button
            v-for="row in statusCounts"
            :key="row.id"
            class="block w-full text-left"
            @click="goList(row.id)"
          >
            <div class="mb-1 flex justify-between text-xs">
              <span class="text-muted">{{ row.label }}</span>
              <span class="font-medium">{{ row.value }}</span>
            </div>
            <div class="h-2 overflow-hidden rounded-full bg-canvas">
              <div
                class="h-full rounded-full bg-forest"
                :class="{
                  'bg-stone-400': row.id === 'todo',
                  'bg-sky-500': row.id === 'in_progress',
                  'bg-amber-500': row.id === 'in_review',
                  'bg-emerald-600': row.id === 'done',
                }"
                :style="{ width: `${(row.value / maxStatus) * 100}%` }"
              />
            </div>
          </button>
        </div>
        <div class="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div v-for="priority in PRIORITIES" :key="priority.id" class="rounded-xl bg-canvas px-3 py-2">
            <p class="text-[11px] text-muted">{{ priority.label }}</p>
            <p class="text-lg font-semibold">{{ workspace.stats.byPriority[priority.id] }}</p>
            <div class="mt-1 h-1 overflow-hidden rounded-full bg-white">
              <div
                class="h-full bg-accent"
                :style="{ width: `${(workspace.stats.byPriority[priority.id] / maxPriority) * 100}%` }"
              />
            </div>
          </div>
        </div>
      </section>

      <section class="rounded-2xl border border-line bg-surface p-5 shadow-sm">
        <h2 class="text-sm font-semibold">{{ t('dashboard.upcomingDates') }}</h2>
        <div v-if="workspace.upcoming.length" class="mt-3 space-y-2">
          <button
            v-for="task in workspace.upcoming"
            :key="task.id"
            class="flex w-full items-center justify-between gap-3 rounded-xl px-2 py-2 text-left hover:bg-canvas"
            @click="openTask(task.id)"
          >
            <div class="min-w-0">
              <p class="truncate text-sm font-medium">{{ task.title }}</p>
              <div class="mt-1 flex items-center gap-2">
                <StatusBadge :status="task.status" />
                <PriorityBadge :priority="task.priority" />
              </div>
            </div>
            <span
              class="shrink-0 text-xs font-medium"
              :class="isOverdue(task.dueDate, task.status) ? 'text-rose-600' : 'text-muted'"
            >
              {{ formatDateRange(task.startDate, task.dueDate) }}
            </span>
          </button>
        </div>
        <p v-else class="mt-6 text-sm text-muted">{{ t('dashboard.noUpcomingDates') }}</p>
      </section>
    </div>

    <section class="mt-6 rounded-2xl border border-line bg-surface p-5 shadow-sm">
      <div class="flex items-center justify-between">
        <h2 class="text-sm font-semibold">{{ t('dashboard.recentActivity') }}</h2>
        <p class="text-xs text-muted">{{ t('dashboard.recentActivityHint') }}</p>
      </div>
      <div v-if="workspace.recentActivities.length" class="mt-4 grid gap-4 md:grid-cols-2">
        <ActivityItem
          v-for="item in workspace.recentActivities"
          :key="item.id"
          :item="item"
          show-task
        />
      </div>
      <p v-else class="mt-4 text-sm text-muted">{{ t('dashboard.noActivity') }}</p>
    </section>
  </div>
</template>
