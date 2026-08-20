<script setup>
import { computed, defineAsyncComponent, ref } from 'vue'
import { useRouter } from 'vue-router'
import { PhArrowRight, PhPlus } from '@phosphor-icons/vue'
import { formatMoney, getPeriodRange } from '../lib/date.js'

const EChart = defineAsyncComponent(() => import('../components/EChart.vue'))

const props = defineProps({
  transactions: { type: Array, default: () => [] },
})

defineEmits(['add'])

const router = useRouter()
const trendPeriod = ref('week')
const monthRange = getPeriodRange('month')

const monthTransactions = computed(() => props.transactions.filter((item) => item.date >= monthRange.start && item.date <= monthRange.end))
const income = computed(() => monthTransactions.value.filter((item) => item.type === 'income').reduce((sum, item) => sum + item.amount, 0))
const expense = computed(() => monthTransactions.value.filter((item) => item.type === 'expense').reduce((sum, item) => sum + item.amount, 0))

const trendRange = computed(() => getPeriodRange(trendPeriod.value))
const trendData = computed(() => {
  const start = new Date(`${trendRange.value.start}T00:00:00`)
  const end = new Date(`${trendRange.value.end}T00:00:00`)
  const buckets = []

  for (const date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    buckets.push({
      key,
      label: trendPeriod.value === 'week' ? ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()] : `${date.getDate()}日`,
      value: 0,
    })
  }

  props.transactions
    .filter((item) => item.type === 'expense' && item.date >= trendRange.value.start && item.date <= trendRange.value.end)
    .forEach((item) => {
      const bucket = buckets.find((entry) => entry.key === item.date)
      if (bucket) bucket.value += item.amount
    })

  return buckets
})

const trendTotal = computed(() => trendData.value.reduce((sum, item) => sum + item.value, 0))
const trendOption = computed(() => ({
  animationDuration: 260,
  tooltip: { trigger: 'axis', valueFormatter: (value) => formatMoney(value) },
  grid: { left: 6, right: 8, top: 20, bottom: 2, containLabel: true },
  xAxis: {
    type: 'category',
    boundaryGap: false,
    data: trendData.value.map((item) => item.label),
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { color: '#858b84', fontSize: 10, interval: trendPeriod.value === 'month' ? 4 : 0 },
  },
  yAxis: {
    type: 'value',
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { show: false },
    splitLine: { lineStyle: { color: 'rgba(118, 125, 117, .14)' } },
  },
  series: [{
    name: '支出',
    type: 'line',
    smooth: 0.34,
    showSymbol: trendData.value.length <= 7,
    symbolSize: 7,
    itemStyle: { color: '#c65d45' },
    lineStyle: { width: 3, color: '#c65d45' },
    areaStyle: { color: 'rgba(198, 93, 69, .10)' },
    data: trendData.value.map((item) => item.value),
  }],
}))
</script>

<template>
  <div class="view home-view">
    <header class="page-header home-header">
      <div>
        <p class="section-kicker">我的账本</p>
        <h1>今天，记清楚一点</h1>
      </div>
    </header>

    <section class="balance-panel">
      <div class="balance-primary">
        <span>本月结余</span>
        <strong>{{ formatMoney(income - expense) }}</strong>
      </div>
      <div class="balance-split">
        <div><span>收入</span><strong>{{ formatMoney(income) }}</strong></div>
        <div><span>支出</span><strong>{{ formatMoney(expense) }}</strong></div>
      </div>
    </section>

    <button class="quick-add" type="button" @click="$emit('add')">
      <span><PhPlus :size="21" weight="bold" /></span>
      <span><strong>记一笔</strong><small>记录金额、事项和分类</small></span>
    </button>

    <button class="records-entry" type="button" @click="router.push({ name: 'records' })">
      <span><strong>查看流水</strong><small>按日期范围查询和管理所有记录</small></span>
      <PhArrowRight :size="20" />
    </button>

    <section class="home-trend-panel">
      <div class="home-trend-header">
        <div>
          <span>{{ trendPeriod === 'week' ? '本周支出' : '本月支出' }}</span>
          <strong>{{ formatMoney(trendTotal) }}</strong>
        </div>
        <div class="mini-toggle" aria-label="趋势周期">
          <button type="button" :class="{ active: trendPeriod === 'week' }" @click="trendPeriod = 'week'">本周</button>
          <button type="button" :class="{ active: trendPeriod === 'month' }" @click="trendPeriod = 'month'">本月</button>
        </div>
      </div>
      <EChart :option="trendOption" :height="210" />
    </section>

  </div>
</template>
