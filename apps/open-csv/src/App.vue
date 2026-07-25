<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import Papa from 'papaparse'
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  Columns3,
  Download,
  FileSpreadsheet,
  Globe2,
  Info,
  RotateCcw,
  Search,
  Upload,
  X,
} from 'lucide-vue-next'
import { formatNumber, languageHref, languageOptions, locale, localeSlug, switchLanguage, t } from './i18n'

const fileInput = ref(null)
const searchInput = ref(null)
const isDragging = ref(false)
const isLoading = ref(false)
const fileName = ref('')
const fileSize = ref(0)
const rows = ref([])
const headers = ref([])
const parseErrors = ref([])
const query = ref('')
const sort = ref({ key: '', direction: 'asc' })
const hiddenColumns = ref(new Set())
const showColumns = ref(false)
const showShortcuts = ref(false)
const selectedColumn = ref('')
const selectedRow = ref(null)
const selectedCell = ref(null)
const editingCell = ref(null)
const editValue = ref('')
const editOriginalValue = ref('')
const columnWidths = ref({})
const fillRange = ref(null)
const toast = ref('')
let toastTimer
let activeResize = null
let activeFill = null
let undoStack = []
let redoStack = []

const hasData = computed(() => headers.value.length > 0)
const hasSearchQuery = computed(() => query.value.trim().length > 0)
const visibleHeaders = computed(() => headers.value.filter((header) => !hiddenColumns.value.has(header)))

const filteredRows = computed(() => {
  const normalizedQuery = query.value.trim().toLocaleLowerCase()
  let result = normalizedQuery
    ? rows.value.filter((row) =>
        headers.value.some((header) =>
          String(row[header] ?? '').toLocaleLowerCase().includes(normalizedQuery),
        ),
      )
    : [...rows.value]

  if (sort.value.key) {
    const { key, direction } = sort.value
    result.sort((a, b) => {
      const left = a[key] ?? ''
      const right = b[key] ?? ''
      const leftNumber = Number(String(left).replaceAll(',', ''))
      const rightNumber = Number(String(right).replaceAll(',', ''))
      const comparison =
        String(left).trim() !== '' &&
        String(right).trim() !== '' &&
        Number.isFinite(leftNumber) &&
        Number.isFinite(rightNumber)
          ? leftNumber - rightNumber
          : String(left).localeCompare(String(right), locale.value, { numeric: true })
      return direction === 'asc' ? comparison : -comparison
    })
  }
  return result
})

const formattedSize = computed(() => formatBytes(fileSize.value))

function highlightSegments(value) {
  const text = String(value ?? '')
  const keyword = query.value.trim()
  if (!keyword) return [{ text, match: false }]

  const segments = []
  const normalizedText = text.toLocaleLowerCase()
  const normalizedKeyword = keyword.toLocaleLowerCase()
  let cursor = 0
  let matchIndex = normalizedText.indexOf(normalizedKeyword)

  while (matchIndex !== -1) {
    if (matchIndex > cursor) {
      segments.push({ text: text.slice(cursor, matchIndex), match: false })
    }
    const matchEnd = matchIndex + keyword.length
    segments.push({ text: text.slice(matchIndex, matchEnd), match: true })
    cursor = matchEnd
    matchIndex = normalizedText.indexOf(normalizedKeyword, cursor)
  }

  if (cursor < text.length) segments.push({ text: text.slice(cursor), match: false })
  return segments.length ? segments : [{ text, match: false }]
}

function formatBytes(bytes) {
  if (!bytes) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function notify(message) {
  toast.value = message
  clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => {
    toast.value = ''
  }, 2400)
}

function resetHistory() {
  undoStack = []
  redoStack = []
}

function recordHistory(label, changes) {
  const effectiveChanges = changes.filter((change) => change.before !== change.after)
  if (!effectiveChanges.length) return
  pushHistory({ type: 'cells', label, changes: effectiveChanges })
}

function pushHistory(action) {
  undoStack.push(action)
  if (undoStack.length > 100) undoStack.shift()
  redoStack = []
}

