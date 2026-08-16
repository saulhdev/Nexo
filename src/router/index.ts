import { createRouter, createWebHistory } from 'vue-router'
import { isSupabaseConfigured } from '@/lib/config'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/entrar',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { public: true, titleKey: 'login.title' },
    },
    {
      path: '/registro',
      name: 'register',
      component: () => import('@/views/RegisterView.vue'),
      meta: { public: true, titleKey: 'register.title' },
    },
    {
      path: '/',
      component: () => import('@/layouts/AppLayout.vue'),
      children: [
        { path: '', name: 'dashboard', component: () => import('@/views/DashboardView.vue'), meta: { titleKey: 'nav.dashboard' } },
        { path: 'lista', name: 'list', component: () => import('@/views/ListView.vue'), meta: { titleKey: 'nav.list' } },
        { path: 'tablero', name: 'board', component: () => import('@/views/KanbanView.vue'), meta: { titleKey: 'nav.board' } },
        { path: 'matriz', name: 'matrix', component: () => import('@/views/EisenhowerView.vue'), meta: { titleKey: 'nav.matrix' } },
        { path: 'calendario', name: 'calendar', component: () => import('@/views/CalendarView.vue'), meta: { titleKey: 'nav.calendar' } },
        { path: 'perfil', name: 'profile', component: () => import('@/views/ProfileView.vue'), meta: { titleKey: 'nav.profile' } },
      ],
    },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  if (!auth.ready) {
    try {
      await auth.init()
    } catch {
      auth.ready = true
    }
  }

  if (!isSupabaseConfigured) {
    if (to.meta.public) return { name: 'dashboard' }
    return true
  }

  if (!auth.isAuthenticated && !to.meta.public) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if (auth.isAuthenticated && to.meta.public) {
    return { name: 'dashboard' }
  }
  return true
})

export default router
