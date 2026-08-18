<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { X, Users, Trash2, UserMinus, Crown, UserCheck } from '@lucide/vue'
import { useI18n } from '@/i18n'
import { useTeamsStore } from '@/stores/teams'
import { useWorkspaceStore } from '@/stores/workspace'
import { useAuthStore } from '@/stores/auth'
import CustomMultiSelect from '@/components/CustomMultiSelect.vue'
import type { Team } from '@/types'

const props = defineProps<{
  open: boolean
  team: Team | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  created: [team: Team]
  updated: [team: Team]
}>()

const { t } = useI18n()
const teamsStore = useTeamsStore()
const workspace = useWorkspaceStore()
const auth = useAuthStore()

const name = ref('')
const selectedMemberIds = ref<string[]>([])
const saving = ref(false)
const deleting = ref(false)
const error = ref('')
const confirmDelete = ref(false)

const isEditing = computed(() => Boolean(props.team))
const title = computed(() => (isEditing.value ? t('teams.editTitle') : t('teams.createTitle')))

// Available users to add (exclude owner / already members)
const userOptions = computed(() =>
  workspace.users
    .filter((u) => u.id !== auth.user?.id)
    .map((u) => ({ value: u.id, label: u.fullName || u.email })),
)

// Current members when editing
const currentMembers = computed(() => teamsStore.activeTeamMembers)
const isOwner = computed(() =>
  props.team ? props.team.ownerId === auth.user?.id : true,
)

watch(
  () => props.open,
  async (open) => {
    if (open) {
      name.value = props.team?.name ?? ''
      selectedMemberIds.value = []
      error.value = ''
      confirmDelete.value = false
      saving.value = false
      if (props.team) {
        await teamsStore.loadMembers(props.team.id)
      } else {
        teamsStore.activeTeamMembers.length = 0
      }
    }
  },
)

function close() {
  emit('update:open', false)
}

async function save() {
  if (!name.value.trim()) {
    error.value = t('teams.namePlaceholder')
    return
  }
  saving.value = true
  error.value = ''
  try {
    if (isEditing.value && props.team) {
      // Update name
      const updated = await teamsStore.updateTeam(props.team.id, { name: name.value })
      // Add new members
      for (const uid of selectedMemberIds.value) {
        await teamsStore.addMember(props.team.id, uid)
      }
      emit('updated', updated)
    } else {
      const team = await teamsStore.createTeam({
        name: name.value,
        memberIds: selectedMemberIds.value,
      })
      emit('created', team)
    }
    close()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Error al guardar'
  } finally {
    saving.value = false
  }
}

async function removeMember(userId: string) {
  if (!props.team) return
  await teamsStore.removeMember(props.team.id, userId)
}

