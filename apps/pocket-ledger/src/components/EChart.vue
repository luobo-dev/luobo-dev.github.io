<script setup>
import * as echarts from 'echarts/core'
import { BarChart, LineChart, PieChart } from 'echarts/charts'
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

echarts.use([BarChart, LineChart, PieChart, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer])

const props = defineProps({
  option: { type: Object, required: true },
  height: { type: Number, default: 240 },
})

const chartElement = ref(null)
let chart
let resizeObserver

function render() {
  if (!chartElement.value) return
  chart ||= echarts.init(chartElement.value)
  chart.setOption(props.option, true)
}

onMounted(async () => {
  await nextTick()
  render()
  resizeObserver = new ResizeObserver(() => chart?.resize())
  resizeObserver.observe(chartElement.value)
})

watch(() => props.option, render, { deep: true })

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  chart?.dispose()
})
</script>

<template>
  <div ref="chartElement" class="chart" :style="{ height: `${height}px` }" role="img" aria-label="财务统计图表"></div>
</template>
