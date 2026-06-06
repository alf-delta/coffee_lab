import { outgassingProgress, daysRemaining, readyDate, formatDate } from '../lib/outgassing'

export default function OutgassingProgress({ batch, compact = false, tone = 'light' }) {
  const progress = outgassingProgress(batch.roast_date, batch.outgassing_days)
  const left = daysRemaining(batch.roast_date, batch.outgassing_days)
  const done = left <= 0
  const pct = Math.round(progress * 100)
  const dark = tone === 'dark'

  return (
    <div className="w-full">
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className={dark ? 'text-latte' : 'text-coffee-soft'}>
          {done ? 'Дегазация завершена' : `Дегазация · осталось ${left} дн.`}
        </span>
        {!compact && (
          <span className={`tabular-nums ${dark ? 'text-latte/70' : 'text-coffee-soft/70'}`}>
            до {formatDate(readyDate(batch.roast_date, batch.outgassing_days))}
          </span>
        )}
      </div>
      <div
        className={`h-2 w-full overflow-hidden rounded-full ${dark ? 'bg-white/12' : 'bg-coffee/10'}`}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${pct}%`,
            background: done
              ? 'linear-gradient(90deg,#4f8a5b,#74ab7f)'
              : 'linear-gradient(90deg,#b07d2b,#e0c074)',
            transition: 'width 0.6s var(--ease-out-soft)',
          }}
        />
      </div>
    </div>
  )
}
