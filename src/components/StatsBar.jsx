import { motion } from 'framer-motion'
import { Boxes, Hourglass, CheckCircle2, FlaskConical } from 'lucide-react'
import { STATUS } from '../data/constants'

const ICONS = {
  all: Boxes,
  outgassing: Hourglass,
  ready: CheckCircle2,
  done: FlaskConical,
}

export default function StatsBar({ batches, active = 'all', onSelect }) {
  const by = (s) => batches.filter((b) => b._status === s).length
  // key совпадает со значением фильтра
  const stats = [
    { key: 'all', label: 'Всего партий', value: batches.length, tint: '#6f4e37' },
    { key: STATUS.OUTGASSING, label: 'В дегазации', value: by(STATUS.OUTGASSING), tint: '#b07d2b' },
    { key: STATUS.READY, label: 'Готово к анализу', value: by(STATUS.READY), tint: '#4f8a5b' },
    { key: STATUS.DONE, label: 'Завершено', value: by(STATUS.DONE), tint: '#6f4e37' },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
      {stats.map((s, i) => {
        const Icon = ICONS[s.key]
        const isActive = active === s.key
        return (
          <motion.button
            key={s.key}
            type="button"
            onClick={() => onSelect?.(s.key)}
            aria-pressed={isActive}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: isActive ? -8 : 0 }}
            transition={{
              y: { type: 'spring', stiffness: 320, damping: 24 },
              opacity: { delay: i * 0.05, duration: 0.5 },
            }}
            whileHover={{ y: isActive ? -10 : -3 }}
            whileTap={{ scale: 0.97 }}
            className="glass rounded-[1.5rem] p-4 text-left sm:p-5"
            style={{
              boxShadow: isActive
                ? `0 26px 50px -14px color-mix(in srgb, ${s.tint} 50%, transparent), 0 8px 18px -8px rgba(43,29,20,0.25)`
                : undefined,
              border: isActive ? `1.5px solid color-mix(in srgb, ${s.tint} 55%, transparent)` : undefined,
            }}
          >
            <div className="flex items-center justify-between">
              <span
                className="grid size-9 place-items-center rounded-2xl transition-colors"
                style={{
                  background: isActive
                    ? s.tint
                    : `color-mix(in srgb, ${s.tint} 14%, white)`,
                  color: isActive ? '#fff' : s.tint,
                }}
              >
                <Icon size={18} strokeWidth={2} />
              </span>
            </div>
            <div
              className="mt-3 font-display text-4xl leading-none tabular-nums"
              style={{ color: 'var(--color-espresso)' }}
            >
              {s.value}
            </div>
            <div className="mt-1 text-xs text-coffee-soft">{s.label}</div>
          </motion.button>
        )
      })}
    </div>
  )
}
