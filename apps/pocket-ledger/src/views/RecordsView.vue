<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { PhArrowLeft, PhCalendarBlank, PhMagnifyingGlass } from '@phosphor-icons/vue'
import TransactionList from '../components/TransactionList.vue'
import { formatDateHeading, formatDateRange, formatMoney, getPresetRange } from '../lib/date.js'

const props = defineProps({
  transactions: { type: Array, default: () => [] },
  categories: { type: Array, default: () => [] },
})

defineEmits(['edit', 'delete'])

const router = useRouter()
const activePreset = ref('month')
const initialRange = getPresetRange('month')
const startDate = ref(initialRange.start)
const endDate = ref(initialRange.end)
const typeFilter = ref('all')
const query = ref('')

const presets = [
  { key: 'week', label: '本周' },
  { key: 'month', label: '本月' },
  { key: 'year', label: '今年' },
  { key: 'lastYear', label: '去年' },
  { key: 'custom', label: '自定义' },
]

function selectPreset(key) {
  activePreset.value = key
  if (key === 'custom') return
  const range = getPresetRange(key)
  startDate.value = range.start
  endDate.value = range.end
}

function onCustomDateChange() {
  activePreset.value = 'custom'
  if (startDate.value > endDate.value) endDate.value = startDate.value
}

const categoryMap = computed(() => new Map(props.categories.map((item) => [item.id, item])))
const visibleTransactions = computed(() => props.transactions.filter((item) => {
  if (item.date < startDate.value || item.date > endDate.value) return false
  if (typeFilter.value !== 'all' && item.type !== typeFilter.value) return false
  if (!query.value.trim()) return true
  const category = categoryMap.value.get(item.categoryId)
  const parent = categoryMap.value.get(category?.parentId)
  return `${item.event || ''}${item.note || ''}${category?.name || ''}${parent?.name || ''}`.includes(query.value.trim())
}))

const groups = computed(() => {
  const result = []
  const map = new Map()
  visibleTransactions.value.forEach((item) => {
    if (!map.has(item.date)) {
      const group = { date: item.date, items: [], expense: 0, income: 0 }
      map.set(item.date, group)
      result.push(group)
    }
    const group = map.get(item.date)
    group.items.push(item)
    group[item.type] += item.amount
  })
  return result
})

const expense = computed(() => visibleTransactions.value.filter((item) => item.type === 'expense').reduce((sum, item) => sum + item.amount, 0))
const income = computed(() => visibleTransactions.value.filter((item) => item.type === 'income').reduce((sum, item) => sum + item.amount, 0))
</script>

<template>
  <div class="view records-view">
    <header class="records-header">
      <button class="icon-button" type="button" aria-label="返回首页" @click="router.push({ name: 'home' })">
        <PhArrowLeft :size="21" />
      </button>
      <div>
        <p class="section-kicker">流水查询</p>
        <h1>查找流水</h1>
      </div>
    </header>

    <div class="preset-scroll" aria-label="日期范围">
      <button v-for="preset in presets" :key="preset.key" type="button" :class="{ active: activePreset === preset.key }" @click="selectPreset(preset.key)">{{ preset.label }}</button>
    </div>

    <section class="date-range-panel">
      <div class="range-summary">
        <PhCalendarBlank :size="20" />
        <span><small>查询日期</small><strong>{{ formatDateRange(startDate, endDate) }}</strong></span>
      </div>
      <div v-if="activePreset === 'custom'" class="custom-date-grid">
        <label class="field"><span>开始日期</span><input v-model="startDate" type="date" :max="endDate" @change="onCustomDateChange" /></label>
        <label class="field"><span>结束日期</span><input v-model="endDate" type="date" :min="startDate" @change="onCustomDateChange" /></label>
      </div>
    </section>

    <section class="records-summary">
      <div><span>支出</span><strong class="expense-text">{{ formatMoney(expense) }}</strong></div>
      <div><span>收入</span><strong class="income-text">{{ formatMoney(income) }}</strong></div>
      <div><span>共计</span><strong>{{ visibleTransactions.length }} 笔</strong></div>
    </section>

    <div class="records-tools">
      <label class="records-search">
        <PhMagnifyingGlass :size="18" />
        <input v-model="query" type="search" placeholder="搜索事项、备注或分类" aria-label="搜索流水" />
      </label>
      <div class="records-type-filter" aria-label="交易类型">
        <button v-for="item in [{ key: 'all', label: '全部' }, { key: 'expense', label: '支出' }, { key: 'income', label: '收入' }]" :key="item.key" type="button" :class="{ active: typeFilter === item.key }" @click="typeFilter = item.key">{{ item.label }}</button>
      </div>
    </div>

    <div v-if="groups.length" class="date-groups">
      <section v-for="group in groups" :key="group.date" class="date-group">
        <header class="date-group-header">
          <div><h2>{{ formatDateHeading(group.date) }}</h2><span>{{ group.items.length }} 笔</span></div>
          <p><span v-if="group.expense">支出 {{ formatMoney(group.expense) }}</span><span v-if="group.income">收入 {{ formatMoney(group.income) }}</span></p>
        </header>
        <TransactionList :transactions="group.items" :categories="categories" :show-date="false" @edit="$emit('edit', $event)" @delete="$emit('delete', $event)" />
      </section>
    </div>

    <div v-else class="empty-state records-empty">
      <span class="empty-mark">¥</span>
      <h3>这个日期范围没有流水</h3>
      <p>可以切换预设日期，或者选择自定义日期继续查找。</p>
    </div>
  </div>
</template>
