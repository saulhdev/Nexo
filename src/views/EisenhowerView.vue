<script setup lang="ts">
import { ref } from 'vue'
import { Pencil, Plus, Search } from 'lucide-vue-next'
import draggable from 'vuedraggable'
import PriorityBadge from '@/components/PriorityBadge.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import TaskComposer from '@/components/TaskComposer.vue'
import { EISENHOWER_QUADRANTS, type EisenhowerQuadrant, getQuadrantFromTask } from '@/constants'
import { useI18n } from '@/i18n'
import { formatDateRange, isOverdue } from '@/lib/dates'
import { useWorkspaceStore } from '@/stores/workspace'
import type { Task, TaskStatus } from '@/types'

const { t } = useI18n()
const workspace = useWorkspaceStore()
const composerQuadrant = ref<EisenhowerQuadrant | null>(null)
const composerRef = ref<InstanceType<typeof TaskComposer> | null>(null)

function quadrantTasks(quadrant: EisenhowerQuadrant): Task[] {
  return workspace.filteredTasks.filter((task) => {
    const q = getQuadrantFromTask(task)
    return q.id === quadrant.id
  })
}

async function onUpdateQuadrant(quadrant: EisenhowerQuadrant, newTasks: Task[]) {
  const currentIds = quadrantTasks(quadrant).map((t) => t.id)
  const moved = newTasks.find((t) => !currentIds.includes(t.id))
  if (moved) {
    await workspace.updateTask(moved.id, {
      isUrgent: quadrant.isUrgent,
      isImportant: quadrant.isImportant,
      priority: quadrant.priority,
    })
  }
}

function openTask(id: string) {
  void workspace.openTask(id)
}

