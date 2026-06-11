import { FlaskRound, Droplets, Bean } from 'lucide-react'
import { LAB_METRICS, LAB_SOURCES, GREEN_QC_METRICS } from '../data/constants'

const SRC_ICON = { 'Omix Plus': FlaskRound, 'R2 Extract': Droplets }

function MetricCell({ label, value, unit }) {
  const has = value !== '' && value != null
  return (
    <div className="glass-dark-soft rounded-xl px-2.5 py-1.5">
      <div className="text-[10px] leading-tight text-latte/55">{label}</div>
      <div className="mt-0.5 text-sm tabular-nums text-cream">
        {has ? value : '—'}
        {has && <span className="ml-1 text-[10px] text-latte/60">{unit}</span>}
      </div>
    </div>
  )
}

// Компактная read-only панель показателей анализаторов (без полей ввода)
// green — объект с замерами зелёного на момент жарки (поля партии green_*)
export default function LabReadings({ lab, green }) {
  const data = lab || {}
  const hasGreen = green && GREEN_QC_METRICS.some((m) => green[m.key] != null && green[m.key] !== '')

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
                  <MetricCell key={m.key} label={m.label} value={data[m.key]} unit={m.unit} />
                ))}
              </div>
            </div>
          )
        })}

        {/* входные замеры зелёного этой партии (введены при назначении жарки) */}
        {hasGreen && (
          <div>
            <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-latte/60">
              <Bean size={12} /> Зелёное · вход жарки
            </div>
            <div className="grid grid-cols-3 gap-2">
              {GREEN_QC_METRICS.map((m) => (
                <MetricCell key={m.key} label={m.label} value={green[m.key]} unit={m.unit} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
