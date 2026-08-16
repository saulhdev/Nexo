<script setup lang="ts">
import { statusMeta } from '@/constants'
import type { TaskStatus } from '@/types'

const props = defineProps<{ status: TaskStatus }>()
const meta = statusMeta(props.status)

const tones: Record<string, string> = {
  stone: 'bg-stone-100 text-stone-700 ring-stone-200',
  sky: 'bg-sky-50 text-sky-800 ring-sky-200',
  amber: 'bg-amber-50 text-amber-800 ring-amber-200',
  emerald: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
}
</script>

<template>
  <span
    class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset"
    :class="tones[meta.tone]"
  >
    {{ meta.label }}
  </span>
</template>
