<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { Calendar, FileText, Grid2x2, Paperclip, X } from 'lucide-vue-next'
import CustomSelect from '@/components/CustomSelect.vue'
import { getPriorityFromUrgencyImportance, getQuadrantFromTask, getUrgencyImportanceFromPriority, PRIORITIES, STATUSES } from '@/constants'
import { useI18n } from '@/i18n'
import { useWorkspaceStore } from '@/stores/workspace'
import type { Task, TaskPriority, TaskStatus } from '@/types'


const { t } = useI18n()

const props = withDefaults(
  defineProps<{
    taskToEdit?: Task | null
    defaultStatus?: TaskStatus
    defaultPriority?: TaskPriority
    defaultUrgent?: boolean
    defaultImportant?: boolean
    compact?: boolean
    autoOpen?: boolean
    showButton?: boolean
  }>(),
  { autoOpen: false, showButton: true },
)

const emit = defineEmits<{ created: [id: string]; updated: [id: string]; cancel: [] }>()
const workspace = useWorkspaceStore()
const open = ref(props.autoOpen)
const submitting = ref(false)
const editingTaskId = ref<string | null>(null)

const pendingFiles = ref<{ file: File; previewUrl?: string }[]>([])
const fileInputRef = ref<HTMLInputElement | null>(null)

const initialUrgent = props.defaultUrgent ?? (props.defaultPriority ? getUrgencyImportanceFromPriority(props.defaultPriority).isUrgent : false)
const initialImportant = props.defaultImportant ?? (props.defaultPriority ? getUrgencyImportanceFromPriority(props.defaultPriority).isImportant : true)

const form = reactive({
  title: '',
  description: '',
  status: (props.defaultStatus ?? 'todo') as TaskStatus,
  isUrgent: initialUrgent,
  isImportant: initialImportant,
  priority: (props.defaultPriority ?? getPriorityFromUrgencyImportance(initialUrgent, initialImportant)) as TaskPriority,
  startDate: '',
  dueDate: '',
  projectId: '',
  assigneeId: '',
})

const isEditing = computed(() => Boolean(editingTaskId.value))

const currentQuadrant = computed(() =>
  getQuadrantFromTask({ isUrgent: form.isUrgent, isImportant: form.isImportant, priority: form.priority }),
)

const canSubmit = computed(() => form.title.trim().length > 0 && Boolean(form.projectId))

const projectOptions = computed(() =>
  workspace.projects.map((p) => ({ label: p.name, value: p.id }))
)

const assigneeOptions = computed(() => [
  { label: t('common.unassigned'), value: '' },
  ...workspace.users.map((u) => ({ label: u.fullName, value: u.id })),
])


watch(
  () => props.taskToEdit,
  (task) => {
    if (task) {
      editTask(task)
    }
  },
  { immediate: true },
)

watch(
  () => props.defaultStatus,
  (val) => {
    if (val && !isEditing.value) form.status = val
  },
)

function editTask(task: Task) {
  editingTaskId.value = task.id
  form.title = task.title
  form.description = task.description || ''
  form.status = task.status
  form.priority = task.priority
  form.isUrgent = task.isUrgent ?? (task.priority === 'urgent' || task.priority === 'medium')
  form.isImportant = task.isImportant ?? (task.priority === 'urgent' || task.priority === 'high')
  form.startDate = task.startDate ?? ''
  form.dueDate = task.dueDate ?? ''
  form.projectId = task.projectId
  form.assigneeId = task.assigneeId ?? ''
  open.value = true
}

function setUrgent(val: boolean) {
  form.isUrgent = val
  form.priority = getPriorityFromUrgencyImportance(form.isUrgent, form.isImportant)
}

function setImportant(val: boolean) {
  form.isImportant = val
  form.priority = getPriorityFromUrgencyImportance(form.isUrgent, form.isImportant)
}