function applyHistory(action, direction) {
  if (action.type === 'delete-row') {
    if (direction === 'undo') rows.value.splice(action.index, 0, action.row)
    else {
      const currentIndex = rows.value.indexOf(action.row)
      if (currentIndex !== -1) rows.value.splice(currentIndex, 1)
    }
    return
  }

  if (action.type === 'delete-column') {
    if (direction === 'undo') {
      headers.value.splice(action.index, 0, action.key)
      action.values.forEach(({ row, value, existed }) => {
        if (existed) row[action.key] = value
      })
    } else {
      const headerIndex = headers.value.indexOf(action.key)
      if (headerIndex !== -1) headers.value.splice(headerIndex, 1)
      action.values.forEach(({ row }) => {
        delete row[action.key]
      })
    }
    return
  }

  const property = direction === 'undo' ? 'before' : 'after'
  action.changes.forEach((change) => {
    change.row[change.key] = change[property]
  })
}

function undo() {
  const action = undoStack.pop()
  if (!action) {
    notify(t('messages.nothingToUndo'))
    return
  }
  applyHistory(action, 'undo')
  redoStack.push(action)
  notify(t('messages.undone', { action: action.label }))
}

function redo() {
  const action = redoStack.pop()
  if (!action) {
    notify(t('messages.nothingToRedo'))
    return
  }
  applyHistory(action, 'redo')
  undoStack.push(action)
  notify(t('messages.redone', { action: action.label }))
}

function parseCsv(content, metadata = {}) {
  isLoading.value = true
  window.setTimeout(() => {
    Papa.parse(content, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (header, index) => header.trim() || t('table.unnamedColumn', { number: index + 1 }),
      complete(result) {
        const fields = result.meta.fields || []
        if (!fields.length) {
          isLoading.value = false
          notify(t('validation.noColumns'))
          return
        }
        headers.value = fields
        rows.value = result.data
        parseErrors.value = result.errors
        fileName.value = metadata.name || t('file.pastedFileName')
        fileSize.value = metadata.size || new Blob([content]).size
        hiddenColumns.value = new Set()
        selectedColumn.value = ''
        selectedRow.value = null
        selectedCell.value = null
        columnWidths.value = {}
        fillRange.value = null
        resetHistory()
        sort.value = { key: '', direction: 'asc' }
        query.value = ''
        isLoading.value = false
        notify(t('messages.fileLoaded', { count: formatNumber(result.data.length) }))
      },
      error() {
        isLoading.value = false
        notify(t('validation.parseFailed'))
      },
    })
  }, 80)
}

function handleFile(file) {
  if (!file) return
  const isCsv = file.type.includes('csv') || file.name.toLowerCase().endsWith('.csv')
  if (!isCsv) {
    notify(t('validation.invalidFileType'))
    return
  }
  if (file.size > 25 * 1024 * 1024) {
    notify(t('validation.fileTooLarge', { size: '25 MB' }))
    return
  }
  const reader = new FileReader()
  reader.onload = (event) => parseCsv(event.target.result, { name: file.name, size: file.size })
  reader.onerror = () => notify(t('validation.fileReadFailed'))
  reader.readAsText(file)
}

function handleFileInput(event) {
  const input = event.target
  const file = input.files?.[0]
  input.value = ''
  handleFile(file)
}

function onDrop(event) {
  isDragging.value = false
  handleFile(event.dataTransfer.files[0])
}

async function pasteCsv() {
  try {
    const content = await navigator.clipboard.readText()
    if (!content.trim()) {
      notify(t('validation.emptyClipboard'))
      return
    }
    parseCsv(content)
  } catch {
    notify(t('validation.clipboardReadFailed', { modifier: 'Ctrl/⌘' }))
  }
}

function onPaste(event) {
  if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return
  const content = event.clipboardData?.getData('text')
  if (!content?.trim()) return

  if (hasData.value) {
    const target = selectedCell.value
    if (!target) return
    event.preventDefault()
    const before = target.row[target.key]
    target.row[target.key] = content
    recordHistory(t('history.actions.editCell'), [{ row: target.row, key: target.key, before, after: content }])
    return
  }

  event.preventDefault()
  parseCsv(content)
}

function cycleColumn(key) {
  selectedColumn.value = key
  selectedRow.value = null
  selectedCell.value = null
  fillRange.value = null
  sort.value =
    sort.value.key === key
      ? { key, direction: sort.value.direction === 'asc' ? 'desc' : 'asc' }
      : { key, direction: 'asc' }
}

