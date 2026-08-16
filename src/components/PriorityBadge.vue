<script setup lang="ts">
import { priorityMeta } from '@/constants'
import type { TaskPriority } from '@/types'

const props = defineProps<{ priority: TaskPriority; compact?: boolean }>()
const meta = priorityMeta(props.priority)

const tones: Record<string, string> = {
  stone: 'text-stone-500',
  sky: 'text-sky-600',
  orange: 'text-orange-600',
  rose: 'text-rose-600',
}

const dots: Record<string, string> = {
  stone: 'bg-stone-400',
  sky: 'bg-sky-500',
  orange: 'bg-orange-500',
  rose: 'bg-rose-500',
}
</script>

<template>
  <span class="inline-flex items-center gap-1.5 text-xs font-medium" :class="tones[meta.tone]">
    <span class="size-1.5 rounded-full" :class="dots[meta.tone]" />
    <span v-if="!compact">{{ meta.label }}</span>
  </span>
</template>
