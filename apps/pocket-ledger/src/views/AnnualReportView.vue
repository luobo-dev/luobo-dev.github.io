<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { PhArrowLeft, PhCaretLeft, PhCaretRight } from '@phosphor-icons/vue'
import EChart from '../components/EChart.vue'
import { formatCompactMoney, formatFriendlyDate, formatMoney } from '../lib/date.js'
import { monthBuckets, percentageChange, primaryCategoryTotals, transactionTotals } from '../lib/reports.js'

const props = defineProps({
  transactions: { type: Array, default: () => [] },
  categories: { type: Array, default: () => [] },
})

const route = useRoute()
const router = useRouter()
const year = computed(() => Number(route.params.year) || new Date().getFullYear())
const yearTransactions = computed(() => props.transactions.filter((item) => item.date.startsWith(`${year.value}-`)))
const totals = computed(() => transactionTotals(yearTransactions.value))
const now = new Date()
const isCurrentYear = computed(() => year.value === now.getFullYear())
const comparisonSuffix = computed(() => isCurrentYear.value ? `-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}` : '-12-31')
const previousExpense = computed(() => {
  const start = `${year.value - 1}-01-01`
  const end = `${year.value - 1}${comparisonSuffix.value}`
  return props.transactions.filter((item) => item.type === 'expense' && item.date >= start && item.date <= end).reduce((sum, item) => sum + item.amount, 0)
})
const yearlyChange = computed(() => percentageChange(totals.value.expense, previousExpense.value))
const elapsedMonths = computed(() => isCurrentYear.value ? now.getMonth() + 1 : 12)
const activeDays = computed(() => new Set(yearTransactions.value.map((item) => item.date)).size)
const months = computed(() => monthBuckets(yearTransactions.value, new Date(year.value, 11, 1), 12))
const highestMonth = computed(() => months.value.reduce((highest, item) => item.expense > highest.expense ? item : highest, months.value[0]))
const categoryData = computed(() => primaryCategoryTotals(yearTransactions.value, props.categories))
const largestExpenses = computed(() => yearTransactions.value.filter((item) => item.type === 'expense').sort((a, b) => b.amount - a.amount).slice(0, 5))
const categoryMap = computed(() => new Map(props.categories.map((item) => [item.id, item])))

const palette = { expense: '#c65d45', income: '#3f7a64', text: '#6f746e', grid: 'rgba(118, 125, 117, .16)' }
const yearlyOption = computed(() => ({
  animationDuration: 350,
  tooltip: { trigger: 'axis', valueFormatter: (value) => formatMoney(value) },
  legend: { top: 0, right: 2, textStyle: { color: palette.text, fontSize: 10 }, itemWidth: 10, itemHeight: 6 },
  grid: { left: 8, right: 8, top: 28, bottom: 4, containLabel: true },
  xAxis: { type: 'category', data: months.value.map((item) => item.label), axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: palette.text, fontSize: 10, interval: 0 } },
  yAxis: { type: 'value', axisLine: { show: false }, axisTick: { show: false }, splitLine: { lineStyle: { color: palette.grid } }, axisLabel: { color: palette.text, fontSize: 10, formatter: formatCompactMoney } },
  series: [
    { name: '支出', type: 'bar', barMaxWidth: 10, itemStyle: { color: palette.expense, borderRadius: [3, 3, 0, 0] }, data: months.value.map((item) => item.expense) },
    { name: '收入', type: 'bar', barMaxWidth: 10, itemStyle: { color: palette.income, borderRadius: [3, 3, 0, 0] }, data: months.value.map((item) => item.income) },
  ],
}))

function moveYear(amount) {
  router.replace({ name: 'annual-report', params: { year: year.value + amount } })
}

function categoryPath(item) {
  const child = categoryMap.value.get(item.categoryId)
  const parent = categoryMap.value.get(child?.parentId)
  return [parent?.name, child?.name].filter(Boolean).join(' / ') || '未分类'
}

