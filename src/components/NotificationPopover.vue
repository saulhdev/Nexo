<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { Bell, Check, Clock, AlertTriangle, CheckCircle2 } from 'lucide-vue-next'
import { useWorkspaceStore } from '@/stores/workspace'
import { useI18n } from '@/i18n'
import { isDueSoon, isOverdue } from '@/lib/dates'

const workspace = useWorkspaceStore()
const { t } = useI18n()

const isOpen = ref(false)
const popoverRef = ref<HTMLElement | null>(null)
const readNotificationIds = ref<Set<string>>(new Set())

// Build notifications from overdue/dueSoon tasks and recent activities
const notifications = computed(() => {
  const list: Array<{
    id: string
    title: string
    subtitle: string
    type: 'overdue' | 'due_soon' | 'activity'
    timestamp?: string
    taskId?: string
  }> = []

  // Add overdue tasks
  workspace.tasks.forEach((task) => {
    if (task.status !== 'done' && isOverdue(task.dueDate)) {
      list.push({
        id: `overdue-${task.id}`,
        title: task.title,
        subtitle: t('status.todo.hint') || 'Tarea vencida',
        type: 'overdue',
        taskId: task.id,
      })
    } else if (task.status !== 'done' && isDueSoon(task.dueDate)) {
      list.push({
        id: `due-${task.id}`,
        title: task.title,
        subtitle: 'Vence pronto',
        type: 'due_soon',
        taskId: task.id,
      })
    }
  })

  // Add recent activities
  workspace.recentActivities.slice(0, 5).forEach((act) => {
    const task = workspace.tasks.find((t) => t.id === act.taskId)
    list.push({
      id: `act-${act.id}`,
      title: task ? task.title : 'Actividad reciente',
      subtitle: act.action,
      type: 'activity',
      timestamp: act.createdAt,
      taskId: act.taskId,
    })
  })

  return list
})

const unreadCount = computed(() => {
  return notifications.value.filter((n) => !readNotificationIds.value.has(n.id)).length
})

function togglePopover() {
  isOpen.value = !isOpen.value
}

function closePopover() {
  isOpen.value = false
}

function markAllAsRead() {
  notifications.value.forEach((n) => readNotificationIds.value.add(n.id))
}

function handleNotificationClick(taskId?: string, id?: string) {
  if (id) readNotificationIds.value.add(id)
  if (taskId) {
    void workspace.openTask(taskId)
  }
  closePopover()
}

function handleClickOutside(e: MouseEvent) {
  if (popoverRef.value && !popoverRef.value.contains(e.target as Node)) {
    closePopover()
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div ref="popoverRef" class="relative inline-block text-left">
    <button
      class="relative grid size-9 place-items-center rounded-xl border border-line bg-surface text-ink/70 transition hover:bg-canvas hover:text-ink focus:outline-none"
      :title="t('common.notifications')"
      @click.stop="togglePopover"
    >
      <Bell class="size-4.5" />
      <span
        v-if="unreadCount > 0"
        class="absolute -right-1 -top-1 grid min-w-4.5 h-4.5 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-white shadow-xs"
      >
        {{ unreadCount > 9 ? '9+' : unreadCount }}
      </span>
    </button>

    <!-- Popover dropdown -->
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="transform scale-95 opacity-0"
      enter-to-class="transform scale-100 opacity-100"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="transform scale-100 opacity-100"
      leave-to-class="transform scale-95 opacity-0"
    >
      <div
        v-if="isOpen"
        class="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-line bg-surface p-3 shadow-xl z-50"
      >
        <div class="flex items-center justify-between border-b border-line pb-2.5 px-2">
          <div class="flex items-center gap-2">
            <Bell class="size-4 text-accent" />
            <h4 class="text-sm font-semibold text-ink">{{ t('common.notifications') }}</h4>
            <span v-if="unreadCount > 0" class="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
              {{ unreadCount }}
            </span>
          </div>
          <button
            v-if="unreadCount > 0"
            class="flex items-center gap-1 text-xs font-medium text-muted hover:text-ink transition"
            @click="markAllAsRead"
          >
            <Check class="size-3.5" />
            {{ t('common.markAllAsRead') }}
          </button>
        </div>

        <div class="mt-2 max-h-80 overflow-y-auto scrollbar-thin space-y-1">
          <div
            v-if="notifications.length === 0"
            class="py-8 text-center text-xs text-muted"
          >
            <CheckCircle2 class="mx-auto size-8 text-forest/40 mb-2" />
            {{ t('common.noNotifications') }}
          </div>

          <button
            v-for="item in notifications"
            :key="item.id"
            class="flex w-full items-start gap-3 rounded-xl p-2.5 text-left transition hover:bg-canvas"
            :class="readNotificationIds.has(item.id) ? 'opacity-60' : 'bg-surface'"
            @click="handleNotificationClick(item.taskId, item.id)"
          >
            <div
              class="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg"
              :class="{
                'bg-rose-100 text-rose-600': item.type === 'overdue',
                'bg-amber-100 text-amber-600': item.type === 'due_soon',
                'bg-accent/10 text-accent': item.type === 'activity'
              }"
            >
              <AlertTriangle v-if="item.type === 'overdue'" class="size-3.5" />
              <Clock v-else-if="item.type === 'due_soon'" class="size-3.5" />
              <Bell v-else class="size-3.5" />
            </div>

            <div class="min-w-0 flex-1">
              <p class="truncate text-xs font-medium text-ink">{{ item.title }}</p>
              <p class="truncate text-[11px] text-muted">{{ item.subtitle }}</p>
            </div>

            <span v-if="!readNotificationIds.has(item.id)" class="mt-1.5 size-2 rounded-full bg-accent shrink-0" />
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>
