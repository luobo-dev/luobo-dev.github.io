<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  PhCalendarBlank,
  PhCheckCircle,
  PhDownloadSimple,
  PhFileXls,
  PhFolders,
  PhInfo,
  PhLockKey,
  PhShieldCheck,
  PhUploadSimple,
  PhWarningCircle,
  PhX,
} from '@phosphor-icons/vue'
import { commitLedgerImport, exportLedgerExcel, parseLedgerWorkbook } from '../lib/excel.js'

const props = defineProps({
  transactions: { type: Array, default: () => [] },
  categories: { type: Array, default: () => [] },
})
const router = useRouter()
const emit = defineEmits(['export', 'import', 'changed', 'notify'])
const fileInput = ref(null)
const excelInput = ref(null)
const excelBusy = ref(false)
const importing = ref(false)
const excelError = ref('')
const preview = ref(null)

function chooseFile() {
  fileInput.value?.click()
}

function onFile(event) {
  const file = event.target.files?.[0]
  if (file) emit('import', file)
  event.target.value = ''
}

function chooseExcel() {
  excelInput.value?.click()
}

async function onExcelFile(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return

  excelBusy.value = true
  excelError.value = ''
  preview.value = null
  try {
    preview.value = await parseLedgerWorkbook(file, props.categories, props.transactions)
  } catch (error) {
    excelError.value = error.message || 'Excel 文件读取失败'
  } finally {
    excelBusy.value = false
  }
}

async function confirmExcelImport() {
  if (!preview.value?.validRows || importing.value) return
  importing.value = true
  try {
    const result = await commitLedgerImport(preview.value)
    emit('changed')
    emit('notify', `已导入 ${result.transactionsCreated} 笔流水，新增 ${result.categoriesCreated} 个分类`)
    preview.value = null
  } catch (error) {
    excelError.value = error.message || '导入失败，请稍后重试'
  } finally {
    importing.value = false
  }
}

async function downloadExcel() {
  excelBusy.value = true
  excelError.value = ''
  try {
    await exportLedgerExcel(props.transactions, props.categories)
    emit('notify', `已导出 ${props.transactions.length} 笔流水`)
  } catch (error) {
    excelError.value = error.message || 'Excel 导出失败'
  } finally {
    excelBusy.value = false
  }
}
</script>

