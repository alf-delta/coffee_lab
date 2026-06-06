import { STATUS } from '../data/constants'

const DAY = 24 * 60 * 60 * 1000

export function readyDate(roastDate, outgassingDays) {
  const start = new Date(roastDate).getTime()
  return new Date(start + (Number(outgassingDays) || 0) * DAY)
}

// Прогресс дегазации 0..1
export function outgassingProgress(roastDate, outgassingDays, now = Date.now()) {
  const total = (Number(outgassingDays) || 0) * DAY
  if (total <= 0) return 1
  const elapsed = now - new Date(roastDate).getTime()
  return Math.max(0, Math.min(1, elapsed / total))
}

// Сколько дней осталось (может быть отрицательным/0)
export function daysRemaining(roastDate, outgassingDays, now = Date.now()) {
  const end = readyDate(roastDate, outgassingDays).getTime()
  return Math.ceil((end - now) / DAY)
}

export function isOutgassed(roastDate, outgassingDays, now = Date.now()) {
  return now >= readyDate(roastDate, outgassingDays).getTime()
}

// Автоматический статус по дате дегазации.
// Ручные статусы analysis/done не понижаются автоматически.
export function effectiveStatus(batch, now = Date.now()) {
  const manual = batch.status
  if (manual === STATUS.ANALYSIS || manual === STATUS.DONE) return manual
  return isOutgassed(batch.roast_date, batch.outgassing_days, now)
    ? STATUS.READY
    : STATUS.OUTGASSING
}

export function formatDate(d) {
  return new Date(d).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}
