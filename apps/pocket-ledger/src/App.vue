<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import {
  PhChartPieSlice,
  PhGearSix,
  PhHouse,
  PhListBullets,
  PhPlus,
} from '@phosphor-icons/vue'
import TransactionSheet from './components/TransactionSheet.vue'
import PwaUpdatePrompt from './components/PwaUpdatePrompt.vue'
import {
  exportDatabase,
  getAllData,
  importDatabase,
  initializeDatabase,
  removeCategory,
  removeTransaction,
  saveCategory,
  saveTransaction,
} from './lib/db.js'

const route = useRoute()
const router = useRouter()
const currentView = computed(() => {
  if (route.name === 'categories') return 'settings'
  if (route.name === 'period-tracker') return 'settings'
  if (route.name === 'annual-report') return 'stats'
  return route.name || 'home'
})
const categories = ref([])
const transactions = ref([])
const loading = ref(true)
const fatalError = ref('')
const transactionSheetOpen = ref(false)
const editingTransaction = ref(null)
const toast = ref('')
let toastTimer

const navItems = [
  { key: 'home', label: '首页', icon: PhHouse },
  { key: 'records', label: '流水', icon: PhListBullets },
  { key: 'stats', label: '统计', icon: PhChartPieSlice },
  { key: 'settings', label: '设置', icon: PhGearSix },
]

onMounted(async () => {
  try {
    await initializeDatabase()
    await refresh()
  } catch (error) {
    fatalError.value = `账本加载失败：${error.message}`
  } finally {
    loading.value = false
  }
})

async function refresh() {
  const data = await getAllData()
  categories.value = data.categories
  transactions.value = data.transactions
}

function notify(message) {
  toast.value = message
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toast.value = '' }, 2600)
}

function addTransaction() {
  editingTransaction.value = null
  transactionSheetOpen.value = true
}

function routeProps(name) {
  if (name === 'home') return { transactions: transactions.value }
  if (name === 'stats' || name === 'annual-report' || name === 'records') return { transactions: transactions.value, categories: categories.value }
  if (name === 'categories') return { categories: categories.value }
  if (name === 'settings') return { transactions: transactions.value, categories: categories.value }
  return {}
}

function routeListeners(name) {
  if (name === 'home') return { add: addTransaction }
  if (name === 'records') return { edit: editTransaction, delete: onDeleteTransaction }
  if (name === 'categories') return { save: onSaveCategory, delete: onDeleteCategory }
  if (name === 'settings') return { export: onExport, import: onImport, changed: refresh, notify }
  return {}
}

function editTransaction(item) {
  editingTransaction.value = item
  transactionSheetOpen.value = true
}

async function onSaveTransaction(item) {
  await saveTransaction(item)
  await refresh()
  transactionSheetOpen.value = false
  notify(item.id ? '流水已更新' : '已记下一笔')
}

async function onDeleteTransaction(item) {
  if (!window.confirm(`确定删除这笔 ¥${item.amount.toFixed(2)} 的流水吗？`)) return
  await removeTransaction(item.id)
  await refresh()
  notify('流水已删除')
}

async function onSaveCategory(item) {
  await saveCategory(item)
  await refresh()
  notify(item.id ? '分类已更新' : '分类已新增')
}

async function onDeleteCategory(item) {
  if (!window.confirm(`确定删除“${item.name}”吗？`)) return
  try {
    await removeCategory(item.id)
    await refresh()
    notify('分类已删除')
  } catch (error) {
    notify(error.message)
  }
}

async function onExport() {
  const content = await exportDatabase()
  const blob = new Blob([content], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `一笔备份-${new Date().toISOString().slice(0, 10)}.json`
  link.click()
  URL.revokeObjectURL(url)
  notify('备份文件已导出')
}

async function onImport(file) {
  if (!window.confirm('恢复备份会替换当前全部数据，确定继续吗？')) return
  try {
    const payload = JSON.parse(await file.text())
    await importDatabase(payload)
    await refresh()
    notify('备份已恢复')
  } catch (error) {
    notify(error.message || '备份文件读取失败')
  }
}
</script>

<template>
  <div class="app-shell">
    <main class="app-main">
      <div v-if="loading" class="loading-state" aria-label="正在加载">
        <div class="skeleton skeleton-title"></div>
        <div class="skeleton skeleton-balance"></div>
        <div class="skeleton skeleton-row"></div>
        <div class="skeleton skeleton-row"></div>
      </div>

      <div v-else-if="fatalError" class="fatal-state" role="alert">
        <span>!</span>
        <h1>账本没有打开</h1>
        <p>{{ fatalError }}</p>
        <button class="primary-button" type="button" @click="location.reload()">重新加载</button>
      </div>

      <RouterView v-else v-slot="{ Component, route: activeRoute }">
        <component :is="Component" v-bind="routeProps(activeRoute.name)" v-on="routeListeners(activeRoute.name)" />
      </RouterView>
    </main>

    <nav v-if="!fatalError" class="bottom-nav" aria-label="主导航">
      <button v-for="item in navItems.slice(0, 2)" :key="item.key" type="button" :class="{ active: currentView === item.key }" @click="router.push({ name: item.key })">
        <component :is="item.icon" :size="23" :weight="currentView === item.key ? 'fill' : 'regular'" />
        <span>{{ item.label }}</span>
      </button>
      <button class="nav-add" type="button" aria-label="记一笔" @click="addTransaction"><span><PhPlus :size="25" weight="bold" /></span><small>记账</small></button>
      <button v-for="item in navItems.slice(2)" :key="item.key" type="button" :class="{ active: currentView === item.key }" @click="router.push({ name: item.key })">
        <component :is="item.icon" :size="23" :weight="currentView === item.key ? 'fill' : 'regular'" />
        <span>{{ item.label }}</span>
      </button>
    </nav>

    <TransactionSheet :open="transactionSheetOpen" :transaction="editingTransaction" :categories="categories" @close="transactionSheetOpen = false" @save="onSaveTransaction" />
    <PwaUpdatePrompt />

    <Transition name="toast">
      <div v-if="toast" class="toast" role="status">{{ toast }}</div>
    </Transition>
  </div>
</template>
