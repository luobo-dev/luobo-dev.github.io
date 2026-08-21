<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { PhArrowRight, PhCaretLeft, PhCaretRight, PhChartDonut } from '@phosphor-icons/vue'
import EChart from '../components/EChart.vue'
import { formatCompactMoney, formatMoney, getPeriodRange, periodTitle, shiftPeriod } from '../lib/date.js'
import { comparableMonthRange, monthBuckets, percentageChange, primaryCategoryTotals } from '../lib/reports.js'

const props = defineProps({
  transactions: { type: Array, default: () => [] },
  categories: { type: Array, default: () => [] },
})

const period = ref('month')
const anchor = ref(new Date())
const router = useRouter()

const range = computed(() => getPeriodRange(period.value, anchor.value))
const canMoveNext = computed(() => {
  const next = shiftPeriod(period.value, anchor.value, 1)
  return getPeriodRange(period.value, next).start <= getPeriodRange(period.value, new Date()).start
})
const scoped = computed(() => props.transactions.filter((item) => item.date >= range.value.start && item.date <= range.value.end))
const income = computed(() => scoped.value.filter((item) => item.type === 'income').reduce((sum, item) => sum + item.amount, 0))
const expense = computed(() => scoped.value.filter((item) => item.type === 'expense').reduce((sum, item) => sum + item.amount, 0))

function expenseInRange(targetRange) {
  return props.transactions
    .filter((item) => item.type === 'expense' && item.date >= targetRange.start && item.date <= targetRange.end)
    .reduce((sum, item) => sum + item.amount, 0)
}

const monthComparisons = computed(() => {
  if (period.value !== 'month') return null
  const currentRange = comparableMonthRange(anchor.value)
  const previousRange = comparableMonthRange(anchor.value, -1)
  const lastYearRange = comparableMonthRange(anchor.value, -12)
  const current = expenseInRange(currentRange)
  const previous = expenseInRange(previousRange)
  const lastYear = expenseInRange(lastYearRange)
  const now = new Date()
  return {
    month: percentageChange(current, previous),
    year: percentageChange(current, lastYear),
    currentRange,
    previousRange,
    lastYearRange,
    partial: anchor.value.getFullYear() === now.getFullYear() && anchor.value.getMonth() === now.getMonth(),
  }
})

const palette = {
  expense: '#c65d45',
  income: '#3f7a64',
  text: '#6f746e',
  grid: 'rgba(118, 125, 117, .16)',
  categories: ['#c65d45', '#d68a58', '#d1aa61', '#78947f', '#4d766a', '#7c7b91'],
}

const trendData = computed(() => {
  const start = new Date(`${range.value.start}T00:00:00`)
  const end = new Date(`${range.value.end}T00:00:00`)
  const buckets = []

  if (period.value === 'year') {
    for (let month = 0; month < 12; month += 1) {
      buckets.push({ key: `${start.getFullYear()}-${String(month + 1).padStart(2, '0')}`, label: `${month + 1}月`, income: 0, expense: 0 })
    }
  } else {
    for (const date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      buckets.push({ key, label: period.value === 'week' ? ['日', '一', '二', '三', '四', '五', '六'][date.getDay()] : `${date.getDate()}日`, income: 0, expense: 0 })
    }
  }

  scoped.value.forEach((item) => {
    const key = period.value === 'year' ? item.date.slice(0, 7) : item.date
    const bucket = buckets.find((entry) => entry.key === key)
    if (bucket) bucket[item.type] += item.amount
  })
  return buckets
})

const trendOption = computed(() => ({
  animationDuration: 350,
  tooltip: { trigger: 'axis', valueFormatter: (value) => formatMoney(value) },
  grid: { left: 8, right: 8, top: 20, bottom: 4, containLabel: true },
  xAxis: {
    type: 'category',
    boundaryGap: period.value === 'year',
    data: trendData.value.map((item) => item.label),
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { color: palette.text, fontSize: 11, interval: period.value === 'month' ? 4 : 'auto' },
  },
  yAxis: {
    type: 'value',
    axisLine: { show: false },
    axisTick: { show: false },
    splitLine: { lineStyle: { color: palette.grid } },
    axisLabel: { color: palette.text, fontSize: 11, formatter: formatCompactMoney },
  },
  series: [
    {
      name: '支出',
      type: period.value === 'year' ? 'bar' : 'line',
      smooth: true,
      symbol: 'none',
      barMaxWidth: 10,
      itemStyle: { color: palette.expense, borderRadius: [4, 4, 0, 0] },
      lineStyle: { width: 3 },
      areaStyle: period.value === 'year' ? undefined : { color: 'rgba(198, 93, 69, .10)' },
      data: trendData.value.map((item) => item.expense),
    },
    {
      name: '收入',
      type: period.value === 'year' ? 'bar' : 'line',
      smooth: true,
      symbol: 'none',
      barMaxWidth: 10,
      itemStyle: { color: palette.income, borderRadius: [4, 4, 0, 0] },
      lineStyle: { width: 3 },
      data: trendData.value.map((item) => item.income),
    },
  ],
}))

