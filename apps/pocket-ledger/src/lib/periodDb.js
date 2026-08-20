import { openDB } from 'idb'

const dbPromise = openDB('personal-period-tracker', 1, {
  upgrade(db) {
    const periods = db.createObjectStore('periods', { keyPath: 'id' })
    periods.createIndex('by-start-date', 'startDate', { unique: true })
  },
})

function createId() {
  return `period-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`}`
}

export async function getPeriods() {
  const db = await dbPromise
  return (await db.getAll('periods')).sort((a, b) => b.startDate.localeCompare(a.startDate))
}

export async function savePeriod(input) {
  if (!input.startDate) throw new Error('请选择开始日期')
  if (input.endDate && input.endDate < input.startDate) throw new Error('结束日期不能早于开始日期')

  const db = await dbPromise
  const sameDate = await db.getFromIndex('periods', 'by-start-date', input.startDate)
  if (sameDate && sameDate.id !== input.id) throw new Error('这个开始日期已经记录过了')
  if (!input.endDate) {
    const ongoing = (await db.getAll('periods')).find((item) => !item.endDate && item.id !== input.id)
    if (ongoing) throw new Error('已经有一条进行中的记录，请先填写结束日期')
  }

  const now = new Date().toISOString()
  const item = {
    id: input.id || createId(),
    startDate: input.startDate,
    endDate: input.endDate || '',
    note: String(input.note || '').trim(),
    createdAt: input.createdAt || now,
    updatedAt: now,
  }
  await db.put('periods', item)
  return item
}

export async function removePeriod(id) {
  const db = await dbPromise
  await db.delete('periods', id)
}
