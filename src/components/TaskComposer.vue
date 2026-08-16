<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { PRIORITIES, STATUSES } from '@/constants'
import { useWorkspaceStore } from '@/stores/workspace'
import type { TaskPriority, TaskStatus } from '@/types'

const props = withDefaults(
  defineProps<{
    defaultStatus?: TaskStatus
    compact?: boolean
    autoOpen?: boolean
  }>(),
  { autoOpen: false },
)

const emit = defineEmits<{ created: [id: string]; cancel: [] }>()
const workspace = useWorkspaceStore()
const open = ref(props.autoOpen)
const submitting = ref(false)

const form = reactive({
  title: '',
  description: '',
  status: (props.defaultStatus ?? 'todo') as TaskStatus,
  priority: 'medium' as TaskPriority,
  dueDate: '',
  projectId: '',
})

const canSubmit = computed(() => form.title.trim().length > 1 && Boolean(form.projectId))

function reset() {
  form.title = ''
  form.description = ''
  form.status = props.defaultStatus ?? 'todo'
  form.priority = 'medium'
  form.dueDate = ''
  form.projectId = workspace.projects[0]?.id ?? ''
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
      dueDate: form.dueDate || null,
      projectId: form.projectId,
    })
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
      v-if="!open"
      type="button"
      class="inline-flex items-center gap-2 rounded-xl bg-accent px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-dark"
      @click="start"
    >
      Nueva tarea
    </button>

    <form
      v-else
      class="rounded-2xl border border-line bg-surface p-4 shadow-sm"
      @submit.prevent="submit"
    >
      <input
        v-model="form.title"
        autofocus
        class="w-full bg-transparent text-base font-semibold text-ink outline-none placeholder:text-muted/70"
        placeholder="Nombre de la tarea"
      />
      <textarea
        v-if="!compact"
        v-model="form.description"
        rows="2"
        class="mt-2 w-full resize-none bg-transparent text-sm text-ink outline-none placeholder:text-muted/70"
        placeholder="Descripción (opcional)"
      />
      <div class="mt-3 flex flex-wrap gap-2">
        <select v-model="form.projectId" class="field">
          <option disabled value="">Proyecto</option>
          <option v-for="project in workspace.projects" :key="project.id" :value="project.id">
            {{ project.name }}
          </option>
        </select>
        <select v-model="form.status" class="field">
          <option v-for="status in STATUSES" :key="status.id" :value="status.id">
            {{ status.label }}
          </option>
        </select>
        <select v-model="form.priority" class="field">
          <option v-for="priority in PRIORITIES" :key="priority.id" :value="priority.id">
            {{ priority.label }}
          </option>
        </select>
        <input v-model="form.dueDate" type="date" class="field" />
      </div>
      <div class="mt-4 flex justify-end gap-2">
        <button type="button" class="ghost" @click="cancel">Cancelar</button>
        <button type="submit" class="primary" :disabled="!canSubmit || submitting">
          {{ submitting ? 'Creando…' : 'Crear tarea' }}
        </button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.field {
  border: 1px solid var(--color-line);
  background: var(--color-canvas);
  border-radius: 0.75rem;
  padding: 0.4rem 0.7rem;
  font-size: 0.8rem;
  color: var(--color-ink);
}
.ghost {
  border-radius: 0.75rem;
  padding: 0.45rem 0.85rem;
  font-size: 0.85rem;
  color: var(--color-muted);
}
.primary {
  border-radius: 0.75rem;
  background: var(--color-accent);
  padding: 0.45rem 0.9rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: white;
}
.primary:disabled {
  opacity: 0.5;
}
</style>
