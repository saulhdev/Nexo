<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  Archive,
  ArchiveRestore,
  Calendar,
  CheckCircle2,
  Clock,
  FolderArchive,
  Info,
  Search,
  Settings,
  X,
} from '@lucide/vue'
import CustomSelect from '@/components/CustomSelect.vue'
import EmptyState from '@/components/EmptyState.vue'
import PriorityBadge from '@/components/PriorityBadge.vue'
import RichTextViewer from '@/components/RichTextViewer.vue'
import { useI18n } from '@/i18n'
import { stripHtml } from '@/lib/text'
import { useWorkspaceStore } from '@/stores/workspace'
import type { Task } from '@/types'

const { t, locale } = useI18n()
const router = useRouter()
const workspace = useWorkspaceStore()

const searchQuery = ref('')
const selectedProjectId = ref<string>('all')
const selectedAssigneeId = ref<string>('all')
const previewTask = ref<Task | null>(null)
const unarchiveSuccessMessage = ref('')
const unarchivingId = ref<string | null>(null)

const projectFilterOptions = computed(() => [
  { label: t('archived.allProjects'), value: 'all' },
  ...workspace.projects.map((p) => ({ label: p.name, value: p.id })),
])

const assigneeFilterOptions = computed(() => [
  { label: t('archived.allAssignees'), value: 'all' },
  { label: t('common.unassigned'), value: 'unassigned' },
  ...workspace.users.map((u) => ({ label: u.fullName, value: u.id })),
])

