<script setup lang="ts">
import { PRIORITY_LABEL, STATUS_LABEL } from '@/constants'
import { formatDate, formatDateTime } from '@/lib/dates'
import type { Activity, TaskPriority, TaskStatus } from '@/types'

const props = defineProps<{
  item: Activity
  showTask?: boolean
}>()

function text() {
  const { type, meta } = props.item
  if (type === 'task.created') return 'creó la tarea'
  if (type === 'task.updated' && meta.field === 'title') return 'cambió el título'
  if (type === 'task.updated') return 'actualizó la descripción'
  if (type === 'status.changed') {
    return `movió de ${STATUS_LABEL[meta.from as TaskStatus]} a ${STATUS_LABEL[meta.to as TaskStatus]}`
  }
  if (type === 'priority.changed') {
    return `cambió la prioridad de ${PRIORITY_LABEL[meta.from as TaskPriority]} a ${PRIORITY_LABEL[meta.to as TaskPriority]}`
  }
  if (type === 'start_date.changed') {
    return `cambió la fecha de inicio a ${meta.to ? formatDate(String(meta.to)) : 'sin fecha'}`
  }
  if (type === 'due_date.changed') {
    return `cambió la fecha de vencimiento a ${meta.to ? formatDate(String(meta.to)) : 'sin fecha'}`
  }
  if (type === 'comment.added') return 'comentó'
  if (type === 'attachment.added') return `adjuntó "${meta.name || 'un archivo'}"`
  if (type === 'attachment.removed') return `eliminó el adjunto "${meta.name || 'un archivo'}"`
  return 'actualizó la tarea'
}
</script>

<template>
  <div class="flex gap-3">
    <div class="mt-1.5 size-2 shrink-0 rounded-full bg-accent/80" />
    <div class="min-w-0">
      <p class="text-sm text-ink">
        <span class="font-medium">{{ item.authorName || 'Alguien' }}</span>
        {{ text() }}
        <span v-if="showTask && item.taskTitle" class="text-muted"> · {{ item.taskTitle }}</span>
      </p>
      <p v-if="item.type === 'comment.added' && item.meta.preview" class="mt-1 text-sm text-muted">
        “{{ item.meta.preview }}”
      </p>
      <p class="mt-0.5 text-xs text-muted">{{ formatDateTime(item.createdAt) }}</p>
    </div>
  </div>
</template>
