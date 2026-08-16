<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { PROJECT_COLORS } from '@/constants'
import { useI18n } from '@/i18n'
import { useWorkspaceStore } from '@/stores/workspace'
import type { Project } from '@/types'

const { t } = useI18n()
const props = defineProps<{
  project?: Project | null
}>()

const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{
  created: [id: string]
  updated: [id: string]
}>()

const workspace = useWorkspaceStore()
const name = ref('')
const color = ref(PROJECT_COLORS[0])
const submitting = ref(false)
const errorMessage = ref('')

const isEditing = computed(() => !!props.project)
const canSubmit = computed(() => name.value.trim().length > 0)

watch(
  [open, () => props.project],
  ([isOpen]) => {
    if (isOpen) {
      if (props.project) {
        name.value = props.project.name
        color.value = props.project.color
      } else {
        name.value = ''
        color.value = PROJECT_COLORS[0]
      }
      errorMessage.value = ''
    }
  },
  { immediate: true }
)

async function submit() {
  if (!canSubmit.value) return
  submitting.value = true
  errorMessage.value = ''
  try {
    if (props.project) {
      const updated = await workspace.updateProject(props.project.id, {
        name: name.value.trim(),
        color: color.value,
      })
      open.value = false
      emit('updated', updated.id)
    } else {
      const project = await workspace.createProject({
        name: name.value.trim(),
        color: color.value,
      })
      name.value = ''
      open.value = false
      emit('created', project.id)
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : (err as { message?: string })?.message
    errorMessage.value = msg || (isEditing.value ? t('projectModal.errorUpdate') : t('projectModal.error'))
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4">
      <form class="w-full max-w-md rounded-2xl bg-surface p-5 shadow-xl" @submit.prevent="submit">
        <h2 class="text-lg font-semibold">
          {{ isEditing ? t('projectModal.titleEdit') : t('projectModal.title') }}
        </h2>
        <p class="mt-1 text-sm text-muted">
          {{ isEditing ? t('projectModal.subtitleEdit') : t('projectModal.subtitle') }}
        </p>

        <p v-if="errorMessage" class="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
          {{ errorMessage }}
        </p>

        <label class="mt-4 block text-xs font-medium text-muted">{{ t('projectModal.name') }}</label>
        <input
          v-model="name"
          class="mt-1 w-full rounded-xl border border-line bg-canvas px-3 py-2 text-sm outline-none focus:border-accent"
          :placeholder="t('projectModal.namePlaceholder')"
        />
        <p class="mt-4 text-xs font-medium text-muted">{{ t('projectModal.color') }}</p>
        <div class="mt-2 flex flex-wrap gap-2">
          <button
            v-for="swatch in PROJECT_COLORS"
            :key="swatch"
            type="button"
            class="size-7 rounded-full ring-2 ring-offset-2 ring-offset-surface transition-all"
            :class="color === swatch ? 'ring-ink scale-110' : 'ring-transparent opacity-80 hover:opacity-100'"
            :style="{ background: swatch }"
            @click="color = swatch"
          />
        </div>
        <div class="mt-5 flex justify-end gap-2">
          <button type="button" class="rounded-xl px-3 py-2 text-sm text-muted" @click="open = false">
            {{ t('common.cancel') }}
          </button>
          <button
            type="submit"
            class="rounded-xl bg-accent px-3.5 py-2 text-sm font-semibold text-white transition disabled:opacity-50"
            :disabled="!canSubmit || submitting"
          >
            <template v-if="isEditing">
              {{ submitting ? t('common.saving') : t('common.save') }}
            </template>
            <template v-else>
              {{ submitting ? t('common.creating') : t('common.create') }}
            </template>
          </button>
        </div>
      </form>
    </div>
  </Teleport>
</template>