async function handleDelete() {
  if (!props.team) return
  deleting.value = true
  try {
    await teamsStore.deleteTeam(props.team.id)
    close()
  } finally {
    deleting.value = false
    confirmDelete.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
        @click.self="close"
      >
        <Transition
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="scale-95 opacity-0"
          enter-to-class="scale-100 opacity-100"
          leave-active-class="transition duration-150 ease-in"
          leave-from-class="scale-100 opacity-100"
          leave-to-class="scale-95 opacity-0"
        >
          <div
            v-if="open"
            class="relative w-full max-w-lg rounded-2xl bg-surface shadow-2xl border border-line"
          >
            <!-- Header -->
            <div class="flex items-center justify-between border-b border-line px-6 py-4">
              <div class="flex items-center gap-2.5">
                <span class="grid size-8 place-items-center rounded-xl bg-accent/10">
                  <Users class="size-4 text-accent" />
                </span>
                <h2 class="text-sm font-semibold text-ink">{{ title }}</h2>
              </div>
              <button
                class="rounded-lg p-1.5 text-muted transition hover:bg-canvas hover:text-ink"
                @click="close"
              >
                <X class="size-4" />
              </button>
            </div>

            <!-- Body -->
            <div class="space-y-5 px-6 py-5">
              <!-- Error -->
              <p v-if="error" class="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {{ error }}
              </p>

              <!-- Name -->
              <div>
                <label class="mb-1.5 block text-xs font-semibold text-ink/70">
                  {{ t('teams.name') }}
                </label>
                <input
                  v-model="name"
                  :placeholder="t('teams.namePlaceholder')"
                  :disabled="!isOwner"
                  class="w-full rounded-xl border border-line bg-canvas px-3.5 py-2.5 text-sm text-ink placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:opacity-50"
                  @keydown.enter.prevent="save"
                />
              </div>

              <!-- Add new members -->
              <div v-if="isOwner">
                <label class="mb-1.5 block text-xs font-semibold text-ink/70">
                  {{ t('teams.addMembers') }}
                </label>
                <CustomMultiSelect
                  v-model="selectedMemberIds"
                  :options="userOptions"
                  :placeholder="t('teams.namePlaceholder')"
                />
              </div>

              <!-- Current members (when editing) -->
              <div v-if="isEditing && currentMembers.length > 0">
                <p class="mb-2 text-xs font-semibold text-ink/70">{{ t('teams.membersLabel') }}</p>
                <ul class="space-y-1.5 max-h-48 overflow-y-auto">
                  <li
                    v-for="m in currentMembers"
                    :key="m.userId"
                    class="group flex items-center justify-between rounded-xl bg-canvas px-3 py-2"
                  >
                    <div class="flex items-center gap-2.5">
                      <span
                        class="grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold"
                        :class="m.role === 'owner' ? 'bg-amber-100 text-amber-700' : 'bg-accent/10 text-accent'"
                      >
                        {{ (m.user?.fullName || '?')[0].toUpperCase() }}
                      </span>
                      <div>
                        <p class="text-sm font-medium text-ink leading-tight">
                          {{ m.user?.fullName || m.user?.email || m.userId }}
                        </p>
                        <div class="flex items-center gap-1 mt-0.5">
                          <component
                            :is="m.role === 'owner' ? Crown : UserCheck"
                            class="size-3"
                            :class="m.role === 'owner' ? 'text-amber-500' : 'text-muted'"
                          />
                          <span class="text-[11px] text-muted">
                            {{ m.role === 'owner' ? t('teams.owner') : t('teams.member') }}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      v-if="isOwner && m.role !== 'owner'"
                      class="p-1 text-muted opacity-0 transition group-hover:opacity-100 hover:text-rose-600"
                      :title="t('teams.removeMember')"
                      @click="removeMember(m.userId)"
                    >
                      <UserMinus class="size-3.5" />
                    </button>
                  </li>
                </ul>
              </div>

              <!-- Delete confirmation -->
              <div v-if="isEditing && isOwner">
                <template v-if="!confirmDelete">
                  <button
                    class="flex items-center gap-1.5 text-xs text-rose-500 hover:text-rose-700 transition"
                    @click="confirmDelete = true"
                  >
                    <Trash2 class="size-3.5" />
                    {{ t('teams.deleteTeam') }}
                  </button>
                </template>
                <template v-else>
                  <div class="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                    <p class="font-medium mb-2">
                      {{ t('teams.deleteConfirm', { name: team?.name ?? '' }) }}
                    </p>
                    <div class="flex gap-2">
                      <button
                        class="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 transition"
                        :disabled="deleting"
                        @click="handleDelete"
                      >
                        {{ deleting ? t('common.saving') : t('common.delete') }}
                      </button>
                      <button
                        class="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink/70 hover:bg-canvas transition"
                        @click="confirmDelete = false"
                      >
                        {{ t('common.cancel') }}
                      </button>
                    </div>
                  </div>
                </template>
              </div>
            </div>

            <!-- Footer -->
            <div class="flex items-center justify-end gap-2.5 border-t border-line px-6 py-4">
              <button
                class="rounded-xl border border-line px-4 py-2 text-sm font-medium text-ink/70 transition hover:bg-canvas"
                @click="close"
              >
                {{ t('common.cancel') }}
              </button>
              <button
                v-if="isOwner"
                class="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent/90 disabled:opacity-50"
                :disabled="saving || !name.trim()"
                @click="save"
              >
                {{ saving ? t('common.saving') : isEditing ? t('common.save') : t('common.create') }}
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
