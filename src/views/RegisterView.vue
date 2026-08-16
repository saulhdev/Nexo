<script setup lang="ts">
import { reactive } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { APP_NAME } from '@/constants'
import { useAuthStore } from '@/stores/auth'

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
    notice.text = err instanceof Error ? err.message : 'No se pudo crear la cuenta'
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
      <h1 class="mt-6 text-2xl font-semibold">Crear cuenta</h1>
      <p class="mt-1 text-sm text-muted">Empieza con un espacio de trabajo propio.</p>
      <form class="mt-6 space-y-3" @submit.prevent="submit">
        <input
          v-model="form.fullName"
          required
          placeholder="Nombre"
          class="w-full rounded-xl border border-line bg-canvas px-3 py-2.5 text-sm outline-none focus:border-accent"
        />
        <input
          v-model="form.email"
          type="email"
          required
          placeholder="correo@equipo.com"
          class="w-full rounded-xl border border-line bg-canvas px-3 py-2.5 text-sm outline-none focus:border-accent"
        />
        <input
          v-model="form.password"
          type="password"
          required
          minlength="6"
          placeholder="Contraseña (mín. 6)"
          class="w-full rounded-xl border border-line bg-canvas px-3 py-2.5 text-sm outline-none focus:border-accent"
        />
        <p v-if="notice.text || auth.error" class="text-sm text-rose-700">{{ notice.text || auth.error }}</p>
        <button
          class="w-full rounded-xl bg-accent py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          :disabled="auth.loading"
        >
          {{ auth.loading ? 'Creando…' : 'Crear cuenta' }}
        </button>
      </form>
      <p class="mt-4 text-center text-sm text-muted">
        ¿Ya tienes cuenta?
        <RouterLink class="font-medium text-accent" to="/entrar">Entrar</RouterLink>
      </p>
    </div>
  </div>
</template>
