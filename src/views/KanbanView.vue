<script setup lang="ts">
import { ref } from 'vue'
import { Pencil, Plus } from 'lucide-vue-next'
import draggable from 'vuedraggable'
import PriorityBadge from '@/components/PriorityBadge.vue'
import TaskComposer from '@/components/TaskComposer.vue'
import { STATUSES } from '@/constants'
import { useI18n } from '@/i18n'
import { formatDateRange, isOverdue } from '@/lib/dates'
import { useWorkspaceStore } from '@/stores/workspace'
import type { Task, TaskStatus } from '@/types'

const { t } = useI18n()
const workspace = useWorkspaceStore()
const composerFor = ref<TaskStatus | null>(null)
const composerRef = ref<InstanceType<typeof TaskComposer> | null>(null)

function columnTasks(status: TaskStatus) {
  return workspace.tasksByStatus(status)
}

function onUpdateColumn(status: TaskStatus, newTasks: Task[]) {
  const previousIds = workspace.tasksByStatus(status).map((task) => task.id)
  const added = newTasks.find((task) => !previousIds.includes(task.id))
  void workspace.moveInColumn(
    status,
    newTasks.map((task) => task.id),
    added?.id,
  )
}

function open(id: string) {
  void workspace.openTask(id)
}

function edit(task: Task, e: Event) {
  e.stopPropagation()
  composerRef.value?.start(task)
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
    <div class="mb-5 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="text-3xl font-semibold tracking-tight">{{ t('board.title') }}</h1>
        <p class="mt-1 text-sm text-muted">{{ t('board.subtitle') }}</p>
      </div>
      <TaskComposer ref="composerRef" @created="open" />
    </div>

    <div class="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-x-auto pb-4 md:grid-cols-2 xl:grid-cols-4">
      <section
        v-for="column in STATUSES"
        :key="column.id"
        class="flex min-h-0 flex-col rounded-2xl border border-line bg-surface/80"
      >
        <header class="flex items-center justify-between px-3 py-3">
          <div>
            <p class="text-sm font-semibold">{{ column.label }}</p>
            <p class="text-[11px] text-muted">{{ column.hint }} · {{ columnTasks(column.id).length }}</p>
          </div>
          <button class="rounded-lg p-1 text-muted hover:bg-canvas hover:text-ink cursor-pointer" @click="composerFor = column.id">
            <Plus class="size-4" />
          </button>
        </header>

        <div v-if="composerFor === column.id" class="px-3 pb-2">
          <TaskComposer
            :default-status="column.id"
            :show-button="false"
            compact
            auto-open
            @created="
              (id) => {
                composerFor = null
                open(id)
              }
            "
            @cancel="composerFor = null"
          />
        </div>

        <draggable
          :model-value="columnTasks(column.id)"
          :animation="180"
          group="tasks"
          item-key="id"
          class="min-h-24 flex-1 space-y-2 overflow-y-auto px-3 pb-3 scrollbar-thin"
          ghost-class="opacity-40"
          @update:model-value="onUpdateColumn(column.id, $event)"
        >
          <template #item="{ element }">
            <article
              class="group cursor-grab rounded-xl border border-line bg-surface p-3 shadow-sm transition hover:border-accent/40 active:cursor-grabbing"
              @click="open(element.id)"
            >
              <div class="flex items-start justify-between gap-2">
                <p class="text-sm font-medium leading-snug group-hover:text-accent transition">{{ element.title }}</p>
                <div class="flex items-center gap-1.5 shrink-0">
                  <PriorityBadge :priority="element.priority" compact />
                  <button
                    type="button"
                    class="opacity-0 group-hover:opacity-100 rounded-md p-1 text-muted hover:bg-canvas hover:text-accent transition cursor-pointer"
                    :title="t('board.editTask')"
                    @click="edit(element, $event)"
                  >
                    <Pencil class="size-3.5" />
                  </button>
                </div>
              </div>
              <p v-if="element.description" class="mt-1 line-clamp-2 text-xs text-muted">
                {{ element.description }}
              </p>
              <div class="mt-3 flex items-center justify-between gap-2 border-t border-line/40 pt-2">
                <span class="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted">
                  <span class="size-1.5 rounded-full" :style="{ background: element.project?.color }" />
                  {{ element.project?.name }}
                </span>
                <div class="flex items-center gap-2">
                  <span
                    v-if="element.startDate || element.dueDate"
                    class="text-[11px]"
                    :class="isOverdue(element.dueDate, element.status) ? 'font-medium text-rose-600' : 'text-muted'"
                  >
                    {{ formatDateRange(element.startDate, element.dueDate) }}
                  </span>
                  <span
                    v-if="element.assignee"
                    class="flex size-5 shrink-0 items-center justify-center rounded-full bg-accent/15 text-[10px] font-bold text-accent"
                    :title="`${t('board.assignedTo')}: ${element.assignee.fullName}`"
                  >
                    {{ getInitials(element.assignee.fullName) }}
                  </span>
                </div>
              </div>
            </article>
          </template>
        </draggable>
      </section>
    </div>
  </div>
</template>
