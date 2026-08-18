<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { CalendarDays, ChevronDown, Columns3, Globe, Grid2x2, LayoutDashboard, ListChecks, LogOut, Pencil, Plus, User, Users } from '@lucide/vue'
import { APP_NAME } from '@/constants'
import { useI18n } from '@/i18n'
import { useAuthStore } from '@/stores/auth'
import { useWorkspaceStore } from '@/stores/workspace'
import { useTeamsStore } from '@/stores/teams'
import ProjectModal from '@/components/ProjectModal.vue'
import TeamModal from '@/components/TeamModal.vue'
import TaskDrawer from '@/components/TaskDrawer.vue'
import NotificationPopover from '@/components/NotificationPopover.vue'
import type { Project, Team } from '@/types'

const { t, locale, setLocale } = useI18n()
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const workspace = useWorkspaceStore()
const teamsStore = useTeamsStore()

const projectOpen = ref(false)
const projectToEdit = ref<Project | null>(null)
const teamModalOpen = ref(false)
const teamToEdit = ref<Team | null>(null)
const userMenuOpen = ref(false)
const userMenuRef = ref<HTMLElement | null>(null)
const currentYear = new Date().getFullYear()

function openNewProject() {
  projectToEdit.value = null
  projectOpen.value = true
}

function openEditProject(project: Project) {
  projectToEdit.value = project
  projectOpen.value = true
}

function openNewTeam() {
  teamToEdit.value = null
  teamModalOpen.value = true
}

function openEditTeam(team: Team) {
  teamToEdit.value = team
  teamModalOpen.value = true
}

function toggleUserMenu() {
  userMenuOpen.value = !userMenuOpen.value
}

function handleUserMenuClickOutside(e: MouseEvent) {
  if (userMenuRef.value && !userMenuRef.value.contains(e.target as Node)) {
    userMenuOpen.value = false
  }
}

async function handleLogout() {
  userMenuOpen.value = false
  await logout()
}

const nav = computed(() => [
  { name: 'dashboard', label: t('nav.dashboard'), icon: LayoutDashboard },
  { name: 'list', label: t('nav.list'), icon: ListChecks },
  { name: 'board', label: t('nav.board'), icon: Columns3 },
  { name: 'matrix', label: t('nav.matrix'), icon: Grid2x2 },
  { name: 'calendar', label: t('nav.calendar'), icon: CalendarDays },
  { name: 'teams', label: t('nav.teams'), icon: Users },
  { name: 'profile', label: t('nav.profile'), icon: User },
])

const initials = computed(() => {
  const name = auth.user?.fullName || t('common.you')
  return name
    .split(' ')
    .slice(0, 2)
    .map((part: string) => part[0])
    .join('')
    .toUpperCase()
})

function toggleLocale() {
  setLocale(locale.value === 'es' ? 'en' : 'es')
}

onMounted(() => {
  void workspace.bootstrap()
  void teamsStore.bootstrap()
  document.addEventListener('click', handleUserMenuClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleUserMenuClickOutside)
})

watch(
  () => route.query.task,
  (id) => {
    if (typeof id === 'string' && id !== workspace.activeTaskId) {
      void workspace.openTask(id)
    }
    if (!id && workspace.activeTaskId) workspace.closeTask()
  },
  { immediate: true },
)

watch(
  () => workspace.activeTaskId,
  (id) => {
    const current = typeof route.query.task === 'string' ? route.query.task : undefined
    if (id === current) return
    void router.replace({ query: { ...route.query, task: id ?? undefined } })
  },
)

async function logout() {
  await auth.signOut()
  if (!auth.isLocal) await router.push({ name: 'login' })
}

function filterProject(id: string) {
  workspace.setFilter('projectId', id)
  if (route.name === 'dashboard') void router.push({ name: 'list' })
}

function filterTeam(id: string) {
  workspace.setFilter('teamId', id)
  if (route.name === 'dashboard') void router.push({ name: 'list' })
}
</script>

