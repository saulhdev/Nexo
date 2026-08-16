<script setup lang="ts">
import { watchEffect } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import { useI18n } from '@/i18n'

const route = useRoute()
const { t } = useI18n()

watchEffect(() => {
  const titleKey = route.meta?.titleKey as string | undefined
  if (titleKey) {
    document.title = `${t(titleKey)} | Nexo App`
  } else {
    document.title = 'Nexo App'
  }
})
</script>

<template>
  <RouterView />
</template>

