<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Download, FileText, Grid2x2, Paperclip, Trash2, Upload, X } from 'lucide-vue-next'
import CustomDatePicker from '@/components/CustomDatePicker.vue'
import CustomSelect from '@/components/CustomSelect.vue'
import { getPriorityFromUrgencyImportance, getQuadrantFromTask, getUrgencyImportanceFromPriority, PRIORITIES, STATUSES } from '@/constants'
import { useI18n } from '@/i18n'
import { formatDateTime } from '@/lib/dates'
import { useWorkspaceStore } from '@/stores/workspace'
import type { TaskPriority } from '@/types'
import ActivityItem from '@/components/ActivityItem.vue'
import RichTextEditor from '@/components/RichTextEditor.vue'
import RichTextViewer from '@/components/RichTextViewer.vue'

const { t } = useI18n()
const workspace = useWorkspaceStore()
const tab = ref<'comments' | 'attachments' | 'activity'>('comments')
const draft = ref('')
const saving = ref(false)
const uploading = ref(false)
const title = ref('')
const description = ref('')
const fileInputRef = ref<HTMLInputElement | null>(null)

const task = computed(() => workspace.activeTask)
const taskQuadrant = computed(() => (task.value ? getQuadrantFromTask(task.value) : null))

const projectOptions = computed(() =>
  workspace.projects.map((p) => ({ label: p.name, value: p.id }))
)

const assigneeOptions = computed(() => [
  { label: t('common.unassigned'), value: '' },
  ...workspace.users.map((u) => ({ label: u.fullName, value: u.id })),
])


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

async function updateUrgency(isUrgent: boolean) {
  if (!task.value) return
  const isImportant = task.value.isImportant ?? (task.value.priority === 'urgent' || task.value.priority === 'high')
  const newPriority = getPriorityFromUrgencyImportance(isUrgent, isImportant)
  await persist({ isUrgent, isImportant, priority: newPriority })
}

async function updateImportance(isImportant: boolean) {
  if (!task.value) return
  const isUrgent = task.value.isUrgent ?? (task.value.priority === 'urgent' || task.value.priority === 'medium')
  const newPriority = getPriorityFromUrgencyImportance(isUrgent, isImportant)
  await persist({ isUrgent, isImportant, priority: newPriority })
}

