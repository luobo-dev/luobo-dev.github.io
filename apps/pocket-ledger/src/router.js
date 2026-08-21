import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from './views/HomeView.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/records',
      name: 'records',
      component: () => import('./views/RecordsView.vue'),
    },
    {
      path: '/stats',
      name: 'stats',
      component: () => import('./views/StatsView.vue'),
    },
    {
      path: '/annual-report/:year?',
      name: 'annual-report',
      component: () => import('./views/AnnualReportView.vue'),
    },
    {
      path: '/categories',
      name: 'categories',
      component: () => import('./views/CategoriesView.vue'),
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('./views/SettingsView.vue'),
    },
    {
      path: '/period-tracker',
      name: 'period-tracker',
      component: () => import('./views/PeriodTrackerView.vue'),
    },
    {
      path: '/private-vault',
      name: 'private-vault',
      component: () => import('./views/PrivateVaultView.vue'),
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
  scrollBehavior: () => ({ top: 0 }),
})

export default router
