import { FlaskRound, Droplets } from 'lucide-react'
import { LAB_METRICS, LAB_SOURCES } from '../data/constants'

const SRC_ICON = { 'Omix Plus': FlaskRound, 'R2 Extract': Droplets }

// Компактная read-only панель показателей анализаторов (без полей ввода)
export default function LabReadings({ lab }) {
  const data = lab || {}
  const has = (m) => data[m.key] !== '' && data[m.key] != null

  return (
    <div className="glass-dark shrink-0 rounded-[1.5rem] p-4">
      <div className="mb-2.5 flex items-center gap-2 text-sm font-medium text-cream">
        <FlaskRound size={15} className="text-gold-soft" /> Показатели анализаторов
      </div>

      <div className="space-y-3">
        {LAB_SOURCES.map((src) => {
          const Icon = SRC_ICON[src] || FlaskRound
          const metrics = LAB_METRICS.filter((m) => m.source === src)
          return (
            <div key={src}>
              <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-latte/60">
                <Icon size={12} /> {src}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {metrics.map((m) => (
                  <div key={m.key} className="glass-dark-soft rounded-xl px-2.5 py-1.5">
                    <div className="text-[10px] leading-tight text-latte/55">{m.label}</div>
                    <div className="mt-0.5 text-sm tabular-nums text-cream">
                      {has(m) ? data[m.key] : '—'}
                      {has(m) && <span className="ml-1 text-[10px] text-latte/60">{m.unit}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
