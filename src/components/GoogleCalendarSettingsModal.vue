<script setup lang="ts">
import { ref, watch } from 'vue'
import { AlertCircle, Calendar, CheckCircle2, ExternalLink, HelpCircle, RefreshCw, Trash2, X } from 'lucide-vue-next'
import { useI18n } from '@/i18n'
import { formatDateTime } from '@/lib/dates'
import { useGoogleCalendarStore } from '@/stores/googleCalendar'

const open = defineModel<boolean>('open', { default: false })
const { t } = useI18n()
const gcal = useGoogleCalendarStore()

const urlInput = ref('')
const errorMsg = ref<string | null>(null)
const successMsg = ref<string | null>(null)

watch(open, (isOpen) => {
  if (isOpen) {
    urlInput.value = gcal.feedUrl
    errorMsg.value = null
    successMsg.value = null
  }
})

async function handleSaveAndSync() {
  if (!urlInput.value.trim()) return
  errorMsg.value = null
  successMsg.value = null
  gcal.setFeedUrl(urlInput.value)

  try {
    await gcal.sync()
    successMsg.value = `${gcal.events.length} eventos sincronizados correctamente.`
    setTimeout(() => {
      if (open.value) open.value = false
    }, 1500)
  } catch (err) {
    errorMsg.value = err instanceof Error ? err.message : 'Error al conectar con el feed de Google Calendar'
  }
}

async function handleManualSync() {
  errorMsg.value = null
  successMsg.value = null
  try {
    await gcal.sync()
    successMsg.value = `${gcal.events.length} eventos sincronizados.`
  } catch (err) {
    errorMsg.value = err instanceof Error ? err.message : 'Error de sincronización'
  }
}

function handleDisconnect() {
  if (confirm('¿Desconectar el calendario de Google Calendar de Nexo?')) {
    gcal.clear()
    urlInput.value = ''
    open.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4 backdrop-blur-xs">
      <div class="w-full max-w-xl rounded-2xl border border-line bg-surface p-6 shadow-2xl">
        <header class="flex items-start justify-between border-b border-line pb-4">
          <div class="flex items-center gap-3">
            <div class="grid size-10 place-items-center rounded-xl bg-[#4285F4]/10 text-[#4285F4]">
              <Calendar class="size-5" />
            </div>
            <div>
              <h2 class="text-lg font-semibold text-ink">{{ t('gcal.modalTitle') }}</h2>
              <p class="text-xs text-muted">{{ t('gcal.modalSubtitle') }}</p>
            </div>
          </div>
          <button type="button" class="rounded-lg p-1.5 text-muted hover:bg-canvas hover:text-ink cursor-pointer" @click="open = false">
            <X class="size-5" />
          </button>
        </header>

        <form class="mt-5 space-y-4" @submit.prevent="handleSaveAndSync">
          <!-- Feed URL Input -->
          <div>
            <label class="block text-xs font-semibold uppercase tracking-wider text-muted">
              {{ t('gcal.feedLabel') }}
            </label>
            <input
              v-model="urlInput"
              type="text"
              required
              class="mt-1.5 w-full rounded-xl border border-line bg-canvas px-4 py-2.5 text-sm text-ink outline-none focus:border-[#4285F4] transition"
              :placeholder="t('gcal.feedPlaceholder')"
            />
          </div>

          <!-- Alert / Error message -->
          <div v-if="errorMsg" class="flex items-start gap-2 rounded-xl bg-rose-500/10 p-3 text-xs text-rose-600">
            <AlertCircle class="size-4 shrink-0 mt-0.5" />
            <span>{{ errorMsg }}</span>
          </div>

          <!-- Success message -->
          <div v-if="successMsg" class="flex items-center gap-2 rounded-xl bg-emerald-500/10 p-3 text-xs text-emerald-600 font-medium">
            <CheckCircle2 class="size-4 shrink-0" />
            <span>{{ successMsg }}</span>
          </div>

          <!-- Status & Last Sync -->
          <div v-if="gcal.isConfigured" class="flex items-center justify-between rounded-xl bg-canvas p-3 text-xs">
            <div class="flex items-center gap-2 text-muted">
              <span class="size-2 rounded-full" :class="gcal.events.length ? 'bg-emerald-500' : 'bg-amber-500'" />
              <span>{{ t('gcal.eventsCount', { n: gcal.events.length }) }}</span>
              <span v-if="gcal.lastSync">· {{ t('gcal.lastSync', { time: formatDateTime(gcal.lastSync) }) }}</span>
            </div>
            <button
              type="button"
              class="flex items-center gap-1 font-semibold text-[#4285F4] hover:underline cursor-pointer"
              :disabled="gcal.loading"
              @click="handleManualSync"
            >
              <RefreshCw class="size-3.5" :class="gcal.loading && 'animate-spin'" />
              {{ gcal.loading ? t('gcal.syncing') : t('gcal.syncNow') }}
            </button>
          </div>

          <!-- Step-by-step Guide -->
          <div class="rounded-xl border border-line/60 bg-canvas/40 p-4">
            <div class="flex items-center gap-1.5 text-xs font-semibold text-ink mb-2">
              <HelpCircle class="size-4 text-[#4285F4]" />
              <span>{{ t('gcal.howToTitle') }}</span>
              <a
                href="https://calendar.google.com/calendar/u/0/r/settings"
                target="_blank"
                rel="noopener"
                class="ml-auto inline-flex items-center gap-1 text-[11px] font-semibold text-[#4285F4] hover:underline"
              >
                Abrir Google Calendar <ExternalLink class="size-3" />
              </a>
            </div>
            <ol class="list-decimal list-inside space-y-1 text-xs text-muted leading-relaxed">
              <li>{{ t('gcal.step1') }}</li>
              <li>{{ t('gcal.step2') }}</li>
              <li>{{ t('gcal.step3') }}</li>
              <li>{{ t('gcal.step4') }}</li>
            </ol>
          </div>

          <!-- Actions -->
          <div class="flex items-center justify-between border-t border-line pt-4">
            <button
              v-if="gcal.isConfigured"
              type="button"
              class="inline-flex items-center gap-1.5 text-xs font-medium text-rose-600 hover:underline cursor-pointer"
              @click="handleDisconnect"
            >
              <Trash2 class="size-3.5" />
              {{ t('gcal.disconnect') }}
            </button>
            <div v-else />

            <div class="flex items-center gap-2">
              <button type="button" class="rounded-xl px-4 py-2 text-sm font-medium text-muted hover:bg-canvas hover:text-ink cursor-pointer" @click="open = false">
                {{ t('common.cancel') }}
              </button>
              <button
                type="submit"
                class="inline-flex items-center gap-2 rounded-xl bg-[#4285F4] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#3367D6] disabled:opacity-50 cursor-pointer shadow-xs"
                :disabled="gcal.loading || !urlInput.trim()"
              >
                <RefreshCw v-if="gcal.loading" class="size-4 animate-spin" />
                {{ gcal.loading ? t('gcal.syncing') : t('gcal.saveAndSync') }}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>