function onPriorityChange(newPriority: TaskPriority) {
  form.priority = newPriority
  const ui = getUrgencyImportanceFromPriority(newPriority)
  form.isUrgent = ui.isUrgent
  form.isImportant = ui.isImportant
}

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
  editingTaskId.value = null
  form.title = ''
  form.description = ''
  form.status = props.defaultStatus ?? 'todo'
  form.isUrgent = props.defaultUrgent ?? false
  form.isImportant = props.defaultImportant ?? true
  form.priority = props.defaultPriority ?? getPriorityFromUrgencyImportance(form.isUrgent, form.isImportant)
  form.startDate = ''
  form.dueDate = ''
  form.projectId = workspace.projects[0]?.id ?? ''
  form.assigneeId = ''
  pendingFiles.value.forEach((item) => {
    if (item.previewUrl) URL.revokeObjectURL(item.previewUrl)
  })
  pendingFiles.value = []
}

function start(taskToStartEdit?: Task) {
  if (taskToStartEdit) {
    editTask(taskToStartEdit)
    return
  }
  reset()
  if (!form.projectId) form.projectId = workspace.projects[0]?.id ?? ''
  open.value = true
}

async function submit() {
  if (!canSubmit.value) return
  submitting.value = true
  try {
    if (isEditing.value && editingTaskId.value) {
      const task = await workspace.updateTask(editingTaskId.value, {
        title: form.title,
        description: form.description,
        status: form.status,
        priority: form.priority,
        isUrgent: form.isUrgent,
        isImportant: form.isImportant,
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
      emit('updated', task.id)
    } else {
      const task = await workspace.createTask({
        title: form.title,
        description: form.description,
        status: form.status,
        priority: form.priority,
        isUrgent: form.isUrgent,
        isImportant: form.isImportant,
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
    }
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

defineExpose({ start, editTask })
</script>

<template>
  <div>
    <button
      v-if="showButton"
      type="button"
      class="inline-flex items-center gap-2 rounded-xl bg-accent px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-dark cursor-pointer"
      @click="start()"
    >
      {{ t('composer.newTask') }}
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
                <h2 class="text-xl font-semibold text-ink">{{ isEditing ? t('composer.editTitle') : t('composer.createTitle') }}</h2>
                <p class="text-xs text-muted">
                  {{ isEditing ? t('composer.editSubtitle') : t('composer.createSubtitle') }}
                </p>
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
                <label class="block text-xs font-semibold uppercase tracking-wider text-muted">{{ t('composer.taskName') }}</label>
                <input
                  v-model="form.title"
                  autofocus
                  class="mt-1.5 w-full rounded-xl border border-line bg-canvas px-4 py-2.5 text-sm font-medium text-ink outline-none focus:border-accent transition"
                  :placeholder="t('composer.taskNamePlaceholder')"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold uppercase tracking-wider text-muted">{{ t('composer.description') }}</label>
                <textarea
                  v-model="form.description"
                  rows="3"
                  class="mt-1.5 w-full resize-none rounded-xl border border-line bg-canvas px-4 py-2.5 text-sm text-ink outline-none focus:border-accent transition"
                  :placeholder="t('composer.descriptionPlaceholder')"
                />
              </div>

              <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label class="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">{{ t('composer.project') }}</label>
                  <CustomSelect
                    v-model="form.projectId"
                    :options="projectOptions"
                    :placeholder="t('composer.selectProject')"
                    filter
                  />
                </div>

                <div>
                  <label class="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">{{ t('composer.assignee') }}</label>
                  <CustomSelect
                    v-model="form.assigneeId"
                    :options="assigneeOptions"
                    filter
                  />
                </div>

                <div>
                  <label class="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">{{ t('composer.status') }}</label>
                  <CustomSelect
                    v-model="form.status"
                    :options="STATUSES"
                  />
                </div>
              </div>

              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label class="block text-xs font-semibold uppercase tracking-wider text-muted">{{ t('composer.startDate') }}</label>
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
                  <label class="block text-xs font-semibold uppercase tracking-wider text-muted">{{ t('composer.dueDate') }}</label>
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

              <!-- MATRIZ DE EISENHOWER & PRIORIDAD -->
              <div class="rounded-xl border border-line bg-canvas/60 p-4">
                <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div class="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted">
                    <Grid2x2 class="size-4 text-accent" />
                    <span>{{ t('eisenhower.title') }}</span>
                  </div>
                  <span
                    class="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium"
                    :class="currentQuadrant.badgeClass"
                  >
                    <span>{{ currentQuadrant.name }}:</span>
                    <strong class="font-semibold">{{ currentQuadrant.action }}</strong>
                  </span>
                </div>

                <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <label class="block text-[11px] font-semibold text-muted mb-1">{{ t('eisenhower.urgency') }}</label>
                    <div class="grid grid-cols-2 gap-1 rounded-lg border border-line bg-surface p-1">
                      <button
                        type="button"
                        class="rounded-md px-2 py-1 text-xs font-medium transition cursor-pointer"
                        :class="form.isUrgent ? 'bg-rose-500/15 text-rose-600 font-semibold' : 'text-muted hover:text-ink'"
                        @click="setUrgent(true)"
                      >
                        {{ t('eisenhower.urgent') }}
                      </button>
                      <button
                        type="button"
                        class="rounded-md px-2 py-1 text-xs font-medium transition cursor-pointer"
                        :class="!form.isUrgent ? 'bg-canvas text-ink font-semibold' : 'text-muted hover:text-ink'"
                        @click="setUrgent(false)"
                      >
                        {{ t('eisenhower.notUrgent') }}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label class="block text-[11px] font-semibold text-muted mb-1">{{ t('eisenhower.importance') }}</label>
                    <div class="grid grid-cols-2 gap-1 rounded-lg border border-line bg-surface p-1">
                      <button
                        type="button"
                        class="rounded-md px-2 py-1 text-xs font-medium transition cursor-pointer"
                        :class="form.isImportant ? 'bg-amber-500/15 text-amber-600 font-semibold' : 'text-muted hover:text-ink'"
                        @click="setImportant(true)"
                      >
                        {{ t('eisenhower.important') }}
                      </button>
                      <button
                        type="button"
                        class="rounded-md px-2 py-1 text-xs font-medium transition cursor-pointer"
                        :class="!form.isImportant ? 'bg-canvas text-ink font-semibold' : 'text-muted hover:text-ink'"
                        @click="setImportant(false)"
                      >
                        {{ t('eisenhower.notImportant') }}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label class="block text-[11px] font-semibold text-muted mb-1">{{ t('eisenhower.assignedPriority') }}</label>
                    <CustomSelect
                      :modelValue="form.priority"
                      :options="PRIORITIES"
                      size="small"
                      @update:modelValue="onPriorityChange($event as TaskPriority)"
                    />
                  </div>
                </div>
              </div>

              <!-- SECCIÓN ARCHIVOS ADJUNTOS -->
              <div>
                <div class="flex items-center justify-between">
                  <label class="block text-xs font-semibold uppercase tracking-wider text-muted">{{ t('composer.attachments') }}</label>
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
                    {{ t('composer.attachFiles') }}
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
                      :title="t('composer.removeFile')"
                      @click="removePendingFile(idx)"
                    >
                      <X class="size-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              <div class="mt-6 flex justify-end gap-3 border-t border-line pt-4">
                <button type="button" class="ghost cursor-pointer" @click="cancel">{{ t('common.cancel') }}</button>
                <button type="submit" class="primary cursor-pointer" :disabled="!canSubmit || submitting">
                  {{ submitting ? (pendingFiles.length ? t('composer.uploadingFiles') : (isEditing ? t('composer.savingEdit') : t('composer.creatingTask'))) : (isEditing ? t('composer.saveEdit') : t('composer.createTask')) }}
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
