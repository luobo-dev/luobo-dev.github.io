const EXPORT_HEADERS = ['交易类型', '日期', '一级分类', '二级分类', '金额', '事项', '备注']

const REQUIRED_HEADERS = ['交易类型', '日期', '金额']

function cleanText(value) {
  return String(value ?? '').replace(/\r\n/g, '\n').trim()
}

function cleanCategory(value, fallback) {
  return cleanText(value).replace(/\s+/g, ' ') || fallback
}

function dateFromParts(year, month, day) {
  const date = new Date(year, month - 1, day)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return ''
  return `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
}

function normalizeDate(value, XLSX) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return dateFromParts(value.getFullYear(), value.getMonth() + 1, value.getDate())
  }

  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value)
    return parsed ? dateFromParts(parsed.y, parsed.m, parsed.d) : ''
  }

  const match = cleanText(value).match(/^(\d{4})[-/.年](\d{1,2})[-/.月](\d{1,2})日?/)
  return match ? dateFromParts(Number(match[1]), Number(match[2]), Number(match[3])) : ''
}

function normalizeAmount(value) {
  const amount = Number(String(value ?? '').replace(/[¥￥,，\s]/g, ''))
  if (!Number.isFinite(amount) || amount <= 0) return null
  return Math.round(amount * 100) / 100
}

function normalizeType(value) {
  const text = cleanText(value)
  if (text === '支出' || text.toLowerCase() === 'expense') return 'expense'
  if (text === '收入' || text.toLowerCase() === 'income') return 'income'
  return ''
}

function parseRemark(value) {
  const remark = cleanText(value)
  if (!remark) return { event: '', note: '' }

  const marked = remark.match(/^\[事项\]\s*([\s\S]*?)(?:\n\[备注\]\s*([\s\S]*))?$/)
  if (marked) return { event: cleanText(marked[1]), note: cleanText(marked[2]) }

  const noteOnly = remark.match(/^\[备注\]\s*([\s\S]*)$/)
  if (noteOnly) return { event: '', note: cleanText(noteOnly[1]) }
  return { event: remark, note: '' }
}

function transactionFingerprint(item, primaryName, secondaryName) {
  return [
    item.type,
    item.date,
    Number(item.amount).toFixed(2),
    cleanText(primaryName),
    cleanText(secondaryName),
    cleanText(item.event),
    cleanText(item.note),
  ].join('|')
}

function existingFingerprints(categories, transactions) {
  const categoryById = new Map(categories.map((item) => [item.id, item]))
  return new Set(transactions.map((item) => {
    const secondary = categoryById.get(item.categoryId)
    const primary = secondary?.parentId ? categoryById.get(secondary.parentId) : secondary
    return transactionFingerprint(item, primary?.name, secondary?.name)
  }))
}

function categoryKeys(categories) {
  const primary = new Set()
  const secondary = new Set()
  const byId = new Map(categories.map((item) => [item.id, item]))

  categories.forEach((item) => {
    if (!item.parentId) primary.add(`${item.type}|${cleanText(item.name)}`)
    else {
      const parent = byId.get(item.parentId)
      if (parent) secondary.add(`${item.type}|${cleanText(parent.name)}|${cleanText(item.name)}`)
    }
  })
  return { primary, secondary }
}

function findHeaderRow(rows) {
  const limit = Math.min(rows.length, 20)
  for (let index = 0; index < limit; index += 1) {
    const headers = rows[index].map(cleanText)
    if (REQUIRED_HEADERS.every((header) => headers.includes(header))) return index
  }
  return -1
}

function rowToObject(headers, cells) {
  return Object.fromEntries(headers.map((header, index) => [header, cells[index]]))
}

function normalizeRow(row, XLSX) {
  const type = normalizeType(row['交易类型'])
  if (!type) throw new Error('交易类型必须是支出或收入')

  const date = normalizeDate(row['日期'], XLSX)
  if (!date) throw new Error('日期格式无法识别')

  const amount = normalizeAmount(row['金额'])
  if (amount === null) throw new Error('金额必须大于 0')

  const primaryCategoryName = cleanCategory(row['一级分类'], type === 'expense' ? '其他支出' : '其他收入')
  const secondaryCategoryName = cleanCategory(row['二级分类'], primaryCategoryName)
  const remark = parseRemark(row['备注'])
  const explicitEvent = cleanText(row['事项'])

  return {
    type,
    amount,
    date,
    primaryCategoryName,
    secondaryCategoryName,
    event: explicitEvent || remark.event || secondaryCategoryName,
    note: explicitEvent ? cleanText(row['备注']) : remark.note,
  }
}

export async function parseLedgerWorkbook(file, categories = [], transactions = []) {
  const buffer = await file.arrayBuffer()
  return parseLedgerWorkbookBuffer(buffer, file.name, categories, transactions)
}

export async function parseLedgerWorkbookBuffer(buffer, fileName = '账本.xlsx', categories = [], transactions = []) {
  const XLSX = await import('xlsx')
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true })
  const fingerprints = existingFingerprints(categories, transactions)
  const knownCategories = categoryKeys(categories)
  const newPrimary = new Set()
  const newSecondary = new Set()
  const acceptedRows = []
  const errors = []
  let totalRows = 0
  let duplicateRows = 0
  let recognizedSheets = 0

  workbook.SheetNames.forEach((sheetName) => {
    const matrix = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: '', raw: true })
    const headerIndex = findHeaderRow(matrix)
    if (headerIndex < 0) return
    recognizedSheets += 1
    const headers = matrix[headerIndex].map(cleanText)

    matrix.slice(headerIndex + 1).forEach((cells, offset) => {
      if (!cells.some((cell) => cleanText(cell))) return
      totalRows += 1
      const sourceRow = headerIndex + offset + 2
      try {
        const item = normalizeRow(rowToObject(headers, cells), XLSX)
        const fingerprint = transactionFingerprint(item, item.primaryCategoryName, item.secondaryCategoryName)
        if (fingerprints.has(fingerprint)) {
          duplicateRows += 1
          return
        }
        fingerprints.add(fingerprint)

        const primaryKey = `${item.type}|${item.primaryCategoryName}`
        const secondaryKey = `${item.type}|${item.primaryCategoryName}|${item.secondaryCategoryName}`
        if (!knownCategories.primary.has(primaryKey)) newPrimary.add(primaryKey)
        if (!knownCategories.secondary.has(secondaryKey)) newSecondary.add(secondaryKey)
        acceptedRows.push({ ...item, sourceSheet: sheetName, sourceRow })
      } catch (error) {
        errors.push({ sheet: sheetName, row: sourceRow, message: error.message })
      }
    })
  })

  if (!recognizedSheets) throw new Error('没有找到包含“交易类型、日期、金额”的工作表')
  if (!totalRows) throw new Error('表格中没有可读取的流水')

  return {
    fileName,
    sheetNames: workbook.SheetNames,
    totalRows,
    validRows: acceptedRows.length,
    duplicateRows,
    invalidRows: errors.length,
    newPrimaryCategories: [...newPrimary],
    newSecondaryCategories: [...newSecondary],
    errors,
    rows: acceptedRows,
  }
}

export async function commitLedgerImport(preview) {
  if (!Array.isArray(preview?.rows)) throw new Error('导入预览已失效，请重新选择文件')

  const { getAllData, saveCategory, saveTransaction } = await import('./db.js')
  const current = await getAllData()
  const categories = [...current.categories]
  let categoriesCreated = 0

  for (const row of preview.rows) {
    let primary = categories.find((item) => !item.parentId && item.type === row.type && cleanText(item.name) === row.primaryCategoryName)
    if (!primary) {
      primary = await saveCategory({ name: row.primaryCategoryName, type: row.type, parentId: null })
      categories.push(primary)
      categoriesCreated += 1
    }

    let secondary = categories.find((item) => item.parentId === primary.id && item.type === row.type && cleanText(item.name) === row.secondaryCategoryName)
    if (!secondary) {
      secondary = await saveCategory({ name: row.secondaryCategoryName, type: row.type, parentId: primary.id })
      categories.push(secondary)
      categoriesCreated += 1
    }

    await saveTransaction({
      type: row.type,
      amount: row.amount,
      date: row.date,
      categoryId: secondary.id,
      event: row.event,
      note: row.note,
    })
  }

  return { transactionsCreated: preview.rows.length, categoriesCreated }
}

export async function exportLedgerExcel(transactions, categories) {
  const XLSX = await import('xlsx')
  const categoryById = new Map(categories.map((item) => [item.id, item]))
  const rows = transactions
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date) || (b.updatedAt || '').localeCompare(a.updatedAt || ''))
    .map((item) => {
      const secondary = categoryById.get(item.categoryId)
      const primary = secondary?.parentId ? categoryById.get(secondary.parentId) : secondary
      return [
        item.type === 'income' ? '收入' : '支出',
        `${item.date} 12:00:00`,
        primary?.name || '未分类',
        secondary?.name || primary?.name || '未分类',
        Number(item.amount),
        cleanText(item.event),
        cleanText(item.note),
      ]
    })

  const worksheet = XLSX.utils.aoa_to_sheet([EXPORT_HEADERS, ...rows])
  worksheet['!cols'] = [
    { wch: 10 }, { wch: 21 }, { wch: 14 }, { wch: 16 }, { wch: 12 }, { wch: 20 }, { wch: 32 },
  ]
  worksheet['!autofilter'] = { ref: `A1:G${Math.max(rows.length + 1, 1)}` }

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, '流水')
  const date = new Date().toISOString().slice(0, 10)
  const content = XLSX.write(workbook, { bookType: 'xlsx', type: 'array', compression: true })
  const blob = new Blob([content], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `一笔账本-${date}.xlsx`
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
