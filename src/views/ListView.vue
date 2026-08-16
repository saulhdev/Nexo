<script setup lang="ts">
import { computed, ref } from 'vue'
import { Inbox, Pencil, Trash2 } from 'lucide-vue-next'
import EmptyState from '@/components/EmptyState.vue'
import TaskComposer from '@/components/TaskComposer.vue'
import { getUrgencyImportanceFromPriority, PRIORITIES, STATUSES } from '@/constants'
import { useI18n } from '@/i18n'
import { isOverdue } from '@/lib/dates'
import { useWorkspaceStore } from '@/stores/workspace'
import type { Task, TaskPriority, TaskStatus } from '@/types'

const { t } = useI18n()
const workspace = useWorkspaceStore()
const composerRef = ref<InstanceType<typeof TaskComposer> | null>(null)
const composer = computed(() => workspace.projects[0])

function open(id: string) {
  void workspace.openTask(id)
}

function startEdit(task: Task, e: Event) {
  e.stopPropagation()
  composerRef.value?.start(task)
}

async function removeTask(id: string, e: Event) {
  e.stopPropagation()
  if (!confirm(t('list.confirmDelete'))) return
  await workspace.deleteTask(id)
}

async function changeStatus(task: Task, status: TaskStatus, e: Event) {
  e.stopPropagation()
  await workspace.updateTask(task.id, { status })
}

async function changePriority(task: Task, priority: TaskPriority, e: Event) {
  e.stopPropagation()
  const ui = getUrgencyImportanceFromPriority(priority)
  await workspace.updateTask(task.id, { priority, isUrgent: ui.isUrgent, isImportant: ui.isImportant })
}

async function changeAssignee(task: Task, assigneeId: string, e: Event) {
  e.stopPropagation()
  await workspace.updateTask(task.id, { assigneeId: assigneeId || null })
}

async function changeProject(task: Task, projectId: string, e: Event) {
  e.stopPropagation()
  await workspace.updateTask(task.id, { projectId })
}

async function changeStartDate(task: Task, startDate: string, e: Event) {
  e.stopPropagation()
  await workspace.updateTask(task.id, { startDate: startDate || null })
}

async function changeDueDate(task: Task, dueDate: string, e: Event) {
  e.stopPropagation()
  await workspace.updateTask(task.id, { dueDate: dueDate || null })
}
</script>

