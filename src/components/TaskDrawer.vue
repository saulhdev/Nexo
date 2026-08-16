<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Trash2, X } from 'lucide-vue-next'
import { PRIORITIES, STATUSES } from '@/constants'
import { formatDateTime } from '@/lib/dates'
import { useWorkspaceStore } from '@/stores/workspace'
import ActivityItem from '@/components/ActivityItem.vue'

const workspace = useWorkspaceStore()
const tab = ref<'comments' | 'activity'>('comments')
const draft = ref('')
const saving = ref(false)
const title = ref('')
const description = ref('')

const task = computed(() => workspace.activeTask)

watch(
  () => task.value,
  (next) => {
    title.value = next?.title ?? ''
    description.value = next?.description ?? ''
  },
  { immediate: true },
)

async function persist(patch: Parameters<typeof workspace.updateTask>[1]) {
  if (!task.value) return
  saving.value = true
  try {
    await workspace.updateTask(task.value.id, patch)
  } finally {
    saving.value = false
  }
}

async function saveTitle() {
  if (!task.value || title.value.trim() === task.value.title) return
  await persist({ title: title.value })
}

async function saveDescription() {
  if (!task.value || description.value === task.value.description) return
  await persist({ description: description.value })
}

async function submitComment() {
  if (!draft.value.trim()) return
  await workspace.addComment(draft.value)
  draft.value = ''
  tab.value = 'comments'
}

async function remove() {
  if (!task.value) return
  if (!confirm('¿Eliminar esta tarea? Esta acción no se puede deshacer.')) return
  await workspace.deleteTask(task.value.id)
}

function close() {
  workspace.closeTask()
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="task" class="fixed inset-0 z-40 bg-ink/30" @click="close" />
    </Transition>
    <Transition name="slide">
      <aside
        v-if="task"
        class="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col border-l border-line bg-surface shadow-2xl"
      >
        <header class="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div class="min-w-0 flex-1">
            <p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Detalle</p>
            <input
              v-model="title"
              class="mt-1 w-full bg-transparent text-xl font-semibold outline-none"
              @blur="saveTitle"
              @keydown.enter.prevent="saveTitle"
            />
          </div>
          <div class="flex items-center gap-1">
            <button class="icon-btn" title="Eliminar" @click="remove">
              <Trash2 class="size-4" />
            </button>
            <button class="icon-btn" title="Cerrar" @click="close">
              <X class="size-4" />
            </button>
          </div>
        </header>

        <div class="grid grid-cols-2 gap-3 border-b border-line px-5 py-4">
          <label class="field-label">
            Estado
            <select :value="task.status" class="field" @change="persist({ status: ($event.target as HTMLSelectElement).value as typeof task.status })">
              <option v-for="status in STATUSES" :key="status.id" :value="status.id">{{ status.label }}</option>
            </select>
          </label>
          <label class="field-label">
            Prioridad
            <select :value="task.priority" class="field" @change="persist({ priority: ($event.target as HTMLSelectElement).value as typeof task.priority })">
              <option v-for="priority in PRIORITIES" :key="priority.id" :value="priority.id">{{ priority.label }}</option>
            </select>
          </label>
          <label class="field-label">
            Fecha
            <input
              :value="task.dueDate ?? ''"
              type="date"
              class="field"
              @change="persist({ dueDate: ($event.target as HTMLInputElement).value || null })"
            />
          </label>
          <label class="field-label">
            Proyecto
            <select :value="task.projectId" class="field" @change="persist({ projectId: ($event.target as HTMLSelectElement).value })">
              <option v-for="project in workspace.projects" :key="project.id" :value="project.id">
                {{ project.name }}
              </option>
            </select>
          </label>
        </div>

        <div class="flex-1 overflow-y-auto scrollbar-thin">
          <section class="px-5 py-4">
            <p class="text-xs font-semibold uppercase tracking-wide text-muted">Descripción</p>
            <textarea
              v-model="description"
              rows="5"
              class="mt-2 w-full resize-y rounded-xl border border-line bg-canvas px-3 py-2 text-sm outline-none focus:border-accent"
              placeholder="Qué hay que hacer, contexto, criterios de cierre…"
              @blur="saveDescription"
            />
            <p class="mt-2 text-[11px] text-muted">
              Creada {{ formatDateTime(task.createdAt) }}
              <span v-if="saving"> · Guardando…</span>
            </p>
          </section>

          <section class="px-5 pb-6">
            <div class="flex gap-4 border-b border-line">
              <button
                class="tab"
                :class="tab === 'comments' && 'tab-active'"
                @click="tab = 'comments'"
              >
                Comentarios ({{ workspace.comments.length }})
              </button>
              <button
                class="tab"
                :class="tab === 'activity' && 'tab-active'"
                @click="tab = 'activity'"
              >
                Actividad
              </button>
            </div>

            <div v-if="tab === 'comments'" class="mt-4 space-y-4">
              <article
                v-for="comment in workspace.comments"
                :key="comment.id"
                class="rounded-xl bg-canvas px-3 py-2.5"
              >
                <div class="flex items-baseline justify-between gap-3">
                  <p class="text-sm font-medium">{{ comment.authorName || 'Tú' }}</p>
                  <p class="text-[11px] text-muted">{{ formatDateTime(comment.createdAt) }}</p>
                </div>
                <p class="mt-1 whitespace-pre-wrap text-sm text-ink/90">{{ comment.body }}</p>
              </article>
              <p v-if="!workspace.comments.length" class="text-sm text-muted">
                Todavía no hay comentarios.
              </p>
              <form class="rounded-xl border border-line p-2" @submit.prevent="submitComment">
                <textarea
                  v-model="draft"
                  rows="3"
                  class="w-full resize-none bg-transparent px-2 py-1 text-sm outline-none"
                  placeholder="Escribe un comentario o una actualización…"
                />
                <div class="flex justify-end">
                  <button
                    type="submit"
                    class="rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
                    :disabled="!draft.trim()"
                  >
                    Publicar
                  </button>
                </div>
              </form>
            </div>

            <div v-else class="mt-4 space-y-4">
              <ActivityItem v-for="item in workspace.activities" :key="item.id" :item="item" />
              <p v-if="!workspace.activities.length" class="text-sm text-muted">
                Sin actividad todavía.
              </p>
            </div>
          </section>
        </div>
      </aside>
    </Transition>
  </Teleport>
</template>

<style scoped>
.icon-btn {
  display: grid;
  place-items: center;
  width: 2rem;
  height: 2rem;
  border-radius: 0.7rem;
  color: var(--color-muted);
}
.icon-btn:hover {
  background: var(--color-canvas);
  color: var(--color-ink);
}
.field-label {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--color-muted);
}
.field {
  border: 1px solid var(--color-line);
  background: var(--color-canvas);
  border-radius: 0.75rem;
  padding: 0.45rem 0.65rem;
  font-size: 0.85rem;
  font-weight: 500;
  letter-spacing: 0;
  text-transform: none;
  color: var(--color-ink);
}
.tab {
  padding: 0.6rem 0;
  font-size: 0.85rem;
  color: var(--color-muted);
  border-bottom: 2px solid transparent;
}
.tab-active {
  color: var(--color-ink);
  border-bottom-color: var(--color-accent);
  font-weight: 600;
}
</style>