function changeText() {
  if (yearlyChange.value === null) return '上一年暂无支出数据'
  if (Math.abs(yearlyChange.value) < 0.05) return '与上一年基本持平'
  return `比上一年${yearlyChange.value > 0 ? '增加' : '减少'} ${Math.abs(yearlyChange.value).toFixed(1)}%`
}
</script>

<template>
  <div class="view annual-report-view">
    <header class="records-header">
      <button class="icon-button" type="button" aria-label="返回统计" @click="router.push({ name: 'stats' })"><PhArrowLeft :size="21" /></button>
      <div><p class="section-kicker">年度报告</p><h1>{{ year }} 年账单</h1></div>
    </header>

    <div class="period-nav annual-year-nav">
      <button type="button" aria-label="上一年" @click="moveYear(-1)"><PhCaretLeft :size="18" /></button>
      <strong>{{ year }} 年</strong>
      <button type="button" aria-label="下一年" @click="moveYear(1)"><PhCaretRight :size="18" /></button>
    </div>

    <template v-if="yearTransactions.length">
      <section class="annual-hero">
        <span>全年净收支</span>
        <strong>{{ formatMoney(totals.income - totals.expense) }}</strong>
        <p>{{ changeText() }}{{ isCurrentYear ? '（截至今天）' : '' }}</p>
      </section>

      <section class="stats-summary annual-summary">
        <div><span>全年支出</span><strong class="expense-text">{{ formatMoney(totals.expense) }}</strong></div>
        <div><span>全年收入</span><strong class="income-text">{{ formatMoney(totals.income) }}</strong></div>
        <div><span>月均支出</span><strong>{{ formatMoney(totals.expense / elapsedMonths) }}</strong></div>
      </section>

      <section class="annual-facts">
        <div><span>记录天数</span><strong>{{ activeDays }} 天</strong></div>
        <div><span>支出最高月份</span><strong>{{ highestMonth.month }} 月</strong><small>{{ formatMoney(highestMonth.expense) }}</small></div>
        <div><span>全年流水</span><strong>{{ yearTransactions.length }} 笔</strong></div>
      </section>

      <section class="chart-panel">
        <div class="chart-heading"><h2>月度收支</h2><span>全年 12 个月</span></div>
        <EChart :option="yearlyOption" :height="255" />
      </section>

      <section v-if="categoryData.length" class="chart-panel annual-ranking-panel">
        <div class="chart-heading"><h2>支出分类排行</h2><span>按一级分类</span></div>
        <div class="annual-category-ranking">
          <div v-for="item in categoryData.slice(0, 8)" :key="item.id">
            <div><strong>{{ item.name }}</strong><span>{{ totals.expense ? (item.value / totals.expense * 100).toFixed(1) : 0 }}%</span><b>{{ formatMoney(item.value) }}</b></div>
            <i><span :style="{ width: `${totals.expense ? item.value / totals.expense * 100 : 0}%` }"></span></i>
          </div>
        </div>
      </section>

      <section v-if="largestExpenses.length" class="chart-panel annual-largest-panel">
        <div class="chart-heading"><h2>年度大额支出</h2><span>金额最高的五笔</span></div>
        <div class="annual-largest-list">
          <div v-for="item in largestExpenses" :key="item.id">
            <span><strong>{{ item.event || categoryMap.get(item.categoryId)?.name || '未填写事项' }}</strong><small>{{ formatFriendlyDate(item.date) }} · {{ categoryPath(item) }}</small></span>
            <b>{{ formatMoney(item.amount) }}</b>
          </div>
        </div>
      </section>
    </template>

    <div v-else class="empty-state stats-empty">
      <span class="empty-mark">{{ year }}</span>
      <h3>这一年还没有流水</h3>
      <p>切换到有记录的年份，即可生成完整年度报告。</p>
    </div>
  </div>
</template>
