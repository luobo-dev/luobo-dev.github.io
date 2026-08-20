export function localDateString(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function formatMoney(value) {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 2,
  }).format(Number(value) || 0)
}

export function formatCompactMoney(value) {
  return new Intl.NumberFormat('zh-CN', {
    notation: Math.abs(value) >= 10000 ? 'compact' : 'standard',
    maximumFractionDigits: 1,
  }).format(Number(value) || 0)
}

export function formatFriendlyDate(value) {
  const date = new Date(`${value}T00:00:00`)
  const today = localDateString()
  const yesterday = localDateString(new Date(Date.now() - 86400000))
  if (value === today) return '今天'
  if (value === yesterday) return '昨天'
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

export function formatDateHeading(value) {
  const date = new Date(`${value}T00:00:00`)
  const weekday = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()]
  return `${formatFriendlyDate(value)} · ${date.getMonth() + 1}月${date.getDate()}日 ${weekday}`
}

export function formatDateRange(start, end) {
  const startDate = new Date(`${start}T00:00:00`)
  const endDate = new Date(`${end}T00:00:00`)
  const format = (date) => `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
  return `${format(startDate)} - ${format(endDate)}`
}

export function getPresetRange(preset, anchor = new Date()) {
  if (preset === 'week') return getPeriodRange('week', anchor)
  if (preset === 'month') return getPeriodRange('month', anchor)
  if (preset === 'year') return getPeriodRange('year', anchor)
  if (preset === 'lastYear') {
    const lastYear = new Date(anchor)
    lastYear.setFullYear(lastYear.getFullYear() - 1)
    return getPeriodRange('year', lastYear)
  }
  return { start: localDateString(anchor), end: localDateString(anchor) }
}

export function getPeriodRange(period, anchor = new Date()) {
  const start = new Date(anchor)
  const end = new Date(anchor)

  if (period === 'week') {
    const mondayOffset = (start.getDay() + 6) % 7
    start.setDate(start.getDate() - mondayOffset)
    end.setTime(start.getTime())
    end.setDate(start.getDate() + 6)
  } else if (period === 'year') {
    start.setMonth(0, 1)
    end.setMonth(11, 31)
  } else {
    start.setDate(1)
    end.setMonth(end.getMonth() + 1, 0)
  }

  return { start: localDateString(start), end: localDateString(end) }
}

export function shiftPeriod(period, anchor, amount) {
  const date = new Date(anchor)
  if (period === 'week') date.setDate(date.getDate() + amount * 7)
  if (period === 'month') date.setMonth(date.getMonth() + amount)
  if (period === 'year') date.setFullYear(date.getFullYear() + amount)
  return date
}

export function periodTitle(period, anchor) {
  const date = new Date(anchor)
  if (period === 'year') return `${date.getFullYear()}年`
  if (period === 'month') return `${date.getFullYear()}年${date.getMonth() + 1}月`
  const { start, end } = getPeriodRange(period, date)
  const startDate = new Date(`${start}T00:00:00`)
  const endDate = new Date(`${end}T00:00:00`)
  return `${startDate.getMonth() + 1}月${startDate.getDate()}日 - ${endDate.getMonth() + 1}月${endDate.getDate()}日`
}