<template>
  <div class="flex min-h-screen bg-canvas">
    <!-- Sidebar: Fixed / Sticky sidebar -->
    <aside class="sticky top-0 flex h-screen w-64 shrink-0 flex-col bg-sidebar text-[#f3efe6] overflow-y-auto scrollbar-thin">
      <div class="flex items-center gap-2.5 px-5 py-5">
        <span class="grid size-8 place-items-center rounded-xl bg-accent text-sm font-bold text-white">N</span>
        <div>
          <p class="text-sm font-semibold tracking-wide">{{ APP_NAME }}</p>
          <p class="text-[11px] text-white/45">{{ t('common.appSubtitle') }}</p>
        </div>
      </div>

      <nav class="space-y-1 px-3">
        <RouterLink
          v-for="item in nav"
          :key="item.name"
          :to="{ name: item.name }"
          class="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-white/70 transition hover:bg-white/5 hover:text-white"
          :class="route.name === item.name && 'bg-white/8 text-white'"
        >
          <component :is="item.icon" class="size-4" />
          {{ item.label }}
        </RouterLink>
      </nav>

      <div class="mt-6 px-5">
        <div class="flex items-center justify-between">
          <p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/40">{{ t('common.projects') }}</p>
          <button class="text-white/50 hover:text-white" :title="t('common.newProject')" @click="openNewProject">
            <Plus class="size-4" />
          </button>
        </div>
        <div class="mt-2 space-y-0.5">
          <button
            class="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-white/70 hover:bg-white/5"
            :class="workspace.filters.projectId === 'all' && 'bg-white/8 text-white'"
            @click="filterProject('all')"
          >
            <span class="size-2 rounded-full bg-white/30" />
            {{ t('common.all') }}
          </button>
          <div
            v-for="project in workspace.projects"
            :key="project.id"
            class="group flex items-center justify-between rounded-lg px-2 py-1.5 text-sm text-white/70 transition hover:bg-white/5"
            :class="workspace.filters.projectId === project.id && 'bg-white/8 text-white'"
          >
            <button
              class="flex min-w-0 flex-1 items-center gap-2 text-left"
              @click="filterProject(project.id)"
            >
              <span class="size-2 shrink-0 rounded-full" :style="{ background: project.color }" />
              <span class="truncate">{{ project.name }}</span>
            </button>
            <button
              class="p-0.5 text-white/40 opacity-0 transition group-hover:opacity-100 hover:text-white"
              :title="t('common.editProject')"
              @click.stop="openEditProject(project)"
            >
              <Pencil class="size-3.5" />
            </button>
          </div>
        </div>
      </div>

      <!-- Teams sidebar section -->
      <div class="mt-4 px-5">
        <div class="flex items-center justify-between">
          <p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/40">{{ t('teams.title') }}</p>
          <button
            v-if="auth.user?.isAdmin"
            class="text-white/50 hover:text-white"
            :title="t('teams.new')"
            @click="openNewTeam"
          >
            <Plus class="size-4" />
          </button>
        </div>
        <div class="mt-2 space-y-0.5">
          <button
            class="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-white/70 hover:bg-white/5"
            :class="workspace.filters.teamId === 'all' && 'bg-white/8 text-white'"
            @click="filterTeam('all')"
          >
            <span class="size-2 rounded-full bg-white/30" />
            {{ t('common.all') }}
          </button>
          <div
            v-for="team in teamsStore.teams"
            :key="team.id"
            class="group flex items-center justify-between rounded-lg px-2 py-1.5 text-sm text-white/70 transition hover:bg-white/5"
            :class="workspace.filters.teamId === team.id && 'bg-white/8 text-white'"
          >
            <button
              class="flex min-w-0 flex-1 items-center gap-2 text-left"
              @click="filterTeam(team.id)"
            >
              <Users class="size-3 shrink-0 text-white/50" />
              <span class="truncate">{{ team.name }}</span>
            </button>
            <button
              v-if="team.ownerId === auth.user?.id || auth.user?.isAdmin"
              class="p-0.5 text-white/40 opacity-0 transition group-hover:opacity-100 hover:text-white"
              :title="t('teams.editTitle')"
              @click.stop="openEditTeam(team)"
            >
              <Pencil class="size-3.5" />
            </button>
          </div>
        </div>
      </div>

      <div class="mt-auto border-t border-sidebar-line p-4">
        <div v-if="auth.isLocal" class="rounded-xl bg-white/5 px-3 py-2 text-[11px] leading-relaxed text-white/55">
          {{ t('common.localMode') }}
        </div>
      </div>
    </aside>

    <!-- Main Section with Top Header, Router View and Footer -->
    <div class="flex min-w-0 flex-1 flex-col min-h-screen">
      <!-- Top Header Bar -->
      <header class="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-surface/80 px-6 py-3.5 backdrop-blur-md">
        <div class="flex items-center gap-3">
          <span class="text-sm font-semibold text-ink">
            {{ route.meta?.titleKey ? t(route.meta.titleKey as string) : APP_NAME }}
          </span>
        </div>

        <div class="flex items-center gap-3">
          <!-- Language selector toggle -->
          <button
            class="flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink/80 transition hover:bg-canvas"
            :title="t('common.language')"
            @click="toggleLocale"
          >
            <Globe class="size-3.5 text-muted" />
            <span>{{ locale === 'es' ? 'ES 🇪🇸' : 'EN 🇺🇸' }}</span>
          </button>

          <!-- Notifications popover -->
          <NotificationPopover />

          <!-- User Profile Dropdown Menu -->
          <div ref="userMenuRef" class="relative inline-block text-left">
            <button
              class="flex items-center gap-2 rounded-xl border border-line bg-surface px-2.5 py-1.5 text-ink transition hover:bg-canvas focus:outline-none"
              @click.stop="toggleUserMenu"
            >
              <div class="grid size-7 place-items-center rounded-full bg-accent/15 text-xs font-bold text-accent">
                {{ initials }}
              </div>
              <span class="hidden sm:inline text-xs font-medium text-ink">{{ auth.user?.fullName || t('common.you') }}</span>
              <ChevronDown class="size-3.5 text-muted transition-transform duration-200" :class="userMenuOpen && 'rotate-180'" />
            </button>

            <!-- Dropdown Menu items -->
            <Transition
              enter-active-class="transition duration-150 ease-out"
              enter-from-class="transform scale-95 opacity-0"
              enter-to-class="transform scale-100 opacity-100"
              leave-active-class="transition duration-100 ease-in"
              leave-from-class="transform scale-100 opacity-100"
              leave-to-class="transform scale-95 opacity-0"
            >
              <div
                v-if="userMenuOpen"
                class="absolute right-0 mt-2 w-48 rounded-2xl border border-line bg-surface p-1.5 shadow-xl z-50 space-y-0.5"
              >
                <div class="px-3 py-2 border-b border-line mb-1">
                  <p class="text-xs font-semibold text-ink truncate">{{ auth.user?.fullName || t('common.you') }}</p>
                  <p class="text-[11px] text-muted truncate">{{ auth.user?.email }}</p>
                </div>

                <RouterLink
                  :to="{ name: 'profile' }"
                  class="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-ink/80 transition hover:bg-canvas hover:text-ink"
                  @click="userMenuOpen = false"
                >
                  <User class="size-4 text-muted" />
                  {{ t('nav.profile') }}
                </RouterLink>

                <button
                  class="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-rose-600 transition hover:bg-rose-50"
                  @click="handleLogout"
                >
                  <LogOut class="size-4" />
                  {{ t('common.logout') }}
                </button>
              </div>
            </Transition>
          </div>
        </div>
      </header>

      <!-- Main Content -->
      <main class="flex-1 p-6 lg:p-8">
        <p v-if="workspace.error" class="mb-4 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {{ workspace.error }}
        </p>
        <RouterView />
      </main>

      <!-- Footer -->
      <footer class="mt-auto border-t border-line py-4 px-6 text-center md:flex md:items-center md:justify-between text-xs text-muted">
        <p>{{ t('common.copyright', { year: currentYear }) }}</p>
        <p class="mt-1 md:mt-0 font-medium text-ink/50">{{ APP_NAME }} • v1.0.0</p>
      </footer>
    </div>

    <TaskDrawer />
    <ProjectModal v-model:open="projectOpen" :project="projectToEdit" @created="filterProject" />
    <TeamModal v-model:open="teamModalOpen" :team="teamToEdit" />
  </div>
</template>
