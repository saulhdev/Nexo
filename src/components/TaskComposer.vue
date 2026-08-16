<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { Calendar, ChevronDown, FileText, Flag, Folder, ListTodo, Paperclip, UserCheck, X } from 'lucide-vue-next'
import { PRIORITIES, STATUSES } from '@/constants'
import { useWorkspaceStore } from '@/stores/workspace'
import type { TaskPriority, TaskStatus } from '@/types'

const props = withDefaults(
  defineProps<{
    defaultStatus?: TaskStatus
    compact?: boolean
    autoOpen?: boolean
    showButton?: boolean
  }>(),
  { autoOpen: false, showButton: true },
)

const emit = defineEmits<{ created: [id: string]; cancel: [] }>()
const workspace = useWorkspaceStore()
const open = ref(props.autoOpen)
const submitting = ref(false)

const pendingFiles = ref<{ file: File; previewUrl?: string }[]>([])
const fileInputRef = ref<HTMLInputElement | null>(null)

const form = reactive({
  title: '',
  description: '',
  status: (props.defaultStatus ?? 'todo') as TaskStatus,
  priority: 'medium' as TaskPriority,
  startDate: '',
  dueDate: '',
  projectId: '',
  assigneeId: '',
})

const canSubmit = computed(() => form.title.trim().length > 0 && Boolean(form.projectId))

watch(
  () => props.defaultStatus,
  (val) => {
    if (val) form.status = val
  },
)

function triggerFileSelect() {
  fileInputRef.value?.click()
}

function onFilesSelected(e: Event) {
  const target = e.target as HTMLInputElement
  if (!target.files?.length) return
  for (let i = 0; i < target.files.length; i++) {
    const file = target.files[i]
    const isImage = file.type.startsWith('image/')
    pendingFiles.value.push({
      file,
      previewUrl: isImage ? URL.createObjectURL(file) : undefined,
    })
  }
  target.value = ''
}

