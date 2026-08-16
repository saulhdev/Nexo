<script setup lang="ts">
import { reactive } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { APP_NAME } from '@/constants'
import { useI18n } from '@/i18n'
import { useAuthStore } from '@/stores/auth'

const { t } = useI18n()
const auth = useAuthStore()
const router = useRouter()
const route = useRoute()
const form = reactive({ email: '', password: '' })

async function submit() {
  await auth.signIn(form.email, form.password)
  const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
  await router.push(redirect)
}
</script>

<template>
  <div class="grid min-h-screen place-items-center bg-canvas px-4">
    <div class="w-full max-w-md rounded-3xl border border-line bg-surface p-8 shadow-sm">
      <div class="flex items-center gap-2">
        <span class="grid size-8 place-items-center rounded-xl bg-accent text-sm font-bold text-white">N</span>
        <p class="font-semibold">{{ APP_NAME }}</p>
      </div>
      <h1 class="mt-6 text-2xl font-semibold">{{ t('login.title') }}</h1>
      <p class="mt-1 text-sm text-muted">{{ t('login.subtitle') }}</p>
      <form class="mt-6 space-y-3" @submit.prevent="submit">
        <input
          v-model="form.email"
          type="email"
          required
          :placeholder="t('login.emailPlaceholder')"
          class="w-full rounded-xl border border-line bg-canvas px-3 py-2.5 text-sm outline-none focus:border-accent"
        />
        <input
          v-model="form.password"
          type="password"
          required
          minlength="6"
          :placeholder="t('login.passwordPlaceholder')"
          class="w-full rounded-xl border border-line bg-canvas px-3 py-2.5 text-sm outline-none focus:border-accent"
        />
        <p v-if="auth.error" class="text-sm text-rose-700">{{ auth.error }}</p>
        <button
          class="w-full rounded-xl bg-accent py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          :disabled="auth.loading"
        >
          {{ auth.loading ? t('login.submitting') : t('login.submit') }}
        </button>
      </form>
      <p class="mt-4 text-center text-sm text-muted">
        {{ t('login.noAccount') }}
        <RouterLink class="font-medium text-accent" to="/registro">{{ t('login.createOne') }}</RouterLink>
      </p>
    </div>
  </div>
</template>
