<script setup>
import { computed, ref } from 'vue'
import { PhCaretLeft, PhCaretRight, PhChartDonut } from '@phosphor-icons/vue'
import EChart from '../components/EChart.vue'
import { formatCompactMoney, formatMoney, getPeriodRange, periodTitle, shiftPeriod } from '../lib/date.js'

const props = defineProps({
  transactions: { type: Array, default: () => [] },
  categories: { type: Array, default: () => [] },
})

const period = ref('month')
const anchor = ref(new Date())

const range = computed(() => getPeriodRange(period.value, anchor.value))
const scoped = computed(() => props.transactions.filter((item) => item.date >= range.value.start && item.date <= range.value.end))
const income = computed(() => scoped.value.filter((item) => item.type === 'income').reduce((sum, item) => sum + item.amount, 0))
const expense = computed(() => scoped.value.filter((item) => item.type === 'expense').reduce((sum, item) => sum + item.amount, 0))

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

function changePeriod(next) {
  period.value = next
  anchor.value = new Date()
}

function move(amount) {
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
      <button type="button" aria-label="下一个周期" @click="move(1)"><PhCaretRight :size="18" /></button>
    </div>

    <section class="stats-summary">
      <div><span>支出</span><strong class="expense-text">{{ formatMoney(expense) }}</strong></div>
      <div><span>收入</span><strong class="income-text">{{ formatMoney(income) }}</strong></div>
      <div><span>结余</span><strong>{{ formatMoney(income - expense) }}</strong></div>
    </section>

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
  </div>
</template>
