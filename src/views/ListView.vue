<script setup lang="ts">
import { computed, ref } from 'vue'
import { CheckSquare, Inbox, Pencil, Trash2 } from 'lucide-vue-next'
import CustomDatePicker from '@/components/CustomDatePicker.vue'
import CustomSelect from '@/components/CustomSelect.vue'
import EmptyState from '@/components/EmptyState.vue'
import TaskComposer from '@/components/TaskComposer.vue'
import { getUrgencyImportanceFromPriority, PRIORITIES, STATUSES } from '@/constants'
import { useI18n } from '@/i18n'
import { isOverdue } from '@/lib/dates'
import { stripHtml } from '@/lib/text'
import { useWorkspaceStore } from '@/stores/workspace'
import type { Task, TaskPriority, TaskStatus } from '@/types'

const { t } = useI18n()
const workspace = useWorkspaceStore()
const composerRef = ref<InstanceType<typeof TaskComposer> | null>(null)
const composer = computed(() => workspace.projects[0])

const statusFilterOptions = computed(() => [
  { label: t('list.allStatuses'), value: 'all' },
  ...STATUSES,
])

const priorityFilterOptions = computed(() => [
  { label: t('list.allPriorities'), value: 'all' },
  ...PRIORITIES,
])

const projectFilterOptions = computed(() => [
  { label: t('list.allProjects'), value: 'all' },
  ...workspace.projects.map((p) => ({ label: p.name, value: p.id })),
])

const assigneeFilterOptions = computed(() => [
  { label: t('list.allAssignees'), value: 'all' },
  { label: t('common.unassigned'), value: 'unassigned' },
  ...workspace.users.map((u) => ({ label: u.fullName, value: u.id })),
])

const assigneeOptions = computed(() => [
  { label: t('common.unassigned'), value: '' },
  ...workspace.users.map((u) => ({ label: u.fullName, value: u.id })),
])

const projectOptions = computed(() =>
  workspace.projects.map((p) => ({ label: p.name, value: p.id }))
)

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

async function changeStatus(task: Task, status: TaskStatus) {
  await workspace.updateTask(task.id, { status })
}

async function changePriority(task: Task, priority: TaskPriority) {
  const ui = getUrgencyImportanceFromPriority(priority)
  await workspace.updateTask(task.id, { priority, isUrgent: ui.isUrgent, isImportant: ui.isImportant })
}

async function changeAssignee(task: Task, assigneeId: string) {
  await workspace.updateTask(task.id, { assigneeId: assigneeId || null })
}

async function changeProject(task: Task, projectId: string) {
  await workspace.updateTask(task.id, { projectId })
}

async function changeStartDate(task: Task, startDate: string | null) {
  await workspace.updateTask(task.id, { startDate: startDate || null })
}

async function changeDueDate(task: Task, dueDate: string | null) {
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

    <div class="mt-6 flex flex-wrap items-center gap-2">
      <input
        :value="workspace.filters.search"
        class="w-full max-w-xs rounded-xl border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
        :placeholder="t('list.searchPlaceholder')"
        @input="workspace.setFilter('search', ($event.target as HTMLInputElement).value)"
      />
      <div class="w-40">
        <CustomSelect
          :modelValue="workspace.filters.status"
          :options="statusFilterOptions"
          @update:modelValue="workspace.setFilter('status', $event as never)"
        />
      </div>
      <div class="w-40">
        <CustomSelect
          :modelValue="workspace.filters.priority"
          :options="priorityFilterOptions"
          @update:modelValue="workspace.setFilter('priority', $event as never)"
        />
      </div>
      <div class="w-44">
        <CustomSelect
          :modelValue="workspace.filters.projectId"
          :options="projectFilterOptions"
          @update:modelValue="workspace.setFilter('projectId', $event)"
        />
      </div>
      <div class="w-44">
        <CustomSelect
          :modelValue="workspace.filters.assigneeId"
          :options="assigneeFilterOptions"
          @update:modelValue="workspace.setFilter('assigneeId', $event as never)"
        />
      </div>
    </div>

    <div class="mt-4 rounded-2xl border border-line bg-surface shadow-sm overflow-hidden">
      <table class="w-full table-fixed text-left text-sm">
        <colgroup>
          <col />
          <col class="w-[140px]" />
          <col class="w-[130px]" />
          <col class="w-[120px]" />
          <col class="w-[130px]" />
          <col class="w-[130px]" />
          <col class="w-[140px]" />
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
              <div class="flex items-center gap-2 min-w-0">
                <p class="font-medium text-ink hover:text-accent transition truncate">{{ task.title }}</p>
                <span
                  v-if="task.subtaskCount"
                  class="inline-flex items-center gap-1 text-[10px] font-medium text-muted bg-canvas px-1.5 py-0.5 rounded border border-line/50 shrink-0"
                  :class="task.completedSubtaskCount === task.subtaskCount ? 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20 font-semibold' : ''"
                  :title="t('drawer.subtasks')"
                >
                  <CheckSquare class="size-3" />
                  {{ task.completedSubtaskCount ?? 0 }}/{{ task.subtaskCount }}
                </span>
              </div>
              <p v-if="task.description" class="mt-0.5 line-clamp-1 text-xs text-muted truncate">
                {{ stripHtml(task.description) }}
              </p>
            </td>

            <!-- Asignado (editable) -->
            <td class="px-3 py-2" @click.stop>
              <CustomSelect
                :modelValue="task.assigneeId ?? ''"
                :options="assigneeOptions"
                size="small"
                @update:modelValue="changeAssignee(task, $event)"
              />
            </td>

            <!-- Estado (editable) -->
            <td class="px-3 py-2" @click.stop>
              <CustomSelect
                :modelValue="task.status"
                :options="STATUSES"
                size="small"
                @update:modelValue="changeStatus(task, $event as TaskStatus)"
              />
            </td>

            <!-- Prioridad (editable) -->
            <td class="px-3 py-2" @click.stop>
              <CustomSelect
                :modelValue="task.priority"
                :options="PRIORITIES"
                size="small"
                @update:modelValue="changePriority(task, $event as TaskPriority)"
              />
            </td>

            <!-- Fecha Inicio (editable) -->
            <td class="px-3 py-2 min-w-[130px]" @click.stop>
              <CustomDatePicker
                :modelValue="task.startDate"
                size="small"
                placeholder="-"
                showButtonBar
                @update:modelValue="changeStartDate(task, $event)"
              />
            </td>

            <!-- Fecha Vencimiento (editable) -->
            <td class="px-3 py-2 min-w-[130px]" @click.stop>
              <CustomDatePicker
                :modelValue="task.dueDate"
                size="small"
                placeholder="-"
                showButtonBar
                :invalid="isOverdue(task.dueDate, task.status)"
                @update:modelValue="changeDueDate(task, $event)"
              />
            </td>

            <!-- Proyecto (editable) -->
            <td class="px-3 py-2" @click.stop>
              <CustomSelect
                :modelValue="task.projectId"
                :options="projectOptions"
                size="small"
                @update:modelValue="changeProject(task, $event)"
              />
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

      <div v-if="workspace.filteredTasks.length === 0" class="p-8">
        <EmptyState
          :icon="Inbox"
          :title="t('list.emptyTitle')"
          :description="t('list.emptyDesc')"
        />
      </div>
    </div>
  </div>
</template>