function columnActionLabel(key) {
  if (sort.value.key === key && sort.value.direction === 'asc') {
    return t('table.sortDescending', { column: key })
  }
  return t('table.sortAscending', { column: key })
}

function columnStyle(key) {
  const width = columnWidths.value[key]
  return width ? { width: `${width}px`, minWidth: `${width}px`, maxWidth: `${width}px` } : undefined
}

function setColumnWidth(key, width) {
  columnWidths.value = {
    ...columnWidths.value,
    [key]: Math.max(72, Math.round(width)),
  }
}

function startColumnResize(event, key) {
  const headerCell = event.currentTarget.closest('th')
  if (!headerCell) return
  activeResize = {
    key,
    startX: event.clientX,
    startWidth: headerCell.getBoundingClientRect().width,
  }
  document.body.classList.add('is-resizing-column')
  window.addEventListener('pointermove', resizeColumn)
  window.addEventListener('pointerup', stopColumnResize, { once: true })
}

function resizeColumn(event) {
  if (!activeResize) return
  setColumnWidth(activeResize.key, activeResize.startWidth + event.clientX - activeResize.startX)
}

function stopColumnResize() {
  activeResize = null
  document.body.classList.remove('is-resizing-column')
  window.removeEventListener('pointermove', resizeColumn)
}

function resetColumnWidth(key) {
  const widths = { ...columnWidths.value }
  delete widths[key]
  columnWidths.value = widths
}

function adjustColumnWidth(event, key, direction) {
  event.preventDefault()
  event.stopPropagation()
  const headerCell = event.currentTarget.closest('th')
  const currentWidth = columnWidths.value[key] || headerCell?.getBoundingClientRect().width || 120
  setColumnWidth(key, currentWidth + direction * 12)
}

function isFillPreview(index, key) {
  if (!fillRange.value || fillRange.value.key !== key) return false
  const start = Math.min(fillRange.value.start, fillRange.value.end)
  const end = Math.max(fillRange.value.start, fillRange.value.end)
  return index >= start && index <= end
}

function isFillEdge(index, key, edge) {
  if (!fillRange.value || fillRange.value.key !== key) return false
  const boundary =
    edge === 'start'
      ? Math.min(fillRange.value.start, fillRange.value.end)
      : Math.max(fillRange.value.start, fillRange.value.end)
  return index === boundary
}

function startFill(event, row, key, index) {
  activeFill = {
    row,
    key,
    start: index,
    end: index,
    value: row[key],
  }
  fillRange.value = { key, start: index, end: index }
  document.body.classList.add('is-filling-cells')
  window.addEventListener('pointermove', updateFillRange)
  window.addEventListener('pointerup', finishFill, { once: true })
}

function updateFillRange(event) {
  if (!activeFill) return
  const cell = document.elementFromPoint(event.clientX, event.clientY)?.closest('td[data-column-key]')
  if (!cell || cell.dataset.columnKey !== activeFill.key) return
  const end = Number(cell.dataset.rowIndex)
  if (!Number.isInteger(end)) return
  activeFill.end = end
  fillRange.value = { key: activeFill.key, start: activeFill.start, end }
}

function finishFill() {
  let keepRange = false
  if (activeFill && activeFill.end !== activeFill.start) {
    const start = Math.min(activeFill.start, activeFill.end)
    const end = Math.max(activeFill.start, activeFill.end)
    const changes = []
    for (let index = start; index <= end; index += 1) {
      if (index === activeFill.start) continue
      const targetRow = filteredRows.value[index]
      changes.push({
        row: targetRow,
        key: activeFill.key,
        before: targetRow[activeFill.key],
        after: activeFill.value,
      })
      targetRow[activeFill.key] = activeFill.value
    }
    recordHistory(t('history.actions.fillCells'), changes)
    fillRange.value = { key: activeFill.key, start, end }
    selectedCell.value = {
      row: filteredRows.value[activeFill.end],
      key: activeFill.key,
    }
    keepRange = true
    notify(t('messages.cellsFilled', { count: end - start }))
  }
  activeFill = null
  if (!keepRange) fillRange.value = null
  document.body.classList.remove('is-filling-cells')
  window.removeEventListener('pointermove', updateFillRange)
}