async function updatePriority(priority: TaskPriority) {
  if (!task.value) return
  const ui = getUrgencyImportanceFromPriority(priority)
  await persist({ priority, isUrgent: ui.isUrgent, isImportant: ui.isImportant })
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
  if (!confirm(t('drawer.confirmDeleteAttachment'))) return
  await workspace.deleteAttachment(id)
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

async function remove() {
  if (!task.value) return
  if (!confirm(t('drawer.confirmDelete'))) return
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
            <p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">{{ t('drawer.detail') }}</p>
            <input
              v-model="title"
              class="mt-1 w-full bg-transparent text-xl font-semibold outline-none"
              @blur="saveTitle"
              @keydown.enter.prevent="saveTitle"
            />
          </div>
          <div class="flex items-center gap-1">
            <button class="icon-btn" :title="t('drawer.deleteTask')" @click="remove">
              <Trash2 class="size-4" />
            </button>
            <button class="icon-btn" :title="t('common.close')" @click="close">
              <X class="size-4" />
            </button>
          </div>
        </header>

        <!-- SECCIÓN MATRIZ DE EISENHOWER EN DRAWER -->
        <div v-if="taskQuadrant" class="border-b border-line bg-canvas/40 px-5 py-3">
          <div class="flex items-center justify-between gap-2 mb-2">
            <span class="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-muted">
              <Grid2x2 class="size-3.5 text-accent" />
              {{ t('eisenhower.title') }}
            </span>
            <span class="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded border" :class="taskQuadrant.badgeClass">
              {{ taskQuadrant.name }}: {{ taskQuadrant.action }}
            </span>
          </div>
          <div class="grid grid-cols-2 gap-2 text-xs">
            <div class="flex items-center justify-between rounded-lg border border-line bg-surface p-1.5">
              <span class="text-muted font-medium">{{ t('drawer.urgency') }}</span>
              <div class="flex items-center gap-1">
                <button
                  type="button"
                  class="rounded px-2 py-0.5 font-medium transition cursor-pointer"
                  :class="task.isUrgent ? 'bg-rose-500/20 text-rose-600 font-bold' : 'text-muted hover:text-ink'"
                  @click="updateUrgency(true)"
                >
                  {{ t('common.yes') }}
                </button>
                <button
                  type="button"
                  class="rounded px-2 py-0.5 font-medium transition cursor-pointer"
                  :class="!task.isUrgent ? 'bg-canvas text-ink font-bold' : 'text-muted hover:text-ink'"
                  @click="updateUrgency(false)"
                >
                  {{ t('common.no') }}
                </button>
              </div>
            </div>

            <div class="flex items-center justify-between rounded-lg border border-line bg-surface p-1.5">
              <span class="text-muted font-medium">{{ t('drawer.importance') }}</span>
              <div class="flex items-center gap-1">
                <button
                  type="button"
                  class="rounded px-2 py-0.5 font-medium transition cursor-pointer"
                  :class="task.isImportant ? 'bg-amber-500/20 text-amber-600 font-bold' : 'text-muted hover:text-ink'"
                  @click="updateImportance(true)"
                >
                  {{ t('common.yes') }}
                </button>
                <button
                  type="button"
                  class="rounded px-2 py-0.5 font-medium transition cursor-pointer"
                  :class="!task.isImportant ? 'bg-canvas text-ink font-bold' : 'text-muted hover:text-ink'"
                  @click="updateImportance(false)"
                >
                  {{ t('common.no') }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3 border-b border-line px-5 py-4">
          <label class="field-label">
            {{ t('drawer.status') }}
            <CustomSelect
              :modelValue="task.status"
              :options="STATUSES"
              @update:modelValue="persist({ status: $event })"
            />
          </label>
          <label class="field-label">
            {{ t('drawer.priority') }}
            <CustomSelect
              :modelValue="task.priority"
              :options="PRIORITIES"
              @update:modelValue="updatePriority($event as TaskPriority)"
            />
          </label>
          <label class="field-label">
            {{ t('drawer.startDate') }}
            <CustomDatePicker
              :modelValue="task.startDate"
              :placeholder="t('drawer.startDate')"
              showButtonBar
              @update:modelValue="persist({ startDate: $event })"
            />
          </label>
          <label class="field-label">
            {{ t('drawer.dueDate') }}
            <CustomDatePicker
              :modelValue="task.dueDate"
              :placeholder="t('drawer.dueDate')"
              showButtonBar
              @update:modelValue="persist({ dueDate: $event })"
            />
          </label>
          <label class="field-label">
            {{ t('drawer.project') }}
            <CustomSelect
              :modelValue="task.projectId"
              :options="projectOptions"
              @update:modelValue="persist({ projectId: $event })"
            />
          </label>
          <label class="field-label">
            {{ t('drawer.assignee') }}
            <CustomSelect
              :modelValue="task.assigneeId ?? ''"
              :options="assigneeOptions"
              @update:modelValue="persist({ assigneeId: $event || null })"
            />
          </label>
        </div>

        <div class="flex-1 overflow-y-auto scrollbar-thin">
          <section class="px-5 py-4">
            <p class="text-xs font-semibold uppercase tracking-wide text-muted">{{ t('drawer.description') }}</p>
            <RichTextEditor
              v-model="description"
              :placeholder="t('drawer.descriptionPlaceholder')"
              minHeight="110px"
              class="mt-2"
              @blur="saveDescription"
            />
            <p class="mt-2 text-[11px] text-muted">
              {{ t('drawer.created') }} {{ formatDateTime(task.createdAt) }}
              <span v-if="saving"> · {{ t('drawer.savingInline') }}</span>
            </p>
          </section>

          <section class="px-5 pb-6">
            <div class="flex gap-4 border-b border-line">
              <button
                class="tab"
                :class="tab === 'comments' && 'tab-active'"
                @click="tab = 'comments'"
              >
                {{ t('drawer.comments') }} ({{ workspace.comments.length }})
              </button>
              <button
                class="tab flex items-center gap-1.5"
                :class="tab === 'attachments' && 'tab-active'"
                @click="tab = 'attachments'"
              >
                <Paperclip class="size-3.5" />
                {{ t('drawer.attachmentsTab') }} ({{ workspace.attachments.length }})
              </button>
              <button
                class="tab"
                :class="tab === 'activity' && 'tab-active'"
                @click="tab = 'activity'"
              >
                {{ t('drawer.activityTab') }}
              </button>
            </div>

            <!-- TAB COMENTARIOS -->
            <div v-if="tab === 'comments'" class="mt-4 space-y-4">
              <article
                v-for="comment in workspace.comments"
                :key="comment.id"
                class="rounded-xl bg-canvas px-3.5 py-3 border border-line/60 shadow-2xs"
              >
                <div class="flex items-baseline justify-between gap-3 border-b border-line/40 pb-1.5 mb-2">
                  <p class="text-sm font-semibold text-ink">{{ comment.authorName || t('common.you') }}</p>
                  <p class="text-[11px] text-muted">{{ formatDateTime(comment.createdAt) }}</p>
                </div>
                <RichTextViewer :content="comment.body" />
              </article>
              <p v-if="!workspace.comments.length" class="text-sm text-muted">
                {{ t('drawer.noComments') }}
              </p>
              <div class="space-y-2 pt-1">
                <RichTextEditor
                  v-model="draft"
                  :placeholder="t('drawer.commentPlaceholder')"
                  minHeight="80px"
                  @submit="submitComment"
                />
                <div class="flex items-center justify-between">
                  <span class="text-[11px] text-muted">Ctrl + Enter para publicar</span>
                  <button
                    type="button"
                    class="rounded-lg bg-accent px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-accent-dark disabled:opacity-40 transition cursor-pointer"
                    :disabled="!draft.trim()"
                    @click="submitComment"
                  >
                    {{ t('drawer.publish') }}
                  </button>
                </div>
              </div>
            </div>

            <!-- TAB ADJUNTOS -->
            <div v-else-if="tab === 'attachments'" class="mt-4 space-y-4">
              <div class="flex items-center justify-between">
                <p class="text-xs font-semibold uppercase tracking-wide text-muted">{{ t('drawer.attachmentsLabel') }}</p>
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
                  {{ uploading ? t('drawer.uploading') : t('drawer.addAttachment') }}
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
                        {{ t('drawer.open') }}
                      </a>
                    </div>
                  </div>

                  <button
                    type="button"
                    class="rounded-md p-1 text-muted hover:bg-rose-500/10 hover:text-rose-600"
                    :title="t('drawer.deleteAttachment')"
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
                <p class="mt-2 text-sm font-medium">{{ t('drawer.noAttachments') }}</p>
                <p class="mt-1 text-xs text-muted">{{ t('drawer.noAttachmentsHint') }}</p>
                <button
                  type="button"
                  class="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink hover:bg-canvas"
                  @click="triggerFileSelect"
                >
                  <Upload class="size-3.5" />
                  {{ t('drawer.selectFile') }}
                </button>
              </div>
            </div>

            <!-- TAB ACTIVIDAD -->
            <div v-else class="mt-4 space-y-4">
              <ActivityItem v-for="item in workspace.activities" :key="item.id" :item="item" />
              <p v-if="!workspace.activities.length" class="text-sm text-muted">
                {{ t('drawer.noActivity') }}
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