const filteredArchivedTasks = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  return workspace.archivedTasks.filter((task) => {
    if (selectedProjectId.value !== 'all' && task.projectId !== selectedProjectId.value) return false
    if (selectedAssigneeId.value !== 'all') {
      if (selectedAssigneeId.value === 'unassigned') {
        if (task.assigneeId) return false
      } else if (task.assigneeId !== selectedAssigneeId.value) {
        return false
      }
    }
    if (q) {
      const hay = `${task.title} ${task.description} ${task.project?.name ?? ''} ${task.assignee?.fullName ?? ''}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })
})

function formatCompletedDate(dateStr?: string | null): string {
  if (!dateStr) return '-'
  try {
    const d = new Date(dateStr)
    const intlLocale = locale.value === 'en' ? 'en-US' : 'es-ES'
    return d.toLocaleDateString(intlLocale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return dateStr.slice(0, 10)
  }
}

function getDaysSinceCompleted(dateStr?: string | null): number {
  if (!dateStr) return 0
  const time = new Date(dateStr).getTime()
  if (isNaN(time)) return 0
  const diffMs = Date.now() - time
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
}

function getAgeLabel(dateStr?: string | null): string {
  const days = getDaysSinceCompleted(dateStr)
  if (days === 0) return t('archived.today')
  if (days === 1) return t('archived.yesterday')
  return t('archived.daysAgo', { n: days })
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

function openPreview(task: Task) {
  previewTask.value = task
}

function closePreview() {
  previewTask.value = null
}

async function handleUnarchive(task: Task, e?: Event) {
  if (e) e.stopPropagation()
  if (!confirm(t('archived.unarchiveConfirm'))) return

  unarchivingId.value = task.id
  try {
    await workspace.unarchiveTask(task.id)
    if (previewTask.value?.id === task.id) {
      previewTask.value = null
    }
    unarchiveSuccessMessage.value = t('archived.unarchiveSuccess')
    setTimeout(() => {
      unarchiveSuccessMessage.value = ''
    }, 4500)
  } finally {
    unarchivingId.value = null
  }
}

function goToProfilePreferences() {
  void router.push({ name: 'profile' })
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <div class="flex items-center gap-2.5">
          <h1 class="text-3xl font-semibold tracking-tight text-ink">{{ t('archived.title') }}</h1>
          <span class="inline-flex items-center rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-semibold text-accent">
            {{ workspace.archivedTasks.length }}
          </span>
        </div>
        <p class="mt-1 text-sm text-muted">
          {{ t('archived.subtitle') }}
        </p>
      </div>

      <!-- Policy Info & Config Link -->
      <div class="flex items-center gap-2 rounded-2xl border border-line bg-surface px-3.5 py-2 text-xs shadow-xs">
        <Clock class="size-4 text-accent" />
        <span class="font-medium text-ink/80">
          {{ t('archived.policyInfo', { days: workspace.autoArchiveDays }) }}
        </span>
        <button
          type="button"
          class="ml-1 inline-flex items-center gap-1 rounded-lg bg-canvas px-2 py-1 font-semibold text-accent hover:bg-accent/10 transition"
          :title="t('archived.changePreference')"
          @click="goToProfilePreferences"
        >
          <Settings class="size-3" />
          <span>{{ t('archived.changePreference') }}</span>
        </button>
      </div>
    </div>

    <!-- Alert / Toast Banner -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="transform -translate-y-2 opacity-0"
      enter-to-class="transform translate-y-0 opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="transform translate-y-0 opacity-100"
      leave-to-class="transform -translate-y-2 opacity-0"
    >
      <div
        v-if="unarchiveSuccessMessage"
        class="flex items-center justify-between rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 shadow-xs"
      >
        <div class="flex items-center gap-2.5">
          <CheckCircle2 class="size-5 text-emerald-600 shrink-0" />
          <span class="font-medium">{{ unarchiveSuccessMessage }}</span>
        </div>
        <button
          type="button"
          class="text-emerald-700 hover:text-emerald-900"
          @click="unarchiveSuccessMessage = ''"
        >
          <X class="size-4" />
        </button>
      </div>
    </Transition>

    <!-- Filters & Search Toolbar -->
    <div class="flex flex-wrap items-center gap-2.5 rounded-2xl border border-line bg-surface p-3 shadow-xs">
      <div class="relative min-w-64 flex-1">
        <Search class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <input
          v-model="searchQuery"
          type="text"
          :placeholder="t('archived.searchPlaceholder')"
          class="w-full rounded-xl border border-line bg-canvas pl-9 pr-3 py-2 text-sm text-ink outline-none focus:border-accent"
        />
      </div>

      <div class="w-48">
        <CustomSelect
          v-model="selectedProjectId"
          :options="projectFilterOptions"
        />
      </div>

      <div class="w-48">
        <CustomSelect
          v-model="selectedAssigneeId"
          :options="assigneeFilterOptions"
        />
      </div>
    </div>

    <!-- Table of Archived Tasks -->
    <div class="rounded-2xl border border-line bg-surface shadow-sm overflow-x-auto">
      <table class="w-full min-w-[950px] table-fixed text-left text-sm">
        <colgroup>
          <col class="w-[300px]" />
          <col class="w-[140px]" />
          <col class="w-[140px]" />
          <col class="w-[110px]" />
          <col class="w-[130px]" />
          <col class="w-[130px]" />
          <col class="w-[130px]" />
        </colgroup>
        <thead class="bg-canvas/80 text-[11px] uppercase tracking-wide text-muted">
          <tr>
            <th class="px-4 py-3 font-semibold">{{ t('archived.thTask') }}</th>
            <th class="px-3 py-3 font-semibold">{{ t('archived.thProject') }}</th>
            <th class="px-3 py-3 font-semibold">{{ t('archived.thAssignee') }}</th>
            <th class="px-3 py-3 font-semibold">{{ t('archived.thPriority') }}</th>
            <th class="px-3 py-3 font-semibold">{{ t('archived.thCompletedAt') }}</th>
            <th class="px-3 py-3 font-semibold">{{ t('archived.thAge') }}</th>
            <th class="px-4 py-3 font-semibold text-right">{{ t('archived.thActions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="task in filteredArchivedTasks"
            :key="task.id"
            class="group border-t border-line/80 hover:bg-canvas/70 cursor-pointer transition"
            @click="openPreview(task)"
          >
            <!-- Task Title & Description -->
            <td class="px-4 py-3.5">
              <div class="flex items-center gap-2 min-w-0">
                <p class="font-medium text-ink group-hover:text-accent transition truncate">{{ task.title }}</p>
                <span
                  class="inline-flex items-center rounded-md bg-stone-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-stone-600 border border-stone-300/40 shrink-0"
                >
                  {{ t('archived.readOnlyBadge') }}
                </span>
              </div>
              <p v-if="task.description" class="mt-0.5 line-clamp-1 text-xs text-muted truncate">
                {{ stripHtml(task.description) }}
              </p>
            </td>

            <!-- Project -->
            <td class="px-3 py-3.5" @click.stop>
              <span v-if="task.project" class="inline-flex items-center gap-1.5 text-xs font-medium text-ink/80 truncate">
                <span class="size-2 shrink-0 rounded-full" :style="{ background: task.project.color }" />
                <span class="truncate">{{ task.project.name }}</span>
              </span>
              <span v-else class="text-xs text-muted">-</span>
            </td>

            <!-- Assignee -->
            <td class="px-3 py-3.5" @click.stop>
              <div v-if="task.assignee" class="flex items-center gap-2 min-w-0">
                <div class="grid size-6 shrink-0 place-items-center rounded-full bg-accent/15 text-[10px] font-bold text-accent">
                  {{ getInitials(task.assignee.fullName) }}
                </div>
                <span class="text-xs font-medium text-ink/90 truncate">{{ task.assignee.fullName }}</span>
              </div>
              <span v-else class="text-xs text-muted">{{ t('common.unassigned') }}</span>
            </td>

            <!-- Priority -->
            <td class="px-3 py-3.5" @click.stop>
              <PriorityBadge :priority="task.priority" compact />
            </td>

            <!-- Completed At Date -->
            <td class="px-3 py-3.5 text-xs text-muted font-medium" @click.stop>
              <div class="flex items-center gap-1.5">
                <Calendar class="size-3.5 text-muted/80" />
                <span>{{ formatCompletedDate(task.completedAt || task.updatedAt) }}</span>
              </div>
            </td>

            <!-- Age (Days completed) -->
            <td class="px-3 py-3.5 text-xs" @click.stop>
              <span class="inline-flex items-center gap-1 rounded-lg bg-canvas px-2 py-0.5 text-xs font-medium text-muted border border-line/60">
                <Clock class="size-3 text-muted/70" />
                {{ getAgeLabel(task.completedAt || task.updatedAt) }}
              </span>
            </td>

            <!-- Action: Desarchivar -->
            <td class="px-4 py-3.5 text-right" @click.stop>
              <button
                type="button"
                class="inline-flex items-center gap-1.5 rounded-xl bg-accent px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-accent/90 disabled:opacity-50"
                :disabled="unarchivingId === task.id"
                :title="t('archived.unarchive')"
                @click="handleUnarchive(task, $event)"
              >
                <ArchiveRestore class="size-3.5" />
                <span>{{ unarchivingId === task.id ? t('common.saving') : t('archived.unarchive') }}</span>
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Empty State -->
      <div v-if="filteredArchivedTasks.length === 0" class="p-12">
        <EmptyState
          :icon="FolderArchive"
          :title="t('archived.emptyTitle')"
          :description="t('archived.emptyDesc', { days: workspace.autoArchiveDays })"
        />
      </div>
    </div>

    <!-- Read-Only Task Preview Drawer / Modal -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="previewTask"
          class="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex justify-end"
          @click="closePreview"
        >
          <div
            class="h-full w-full max-w-xl bg-surface border-l border-line shadow-2xl flex flex-col overflow-y-auto"
            @click.stop
          >
            <!-- Drawer Header -->
            <header class="flex items-center justify-between border-b border-line px-6 py-4 bg-canvas/40 sticky top-0 z-10">
              <div class="flex items-center gap-2">
                <span class="inline-flex items-center gap-1 rounded-lg bg-stone-500/10 px-2.5 py-1 text-xs font-bold text-stone-700 border border-stone-300">
                  <Archive class="size-3.5" />
                  {{ t('archived.readOnlyBadge') }}
                </span>
              </div>
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  class="inline-flex items-center gap-1.5 rounded-xl bg-accent px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-accent/90"
                  :title="t('archived.unarchive')"
                  @click="handleUnarchive(previewTask)"
                >
                  <ArchiveRestore class="size-3.5" />
                  <span>{{ t('archived.unarchive') }}</span>
                </button>
                <button
                  type="button"
                  class="rounded-xl p-1.5 text-muted hover:bg-canvas hover:text-ink transition"
                  @click="closePreview"
                >
                  <X class="size-5" />
                </button>
              </div>
            </header>

            <!-- Read-Only Notice Banner -->
            <div class="px-6 pt-5">
              <div class="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-800">
                <Info class="size-4 shrink-0 text-amber-700 mt-0.5" />
                <div>
                  <p class="font-semibold">{{ t('archived.readOnlyNotice') }}</p>
                  <p class="mt-0.5 text-amber-700/90">
                    {{ t('archived.policyInfo', { days: workspace.autoArchiveDays }) }} ({{ getAgeLabel(previewTask.completedAt || previewTask.updatedAt) }}).
                  </p>
                </div>
              </div>
            </div>

            <!-- Task Main Content (Read-Only) -->
            <div class="flex-1 px-6 py-5 space-y-6">
              <div>
                <h2 class="text-2xl font-bold tracking-tight text-ink">{{ previewTask.title }}</h2>
                <div class="mt-3 flex flex-wrap items-center gap-2.5 text-xs">
                  <span class="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 font-semibold text-emerald-700">
                    <CheckCircle2 class="size-3.5" />
                    {{ t('status.done') }}
                  </span>
                  <PriorityBadge :priority="previewTask.priority" />
                  <span v-if="previewTask.project" class="inline-flex items-center gap-1.5 rounded-lg border border-line bg-canvas px-2.5 py-1 font-medium text-ink">
                    <span class="size-2 rounded-full" :style="{ background: previewTask.project.color }" />
                    {{ previewTask.project.name }}
                  </span>
                </div>
              </div>

              <!-- Metadata Grid -->
              <div class="grid grid-cols-2 gap-3 rounded-2xl border border-line bg-canvas/50 p-4 text-xs">
                <div>
                  <p class="text-muted font-semibold uppercase tracking-wider text-[10px]">{{ t('archived.thAssignee') }}</p>
                  <p class="mt-1 font-medium text-ink">
                    {{ previewTask.assignee?.fullName || t('common.unassigned') }}
                  </p>
                </div>
                <div>
                  <p class="text-muted font-semibold uppercase tracking-wider text-[10px]">{{ t('archived.thCompletedAt') }}</p>
                  <p class="mt-1 font-medium text-ink">
                    {{ formatCompletedDate(previewTask.completedAt || previewTask.updatedAt) }}
                  </p>
                </div>
                <div>
                  <p class="text-muted font-semibold uppercase tracking-wider text-[10px]">{{ t('drawer.startDate') }}</p>
                  <p class="mt-1 font-medium text-ink">
                    {{ previewTask.startDate ? formatCompletedDate(previewTask.startDate) : '-' }}
                  </p>
                </div>
                <div>
                  <p class="text-muted font-semibold uppercase tracking-wider text-[10px]">{{ t('drawer.dueDate') }}</p>
                  <p class="mt-1 font-medium text-ink">
                    {{ previewTask.dueDate ? formatCompletedDate(previewTask.dueDate) : '-' }}
                  </p>
                </div>
              </div>

              <!-- Description -->
              <div>
                <h3 class="text-xs font-semibold uppercase tracking-wider text-muted">{{ t('drawer.description') }}</h3>
                <div class="mt-2 rounded-2xl border border-line bg-canvas p-4 text-sm">
                  <RichTextViewer v-if="previewTask.description" :content="previewTask.description" />
                  <p v-else class="text-xs text-muted italic">{{ t('drawer.noDescription') }}</p>
                </div>
              </div>
            </div>

            <!-- Drawer Footer -->
            <footer class="border-t border-line px-6 py-4 bg-canvas/30 flex items-center justify-between text-xs text-muted">
              <span>ID: {{ previewTask.id }}</span>
              <button
                type="button"
                class="inline-flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 font-semibold text-white transition hover:bg-accent/90"
                @click="handleUnarchive(previewTask)"
              >
                <ArchiveRestore class="size-4" />
                {{ t('archived.unarchive') }}
              </button>
            </footer>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
