<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Download, FileText, Paperclip, Trash2, Upload, X } from 'lucide-vue-next'
import { PRIORITIES, STATUSES } from '@/constants'
import { formatDateTime } from '@/lib/dates'
import { useWorkspaceStore } from '@/stores/workspace'
import ActivityItem from '@/components/ActivityItem.vue'

const workspace = useWorkspaceStore()
const tab = ref<'comments' | 'attachments' | 'activity'>('comments')
const draft = ref('')
const saving = ref(false)
const uploading = ref(false)
const title = ref('')
const description = ref('')
const fileInputRef = ref<HTMLInputElement | null>(null)

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

function triggerFileSelect() {
  fileInputRef.value?.click()
}

async function onFileSelected(e: Event) {
  const target = e.target as HTMLInputElement
  const files = target.files
  if (!files || !files.length) return
  uploading.value = true
  try {
    for (let i = 0; i < files.length; i++) {
      await workspace.uploadAttachment(files[i])
    }
    tab.value = 'attachments'
  } finally {
    uploading.value = false
    target.value = ''
  }
}

async function deleteAttachment(id: string) {
  if (!confirm('¿Eliminar este archivo adjunto?')) return
  await workspace.deleteAttachment(id)
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
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
            <button class="icon-btn" title="Eliminar tarea" @click="remove">
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
            Fecha de inicio
            <input
              :value="task.startDate ?? ''"
              type="date"
              class="field"
              @change="persist({ startDate: ($event.target as HTMLInputElement).value || null })"
            />
          </label>
          <label class="field-label">
            Fecha de vencimiento
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
          <label class="field-label">
            Asignado a
            <select :value="task.assigneeId ?? ''" class="field" @change="persist({ assigneeId: ($event.target as HTMLSelectElement).value || null })">
              <option value="">Sin asignar</option>
              <option v-for="user in workspace.users" :key="user.id" :value="user.id">
                {{ user.fullName }}
              </option>
            </select>
          </label>
        </div>

        <div class="flex-1 overflow-y-auto scrollbar-thin">
          <section class="px-5 py-4">
            <p class="text-xs font-semibold uppercase tracking-wide text-muted">Descripción</p>
            <textarea
              v-model="description"
              rows="4"
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
                class="tab flex items-center gap-1.5"
                :class="tab === 'attachments' && 'tab-active'"
                @click="tab = 'attachments'"
              >
                <Paperclip class="size-3.5" />
                Adjuntos ({{ workspace.attachments.length }})
              </button>
              <button
                class="tab"
                :class="tab === 'activity' && 'tab-active'"
                @click="tab = 'activity'"
              >
                Actividad
              </button>
            </div>

            <!-- TAB COMENTARIOS -->
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

            <!-- TAB ADJUNTOS -->
            <div v-else-if="tab === 'attachments'" class="mt-4 space-y-4">
              <div class="flex items-center justify-between">
                <p class="text-xs font-semibold uppercase tracking-wide text-muted">Archivos adjuntos</p>
                <input
                  ref="fileInputRef"
                  type="file"
                  multiple
                  class="hidden"
                  @change="onFileSelected"
                />
                <button
                  type="button"
                  class="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent-dark disabled:opacity-50"
                  :disabled="uploading"
                  @click="triggerFileSelect"
                >
                  <Upload class="size-3.5" />
                  {{ uploading ? 'Subiendo…' : 'Agregar adjunto' }}
                </button>
              </div>

              <div v-if="workspace.attachments.length" class="grid gap-3 sm:grid-cols-2">
                <div
                  v-for="item in workspace.attachments"
                  :key="item.id"
                  class="group relative flex items-start gap-3 rounded-xl border border-line bg-canvas p-3 transition hover:border-accent/40 shadow-xs"
                >
                  <div v-if="item.type.startsWith('image/')" class="size-12 shrink-0 overflow-hidden rounded-lg bg-line/50">
                    <img :src="item.url" :alt="item.name" class="size-full object-cover" />
                  </div>
                  <div v-else class="flex size-12 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                    <FileText class="size-6" />
                  </div>

                  <div class="min-w-0 flex-1">
                    <p class="truncate text-xs font-semibold text-ink" :title="item.name">{{ item.name }}</p>
                    <p class="mt-0.5 text-[11px] text-muted">{{ formatFileSize(item.size) }}</p>
                    <div class="mt-2 flex items-center gap-2">
                      <a
                        :href="item.url"
                        :download="item.name"
                        target="_blank"
                        class="inline-flex items-center gap-1 text-[11px] font-semibold text-accent hover:underline"
                      >
                        <Download class="size-3" />
                        Abrir
                      </a>
                    </div>
                  </div>

                  <button
                    type="button"
                    class="rounded-md p-1 text-muted hover:bg-rose-500/10 hover:text-rose-600"
                    title="Eliminar adjunto"
                    @click="deleteAttachment(item.id)"
                  >
                    <Trash2 class="size-3.5" />
                  </button>
                </div>
              </div>

              <div
                v-else
                class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line p-6 text-center"
              >
                <Paperclip class="size-8 text-muted/60" />
                <p class="mt-2 text-sm font-medium">Sin archivos adjuntos</p>
                <p class="mt-1 text-xs text-muted">Sube documentos, capturas o imágenes relativas a esta tarea.</p>
                <button
                  type="button"
                  class="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink hover:bg-canvas"
                  @click="triggerFileSelect"
                >
                  <Upload class="size-3.5" />
                  Seleccionar archivo
                </button>
              </div>
            </div>

            <!-- TAB ACTIVIDAD -->
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
