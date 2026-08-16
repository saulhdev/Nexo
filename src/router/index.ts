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
      meta: { public: true },
    },
    {
      path: '/registro',
      name: 'register',
      component: () => import('@/views/RegisterView.vue'),
      meta: { public: true },
    },
    {
      path: '/',
      component: () => import('@/layouts/AppLayout.vue'),
      children: [
        { path: '', name: 'dashboard', component: () => import('@/views/DashboardView.vue') },
        { path: 'lista', name: 'list', component: () => import('@/views/ListView.vue') },
        { path: 'tablero', name: 'board', component: () => import('@/views/KanbanView.vue') },
        { path: 'perfil', name: 'profile', component: () => import('@/views/ProfileView.vue') },
      ],
    },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  if (!auth.ready) await auth.init()

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
