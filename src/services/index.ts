import { isSupabaseConfigured } from '@/lib/config'
import { createLocalBackend } from '@/services/local'
import { createSupabaseBackend } from '@/services/supabase'
import type { Backend } from '@/services/backend'

let instance: Backend | null = null

export function getBackend(): Backend {
  if (!instance) {
    instance = isSupabaseConfigured ? createSupabaseBackend() : createLocalBackend()
  }
  return instance
}

export type { Backend } from '@/services/backend'
