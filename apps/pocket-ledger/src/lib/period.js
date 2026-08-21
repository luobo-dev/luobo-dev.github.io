const DAY_MS = 86400000

export function daysBetween(start, end) {
  const startDate = new Date(`${start}T00:00:00`)
  const endDate = new Date(`${end}T00:00:00`)
  return Math.round((endDate - startDate) / DAY_MS)
}

export function addDays(value, amount) {
  const date = new Date(`${value}T00:00:00`)
  date.setDate(date.getDate() + amount)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function periodSummary(records) {
  const ordered = records.slice().sort((a, b) => a.startDate.localeCompare(b.startDate))
  const recent = ordered.slice(-7)
  const cycleLengths = recent.slice(1).map((item, index) => daysBetween(recent[index].startDate, item.startDate)).filter((value) => value > 0)
  const durations = ordered.filter((item) => item.endDate).map((item) => daysBetween(item.startDate, item.endDate) + 1).filter((value) => value > 0)
  const average = (values) => values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : null
  const latest = ordered.at(-1)

  return {
    averageCycle: average(cycleLengths),
    averageDuration: average(durations.slice(-6)),
    prediction: latest && cycleLengths.length >= 2 ? {
      start: addDays(latest.startDate, Math.min(...cycleLengths)),
      end: addDays(latest.startDate, Math.max(...cycleLengths)),
    } : null,
    cyclesNeeded: Math.max(0, 3 - ordered.length),
  }
}

export function validatePeriods(items) {
  if (!Array.isArray(items) || items.some((item) => !item?.id || !item?.startDate || (item.endDate && item.endDate < item.startDate))) {
    throw new Error('私人小工具中的经期记录格式无效')
  }
  return true
}