async function startEdit(row, key) {
  if (!columnWidths.value[key]) {
    const headerCell = [...document.querySelectorAll('thead th[data-column-key]')].find(
      (cell) => cell.dataset.columnKey === key,
    )
    if (headerCell) setColumnWidth(key, headerCell.getBoundingClientRect().width)
  }
  fillRange.value = null
  selectedCell.value = { row, key }
  editingCell.value = { row, key }
  editValue.value = String(row[key] ?? '')
  editOriginalValue.value = row[key]
  await nextTick()
  const editor = document.querySelector('.cell-editor')
  editor?.select()
  resizeEditor({ target: editor })
}

function isEditing(row, key) {
  return editingCell.value?.row === row && editingCell.value?.key === key
}

function isSelected(row, key) {
  return selectedCell.value?.row === row && selectedCell.value?.key === key
}

function focusSelectedCell() {
  nextTick(() => document.querySelector('td.selected-cell')?.focus())
}

function selectCell(row, key, event) {
  if (isEditing(row, key)) return
  fillRange.value = null
  selectedColumn.value = ''
  selectedRow.value = null
  selectedCell.value = { row, key }
  event?.currentTarget?.focus()
}

function selectRow(row) {
  fillRange.value = null
  selectedColumn.value = ''
  selectedCell.value = null
  selectedRow.value = row
}

function deleteSelectedRow() {
  const row = selectedRow.value
  if (!row) return
  const index = rows.value.indexOf(row)
  if (index === -1) return
  rows.value.splice(index, 1)
  pushHistory({ type: 'delete-row', label: t('history.actions.deleteRow'), row, index })
  selectedRow.value = null
  notify(t('messages.rowDeleted'))
}

function deleteSelectedColumn() {
  const key = selectedColumn.value
  if (!key) return
  if (headers.value.length <= 1) {
    notify(t('validation.keepOneColumn'))
    return
  }
  const index = headers.value.indexOf(key)
  if (index === -1) return
  const values = rows.value.map((row) => ({
    row,
    value: row[key],
    existed: Object.prototype.hasOwnProperty.call(row, key),
  }))
  headers.value.splice(index, 1)
  values.forEach(({ row }) => {
    delete row[key]
  })
  pushHistory({ type: 'delete-column', label: t('history.actions.deleteColumn'), key, index, values })
  const widths = { ...columnWidths.value }
  delete widths[key]
  columnWidths.value = widths
  const hidden = new Set(hiddenColumns.value)
  hidden.delete(key)
  hiddenColumns.value = hidden
  if (sort.value.key === key) sort.value = { key: '', direction: 'asc' }
  selectedColumn.value = ''
  notify(t('messages.columnDeleted'))
}

function handleSelectionOutsideClick(event) {
  if (!event.target.closest('th[data-column-key]')) selectedColumn.value = ''
  if (!event.target.closest('.row-select-button')) selectedRow.value = null
}

function selectCellBelow(row, key) {
  const currentIndex = filteredRows.value.indexOf(row)
  const nextRow = filteredRows.value[currentIndex + 1]
  selectedCell.value = { row: nextRow || row, key }
  focusSelectedCell()
}

function handleCellKeydown(event, row, key) {
  if (editingCell.value || event.key !== 'Enter') return
  event.preventDefault()
  startEdit(row, key)
}

function commitEdit(moveDown = false) {
  if (!editingCell.value) return
  const { row, key } = editingCell.value
  const before = editOriginalValue.value
  row[key] = editValue.value
  recordHistory(t('history.actions.editCell'), [{ row, key, before, after: editValue.value }])
  editingCell.value = null
  selectedCell.value = { row, key }
  if (moveDown) selectCellBelow(row, key)
  else focusSelectedCell()
}

function cancelEdit() {
  editingCell.value = null
  focusSelectedCell()
}

function resizeEditor(event) {
  const editor = event.target
  if (!editor) return
  const cellWidth = editor.parentElement?.clientWidth || 0
  editor.style.width = '1px'
  const contentWidth = editor.scrollWidth + 16
  editor.style.width = `${Math.max(cellWidth, contentWidth)}px`
  editor.style.height = '30px'
  editor.style.height = `${Math.max(30, editor.scrollHeight)}px`
}

