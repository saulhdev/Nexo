import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { getBackend } from '@/services'
import type { User } from '@/types'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const ready = ref(false)
  const loading = ref(false)
  const error = ref('')
  const backend = getBackend()

  const isLocal = computed(() => backend.kind === 'local')
  const isAuthenticated = computed(() => Boolean(user.value))

  async function init() {
    try {
      user.value = await backend.getSession()
    } finally {
      ready.value = true
    }
    backend.onAuthChange((next) => {
      user.value = next
    })
  }

  async function signIn(email: string, password: string) {
    loading.value = true
    error.value = ''
    try {
      user.value = await backend.signIn(email, password)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'No se pudo iniciar sesión'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function signUp(email: string, password: string, fullName: string) {
    loading.value = true
    error.value = ''
    try {
      user.value = await backend.signUp(email, password, fullName)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'No se pudo crear la cuenta'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function signOut() {
    await backend.signOut()
    if (backend.kind === 'supabase') user.value = null
  }

  async function updateProfile(input: { fullName?: string; password?: string }) {
    loading.value = true
    error.value = ''
    try {
      user.value = await backend.updateProfile(input)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'No se pudo actualizar el perfil'
      throw err
    } finally {
      loading.value = false
    }
  }

  return { user, ready, loading, error, isLocal, isAuthenticated, init, signIn, signUp, signOut, updateProfile }
})
