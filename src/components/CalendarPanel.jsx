import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Flame, CheckCircle2, Coffee } from 'lucide-react'
import { readyDate, serviceDate } from '../lib/outgassing'

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
const pad = (n) => String(n).padStart(2, '0')
const keyOf = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`
const keyOfDate = (date) => keyOf(date.getFullYear(), date.getMonth(), date.getDate())

const ROAST_COLOR = '#c87f2b' // обжарка
const READY_COLOR = '#4f8a5b' // готово к анализу
const SERVICE_COLOR = '#6f4e37' // допуск в работу в кофейне

function Dot({ color }) {
  return (
    <span
      className="size-1.5 rounded-full"
      style={{ background: color, boxShadow: '0 0 0 1px rgba(255,255,255,0.75)' }}
    />
  )
}

export default function CalendarPanel({ batches, selected = null, onSelect, className = '' }) {
  const today = new Date()
  const [view, setView] = useState(new Date(today.getFullYear(), today.getMonth(), 1))

  // События по дням: обжарка + готовность к анализу + допуск в работу
  const eventsByDay = useMemo(() => {
    const map = {}
    const add = (k, type, batch) => {
      ;(map[k] ||= []).push({ type, batch })
    }
    for (const b of batches) {
      if (b.roast_date) add(String(b.roast_date).slice(0, 10), 'roast', b)
      add(keyOfDate(readyDate(b.roast_date, b.outgassing_days)), 'ready', b)
      add(keyOfDate(serviceDate(b)), 'service', b)
    }
    return map
  }, [batches])

  const year = view.getFullYear()
  const month = view.getMonth()
  const startOffset = (new Date(year, month, 1).getDay() + 6) % 7 // Пн = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const todayKey = keyOfDate(today)

  const cells = Array.from({ length: 42 }, (_, i) => {
    const day = i - startOffset + 1
    if (day < 1 || day > daysInMonth) return null
    return { day, key: keyOf(year, month, day) }
  })

  const monthEvents = cells.reduce(
    (sum, c) => sum + (c ? (eventsByDay[c.key]?.length || 0) : 0),
    0
  )

  const move = (delta) => setView(new Date(year, month + delta, 1))

  const monthLabel = view.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })
  const selectedEvents = selected ? eventsByDay[selected] || [] : []

  return (
    <div className={`glass rounded-[1.75rem] p-4 ${className}`}>
      {/* шапка */}
      <div className="mb-3 flex items-center justify-between">
        <div className="font-display text-lg capitalize text-espresso">{monthLabel}</div>
        <div className="flex gap-1">
          <button
            onClick={() => move(-1)}
            aria-label="Предыдущий месяц"
            className="grid size-8 place-items-center rounded-full text-coffee-soft transition hover:bg-coffee/10"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => move(1)}
            aria-label="Следующий месяц"
            className="grid size-8 place-items-center rounded-full text-coffee-soft transition hover:bg-coffee/10"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* дни недели */}
      <div className="mb-1 grid grid-cols-7 gap-1">
        {WEEKDAYS.map((w) => (
          <div key={w} className="py-1 text-center text-[11px] font-medium text-coffee-soft/70">
            {w}
          </div>
        ))}
      </div>

      {/* сетка дней */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((c, i) => {
          if (!c) return <div key={i} />
          const evts = eventsByDay[c.key] || []
          const hasRoast = evts.some((e) => e.type === 'roast')
          const hasReady = evts.some((e) => e.type === 'ready')
          const hasService = evts.some((e) => e.type === 'service')
          const isToday = c.key === todayKey
          const isSelected = c.key === selected
          return (
            <button
              key={i}
              onClick={() => onSelect?.(isSelected ? null : c.key)}
              className="relative flex aspect-square flex-col items-center justify-center gap-1 rounded-xl text-sm transition"
              style={{
                background: isSelected
                  ? 'var(--color-gold)'
                  : evts.length
                    ? 'rgba(111,78,55,0.06)'
                    : 'transparent',
                color: isSelected ? '#2b1d14' : 'var(--color-espresso)',
                fontWeight: evts.length ? 600 : 400,
                boxShadow: isToday && !isSelected ? 'inset 0 0 0 1.5px rgba(111,78,55,0.35)' : 'none',
              }}
            >
              <span className="leading-none">{c.day}</span>
              {(hasRoast || hasReady || hasService) && (
                <span className="flex h-1.5 items-center gap-0.5">
                  {hasRoast && <Dot color={ROAST_COLOR} />}
                  {hasReady && <Dot color={READY_COLOR} />}
                  {hasService && <Dot color={SERVICE_COLOR} />}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* итог по месяцу + легенда */}
      <div className="mt-3 space-y-2 border-t border-coffee/10 pt-3">
        <div className="text-xs text-coffee-soft">
          {monthEvents > 0 ? `Событий в этом месяце: ${monthEvents}` : 'В этом месяце событий нет'}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-coffee-soft">
          <span className="inline-flex items-center gap-1.5">
            <Dot color={ROAST_COLOR} /> Обжарка
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Dot color={READY_COLOR} /> Готово к анализу
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Dot color={SERVICE_COLOR} /> Допуск в работу
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-md" style={{ boxShadow: 'inset 0 0 0 1.5px rgba(111,78,55,0.35)' }} />
            Сегодня
          </span>
        </div>
      </div>

      {/* события выбранного дня */}
      <AnimatePresence initial={false}>
        {selected && selectedEvents.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2 space-y-1.5 overflow-hidden"
          >
            {selectedEvents.map((e, idx) => (
              <div
                key={idx}
                className="glass-soft flex items-center gap-2 rounded-xl px-3 py-2 text-xs"
              >
                {e.type === 'roast' ? (
                  <Flame size={13} className="shrink-0" style={{ color: ROAST_COLOR }} />
                ) : e.type === 'ready' ? (
                  <CheckCircle2 size={13} className="shrink-0" style={{ color: READY_COLOR }} />
                ) : (
                  <Coffee size={13} className="shrink-0" style={{ color: SERVICE_COLOR }} />
                )}
                <span className="truncate text-espresso">{e.batch.name}</span>
                <span className="ml-auto shrink-0 text-coffee-soft">
                  {e.type === 'roast' ? 'обжарка' : e.type === 'ready' ? 'готово' : 'в работу'}
                </span>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
