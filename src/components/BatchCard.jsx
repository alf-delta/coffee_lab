import { forwardRef } from 'react'
import { motion } from 'framer-motion'
import { Calendar, Trash2, AlertTriangle, Check, Coffee } from 'lucide-react'
import { totalScore, grade as gradeOf } from '../lib/scoring'
import { formatDate, formatDateShort, daysRemaining, isInService, serviceDate, serviceDaysRemaining } from '../lib/outgassing'
import { STATUS } from '../data/constants'

// Круглый индикатор активности справа
function Indicator({ batch }) {
  const base = 'grid size-14 shrink-0 place-items-center rounded-full'

  // Готово к анализу (3-дневный порог) — коричневая галочка
  if (batch._status === STATUS.READY) {
    return (
      <div
        className={base}
        style={{ background: '#6f4e37', boxShadow: '0 6px 16px -6px rgba(111,78,55,0.7)' }}
        title="Готово к анализу"
      >
        <Check size={26} strokeWidth={3} color="#fff" />
      </div>
    )
  }

  // Дегазация — жёлтый круг, треугольник + остаток дней
  if (batch._status === STATUS.OUTGASSING) {
    const left = Math.max(0, daysRemaining(batch.roast_date, batch.outgassing_days))
    return (
      <div
        className={`${base} flex-col gap-0`}
        style={{ background: '#e6c15a', boxShadow: '0 6px 16px -6px rgba(200,155,60,0.7)' }}
        title={`Дегазация · осталось ${left} дн.`}
      >
        <AlertTriangle size={14} strokeWidth={2.5} color="#2b1d14" />
        <span className="font-display text-sm leading-none tabular-nums text-espresso">
          {left}
          <span className="ml-0.5 text-[9px] font-medium">дн.</span>
        </span>
      </div>
    )
  }

  // Анализ / Завершено — скор; при наступлении 10-дневного допуска
  // поверх скора появляется зелёная галочка — до нажатия «Запущено в работу»
  const total = totalScore(batch.scores)
  const g = gradeOf(total)
  const awaitingLaunch = isInService(batch) && !batch.in_service_at
  return (
    <div className="relative shrink-0">
      <div
        className={base}
        style={{
          background: `color-mix(in srgb, ${g.tint} 16%, white)`,
          border: `1.5px solid color-mix(in srgb, ${g.tint} 40%, transparent)`,
        }}
        title={awaitingLaunch ? `${g.label} · допущено в работу с ${formatDate(serviceDate(batch))}` : g.label}
      >
        <span
          className="font-display text-2xl leading-none tabular-nums"
          style={{ color: g.tint }}
        >
          {total}
        </span>
      </div>
      {awaitingLaunch && (
        <span
          className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full"
          style={{ background: '#4f8a5b', boxShadow: '0 0 0 2px #fff' }}
          title="Готово в работу — запустите в карточке"
        >
          <Check size={12} strokeWidth={3.5} color="#fff" />
        </span>
      )}
    </div>
  )
}

// forwardRef обязателен: AnimatePresence mode="popLayout" вешает ref на карточку,
// чтобы зафиксировать её позицию при exit-анимации
const BatchCard = forwardRef(function BatchCard({ batch, onOpen, onDelete }, ref) {
  return (
    <motion.article
      ref={ref}
      layout
      initial={{ opacity: 0, y: 14, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ ease: [0.22, 1, 0.36, 1], duration: 0.4 }}
      whileHover={{ y: -3 }}
      onClick={() => onOpen(batch)}
      className="glass group relative flex cursor-pointer items-center gap-3 rounded-full p-2 pl-6"
    >
      {/* наименование сорта */}
      <h3 className="min-w-0 flex-1 truncate font-display text-lg text-espresso">
        {batch.name}
      </h3>

      {/* допуск в работу: «в работе» — только после ручного запуска в карточке */}
      {batch.in_service_at ? (
        <span
          className="hidden shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium sm:inline-flex"
          style={{ background: 'rgba(79,138,91,0.12)', color: '#4f8a5b' }}
          title={`Запущено в работу ${formatDate(batch.in_service_at)}`}
        >
          <Coffee size={12} /> в работе
        </span>
      ) : !isInService(batch) ? (
        <span
          className="hidden shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium sm:inline-flex"
          style={{ background: 'rgba(176,125,43,0.12)', color: '#b07d2b' }}
          title={`Допуск в работу: ${formatDate(serviceDate(batch))}`}
        >
          <Coffee size={12} /> в работу {Math.max(0, serviceDaysRemaining(batch))} дн.
        </span>
      ) : null}

      {/* разделитель */}
      <span className="h-7 w-px shrink-0 bg-coffee/15" />

      {/* дата обжарки: на мобильных — без года, имя сорта важнее */}
      <span
        className="inline-flex shrink-0 items-center gap-1.5 text-sm text-coffee-soft tabular-nums"
        title={formatDate(batch.roast_date)}
      >
        <Calendar size={14} />
        <span className="sm:hidden">{formatDateShort(batch.roast_date)}</span>
        <span className="hidden sm:inline">{formatDate(batch.roast_date)}</span>
      </span>

      {/* удаление (появляется на hover, без сдвига раскладки) */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onDelete(batch)
        }}
        aria-label="Удалить партию"
        className="grid size-8 shrink-0 place-items-center rounded-full text-coffee-soft/0 transition-all duration-200 hover:bg-red-500/10 hover:text-red-600 group-hover:text-coffee-soft/55"
      >
        <Trash2 size={15} />
      </button>

      {/* индикатор активности */}
      <Indicator batch={batch} />
    </motion.article>
  )
})

export default BatchCard
