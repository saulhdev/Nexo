import { ref, computed } from 'vue'
import es from './es'
import en from './en'

export type Locale = 'es' | 'en'
export type TranslationKey = keyof typeof es

const dictionaries: Record<Locale, Record<string, string | readonly string[]>> = { es, en }

const STORAGE_KEY = 'nexo-locale'

function loadLocale(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'es' || stored === 'en') return stored
  } catch {
    /* SSR or blocked storage */
  }
  return 'es'
}

const locale = ref<Locale>(loadLocale())

export function setLocale(newLocale: Locale) {
  locale.value = newLocale
  try {
    localStorage.setItem(STORAGE_KEY, newLocale)
  } catch {
    /* ignore */
  }
}

/**
 * Translate a key, optionally replacing `{placeholder}` tokens.
 *
 * Usage:
 *   t('dashboard.greeting')            → "Hola"
 *   t('activity.movedStatus', { from: 'A', to: 'B' }) → "movió de A a B"
 */
export function t(key: string, params?: Record<string, string | number>): string {
  const dict = dictionaries[locale.value]
  let value = dict[key]
  if (value === undefined) {
    // Fallback to Spanish
    value = dictionaries.es[key]
  }
  if (value === undefined) return key
  if (Array.isArray(value)) return value.join(', ')
  if (params) {
    let result = value as string
    for (const [k, v] of Object.entries(params)) {
      result = result.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v))
    }
    return result
  }
  return value as string
}

/**
 * Get a translated array (e.g. weekday names).
 */
export function tArray(key: string): string[] {
  const dict = dictionaries[locale.value]
  const value = dict[key]
  if (Array.isArray(value)) return [...value]
  const fallback = dictionaries.es[key]
  if (Array.isArray(fallback)) return [...fallback]
  return []
}

/**
 * Returns the Intl locale string for date formatting.
 */
export const intlLocale = computed(() => (locale.value === 'en' ? 'en-US' : 'es-ES'))

export function useI18n() {
  return {
    t,
    tArray,
    locale,
    setLocale,
    intlLocale,
  }
}
