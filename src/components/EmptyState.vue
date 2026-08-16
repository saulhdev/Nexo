<script setup lang="ts">
defineProps<{
  title: string
  description: string
}>()
</script>

<template>
  <div class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-surface/60 px-6 py-14 text-center">
    <div class="mb-3 grid size-11 place-items-center rounded-2xl bg-canvas text-muted">
      <slot name="icon" />
    </div>
    <h3 class="text-sm font-semibold text-ink">{{ title }}</h3>
    <p class="mt-1 max-w-sm text-sm text-muted">{{ description }}</p>
    <div v-if="$slots.action" class="mt-4">
      <slot name="action" />
    </div>
  </div>
</template>
