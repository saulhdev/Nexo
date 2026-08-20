<script setup lang="ts">
import { computed, ref } from 'vue'
import { Users, Plus, ChevronRight, Crown, UserCheck, Layers } from '@lucide/vue'
import { useI18n } from '@/i18n'
import { useTeamsStore } from '@/stores/teams'
import { useWorkspaceStore } from '@/stores/workspace'
import { useAuthStore } from '@/stores/auth'
import TeamModal from '@/components/TeamModal.vue'
import EmptyState from '@/components/EmptyState.vue'
import type { Team } from '@/types'

const { t } = useI18n()
const teamsStore = useTeamsStore()
const workspace = useWorkspaceStore()
const auth = useAuthStore()

const teamModalOpen = ref(false)
const teamToEdit = ref<Team | null>(null)
const expandedTeamId = ref<string | null>(null)

const isAdmin = computed(() => auth.user?.isAdmin ?? false)

function openCreate() {
  teamToEdit.value = null
  teamModalOpen.value = true
}

function openEdit(team: Team) {
  teamToEdit.value = team
  teamModalOpen.value = true
}

async function toggleExpand(team: Team) {
  if (expandedTeamId.value === team.id) {
    expandedTeamId.value = null
    return
  }
  expandedTeamId.value = team.id
  await teamsStore.loadMembers(team.id)
}

function teamTaskCount(teamId: string) {
  return workspace.tasks.filter((t) => t.teamId === teamId).length
}

// Initials from name
function initials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
}

// Palette of colors for team cards
const palette = [
  '#C45C26', '#1F6B5A', '#2F6FED', '#7C3AED', '#DB2777',
  '#D97706', '#059669', '#DC2626', '#0891B2', '#4F46E5',
]

function teamColor(index: number) {
  return palette[index % palette.length]
}
</script>

<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div class="flex items-start justify-between">
      <div>
        <h1 class="text-xl font-bold text-ink">{{ t('teams.title') }}</h1>
        <p class="mt-1 text-sm text-muted">{{ t('teams.subtitle') }}</p>
      </div>
      <button
        v-if="isAdmin"
        id="new-team-btn"
        class="flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-accent/90 active:scale-95"
        @click="openCreate"
      >
        <Plus class="size-4" />
        {{ t('teams.new') }}
      </button>
      <div
        v-else
        class="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700"
      >
        {{ t('teams.adminOnly') }}
      </div>
    </div>

    <!-- Loading skeleton -->
    <div v-if="teamsStore.loading" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="i in 3"
        :key="i"
        class="h-36 animate-pulse rounded-2xl bg-surface border border-line"
      />
    </div>

    <!-- Empty state -->
    <EmptyState
      v-else-if="teamsStore.teams.length === 0"
      :title="t('teams.empty')"
      :description="t('teams.emptyHint')"
    >
      <template #icon>
        <Users class="size-8 text-muted" />
      </template>
    </EmptyState>

    <!-- Teams grid -->
    <div v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="(team, idx) in teamsStore.teams"
        :key="team.id"
        class="group relative overflow-hidden rounded-2xl border border-line bg-surface shadow-sm transition hover:shadow-md hover:border-accent/30"
      >
        <!-- Color accent bar -->
        <div
          class="h-1 w-full"
          :style="{ background: teamColor(idx) }"
        />

        <div class="p-5">
          <!-- Header row -->
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-3 min-w-0">
              <span
                class="grid size-10 shrink-0 place-items-center rounded-xl text-sm font-bold text-white shadow-sm"
                :style="{ background: teamColor(idx) }"
              >
                {{ initials(team.name) }}
              </span>
              <div class="min-w-0">
                <h3 class="truncate text-sm font-semibold text-ink">{{ team.name }}</h3>
                <p class="text-xs text-muted">
                  {{ team.memberCount ?? 0 }}
                  {{ (team.memberCount ?? 0) === 1 ? t('teams.members').split(' | ')[0] : t('teams.members').split(' | ')[1] }}
                </p>
              </div>
            </div>
            <button
              v-if="team.ownerId === auth.user?.id || isAdmin"
              class="p-1.5 rounded-lg text-muted opacity-0 transition group-hover:opacity-100 hover:bg-canvas hover:text-ink"
              @click.stop="openEdit(team)"
            >
              <ChevronRight class="size-4" />
            </button>
          </div>

          <!-- Stats row -->
          <div class="mt-4 flex items-center gap-4 border-t border-line pt-3">
            <div class="flex items-center gap-1.5 text-xs text-muted">
              <Layers class="size-3.5" />
              <span>{{ teamTaskCount(team.id) }} tareas</span>
            </div>
          </div>

          <!-- Expand button -->
          <button
            class="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-line py-1.5 text-xs font-medium text-ink/60 transition hover:bg-canvas hover:text-ink"
            @click="toggleExpand(team)"
          >
            <Users class="size-3.5" />
            {{ expandedTeamId === team.id ? 'Ocultar miembros' : t('teams.membersLabel') }}
          </button>

          <!-- Members list (expanded) -->
          <Transition
            enter-active-class="transition duration-200 ease-out"
            enter-from-class="opacity-0 -translate-y-1"
            enter-to-class="opacity-100 translate-y-0"
            leave-active-class="transition duration-150 ease-in"
            leave-from-class="opacity-100 translate-y-0"
            leave-to-class="opacity-0 -translate-y-1"
          >
            <div v-if="expandedTeamId === team.id" class="mt-3 space-y-1.5">
              <div
                v-if="teamsStore.membersLoading"
                class="h-8 animate-pulse rounded-lg bg-canvas"
              />
              <template v-else>
                <div
                  v-for="m in teamsStore.activeTeamMembers"
                  :key="m.userId"
                  class="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-canvas"
                >
                  <span
                    class="grid size-6 shrink-0 place-items-center rounded-full text-[10px] font-bold"
                    :class="m.role === 'owner' ? 'bg-amber-100 text-amber-700' : 'bg-accent/10 text-accent'"
                  >
                    {{ (m.user?.fullName || '?')[0].toUpperCase() }}
                  </span>
                  <span class="flex-1 truncate text-xs text-ink">
                    {{ m.user?.fullName || m.user?.email }}
                  </span>
                  <component
                    :is="m.role === 'owner' ? Crown : UserCheck"
                    class="size-3 shrink-0"
                    :class="m.role === 'owner' ? 'text-amber-400' : 'text-muted'"
                  />
                </div>
                <p v-if="!teamsStore.activeTeamMembers.length" class="px-2 py-1 text-xs text-muted">
                  {{ t('teams.noMembers') }}
                </p>
              </template>
            </div>
          </Transition>
        </div>
      </div>
    </div>

    <!-- Team Modal -->
    <TeamModal
      v-model:open="teamModalOpen"
      :team="teamToEdit"
      @created="() => {}"
      @updated="() => {}"
    />
  </div>
</template>