<template>
  <div class="view settings-view">
    <header class="page-header">
      <div>
        <p class="section-kicker">设置</p>
        <h1>数据由你保管</h1>
      </div>
    </header>

    <section class="privacy-panel">
      <PhShieldCheck :size="30" weight="duotone" />
      <div><h2>只存在这台设备</h2><p>账本和私人小工具保存在浏览器的 IndexedDB 中，不会上传到服务器。</p></div>
    </section>

    <section class="settings-section">
      <div class="section-heading"><div><h2>账本设置</h2><p>整理记账时使用的分类</p></div></div>
      <div class="settings-actions">
        <button type="button" @click="router.push({ name: 'categories' })"><PhFolders :size="22" /><span><strong>分类管理</strong><small>新增、编辑和删除一级、二级分类</small></span></button>
      </div>
    </section>

    <section class="settings-section">
      <div class="section-heading"><div><h2>Excel 导入导出</h2><p>兼容随手记导入，导出一笔简洁格式</p></div></div>
      <div class="settings-actions">
        <button type="button" :disabled="excelBusy" @click="chooseExcel"><PhFileXls :size="22" /><span><strong>{{ excelBusy ? '正在读取...' : '导入 Excel' }}</strong><small>追加流水，重复记录自动跳过</small></span></button>
        <button type="button" :disabled="excelBusy" @click="downloadExcel"><PhDownloadSimple :size="21" /><span><strong>导出 Excel</strong><small>导出 {{ transactions.length }} 笔简洁格式流水</small></span></button>
        <input ref="excelInput" hidden type="file" accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" @change="onExcelFile" />
      </div>
      <p v-if="excelError && !preview" class="settings-error" role="alert"><PhWarningCircle :size="17" />{{ excelError }}</p>
    </section>

    <section class="settings-section">
      <div class="section-heading"><div><h2>完整备份</h2><p>包含账本、经期记录和加密保险箱</p></div></div>
      <div class="settings-actions">
        <button type="button" @click="emit('export')"><PhDownloadSimple :size="21" /><span><strong>导出完整备份</strong><small>保险箱内容在文件中仍保持加密</small></span></button>
        <button type="button" @click="chooseFile"><PhUploadSimple :size="21" /><span><strong>恢复完整备份</strong><small>同时恢复账本和文件中包含的私人数据</small></span></button>
        <input ref="fileInput" hidden type="file" accept="application/json,.json" @change="onFile" />
      </div>
    </section>

    <section class="about-panel">
      <PhInfo :size="21" />
      <div><strong>一笔</strong><p>无广告、无账号、无订阅。清除浏览器网站数据会同时删除账本，请记得备份。</p></div>
    </section>

    <section class="settings-section period-settings-entry">
      <div class="section-heading"><div><h2>私人小工具</h2><p>独立保存，不混入账本数据</p></div></div>
      <div class="settings-actions">
        <button type="button" @click="router.push({ name: 'period-tracker' })"><PhCalendarBlank :size="22" /><span><strong>经期记录</strong><small>记下开始、结束日期和周期规律</small></span></button>
        <button type="button" @click="router.push({ name: 'private-vault' })"><PhLockKey :size="22" /><span><strong>私密保险箱</strong><small>加密保存银行卡号和私密账号</small></span></button>
      </div>
    </section>

    <Teleport to="body">
      <Transition name="sheet">
        <div v-if="preview" class="sheet-layer" @click.self="preview = null">
          <section class="sheet-panel compact-sheet import-preview" role="dialog" aria-modal="true" aria-labelledby="import-preview-title">
            <div class="sheet-handle"></div>
            <header class="sheet-header">
              <div>
                <p class="section-kicker">导入预览</p>
                <h2 id="import-preview-title">检查后再写入</h2>
              </div>
              <button class="icon-button" type="button" aria-label="关闭导入预览" @click="preview = null"><PhX :size="22" /></button>
            </header>

            <p class="import-file-name">{{ preview.fileName }}</p>
            <div class="import-counts" aria-label="导入统计">
              <div><strong>{{ preview.validRows }}</strong><span>可导入</span></div>
              <div><strong>{{ preview.duplicateRows }}</strong><span>重复跳过</span></div>
              <div :class="{ warning: preview.invalidRows }"><strong>{{ preview.invalidRows }}</strong><span>异常</span></div>
            </div>

            <div class="import-detail-list">
              <p><PhCheckCircle :size="19" weight="fill" /><span>将新增 <strong>{{ preview.newPrimaryCategories.length + preview.newSecondaryCategories.length }}</strong> 个分类</span></p>
              <p><PhShieldCheck :size="19" weight="fill" /><span>只追加到当前账本，不会覆盖现有数据</span></p>
            </div>

            <div v-if="preview.errors.length" class="import-errors">
              <h3>需要检查的行</h3>
              <p v-for="item in preview.errors.slice(0, 4)" :key="`${item.sheet}-${item.row}`">{{ item.sheet }} 第 {{ item.row }} 行：{{ item.message }}</p>
              <small v-if="preview.errors.length > 4">另有 {{ preview.errors.length - 4 }} 条异常未显示</small>
            </div>

            <p v-if="excelError" class="settings-error" role="alert"><PhWarningCircle :size="17" />{{ excelError }}</p>
            <button class="primary-button full-width import-confirm" type="button" :disabled="!preview.validRows || importing" @click="confirmExcelImport">
              {{ importing ? '正在导入...' : `导入 ${preview.validRows} 笔流水` }}
            </button>
          </section>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
