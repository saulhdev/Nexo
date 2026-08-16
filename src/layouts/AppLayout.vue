<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { CalendarDays, Columns3, Grid2x2, LayoutDashboard, ListChecks, LogOut, Plus, User } from 'lucide-vue-next'
import { APP_NAME } from '@/constants'
import { useAuthStore } from '@/stores/auth'
import { useWorkspaceStore } from '@/stores/workspace'
import ProjectModal from '@/components/ProjectModal.vue'
import TaskDrawer from '@/components/TaskDrawer.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const workspace = useWorkspaceStore()
const projectOpen = ref(false)

const nav = [
  { name: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { name: 'list', label: 'Lista', icon: ListChecks },
  { name: 'board', label: 'Tablero', icon: Columns3 },
  { name: 'matrix', label: 'Matriz', icon: Grid2x2 },
  { name: 'calendar', label: 'Calendario', icon: CalendarDays },
  { name: 'profile', label: 'Mi Perfil', icon: User },
]

const initials = computed(() => {
  const name = auth.user?.fullName || 'Tú'
  return name
    .split(' ')
    .slice(0, 2)
    .map((part: string) => part[0])
    .join('')
    .toUpperCase()
})

onMounted(() => {
  void workspace.bootstrap()
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
</script>

<template>
  <div class="flex min-h-screen bg-canvas">
    <aside class="flex w-64 shrink-0 flex-col bg-sidebar text-[#f3efe6]">
      <div class="flex items-center gap-2.5 px-5 py-5">
        <span class="grid size-8 place-items-center rounded-xl bg-accent text-sm font-bold text-white">N</span>
        <div>
          <p class="text-sm font-semibold tracking-wide">{{ APP_NAME }}</p>
          <p class="text-[11px] text-white/45">Gestión de Tareas</p>
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
          <p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/40">Proyectos</p>
          <button class="text-white/50 hover:text-white" title="Nuevo proyecto" @click="projectOpen = true">
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
            Todos
          </button>
          <button
            v-for="project in workspace.projects"
            :key="project.id"
            class="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-white/70 hover:bg-white/5"
            :class="workspace.filters.projectId === project.id && 'bg-white/8 text-white'"
            @click="filterProject(project.id)"
          >
            <span class="size-2 rounded-full" :style="{ background: project.color }" />
            <span class="truncate">{{ project.name }}</span>
          </button>
        </div>
      </div>

      <div class="mt-auto border-t border-sidebar-line p-4">
        <div v-if="auth.isLocal" class="mb-3 rounded-xl bg-white/5 px-3 py-2 text-[11px] leading-relaxed text-white/55">
          Modo local. Conecta Supabase para cuentas y sincronización.
        </div>
        <div class="flex items-center gap-2">
          <RouterLink :to="{ name: 'profile' }" class="flex min-w-0 flex-1 items-center gap-2 rounded-xl p-1 text-left transition hover:bg-white/5">
            <div class="grid size-8 shrink-0 place-items-center rounded-full bg-white/10 text-xs font-semibold">
              {{ initials }}
            </div>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium">{{ auth.user?.fullName }}</p>
              <p class="truncate text-[11px] text-white/40">{{ auth.user?.email }}</p>
            </div>
          </RouterLink>
          <button v-if="!auth.isLocal" class="p-1 text-white/50 hover:text-white" title="Salir" @click="logout">
            <LogOut class="size-4" />
          </button>
        </div>
      </div>
    </aside>

    <div class="flex min-w-0 flex-1 flex-col">
      <main class="flex-1 p-6 lg:p-8">
        <p v-if="workspace.error" class="mb-4 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {{ workspace.error }}
        </p>
        <RouterView />
      </main>
    </div>

    <TaskDrawer />
    <ProjectModal v-model:open="projectOpen" @created="filterProject" />
  </div>
</template>
