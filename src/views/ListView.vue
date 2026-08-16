<script setup lang="ts">
import { computed } from 'vue'
import { Inbox } from 'lucide-vue-next'
import EmptyState from '@/components/EmptyState.vue'
import PriorityBadge from '@/components/PriorityBadge.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import TaskComposer from '@/components/TaskComposer.vue'
import { PRIORITIES, STATUSES } from '@/constants'
import { dueLabel, isOverdue } from '@/lib/dates'
import { useWorkspaceStore } from '@/stores/workspace'

const workspace = useWorkspaceStore()
const composer = computed(() => workspace.projects[0])

function open(id: string) {
  void workspace.openTask(id)
}
</script>

<template>
  <div class="mx-auto max-w-6xl">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="text-3xl font-semibold tracking-tight">Lista</h1>
        <p class="mt-1 text-sm text-muted">
          {{ workspace.filteredTasks.length }} tareas
          <span v-if="workspace.filters.projectId !== 'all'"> filtradas</span>
        </p>
      </div>
      <TaskComposer v-if="composer" @created="open" />
    </div>

    <div class="mt-6 flex flex-wrap gap-2">
      <input
        :value="workspace.filters.search"
        class="w-full max-w-xs rounded-xl border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
        placeholder="Buscar por título o descripción"
        @input="workspace.setFilter('search', ($event.target as HTMLInputElement).value)"
      />
      <select
        :value="workspace.filters.status"
        class="rounded-xl border border-line bg-surface px-3 py-2 text-sm"
        @change="workspace.setFilter('status', ($event.target as HTMLSelectElement).value as never)"
      >
        <option value="all">Todos los estados</option>
        <option v-for="status in STATUSES" :key="status.id" :value="status.id">{{ status.label }}</option>
      </select>
      <select
        :value="workspace.filters.priority"
        class="rounded-xl border border-line bg-surface px-3 py-2 text-sm"
        @change="workspace.setFilter('priority', ($event.target as HTMLSelectElement).value as never)"
      >
        <option value="all">Todas las prioridades</option>
        <option v-for="priority in PRIORITIES" :key="priority.id" :value="priority.id">{{ priority.label }}</option>
      </select>
      <select
        :value="workspace.filters.projectId"
        class="rounded-xl border border-line bg-surface px-3 py-2 text-sm"
        @change="workspace.setFilter('projectId', ($event.target as HTMLSelectElement).value)"
      >
        <option value="all">Todos los proyectos</option>
        <option v-for="project in workspace.projects" :key="project.id" :value="project.id">
          {{ project.name }}
        </option>
      </select>
    </div>

    <div class="mt-4 overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
      <table class="w-full text-left text-sm">
        <thead class="bg-canvas/80 text-[11px] uppercase tracking-wide text-muted">
          <tr>
            <th class="px-4 py-3 font-semibold">Tarea</th>
            <th class="px-4 py-3 font-semibold">Estado</th>
            <th class="px-4 py-3 font-semibold">Prioridad</th>
            <th class="px-4 py-3 font-semibold">Fecha</th>
            <th class="px-4 py-3 font-semibold">Proyecto</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="task in workspace.filteredTasks"
            :key="task.id"
            class="cursor-pointer border-t border-line/80 hover:bg-canvas/70"
            @click="open(task.id)"
          >
            <td class="px-4 py-3">
              <p class="font-medium">{{ task.title }}</p>
              <p v-if="task.description" class="mt-0.5 line-clamp-1 text-xs text-muted">
                {{ task.description }}
              </p>
            </td>
            <td class="px-4 py-3"><StatusBadge :status="task.status" /></td>
            <td class="px-4 py-3"><PriorityBadge :priority="task.priority" /></td>
            <td class="px-4 py-3">
              <span :class="isOverdue(task.dueDate, task.status) ? 'font-medium text-rose-600' : 'text-muted'">
                {{ dueLabel(task.dueDate) }}
              </span>
            </td>
            <td class="px-4 py-3">
              <span class="inline-flex items-center gap-2 text-xs font-medium">
                <span class="size-2 rounded-full" :style="{ background: task.project?.color }" />
                {{ task.project?.name }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="!workspace.filteredTasks.length" class="p-6">
        <EmptyState
          title="Nada por aquí"
          description="Prueba otro filtro o crea una tarea para empezar el tablero."
        >
          <template #icon><Inbox class="size-5" /></template>
        </EmptyState>
      </div>
    </div>
  </div>
</template>