function removePendingFile(index: number) {
  const removed = pendingFiles.value[index]
  if (removed?.previewUrl) {
    URL.revokeObjectURL(removed.previewUrl)
  }
  pendingFiles.value.splice(index, 1)
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function reset() {
  form.title = ''
  form.description = ''
  form.status = props.defaultStatus ?? 'todo'
  form.priority = 'medium'
  form.startDate = ''
  form.dueDate = ''
  form.projectId = workspace.projects[0]?.id ?? ''
  form.assigneeId = ''
  pendingFiles.value.forEach((item) => {
    if (item.previewUrl) URL.revokeObjectURL(item.previewUrl)
  })
  pendingFiles.value = []
}

function start() {
  if (!form.projectId) form.projectId = workspace.projects[0]?.id ?? ''
  open.value = true
}

async function submit() {
  if (!canSubmit.value) return
  submitting.value = true
  try {
    const task = await workspace.createTask({
      title: form.title,
      description: form.description,
      status: form.status,
      priority: form.priority,
      startDate: form.startDate || null,
      dueDate: form.dueDate || null,
      projectId: form.projectId,
      assigneeId: form.assigneeId || null,
    })

    if (pendingFiles.value.length > 0) {
      for (const item of pendingFiles.value) {
        await workspace.uploadAttachment(item.file, task.id)
      }
    }

    reset()
    open.value = false
    emit('created', task.id)
  } finally {
    submitting.value = false
  }
}

function cancel() {
  reset()
  open.value = false
  emit('cancel')
}

onMounted(() => {
  if (props.autoOpen) start()
})

defineExpose({ start })
</script>

<template>
  <div>
    <button
      v-if="showButton"
      type="button"
      class="inline-flex items-center gap-2 rounded-xl bg-accent px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-dark cursor-pointer"
      @click="start"
    >
      Nueva tarea
    </button>

    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="open"
          class="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-ink/40 p-4 backdrop-blur-xs"
        >
          <div class="w-full max-w-3xl rounded-2xl border border-line bg-surface p-6 shadow-2xl">
            <header class="flex items-center justify-between border-b border-line pb-4">
              <div>
                <h2 class="text-xl font-semibold text-ink">Nueva tarea</h2>
                <p class="text-xs text-muted">Crea y organiza una nueva tarea en tu espacio de trabajo.</p>
              </div>
              <button
                type="button"
                class="rounded-lg p-1.5 text-muted hover:bg-canvas hover:text-ink cursor-pointer"
                @click="cancel"
              >
                <X class="size-5" />
              </button>
            </header>

            <form class="mt-5 space-y-5" @submit.prevent="submit">
              <div>
                <label class="block text-xs font-semibold uppercase tracking-wider text-muted">Nombre de la tarea</label>
                <input
                  v-model="form.title"
                  autofocus
                  class="mt-1.5 w-full rounded-xl border border-line bg-canvas px-4 py-2.5 text-sm font-medium text-ink outline-none focus:border-accent transition"
                  placeholder="Ej: Diseñar flujo de autenticación y permisos"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold uppercase tracking-wider text-muted">Descripción</label>
                <textarea
                  v-model="form.description"
                  rows="3"
                  class="mt-1.5 w-full resize-none rounded-xl border border-line bg-canvas px-4 py-2.5 text-sm text-ink outline-none focus:border-accent transition"
                  placeholder="Qué hay que hacer, contexto, criterios de cierre…"
                />
              </div>

              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label class="block text-xs font-semibold uppercase tracking-wider text-muted">Proyecto</label>
                  <div class="relative mt-1.5">
                    <Folder class="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
                    <select
                      v-model="form.projectId"
                      class="field-input pl-10 pr-9"
                    >
                      <option disabled value="">Seleccionar proyecto</option>
                      <option v-for="project in workspace.projects" :key="project.id" :value="project.id">
                        {{ project.name }}
                      </option>
                    </select>
                    <ChevronDown class="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
                  </div>
                </div>

                <div>
                  <label class="block text-xs font-semibold uppercase tracking-wider text-muted">Asignado a</label>
                  <div class="relative mt-1.5">
                    <UserCheck class="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
                    <select
                      v-model="form.assigneeId"
                      class="field-input pl-10 pr-9"
                    >
                      <option value="">Sin asignar</option>
                      <option v-for="user in workspace.users" :key="user.id" :value="user.id">
                        {{ user.fullName }}
                      </option>
                    </select>
                    <ChevronDown class="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
                  </div>
                </div>

                <div>
                  <label class="block text-xs font-semibold uppercase tracking-wider text-muted">Estado</label>
                  <div class="relative mt-1.5">
                    <ListTodo class="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
                    <select
                      v-model="form.status"
                      class="field-input pl-10 pr-9"
                    >
                      <option v-for="status in STATUSES" :key="status.id" :value="status.id">
                        {{ status.label }}
                      </option>
                    </select>
                    <ChevronDown class="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
                  </div>
                </div>

                <div>
                  <label class="block text-xs font-semibold uppercase tracking-wider text-muted">Prioridad</label>
                  <div class="relative mt-1.5">
                    <Flag class="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
                    <select
                      v-model="form.priority"
                      class="field-input pl-10 pr-9"
                    >
                      <option v-for="priority in PRIORITIES" :key="priority.id" :value="priority.id">
                        {{ priority.label }}
                      </option>
                    </select>
                    <ChevronDown class="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
                  </div>
                </div>
              </div>

              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label class="block text-xs font-semibold uppercase tracking-wider text-muted">Fecha de inicio</label>
                  <div class="relative mt-1.5">
                    <Calendar class="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
                    <input
                      v-model="form.startDate"
                      type="date"
                      class="field-input pl-10 pr-3"
                    />
                  </div>
                </div>

                <div>
                  <label class="block text-xs font-semibold uppercase tracking-wider text-muted">Fecha de vencimiento</label>
                  <div class="relative mt-1.5">
                    <Calendar class="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
                    <input
                      v-model="form.dueDate"
                      type="date"
                      class="field-input pl-10 pr-3"
                    />
                  </div>
                </div>
              </div>

              <!-- SECCIÓN ARCHIVOS ADJUNTOS -->
              <div>
                <div class="flex items-center justify-between">
                  <label class="block text-xs font-semibold uppercase tracking-wider text-muted">Archivos adjuntos</label>
                  <input
                    ref="fileInputRef"
                    type="file"
                    multiple
                    class="hidden"
                    @change="onFilesSelected"
                  />
                  <button
                    type="button"
                    class="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline cursor-pointer"
                    @click="triggerFileSelect"
                  >
                    <Paperclip class="size-3.5" />
                    Adjuntar archivos
                  </button>
                </div>

                <div v-if="pendingFiles.length" class="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  <div
                    v-for="(item, idx) in pendingFiles"
                    :key="idx"
                    class="group relative flex items-center gap-2.5 rounded-xl border border-line bg-canvas p-2.5 text-xs"
                  >
                    <div v-if="item.previewUrl" class="size-9 shrink-0 overflow-hidden rounded-lg bg-line/50">
                      <img :src="item.previewUrl" :alt="item.file.name" class="size-full object-cover" />
                    </div>
                    <div v-else class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                      <FileText class="size-4" />
                    </div>
                    <div class="min-w-0 flex-1">
                      <p class="truncate font-medium text-ink" :title="item.file.name">{{ item.file.name }}</p>
                      <p class="text-[10px] text-muted">{{ formatFileSize(item.file.size) }}</p>
                    </div>
                    <button
                      type="button"
                      class="rounded-md p-1 text-muted hover:bg-rose-500/10 hover:text-rose-600 cursor-pointer"
                      title="Quitar archivo"
                      @click="removePendingFile(idx)"
                    >
                      <X class="size-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              <div class="mt-6 flex justify-end gap-3 border-t border-line pt-4">
                <button type="button" class="ghost cursor-pointer" @click="cancel">Cancelar</button>
                <button type="submit" class="primary cursor-pointer" :disabled="!canSubmit || submitting">
                  {{ submitting ? (pendingFiles.length ? 'Subiendo archivos…' : 'Creando…') : 'Crear tarea' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.field-input {
  width: 100%;
  appearance: none;
  border: 1px solid var(--color-line);
  background-color: var(--color-canvas);
  border-radius: 0.75rem;
  padding-top: 0.6rem;
  padding-bottom: 0.6rem;
  font-size: 0.875rem;
  color: var(--color-ink);
  outline: none;
  transition: border-color 0.15s ease-in-out;
}
.field-input:focus {
  border-color: var(--color-accent);
}
.ghost {
  border-radius: 0.75rem;
  padding: 0.55rem 1.1rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-muted);
}
.ghost:hover {
  background: var(--color-canvas);
  color: var(--color-ink);
}
.primary {
  border-radius: 0.75rem;
  background: var(--color-accent);
  padding: 0.55rem 1.25rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: white;
}
.primary:disabled {
  opacity: 0.5;
}
</style>
