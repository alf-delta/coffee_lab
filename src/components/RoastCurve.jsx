import { rorSeries, formatRoastTime } from '../lib/roastLog'

// Кривая жарки Bellwether: температура зерна + уставка профиля + RoR.
// Статичный SVG для светлых панелей (glass-light / glass-soft).
const W = 640
const M = { l: 42, r: 42, t: 12, b: 26 }

function pathOf(pts) {
  return pts
    .filter((p) => p)
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`)
    .join('')
}

export default function RoastCurve({ log, height = 250 }) {
  if (!log?.bean?.length) return null
  const { bean, spf, step_s, metrics } = log
  const ror = rorSeries(log)

  const H = height
  const pw = W - M.l - M.r
  const ph = H - M.t - M.b
  const tMax = (bean.length - 1) * step_s

  const temps = [...bean, ...spf.filter((v) => v != null)]
  const tLo = Math.floor((Math.min(...temps) - 12) / 25) * 25
  const tHi = Math.ceil((Math.max(...temps) + 12) / 25) * 25
  const rHi = Math.max(30, Math.ceil(Math.max(...ror.filter((v) => v != null)) / 10) * 10)

  const x = (i) => M.l + (i * step_s * pw) / tMax
  const yT = (v) => M.t + ph - ((v - tLo) / (tHi - tLo)) * ph
  const yR = (v) => M.t + ph - (v / rHi) * ph

  const beanPts = bean.map((v, i) => [x(i), yT(v)])
  const spfPts = spf.map((v, i) => (v == null ? null : [x(i), yT(v)]))
  const rorPts = ror.map((v, i) => (v == null ? null : [x(i), yR(Math.max(0, v))]))

  // сетка: 4 температурных уровня + тики времени каждые 2 минуты
  const tGrid = Array.from({ length: 5 }, (_, i) => tLo + ((tHi - tLo) / 4) * i)
  const xTicks = []
  for (let s = 0; s <= tMax; s += 120) xTicks.push(s)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img"
      aria-label={`Кривая жарки: загрузка ${metrics.charge_f}°F, разворот ${metrics.turn_f}°F, выгрузка ${metrics.drop_f}°F за ${formatRoastTime(metrics.duration_s)}`}>
      {tGrid.map((v) => (
        <g key={v}>
          <line x1={M.l} x2={W - M.r} y1={yT(v)} y2={yT(v)} stroke="rgba(111,78,55,0.12)" strokeWidth="1" />
          <text x={M.l - 6} y={yT(v) + 3.5} textAnchor="end" fontSize="10" fill="rgba(111,78,55,0.55)">
            {Math.round(v)}
          </text>
        </g>
      ))}
      {xTicks.map((s) => (
        <text key={s} x={x(s / step_s)} y={H - 8} textAnchor="middle" fontSize="10" fill="rgba(111,78,55,0.55)">
          {formatRoastTime(s)}
        </text>
      ))}
      <text x={M.l - 6} y={M.t - 1} textAnchor="end" fontSize="9" fill="rgba(111,78,55,0.45)">°F</text>
      <text x={W - M.r + 6} y={M.t - 1} textAnchor="start" fontSize="9" fill="rgba(79,138,91,0.8)">°F/мин</text>

      {[0, rHi / 2, rHi].map((v) => (
        <text key={v} x={W - M.r + 6} y={yR(v) + 3.5} textAnchor="start" fontSize="10" fill="rgba(79,138,91,0.7)">
          {Math.round(v)}
        </text>
      ))}

      <path d={pathOf(spfPts)} fill="none" stroke="#9b8266" strokeWidth="1.5" strokeDasharray="5 4" />
      <path d={pathOf(rorPts)} fill="none" stroke="#4f8a5b" strokeWidth="1.8" strokeLinejoin="round" />
      <path d={pathOf(beanPts)} fill="none" stroke="#b6451f" strokeWidth="2.5" strokeLinejoin="round" />

      {/* маркеры: разворот и выгрузка */}
      <circle cx={x(Math.round(metrics.turn_s / step_s))} cy={yT(metrics.turn_f)} r="4" fill="#b6451f" stroke="#fff" strokeWidth="1.5" />
      <circle cx={x(bean.length - 1)} cy={yT(metrics.drop_f)} r="4" fill="#b6451f" stroke="#fff" strokeWidth="1.5" />
    </svg>
  )
}

export function CurveLegend({ className = '' }) {
  return (
    <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-coffee-soft ${className}`}>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-0.5 w-4 rounded-full" style={{ background: '#b6451f' }} /> зерно
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-0 w-4 border-t border-dashed" style={{ borderColor: '#9b8266' }} /> уставка
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-0.5 w-4 rounded-full" style={{ background: '#4f8a5b' }} /> RoR
      </span>
    </div>
  )
}
