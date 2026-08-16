<script setup lang="ts">
import { PRIORITY_LABEL, STATUS_LABEL } from '@/constants'
import { useI18n } from '@/i18n'
import { formatDate, formatDateTime } from '@/lib/dates'
import { stripHtml } from '@/lib/text'
import type { Activity, TaskPriority, TaskStatus } from '@/types'

const { t } = useI18n()

const props = defineProps<{
  item: Activity
  showTask?: boolean
}>()

function text() {
  const { type, meta } = props.item
  if (type === 'task.created') return t('activity.createdTask')
  if (type === 'task.updated' && meta.field === 'title') return t('activity.changedTitle')
  if (type === 'task.updated') return t('activity.updatedDescription')
  if (type === 'status.changed') {
    return t('activity.movedStatus', {
      from: STATUS_LABEL[meta.from as TaskStatus] || String(meta.from),
      to: STATUS_LABEL[meta.to as TaskStatus] || String(meta.to),
    })
  }
  if (type === 'priority.changed') {
    return t('activity.changedPriority', {
      from: PRIORITY_LABEL[meta.from as TaskPriority] || String(meta.from),
      to: PRIORITY_LABEL[meta.to as TaskPriority] || String(meta.to),
    })
  }
  if (type === 'start_date.changed') {
    return t('activity.changedStartDate', {
      date: meta.to ? formatDate(String(meta.to)) : t('dates.noDate').toLowerCase(),
    })
  }
  if (type === 'due_date.changed') {
    return t('activity.changedDueDate', {
      date: meta.to ? formatDate(String(meta.to)) : t('dates.noDate').toLowerCase(),
    })
  }
  if (type === 'assignee.changed') {
    if (!meta.toId && !meta.toName) return t('activity.unassigned')
    return t('activity.assignedTo', { name: String(meta.toName || t('activity.aUser')) })
  }
  if (type === 'comment.added') return t('activity.commented')
  if (type === 'attachment.added') return t('activity.attachedFile', { name: String(meta.name || t('activity.aFile')) })
  if (type === 'attachment.removed') return t('activity.removedAttachment', { name: String(meta.name || t('activity.aFile')) })
  return t('activity.updatedTask')
}
</script>

<template>
  <div class="flex gap-3">
    <div class="mt-1.5 size-2 shrink-0 rounded-full bg-accent/80" />
    <div class="min-w-0">
      <p class="text-sm text-ink">
        <span class="font-medium">{{ item.authorName || t('common.someone') }}</span>
        {{ text() }}
        <span v-if="showTask && item.taskTitle" class="text-muted"> · {{ item.taskTitle }}</span>
      </p>
      <p v-if="item.type === 'comment.added' && item.meta.preview" class="mt-1 text-sm text-muted">
        “{{ stripHtml(item.meta.preview) }}”
      </p>
      <p class="mt-0.5 text-xs text-muted">{{ formatDateTime(item.createdAt) }}</p>
    </div>
  </div>
</template>