function insertLineBreak(event) {
  const editor = event.target
  const start = editor.selectionStart
  const end = editor.selectionEnd
  editValue.value = `${editValue.value.slice(0, start)}\n${editValue.value.slice(end)}`
  nextTick(() => {
    editor.setSelectionRange(start + 1, start + 1)
    resizeEditor({ target: editor })
  })
}

function toggleColumn(header) {
  const next = new Set(hiddenColumns.value)
  next.has(header) ? next.delete(header) : next.add(header)
  hiddenColumns.value = next
}

function resetColumns() {
  hiddenColumns.value = new Set()
}

function escapeCsvCell(value) {
  const text = String(value ?? '')
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

function exportView() {
  const exportHeaders = visibleHeaders.value
  const lines = [
    exportHeaders.map(escapeCsvCell).join(','),
    ...filteredRows.value.map((row) => exportHeaders.map((header) => escapeCsvCell(row[header])).join(',')),
  ]
  const blob = new Blob([`\uFEFF${lines.join('\n')}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${fileName.value.replace(/\.csv$/i, '') || 'data'}-view.csv`
  link.click()
  URL.revokeObjectURL(url)
  notify(t('messages.exported'))
}

function clearData() {
  rows.value = []
  headers.value = []
  fileName.value = ''
  fileSize.value = 0
  query.value = ''
  parseErrors.value = []
  selectedColumn.value = ''
  selectedRow.value = null
  selectedCell.value = null
  columnWidths.value = {}
  fillRange.value = null
  resetHistory()
  sort.value = { key: '', direction: 'asc' }
}

function changeLanguage(slug) {
  switchLanguage(slug)
  document.querySelectorAll('.language-switcher[open]').forEach((element) => {
    element.removeAttribute('open')
  })
}

function handleKeys(event) {
  const modifier = event.metaKey || event.ctrlKey
  const isEditingText = ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)
  if (!isEditingText && (event.key === 'Delete' || event.key === 'Backspace')) {
    if (selectedRow.value || selectedColumn.value) {
      event.preventDefault()
      selectedRow.value ? deleteSelectedRow() : deleteSelectedColumn()
      return
    }
  }
  if (modifier && event.key.toLowerCase() === 'z' && !isEditingText) {
    event.preventDefault()
    event.shiftKey ? redo() : undo()
    return
  }
  if (modifier && event.key.toLowerCase() === 'y' && !isEditingText) {
    event.preventDefault()
    redo()
    return
  }
  if (modifier && event.key.toLowerCase() === 'o') {
    event.preventDefault()
    fileInput.value?.click()
  }
  if (modifier && event.key.toLowerCase() === 'f' && hasData.value) {
    event.preventDefault()
    searchInput.value?.focus()
  }
  if (event.key === 'Escape') {
    showColumns.value = false
    showShortcuts.value = false
  }
}

function confirmDataLoss(event) {
  if (!hasData.value) return
  event.preventDefault()
  event.returnValue = ''
}

onMounted(() => {
  window.addEventListener('keydown', handleKeys)
  window.addEventListener('paste', onPaste)
  window.addEventListener('beforeunload', confirmDataLoss)
  window.addEventListener('click', handleSelectionOutsideClick)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeys)
  window.removeEventListener('paste', onPaste)
  window.removeEventListener('beforeunload', confirmDataLoss)
  window.removeEventListener('click', handleSelectionOutsideClick)
  window.removeEventListener('pointermove', resizeColumn)
  window.removeEventListener('pointerup', stopColumnResize)
  window.removeEventListener('pointermove', updateFillRange)
  window.removeEventListener('pointerup', finishFill)
  clearTimeout(toastTimer)
})
</script>

<template>
  <div class="app-shell">
    <main>
      <section v-if="!hasData" class="empty-layout">
        <div
          class="dropzone"
          :class="{ 'is-dragging': isDragging }"
          @dragenter.prevent="isDragging = true"
          @dragover.prevent="isDragging = true"
          @dragleave.prevent="isDragging = false"
          @drop.prevent="onDrop"
        >
          <input
            ref="fileInput"
            class="sr-only"
            type="file"
            accept=".csv,text/csv"
            @change="handleFileInput"
          />
          <details class="language-switcher in-dropzone">
            <summary>
              <Globe2 :size="15" />
              {{ languageOptions.find((item) => item.slug === localeSlug)?.label }}
              <ChevronDown :size="14" />
            </summary>
            <nav aria-label="Language">
              <a
                v-for="language in languageOptions"
                :key="language.slug"
                :href="languageHref(language.slug)"
                :lang="language.slug"
                :aria-current="language.slug === localeSlug ? 'page' : undefined"
                @click.prevent="changeLanguage(language.slug)"
              >
                {{ language.label }}
              </a>
            </nav>
          </details>
          <div class="drop-icon"><Upload :size="24" stroke-width="1.8" /></div>
          <h2>{{ isDragging ? t('upload.dropActiveTitle') : t('upload.dropTitle') }}</h2>
          <p>{{ t('upload.dropDescription') }}</p>
          <button class="primary-button" type="button" @click="fileInput.click()">
            <FileSpreadsheet :size="17" />
            {{ t('upload.selectFile') }}
          </button>
          <div class="drop-divider"><span>{{ t('upload.otherMethods') }}</span></div>
          <div class="secondary-actions">
            <button type="button" @click="pasteCsv">{{ t('upload.pasteClipboard') }}</button>
            <button type="button" @click="showShortcuts = true">{{ t('upload.viewShortcuts') }}</button>
          </div>
          <p class="local-note"><Check :size="14" /> {{ t('upload.localNotice', { size: '25 MB' }) }}</p>
          <p class="shortcut-hint">{{ t('upload.openShortcut', { modifier: 'Ctrl/⌘' }) }}</p>
        </div>
      </section>

      <section v-else class="workspace" :aria-label="t('accessibility.csvPreviewRegion')">
        <div class="filebar">
          <div class="file-identity">
            <span class="file-icon"><FileSpreadsheet :size="19" /></span>
            <div>
              <div class="file-name-row">
                <h1>{{ fileName }}</h1>
                <span v-if="parseErrors.length" class="warning-pill" :title="t('file.parseWarnings', { count: parseErrors.length })">
                  <Info :size="13" /> {{ parseErrors.length }}
                </span>
              </div>
              <p>{{ t('file.summary', { rows: formatNumber(rows.length), columns: formatNumber(headers.length), size: formattedSize }) }}</p>
            </div>
          </div>
          <div class="file-actions">
            <button class="secondary-button" type="button" @click="fileInput.click()">
              <Upload :size="16" /> {{ t('file.openNewFile') }}
            </button>
            <button class="primary-button compact" type="button" @click="exportView">
              <Download :size="16" /> {{ t('file.exportCurrentView') }}
            </button>
            <details class="language-switcher inline">
              <summary>
                <Globe2 :size="15" />
                {{ languageOptions.find((item) => item.slug === localeSlug)?.label }}
                <ChevronDown :size="14" />
              </summary>
              <nav aria-label="Language">
                <a
                  v-for="language in languageOptions"
                  :key="language.slug"
                  :href="languageHref(language.slug)"
                  :lang="language.slug"
                  :aria-current="language.slug === localeSlug ? 'page' : undefined"
                  @click.prevent="changeLanguage(language.slug)"
                >
                  {{ language.label }}
                </a>
              </nav>
            </details>
            <button class="icon-button" type="button" :aria-label="t('file.closeCurrentFile')" @click="clearData"><X :size="18" /></button>
            <input
              ref="fileInput"
              class="sr-only"
              type="file"
              accept=".csv,text/csv"
              @change="handleFileInput"
            />
          </div>
        </div>

        <div class="toolbar">
          <label class="search-field">
            <Search :size="17" />
            <span class="sr-only">{{ t('toolbar.searchLabel') }}</span>
            <input ref="searchInput" v-model="query" type="search" :placeholder="t('toolbar.searchPlaceholder')" />
            <kbd>⌘ F</kbd>
          </label>

          <div class="toolbar-spacer"></div>

          <div class="column-control">
            <button
              class="secondary-button"
              type="button"
              :aria-expanded="showColumns"
              @click="showColumns = !showColumns"
            >
              <Columns3 :size="16" /> {{ t('toolbar.columns') }}
              <span v-if="hiddenColumns.size" class="count-badge">{{ visibleHeaders.length }}/{{ headers.length }}</span>
              <ChevronDown :size="14" />
            </button>
            <div v-if="showColumns" class="column-menu">
              <div class="menu-heading">
                <span>{{ t('toolbar.visibleColumns') }}</span>
                <button type="button" @click="resetColumns"><RotateCcw :size="13" /> {{ t('toolbar.resetColumns') }}</button>
              </div>
              <label v-for="header in headers" :key="header">
                <input
                  type="checkbox"
                  :checked="!hiddenColumns.has(header)"
                  :disabled="visibleHeaders.length === 1 && !hiddenColumns.has(header)"
                  @change="toggleColumn(header)"
                />
                <span>{{ header }}</span>
              </label>
            </div>
          </div>

        </div>

        <div class="table-frame">
          <table>
            <thead>
              <tr>
                <th class="row-number" scope="col">#</th>
                <th
                  v-for="header in visibleHeaders"
                  :key="header"
                  scope="col"
                  :data-column-key="header"
                  :style="columnStyle(header)"
                  :class="{ 'selected-column': selectedColumn === header }"
                  :aria-sort="sort.key === header ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'"
                >
                  <button
                    class="header-cell"
                    type="button"
                    :aria-pressed="selectedColumn === header"
                    :aria-label="columnActionLabel(header)"
                    @click="cycleColumn(header)"
                  >
                    <span>{{ header }}</span>
                    <span class="sort-indicator" :class="{ visible: sort.key === header }" aria-hidden="true">
                      <ArrowUp v-if="sort.key === header && sort.direction === 'asc'" :size="14" />
                      <ArrowDown v-else-if="sort.key === header" :size="14" />
                    </span>
                  </button>
                  <span
                    class="column-resizer"
                    role="separator"
                    aria-orientation="vertical"
                    :aria-label="t('table.resizeColumn', { column: header })"
                    tabindex="0"
                    @click.stop.prevent
                    @dblclick.stop.prevent="resetColumnWidth(header)"
                    @pointerdown.stop.prevent="startColumnResize($event, header)"
                    @keydown.left="adjustColumnWidth($event, header, -1)"
                    @keydown.right="adjustColumnWidth($event, header, 1)"
                  ></span>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, index) in filteredRows" :key="index" :class="{ 'selected-row': selectedRow === row }">
                <th class="row-number" scope="row">
                  <button
                    class="row-select-button"
                    type="button"
                    :aria-pressed="selectedRow === row"
                    :aria-label="t('table.selectRow', { number: index + 1 })"
                    @click="selectRow(row)"
                  >
                    {{ index + 1 }}
                  </button>
                </th>
                <td
                  v-for="header in visibleHeaders"
                  :key="header"
                  :style="columnStyle(header)"
                  :data-row-index="index"
                  :data-column-key="header"
                  :class="{
                    'selected-column': selectedColumn === header,
                    'selected-cell': isSelected(row, header),
                    'fill-preview': isFillPreview(index, header),
                    'fill-preview-start': isFillEdge(index, header, 'start'),
                    'fill-preview-end': isFillEdge(index, header, 'end'),
                    editing: isEditing(row, header),
                  }"
                  :tabindex="isSelected(row, header) ? 0 : -1"
                  :title="isEditing(row, header) ? '' : t('table.editHint', { value: String(row[header] ?? '') })"
                  @click="selectCell(row, header, $event)"
                  @dblclick="startEdit(row, header)"
                  @keydown="handleCellKeydown($event, row, header)"
                >
                  <textarea
                    v-if="isEditing(row, header)"
                    v-model="editValue"
                    class="cell-editor"
                    :aria-label="t('table.editCell', { column: header })"
                    rows="1"
                    cols="1"
                    @blur="commitEdit(false)"
                    @input="resizeEditor"
                    @keydown.alt.enter.stop.prevent="insertLineBreak"
                    @keydown.enter.exact.stop.prevent="commitEdit(true)"
                    @keydown.shift.enter.stop.prevent="commitEdit(true)"
                    @keydown.esc.stop.prevent="cancelEdit"
                  ></textarea>
                  <span v-else class="cell-value">
                    <template v-for="(segment, segmentIndex) in highlightSegments(row[header])" :key="segmentIndex">
                      <mark v-if="segment.match" class="search-highlight">{{ segment.text }}</mark>
                      <span v-else>{{ segment.text }}</span>
                    </template>
                  </span>
                  <span
                    v-if="isSelected(row, header) && !isEditing(row, header)"
                    class="fill-handle"
                    :aria-label="t('table.dragToFill')"
                    role="button"
                    @click.stop.prevent
                    @pointerdown.stop.prevent="startFill($event, row, header, index)"
                  ></span>
                </td>
              </tr>
            </tbody>
          </table>

          <div v-if="!filteredRows.length && hasSearchQuery" class="no-results">
            <Search :size="22" />
            <strong>{{ t('emptyState.noSearchResults.title') }}</strong>
            <p>{{ t('emptyState.noSearchResults.description') }}</p>
            <button type="button" @click="query = ''">{{ t('emptyState.noSearchResults.action') }}</button>
          </div>
          <div v-else-if="!rows.length" class="no-results">
            <FileSpreadsheet :size="22" />
            <strong>{{ t('emptyState.noDataRows.title') }}</strong>
            <p>{{ t('emptyState.noDataRows.description') }}</p>
          </div>
        </div>

        <footer class="statusbar">
          <span v-if="hasSearchQuery">
            {{ t('table.matchedRows', { matched: formatNumber(filteredRows.length), total: formatNumber(rows.length) }) }}
          </span>
          <span v-else>{{ t('table.totalRows', { count: formatNumber(rows.length) }) }}</span>
        </footer>

      </section>
    </main>

    <div v-if="isLoading" class="loading-layer" role="status" aria-live="polite">
      <div class="loading-panel">
        <span class="loader"></span>
        <strong>{{ t('loading.title') }}</strong>
        <p>{{ t('loading.description') }}</p>
      </div>
    </div>

    <div v-if="showShortcuts" class="dialog-backdrop" @click.self="showShortcuts = false">
      <section class="shortcut-dialog" role="dialog" aria-modal="true" aria-labelledby="shortcut-title">
        <div class="dialog-header">
          <div>
            <p>{{ t('shortcuts.eyebrow') }}</p>
            <h2 id="shortcut-title">{{ t('shortcuts.title') }}</h2>
          </div>
          <button class="icon-button" type="button" :aria-label="t('shortcuts.closeDialog')" @click="showShortcuts = false"><X :size="18" /></button>
        </div>
        <dl>
          <div><dt>{{ t('shortcuts.items.openFile') }}</dt><dd><kbd>Ctrl</kbd>/<kbd>⌘</kbd> + <kbd>O</kbd></dd></div>
          <div><dt>{{ t('shortcuts.items.search') }}</dt><dd><kbd>Ctrl</kbd>/<kbd>⌘</kbd> + <kbd>F</kbd></dd></div>
          <div><dt>{{ t('shortcuts.items.undo') }}</dt><dd><kbd>Ctrl</kbd>/<kbd>⌘</kbd> + <kbd>Z</kbd></dd></div>
          <div><dt>{{ t('shortcuts.items.redo') }}</dt><dd><kbd>Ctrl</kbd>/<kbd>⌘</kbd> + <kbd>Shift</kbd> + <kbd>Z</kbd></dd></div>
          <div><dt>{{ t('shortcuts.items.lineBreak') }}</dt><dd><kbd>Option</kbd>/<kbd>Alt</kbd> + <kbd>Enter</kbd></dd></div>
          <div><dt>{{ t('shortcuts.items.close') }}</dt><dd><kbd>Esc</kbd></dd></div>
          <div><dt>{{ t('shortcuts.items.paste') }}</dt><dd><kbd>Ctrl</kbd>/<kbd>⌘</kbd> + <kbd>V</kbd></dd></div>
        </dl>
      </section>
    </div>

    <div class="toast" :class="{ visible: toast }" role="status" aria-live="polite">
      <Check :size="16" /> {{ toast }}
    </div>
  </div>
</template>
