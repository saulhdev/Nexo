<script setup lang="ts">
import { reactive, ref, watchEffect } from 'vue'
import { CheckCircle2, KeyRound, Mail, User as UserIcon } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()

const profileForm = reactive({
  fullName: '',
})

const securityForm = reactive({
  password: '',
  confirmPassword: '',
})

const profileSuccess = ref('')
const securitySuccess = ref('')
const securityError = ref('')

watchEffect(() => {
  if (auth.user) {
    profileForm.fullName = auth.user.fullName
  }
})

async function saveProfile() {
  profileSuccess.value = ''
  try {
    await auth.updateProfile({ fullName: profileForm.fullName })
    profileSuccess.value = 'Nombre actualizado correctamente'
    setTimeout(() => {
      profileSuccess.value = ''
    }, 4000)
  } catch {
    /* error handled in auth store */
  }
}

async function savePassword() {
  securitySuccess.value = ''
  securityError.value = ''

  if (securityForm.password.length < 6) {
    securityError.value = 'La contraseña debe tener al menos 6 caracteres'
    return
  }

  if (securityForm.password !== securityForm.confirmPassword) {
    securityError.value = 'Las contraseñas no coinciden'
    return
  }

  try {
    await auth.updateProfile({ password: securityForm.password })
    securityForm.password = ''
    securityForm.confirmPassword = ''
    securitySuccess.value = 'Contraseña actualizada con éxito'
    setTimeout(() => {
      securitySuccess.value = ''
    }, 4000)
  } catch (err) {
    securityError.value = err instanceof Error ? err.message : 'Error al actualizar contraseña'
  }
}
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-6">
    <div>
      <h1 class="text-3xl font-semibold tracking-tight">Mi Perfil</h1>
      <p class="mt-1 text-sm text-muted">Gestiona la información de tu cuenta y preferencias de seguridad.</p>
    </div>

    <!-- Información General -->
    <section class="rounded-3xl border border-line bg-surface p-6 shadow-sm sm:p-8">
      <div class="flex items-center gap-3 border-b border-line pb-4">
        <div class="grid size-10 place-items-center rounded-2xl bg-accent/10 text-accent">
          <UserIcon class="size-5" />
        </div>
        <div>
          <h2 class="text-base font-semibold">Información del Usuario</h2>
          <p class="text-xs text-muted">Datos de tu cuenta de trabajo</p>
        </div>
      </div>

      <form class="mt-6 space-y-4" @submit.prevent="saveProfile">
        <div>
          <label class="mb-1.5 block text-xs font-semibold text-muted">Correo electrónico</label>
          <div class="relative">
            <input
              :value="auth.user?.email"
              disabled
              class="w-full rounded-xl border border-line bg-canvas/60 py-2.5 pl-10 pr-3 text-sm text-muted cursor-not-allowed"
            />
            <Mail class="absolute left-3 top-3 size-4 text-muted" />
          </div>
          <p class="mt-1 text-[11px] text-muted">El correo está vinvulado a la autenticación de Supabase.</p>
        </div>

        <div>
          <label class="mb-1.5 block text-xs font-semibold text-muted">Nombre completo</label>
          <input
            v-model="profileForm.fullName"
            required
            placeholder="Tu nombre y apellidos"
            class="w-full rounded-xl border border-line bg-canvas px-3 py-2.5 text-sm outline-none focus:border-accent"
          />
        </div>

        <div v-if="profileSuccess" class="flex items-center gap-2 text-sm text-emerald-600 font-medium">
          <CheckCircle2 class="size-4" />
          {{ profileSuccess }}
        </div>

        <div class="pt-2">
          <button
            type="submit"
            class="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
            :disabled="auth.loading || !profileForm.fullName.trim()"
          >
            {{ auth.loading ? 'Guardando…' : 'Guardar cambios' }}
          </button>
        </div>
      </form>
    </section>

    <!-- Seguridad / Contraseña -->
    <section class="rounded-3xl border border-line bg-surface p-6 shadow-sm sm:p-8">
      <div class="flex items-center gap-3 border-b border-line pb-4">
        <div class="grid size-10 place-items-center rounded-2xl bg-amber-500/10 text-amber-600">
          <KeyRound class="size-5" />
        </div>
        <div>
          <h2 class="text-base font-semibold">Cambiar Contraseña</h2>
          <p class="text-xs text-muted">Actualiza la credencial de acceso a tu cuenta</p>
        </div>
      </div>

      <form class="mt-6 space-y-4" @submit.prevent="savePassword">
        <div>
          <label class="mb-1.5 block text-xs font-semibold text-muted">Nueva contraseña</label>
          <input
            v-model="securityForm.password"
            type="password"
            required
            minlength="6"
            placeholder="Mínimo 6 caracteres"
            class="w-full rounded-xl border border-line bg-canvas px-3 py-2.5 text-sm outline-none focus:border-accent"
          />
        </div>

        <div>
          <label class="mb-1.5 block text-xs font-semibold text-muted">Confirmar contraseña</label>
          <input
            v-model="securityForm.confirmPassword"
            type="password"
            required
            minlength="6"
            placeholder="Repite la nueva contraseña"
            class="w-full rounded-xl border border-line bg-canvas px-3 py-2.5 text-sm outline-none focus:border-accent"
          />
        </div>

        <p v-if="securityError" class="text-sm font-medium text-rose-600">{{ securityError }}</p>

        <div v-if="securitySuccess" class="flex items-center gap-2 text-sm text-emerald-600 font-medium">
          <CheckCircle2 class="size-4" />
          {{ securitySuccess }}
        </div>

        <div class="pt-2">
          <button
            type="submit"
            class="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
            :disabled="auth.loading || !securityForm.password"
          >
            {{ auth.loading ? 'Actualizando…' : 'Actualizar contraseña' }}
          </button>
        </div>
      </form>
    </section>
  </div>
</template>