<template>
  <div>
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="text-3xl font-semibold tracking-tight">{{ t('list.title') }}</h1>
        <p class="mt-1 text-sm text-muted">
          {{ workspace.filteredTasks.length }} {{ t('list.taskCount') }}
          <span v-if="workspace.filters.projectId !== 'all' || workspace.filters.assigneeId !== 'all'"> {{ t('list.filtered') }}</span>
        </p>
      </div>
      <TaskComposer ref="composerRef" v-if="composer" @created="open" />
    </div>

    <div class="mt-6 flex flex-wrap gap-2">
      <input
        :value="workspace.filters.search"
        class="w-full max-w-xs rounded-xl border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
        :placeholder="t('list.searchPlaceholder')"
        @input="workspace.setFilter('search', ($event.target as HTMLInputElement).value)"
      />
      <select
        :value="workspace.filters.status"
        class="rounded-xl border border-line bg-surface px-3 py-2 text-sm"
        @change="workspace.setFilter('status', ($event.target as HTMLSelectElement).value as never)"
      >
        <option value="all">{{ t('list.allStatuses') }}</option>
        <option v-for="status in STATUSES" :key="status.id" :value="status.id">{{ status.label }}</option>
      </select>
      <select
        :value="workspace.filters.priority"
        class="rounded-xl border border-line bg-surface px-3 py-2 text-sm"
        @change="workspace.setFilter('priority', ($event.target as HTMLSelectElement).value as never)"
      >
        <option value="all">{{ t('list.allPriorities') }}</option>
        <option v-for="priority in PRIORITIES" :key="priority.id" :value="priority.id">{{ priority.label }}</option>
      </select>
      <select
        :value="workspace.filters.projectId"
        class="rounded-xl border border-line bg-surface px-3 py-2 text-sm"
        @change="workspace.setFilter('projectId', ($event.target as HTMLSelectElement).value)"
      >
        <option value="all">{{ t('list.allProjects') }}</option>
        <option v-for="project in workspace.projects" :key="project.id" :value="project.id">
          {{ project.name }}
        </option>
      </select>
      <select
        :value="workspace.filters.assigneeId"
        class="rounded-xl border border-line bg-surface px-3 py-2 text-sm"
        @change="workspace.setFilter('assigneeId', ($event.target as HTMLSelectElement).value as never)"
      >
        <option value="all">{{ t('list.allAssignees') }}</option>
        <option value="unassigned">{{ t('common.unassigned') }}</option>
        <option v-for="user in workspace.users" :key="user.id" :value="user.id">
          {{ user.fullName }}
        </option>
      </select>
    </div>

    <div class="mt-4 rounded-2xl border border-line bg-surface shadow-sm">
      <table class="w-full table-fixed text-left text-sm">
        <colgroup>
          <col />
          <col class="w-[130px]" />
          <col class="w-[120px]" />
          <col class="w-[110px]" />
          <col class="w-[130px]" />
          <col class="w-[130px]" />
          <col class="w-[130px]" />
          <col class="w-[80px]" />
        </colgroup>
        <thead class="bg-canvas/80 text-[11px] uppercase tracking-wide text-muted">
          <tr>
            <th class="px-4 py-3 font-semibold">{{ t('list.thTask') }}</th>
            <th class="px-3 py-3 font-semibold">{{ t('list.thAssignee') }}</th>
            <th class="px-3 py-3 font-semibold">{{ t('list.thStatus') }}</th>
            <th class="px-3 py-3 font-semibold">{{ t('list.thPriority') }}</th>
            <th class="px-3 py-3 font-semibold">{{ t('list.thStart') }}</th>
            <th class="px-3 py-3 font-semibold">{{ t('list.thDue') }}</th>
            <th class="px-3 py-3 font-semibold">{{ t('list.thProject') }}</th>
            <th class="px-4 py-3 font-semibold text-right">{{ t('list.thActions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="task in workspace.filteredTasks"
            :key="task.id"
            class="group border-t border-line/80 hover:bg-canvas/70"
          >
            <!-- Título y Descripción -->
            <td class="px-4 py-3 cursor-pointer truncate" @click="open(task.id)">
              <p class="font-medium text-ink hover:text-accent transition truncate">{{ task.title }}</p>
              <p v-if="task.description" class="mt-0.5 line-clamp-1 text-xs text-muted truncate">
                {{ task.description }}
              </p>
            </td>

            <!-- Asignado (editable) -->
            <td class="px-3 py-3" @click.stop>
              <select
                :value="task.assigneeId ?? ''"
                class="w-full rounded-lg border border-line bg-canvas px-2 py-1 text-xs text-ink outline-none focus:border-accent"
                @change="changeAssignee(task, ($event.target as HTMLSelectElement).value, $event)"
              >
                <option value="">{{ t('common.unassigned') }}</option>
                <option v-for="user in workspace.users" :key="user.id" :value="user.id">
                  {{ user.fullName }}
                </option>
              </select>
            </td>

            <!-- Estado (editable) -->
            <td class="px-3 py-3" @click.stop>
              <select
                :value="task.status"
                class="w-full rounded-lg border border-line bg-canvas px-2 py-1 text-xs font-medium text-ink outline-none focus:border-accent"
                @change="changeStatus(task, ($event.target as HTMLSelectElement).value as TaskStatus, $event)"
              >
                <option v-for="s in STATUSES" :key="s.id" :value="s.id">{{ s.label }}</option>
              </select>
            </td>

            <!-- Prioridad (editable) -->
            <td class="px-3 py-3" @click.stop>
              <select
                :value="task.priority"
                class="w-full rounded-lg border border-line bg-canvas px-2 py-1 text-xs font-medium text-ink outline-none focus:border-accent"
                @change="changePriority(task, ($event.target as HTMLSelectElement).value as TaskPriority, $event)"
              >
                <option v-for="p in PRIORITIES" :key="p.id" :value="p.id">{{ p.label }}</option>
              </select>
            </td>

            <!-- Fecha Inicio (editable) -->
            <td class="px-3 py-3" @click.stop>
              <input
                :value="task.startDate ?? ''"
                type="date"
                class="w-full rounded-lg border border-line bg-canvas px-1.5 py-1 text-xs text-muted outline-none focus:border-accent"
                @change="changeStartDate(task, ($event.target as HTMLInputElement).value, $event)"
              />
            </td>

            <!-- Fecha Vencimiento (editable) -->
            <td class="px-3 py-3" @click.stop>
              <input
                :value="task.dueDate ?? ''"
                type="date"
                class="w-full rounded-lg border border-line bg-canvas px-1.5 py-1 text-xs outline-none focus:border-accent"
                :class="isOverdue(task.dueDate, task.status) ? 'font-medium text-rose-600 border-rose-300' : 'text-muted'"
                @change="changeDueDate(task, ($event.target as HTMLInputElement).value, $event)"
              />
            </td>

            <!-- Proyecto (editable) -->
            <td class="px-3 py-3" @click.stop>
              <select
                :value="task.projectId"
                class="w-full rounded-lg border border-line bg-canvas px-2 py-1 text-xs font-medium text-ink outline-none focus:border-accent"
                @change="changeProject(task, ($event.target as HTMLSelectElement).value, $event)"
              >
                <option v-for="proj in workspace.projects" :key="proj.id" :value="proj.id">
                  {{ proj.name }}
                </option>
              </select>
            </td>

            <!-- Acciones -->
            <td class="px-4 py-3 text-right" @click.stop>
              <div class="flex items-center justify-end gap-1">
                <button
                  type="button"
                  class="rounded-lg p-1.5 text-muted hover:bg-canvas hover:text-accent cursor-pointer"
                  :title="t('list.editFull')"
                  @click="startEdit(task, $event)"
                >
                  <Pencil class="size-4" />
                </button>
                <button
                  type="button"
                  class="rounded-lg p-1.5 text-muted hover:bg-rose-500/10 hover:text-rose-600 cursor-pointer"
                  :title="t('list.deleteTask')"
                  @click="removeTask(task.id, $event)"
                >
                  <Trash2 class="size-4" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="!workspace.filteredTasks.length" class="p-6">
        <EmptyState
          :title="t('list.emptyTitle')"
          :description="t('list.emptyDescription')"
        >
          <template #icon><Inbox class="size-5" /></template>
        </EmptyState>
      </div>
    </div>
  </div>
</template>