function editTask(task: Task, e: Event) {
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
  <div class="flex flex-col gap-6">
    <!-- CABECERA -->
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="text-3xl font-semibold tracking-tight">{{ t('eisenhower.title') }}</h1>
        <p class="mt-1 text-sm text-muted">
          {{ t('eisenhower.subtitle') }}
        </p>
      </div>
      <div class="flex items-center gap-3">
        <TaskComposer ref="composerRef" @created="openTask" />
      </div>
    </div>

    <!-- FILTROS Y BÚSQUEDA -->
    <div class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-3 shadow-xs">
      <div class="relative min-w-64 flex-1">
        <Search class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <input
          :value="workspace.filters.search"
          type="text"
          :placeholder="t('eisenhower.searchPlaceholder')"
          class="w-full rounded-xl border border-line bg-canvas pl-9 pr-3 py-1.5 text-sm text-ink outline-none focus:border-accent"
          @input="workspace.setFilter('search', ($event.target as HTMLInputElement).value)"
        />
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <select
          :value="workspace.filters.projectId"
          class="rounded-xl border border-line bg-canvas px-3 py-1.5 text-xs font-medium text-ink outline-none"
          @change="workspace.setFilter('projectId', ($event.target as HTMLSelectElement).value)"
        >
          <option value="all">{{ t('list.allProjects') }}</option>
          <option v-for="p in workspace.projects" :key="p.id" :value="p.id">{{ p.name }}</option>
        </select>

        <select
          :value="workspace.filters.status"
          class="rounded-xl border border-line bg-canvas px-3 py-1.5 text-xs font-medium text-ink outline-none"
          @change="workspace.setFilter('status', ($event.target as HTMLSelectElement).value as TaskStatus | 'all')"
        >
          <option value="all">{{ t('list.allStatuses') }}</option>
          <option value="todo">{{ t('status.todo') }}</option>
          <option value="in_progress">{{ t('status.in_progress') }}</option>
          <option value="in_review">{{ t('status.in_review') }}</option>
          <option value="done">{{ t('status.done') }}</option>
        </select>
      </div>
    </div>

    <!-- RETÍCULA DE 4 CUADRANTES (2x2) -->
    <div class="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <section
        v-for="quadrant in EISENHOWER_QUADRANTS"
        :key="quadrant.id"
        class="flex flex-col min-h-[380px] rounded-2xl border transition shadow-xs"
        :class="[quadrant.bgClass, quadrant.borderClass]"
      >
        <!-- ENCABEZADO DEL CUADRANTE -->
        <header class="flex items-center justify-between border-b px-4 py-3.5" :class="[quadrant.headerBg, quadrant.borderClass]">
          <div>
            <div class="flex items-center gap-2">
              <span class="text-xs font-semibold uppercase tracking-wider">{{ quadrant.name }}</span>
              <span class="rounded-md border px-2 py-0.5 text-xs font-bold" :class="quadrant.badgeClass">
                {{ quadrant.action }}
              </span>
            </div>
            <p class="mt-0.5 text-xs text-muted/90">{{ quadrant.description }}</p>
          </div>
          <div class="flex items-center gap-2">
            <span class="grid size-6 place-items-center rounded-full bg-white/70 text-xs font-bold text-ink shadow-xs">
              {{ quadrantTasks(quadrant).length }}
            </span>
            <button
              type="button"
              class="rounded-lg p-1.5 text-ink/70 hover:bg-surface hover:text-ink cursor-pointer"
              :title="`${t('eisenhower.newTaskIn')} ${quadrant.name}`"
              @click="composerQuadrant = quadrant"
            >
              <Plus class="size-4" />
            </button>
          </div>
        </header>

        <!-- MODAL COMPOSER RÁPIDO PARA CUADRANTE -->
        <div v-if="composerQuadrant?.id === quadrant.id" class="p-3">
          <TaskComposer
            :default-urgent="quadrant.isUrgent"
            :default-important="quadrant.isImportant"
            :default-priority="quadrant.priority"
            :show-button="false"
            compact
            auto-open
            @created="
              (id) => {
                composerQuadrant = null
                openTask(id)
              }
            "
            @cancel="composerQuadrant = null"
          />
        </div>

        <!-- LISTA DRAGGABLE DE TARJETAS -->
        <draggable
          :model-value="quadrantTasks(quadrant)"
          :animation="180"
          group="eisenhower"
          item-key="id"
          class="flex-1 space-y-2.5 p-3.5 overflow-y-auto min-h-32 scrollbar-thin"
          ghost-class="opacity-40"
          @update:model-value="onUpdateQuadrant(quadrant, $event)"
        >
          <template #item="{ element }">
            <article
              class="group cursor-grab rounded-xl border border-line bg-surface p-3.5 shadow-sm transition hover:border-accent/40 hover:shadow-md active:cursor-grabbing"
              @click="openTask(element.id)"
            >
              <div class="flex items-start justify-between gap-2">
                <p class="text-sm font-semibold text-ink leading-snug group-hover:text-accent transition">
                  {{ element.title }}
                </p>
                <div class="flex items-center gap-1.5 shrink-0">
                  <PriorityBadge :priority="element.priority" compact />
                  <button
                    type="button"
                    class="opacity-0 group-hover:opacity-100 rounded-md p-1 text-muted hover:bg-canvas hover:text-accent transition cursor-pointer"
                    :title="t('board.editTask')"
                    @click="editTask(element, $event)"
                  >
                    <Pencil class="size-3.5" />
                  </button>
                </div>
              </div>

              <p v-if="element.description" class="mt-1.5 line-clamp-2 text-xs text-muted">
                {{ element.description }}
              </p>

              <div class="mt-3.5 flex items-center justify-between gap-2 border-t border-line/40 pt-2.5 text-xs">
                <div class="flex items-center gap-2">
                  <StatusBadge :status="element.status" />
                  <span v-if="element.project" class="inline-flex items-center gap-1 text-[11px] font-medium text-muted">
                    <span class="size-1.5 rounded-full" :style="{ background: element.project.color }" />
                    {{ element.project.name }}
                  </span>
                </div>

                <div class="flex items-center gap-2">
                  <span
                    v-if="element.startDate || element.dueDate"
                    class="text-[11px]"
                    :class="isOverdue(element.dueDate, element.status) ? 'font-semibold text-rose-600' : 'text-muted'"
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

        <div v-if="!quadrantTasks(quadrant).length" class="p-6 text-center text-xs text-muted/70">
          {{ t('eisenhower.emptyQuadrant') }}
        </div>
      </section>
    </div>
  </div>
</template>
