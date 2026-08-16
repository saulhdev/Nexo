<script setup lang="ts">
import { reactive } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { APP_NAME } from '@/constants'
import { useI18n } from '@/i18n'
import { useAuthStore } from '@/stores/auth'

const { t } = useI18n()
const auth = useAuthStore()
const router = useRouter()
const form = reactive({ fullName: '', email: '', password: '' })
const notice = reactive({ text: '' })

async function submit() {
  notice.text = ''
  try {
    await auth.signUp(form.email, form.password, form.fullName)
    await router.push('/')
  } catch (err) {
    const msg = err instanceof Error ? err.message : (err as { message?: string })?.message
    notice.text = msg || t('register.error')
  }
}
</script>

<template>
  <div class="grid min-h-screen place-items-center bg-canvas px-4">
    <div class="w-full max-w-md rounded-3xl border border-line bg-surface p-8 shadow-sm">
      <div class="flex items-center gap-2">
        <span class="grid size-8 place-items-center rounded-xl bg-accent text-sm font-bold text-white">N</span>
        <p class="font-semibold">{{ APP_NAME }}</p>
      </div>
      <h1 class="mt-6 text-2xl font-semibold">{{ t('register.title') }}</h1>
      <p class="mt-1 text-sm text-muted">{{ t('register.subtitle') }}</p>
      <form class="mt-6 space-y-3" @submit.prevent="submit">
        <input
          v-model="form.fullName"
          required
          :placeholder="t('register.namePlaceholder')"
          class="w-full rounded-xl border border-line bg-canvas px-3 py-2.5 text-sm outline-none focus:border-accent"
        />
        <input
          v-model="form.email"
          type="email"
          required
          :placeholder="t('register.emailPlaceholder')"
          class="w-full rounded-xl border border-line bg-canvas px-3 py-2.5 text-sm outline-none focus:border-accent"
        />
        <input
          v-model="form.password"
          type="password"
          required
          minlength="6"
          :placeholder="t('register.passwordPlaceholder')"
          class="w-full rounded-xl border border-line bg-canvas px-3 py-2.5 text-sm outline-none focus:border-accent"
        />
        <p v-if="notice.text || auth.error" class="text-sm text-rose-700">{{ notice.text || auth.error }}</p>
        <button
          class="w-full rounded-xl bg-accent py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          :disabled="auth.loading"
        >
          {{ auth.loading ? t('register.submitting') : t('register.submit') }}
        </button>
      </form>
      <p class="mt-4 text-center text-sm text-muted">
        {{ t('register.hasAccount') }}
        <RouterLink class="font-medium text-accent" to="/entrar">{{ t('register.signIn') }}</RouterLink>
      </p>
    </div>
  </div>
</template>