const categoryData = computed(() => {
  const categoryMap = new Map(props.categories.map((item) => [item.id, item]))
  const totals = new Map()
  scoped.value.filter((item) => item.type === 'expense').forEach((item) => {
    const child = categoryMap.get(item.categoryId)
    const primary = child?.parentId ? categoryMap.get(child.parentId) : child
    const name = primary?.name || '未分类'
    totals.set(name, (totals.get(name) || 0) + item.amount)
  })
  return [...totals.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
})

const pieOption = computed(() => ({
  animationDuration: 350,
  color: palette.categories,
  tooltip: { trigger: 'item', formatter: (params) => `${params.name}<br/>${formatMoney(params.value)} (${params.percent}%)` },
  series: [{
    type: 'pie',
    radius: ['52%', '74%'],
    center: ['50%', '48%'],
    avoidLabelOverlap: true,
    itemStyle: { borderWidth: 3, borderColor: 'transparent', borderRadius: 5 },
    label: { color: palette.text, formatter: '{b}\n{d}%', fontSize: 11, lineHeight: 16 },
    labelLine: { length: 8, length2: 8 },
    data: categoryData.value,
  }],
}))

const recentMonths = computed(() => monthBuckets(props.transactions, anchor.value, 12))
const recentMonthTransactions = computed(() => {
  const start = `${recentMonths.value[0].key}-01`
  const endMonth = recentMonths.value.at(-1)
  const end = getPeriodRange('month', new Date(endMonth.year, endMonth.month - 1, 1)).end
  return props.transactions.filter((item) => item.date >= start && item.date <= end)
})

const twelveMonthOption = computed(() => ({
  animationDuration: 350,
  tooltip: { trigger: 'axis', valueFormatter: (value) => formatMoney(value) },
  grid: { left: 8, right: 8, top: 22, bottom: 4, containLabel: true },
  legend: { top: 0, right: 2, textStyle: { color: palette.text, fontSize: 10 }, itemWidth: 10, itemHeight: 6 },
  xAxis: { type: 'category', data: recentMonths.value.map((item) => item.label), axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: palette.text, fontSize: 10, interval: 1 } },
  yAxis: { type: 'value', axisLine: { show: false }, axisTick: { show: false }, splitLine: { lineStyle: { color: palette.grid } }, axisLabel: { color: palette.text, fontSize: 10, formatter: formatCompactMoney } },
  series: [
    { name: '支出', type: 'bar', barMaxWidth: 9, itemStyle: { color: palette.expense, borderRadius: [3, 3, 0, 0] }, data: recentMonths.value.map((item) => item.expense) },
    { name: '收入', type: 'bar', barMaxWidth: 9, itemStyle: { color: palette.income, borderRadius: [3, 3, 0, 0] }, data: recentMonths.value.map((item) => item.income) },
  ],
}))

const trendCategories = computed(() => primaryCategoryTotals(recentMonthTransactions.value, props.categories).slice(0, 3))
const categoryTrendOption = computed(() => {
  const categoryMap = new Map(props.categories.map((item) => [item.id, item]))
  const series = trendCategories.value.map((category, index) => ({
    name: category.name,
    type: 'line',
    smooth: true,
    symbol: 'none',
    lineStyle: { width: 2 },
    itemStyle: { color: palette.categories[index] },
    data: recentMonths.value.map((month) => recentMonthTransactions.value
      .filter((item) => {
        if (item.type !== 'expense' || !item.date.startsWith(month.key)) return false
        const child = categoryMap.get(item.categoryId)
        const primary = child?.parentId ? categoryMap.get(child.parentId) : child
        return (primary?.id || 'uncategorized') === category.id
      })
      .reduce((sum, item) => sum + item.amount, 0)),
  }))
  return {
    animationDuration: 350,
    color: palette.categories,
    tooltip: { trigger: 'axis', valueFormatter: (value) => formatMoney(value) },
    legend: { top: 0, left: 2, textStyle: { color: palette.text, fontSize: 10 }, itemWidth: 12, itemHeight: 7 },
    grid: { left: 8, right: 8, top: 36, bottom: 4, containLabel: true },
    xAxis: { type: 'category', boundaryGap: false, data: recentMonths.value.map((item) => item.label), axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: palette.text, fontSize: 10, interval: 1 } },
    yAxis: { type: 'value', axisLine: { show: false }, axisTick: { show: false }, splitLine: { lineStyle: { color: palette.grid } }, axisLabel: { color: palette.text, fontSize: 10, formatter: formatCompactMoney } },
    series,
  }
})

