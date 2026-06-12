// Учёт зерна: остатки по лотам (партиям прихода).
// Остаток сорта = сумма remaining_kg его непустых лотов.
// «Заканчивается» = остаток < порог (low_stock_kg сорта); «нет» = 0.

export const DEFAULT_LOW_STOCK_KG = 2
const EPS = 1e-6

export const lotRemaining = (lot) => Math.max(0, Number(lot?.remaining_kg) || 0)

export const beanLots = (beanId, lots = []) => lots.filter((l) => l.bean_id === beanId)

// Остаток сорта (кг)
export const beanStock = (beanId, lots = []) =>
  beanLots(beanId, lots).reduce((s, l) => s + lotRemaining(l), 0)

// Непустые лоты, FIFO — старые первыми (для списания и дефолтов жарки)
export const activeLots = (beanId, lots = []) =>
  beanLots(beanId, lots)
    .filter((l) => lotRemaining(l) > EPS)
    .sort(
      (a, b) =>
        String(a.received_at).localeCompare(String(b.received_at)) ||
        String(a.created_at).localeCompare(String(b.created_at))
    )

export const lowStockThreshold = (bean) => Number(bean?.low_stock_kg) || DEFAULT_LOW_STOCK_KG

// Состояние остатка сорта: { remaining, threshold, level: 'ok'|'low'|'out' }
export function stockState(bean, lots = []) {
  const remaining = beanStock(bean?.id, lots)
  const threshold = lowStockThreshold(bean)
  const level = remaining <= EPS ? 'out' : remaining < threshold ? 'low' : 'ok'
  return { remaining, threshold, level }
}

export const STOCK_TONE = {
  ok: { color: '#7cc18d', label: 'в наличии' },
  low: { color: '#e0c074', label: 'заканчивается' },
  out: { color: '#e89a92', label: 'нет в наличии' },
}

// Сколько сортов на исходе (для счётчика-уведомления)
export const lowStockCount = (beans = [], lots = []) =>
  beans.filter((b) => stockState(b, lots).level !== 'ok').length
