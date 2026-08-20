import { localDateString } from './date.js'

export function transactionTotals(items) {
  return items.reduce((totals, item) => {
    totals[item.type] += Number(item.amount) || 0
    return totals
  }, { income: 0, expense: 0 })
}

export function monthBuckets(transactions, endAnchor = new Date(), count = 12) {
  const buckets = []
  const end = new Date(endAnchor.getFullYear(), endAnchor.getMonth(), 1)

  for (let offset = count - 1; offset >= 0; offset -= 1) {
    const date = new Date(end.getFullYear(), end.getMonth() - offset, 1)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    buckets.push({ key, label: `${date.getMonth() + 1}月`, year: date.getFullYear(), month: date.getMonth() + 1, income: 0, expense: 0 })
  }

  const byKey = new Map(buckets.map((item) => [item.key, item]))
  transactions.forEach((item) => {
    const bucket = byKey.get(item.date.slice(0, 7))
    if (bucket) bucket[item.type] += Number(item.amount) || 0
  })
  return buckets
}

export function primaryCategoryTotals(transactions, categories) {
  const categoryMap = new Map(categories.map((item) => [item.id, item]))
  const totals = new Map()

  transactions.filter((item) => item.type === 'expense').forEach((item) => {
    const child = categoryMap.get(item.categoryId)
    const primary = child?.parentId ? categoryMap.get(child.parentId) : child
    const key = primary?.id || 'uncategorized'
    const current = totals.get(key) || { id: key, name: primary?.name || '未分类', value: 0 }
    current.value += Number(item.amount) || 0
    totals.set(key, current)
  })

  return [...totals.values()].sort((a, b) => b.value - a.value)
}

export function comparableMonthRange(anchor, offset = 0, now = new Date()) {
  const target = new Date(anchor.getFullYear(), anchor.getMonth() + offset, 1)
  const isCurrentMonth = anchor.getFullYear() === now.getFullYear() && anchor.getMonth() === now.getMonth()
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()
  const endDay = isCurrentMonth ? Math.min(now.getDate(), lastDay) : lastDay
  return {
    start: localDateString(target),
    end: localDateString(new Date(target.getFullYear(), target.getMonth(), endDay)),
  }
}

export function percentageChange(current, previous) {
  if (!previous) return null
  return ((current - previous) / previous) * 100
}