function formatComparison(value) {
  if (value === null) return { text: '暂无上期数据', tone: '' }
  if (Math.abs(value) < 0.05) return { text: '基本持平', tone: '' }
  return { text: `${value > 0 ? '增加' : '减少'} ${Math.abs(value).toFixed(1)}%`, tone: value > 0 ? 'up' : 'down' }
}

function formatComparisonRange(targetRange, includeYear = false) {
  const start = new Date(`${targetRange.start}T00:00:00`)
  const end = new Date(`${targetRange.end}T00:00:00`)
  const prefix = includeYear ? `${start.getFullYear()}年` : ''
  return `${prefix}${start.getMonth() + 1}月${start.getDate()}日～${end.getMonth() + 1}月${end.getDate()}日`
}

function changePeriod(next) {
  period.value = next
  anchor.value = new Date()
}

function move(amount) {
  if (amount > 0 && !canMoveNext.value) return
  anchor.value = shiftPeriod(period.value, anchor.value, amount)
}
</script>

<template>
  <div class="view stats-view">
    <header class="page-header">
      <div>
        <p class="section-kicker">统计</p>
        <h1>看懂钱的去向</h1>
      </div>
    </header>

    <div class="period-toggle">
      <button v-for="item in [{ key: 'week', label: '周' }, { key: 'month', label: '月' }, { key: 'year', label: '年' }]" :key="item.key" type="button" :class="{ active: period === item.key }" @click="changePeriod(item.key)">{{ item.label }}</button>
    </div>

    <div class="period-nav">
      <button type="button" aria-label="上一个周期" @click="move(-1)"><PhCaretLeft :size="18" /></button>
      <strong>{{ periodTitle(period, anchor) }}</strong>
      <button type="button" aria-label="下一个周期" :disabled="!canMoveNext" @click="move(1)"><PhCaretRight :size="18" /></button>
    </div>

    <section class="stats-summary">
      <div><span>支出</span><strong class="expense-text">{{ formatMoney(expense) }}</strong></div>
      <div><span>收入</span><strong class="income-text">{{ formatMoney(income) }}</strong></div>
      <div><span>净收支</span><strong>{{ formatMoney(income - expense) }}</strong></div>
    </section>

    <section v-if="monthComparisons" class="comparison-grid" aria-label="支出对比">
      <div>
        <span>{{ monthComparisons.partial ? '相比上月同期' : '相比上月' }}</span>
        <strong :class="formatComparison(monthComparisons.month).tone">{{ formatComparison(monthComparisons.month).text }}</strong>
        <small>{{ formatComparisonRange(monthComparisons.currentRange) }} 对比 {{ formatComparisonRange(monthComparisons.previousRange) }}</small>
      </div>
      <div>
        <span>{{ monthComparisons.partial ? '相比去年同期' : '相比去年同月' }}</span>
        <strong :class="formatComparison(monthComparisons.year).tone">{{ formatComparison(monthComparisons.year).text }}</strong>
        <small>{{ formatComparisonRange(monthComparisons.currentRange, true) }} 对比 {{ formatComparisonRange(monthComparisons.lastYearRange, true) }}</small>
      </div>
    </section>

    <button class="annual-report-entry" type="button" @click="router.push({ name: 'annual-report', params: { year: anchor.getFullYear() } })">
      <span><strong>查看年度报告</strong><small>月度趋势、分类排行和年度关键数据</small></span>
      <PhArrowRight :size="20" />
    </button>

    <template v-if="scoped.length">
      <section class="chart-panel">
        <div class="chart-heading"><h2>收支趋势</h2><span>支出与收入</span></div>
        <EChart :option="trendOption" :height="245" />
      </section>

      <section class="chart-panel">
        <div class="chart-heading"><h2>支出构成</h2><span>按一级分类</span></div>
        <EChart v-if="categoryData.length" :option="pieOption" :height="260" />
        <div v-else class="chart-empty"><PhChartDonut :size="28" /><span>这个周期没有支出</span></div>
        <div v-if="categoryData.length" class="category-ranking">
          <div v-for="(item, index) in categoryData.slice(0, 5)" :key="item.name">
            <span><i :style="{ background: palette.categories[index % palette.categories.length] }"></i>{{ item.name }}</span>
            <strong>{{ formatMoney(item.value) }}</strong>
          </div>
        </div>
      </section>
    </template>

    <div v-else class="empty-state stats-empty">
      <span class="empty-mark">%</span>
      <h3>这个周期还没有流水</h3>
      <p>记下几笔后，这里会自动生成趋势和分类构成。</p>
    </div>

    <section class="chart-panel">
      <div class="chart-heading"><h2>最近 12 个月</h2><span>月度收支对比</span></div>
      <EChart :option="twelveMonthOption" :height="245" />
    </section>

    <section v-if="trendCategories.length" class="chart-panel">
      <div class="chart-heading"><h2>分类趋势</h2><span>支出最高的三个一级分类</span></div>
      <EChart :option="categoryTrendOption" :height="250" />
    </section>
  </div>
</template>
