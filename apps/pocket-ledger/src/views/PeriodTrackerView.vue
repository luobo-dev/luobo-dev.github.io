<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { PhArrowLeft, PhCalendarBlank, PhPencilSimple, PhPlus, PhTrash, PhX } from '@phosphor-icons/vue'
import { localDateString } from '../lib/date.js'
import { daysBetween, periodSummary } from '../lib/period.js'
import { getPeriods, removePeriod, savePeriod } from '../lib/periodDb.js'

const router = useRouter()
const records = ref([])
const loading = ref(true)
const editorOpen = ref(false)
const error = ref('')
const form = ref(emptyForm())
const today = localDateString()

const ongoing = computed(() => records.value.find((item) => !item.endDate))
const latest = computed(() => records.value[0])
const summary = computed(() => periodSummary(records.value))
const daysSinceStart = computed(() => latest.value ? Math.max(0, daysBetween(latest.value.startDate, today)) : null)

onMounted(refresh)

function emptyForm() {
  return { id: '', startDate: localDateString(), endDate: '', note: '', createdAt: '' }
}

async function refresh() {
  loading.value = true
  records.value = await getPeriods()
  loading.value = false
}

async function startToday() {
  error.value = ''
  try {
    await savePeriod({ startDate: today, endDate: '', note: '' })
    await refresh()
  } catch (saveError) {
    error.value = saveError.message
  }
}

async function finishToday() {
  if (!ongoing.value) return
  error.value = ''
  try {
    await savePeriod({ ...ongoing.value, endDate: today })
    await refresh()
  } catch (saveError) {
    error.value = saveError.message
  }
}

function openEditor(item = null) {
  error.value = ''
  form.value = item ? { ...item } : emptyForm()
  editorOpen.value = true
}

async function submit() {
  error.value = ''
  try {
    await savePeriod(form.value)
    editorOpen.value = false
    await refresh()
  } catch (saveError) {
    error.value = saveError.message
  }
}

async function deleteRecord(item) {
  if (!window.confirm(`确定删除 ${formatDate(item.startDate)} 开始的记录吗？`)) return
  await removePeriod(item.id)
  await refresh()
}

function formatDate(value) {
  if (!value) return '未记录'
  const date = new Date(`${value}T00:00:00`)
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
}

function duration(item) {
  if (!item.endDate) return `第 ${daysBetween(item.startDate, today) + 1} 天`
  return `共 ${daysBetween(item.startDate, item.endDate) + 1} 天`
}
</script>

<template>
  <div class="view period-tracker-view">
    <header class="records-header">
      <button class="icon-button" type="button" aria-label="返回设置" @click="router.push({ name: 'settings' })"><PhArrowLeft :size="21" /></button>
      <div><p class="section-kicker">私人记录</p><h1>经期记录</h1></div>
    </header>

    <div v-if="loading" class="period-loading">正在读取本地记录...</div>

    <template v-else>
      <section class="period-overview" :class="{ active: ongoing }">
        <div class="period-overview-copy">
          <span>{{ ongoing ? '本次经期进行中' : latest ? '距离上次开始' : '从今天开始记录' }}</span>
          <strong v-if="ongoing">第 {{ daysBetween(ongoing.startDate, today) + 1 }} 天</strong>
          <strong v-else-if="latest">{{ daysSinceStart }} 天</strong>
          <strong v-else>还没有记录</strong>
          <small v-if="ongoing">开始于 {{ formatDate(ongoing.startDate) }}</small>
          <small v-else-if="latest">上次开始于 {{ formatDate(latest.startDate) }}</small>
          <small v-else>点击下面的按钮即可记下开始日期</small>
        </div>
        <PhCalendarBlank :size="34" weight="duotone" />
      </section>

      <p v-if="error && !editorOpen" class="form-error period-page-error" role="alert">{{ error }}</p>

      <div class="period-primary-actions">
        <button v-if="ongoing" class="primary-button full-width" type="button" @click="finishToday">今天结束了</button>
        <button v-else class="primary-button full-width" type="button" @click="startToday">今天来了</button>
        <button class="period-secondary-action" type="button" @click="openEditor()"><PhPlus :size="18" />补记其他日期</button>
      </div>

      <section class="period-stats">
        <div><span>平均周期</span><strong>{{ summary.averageCycle ? `${summary.averageCycle} 天` : '记录不足' }}</strong></div>
        <div><span>平均持续</span><strong>{{ summary.averageDuration ? `${summary.averageDuration} 天` : '记录不足' }}</strong></div>
        <div><span>已记录</span><strong>{{ records.length }} 次</strong></div>
      </section>

      <section class="period-prediction">
        <span>预计下次</span>
        <strong v-if="summary.prediction">{{ formatDate(summary.prediction.start) }}<template v-if="summary.prediction.end !== summary.prediction.start"> ～ {{ formatDate(summary.prediction.end) }}</template></strong>
        <strong v-else>再记录 {{ summary.cyclesNeeded || 1 }} 次后开始估算</strong>
        <p>仅根据历史开始日期估算，不用于避孕或医疗诊断。</p>
      </section>

      <section class="period-history-section">
        <div class="section-heading"><div><h2>历史记录</h2><p>按开始日期从近到远排列</p></div></div>
        <div v-if="records.length" class="period-history-list">
          <article v-for="item in records" :key="item.id">
            <div>
              <strong>{{ formatDate(item.startDate) }}</strong>
              <span>{{ item.endDate ? `${formatDate(item.endDate)}结束` : '进行中' }} · {{ duration(item) }}</span>
              <small v-if="item.note">{{ item.note }}</small>
            </div>
            <button type="button" aria-label="编辑记录" @click="openEditor(item)"><PhPencilSimple :size="17" /></button>
            <button type="button" aria-label="删除记录" @click="deleteRecord(item)"><PhTrash :size="17" /></button>
          </article>
        </div>
        <div v-else class="empty-state period-empty"><span class="empty-mark">·</span><h3>还没有历史记录</h3><p>记录三次后，就可以看到个人周期范围。</p></div>
      </section>

      <p class="period-privacy-note">数据只保存在当前设备的独立数据库中，不会包含在账本备份里。</p>
    </template>

    <Teleport to="body">
      <Transition name="sheet">
        <div v-if="editorOpen" class="sheet-layer" @click.self="editorOpen = false">
          <section class="sheet-panel compact-sheet" role="dialog" aria-modal="true" aria-label="编辑经期记录">
            <div class="sheet-handle"></div>
            <header class="sheet-header">
              <div><p class="section-kicker">经期记录</p><h2>{{ form.id ? '修改日期' : '补记日期' }}</h2></div>
              <button class="icon-button" type="button" aria-label="关闭" @click="editorOpen = false"><PhX :size="22" /></button>
            </header>
            <form class="category-form" @submit.prevent="submit">
              <label class="field"><span>开始日期</span><input v-model="form.startDate" type="date" required /></label>
              <label class="field"><span>结束日期（可以稍后填写）</span><input v-model="form.endDate" type="date" :min="form.startDate" /></label>
              <label class="field"><span>备注</span><textarea v-model="form.note" maxlength="120" rows="2" placeholder="例如：腹痛、量较多或其他情况"></textarea></label>
              <p v-if="error" class="form-error" role="alert">{{ error }}</p>
              <button class="primary-button full-width" type="submit">保存记录</button>
            </form>
          </section>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
