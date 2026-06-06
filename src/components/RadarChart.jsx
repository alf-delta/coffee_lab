import { PARAMETERS } from '../data/constants'

// Чистый SVG-радар по 10 параметрам. Без зависимостей, плавно анимируется.
export default function RadarChart({ scores, size = 340 }) {
  const cx = size / 2
  const cy = size / 2
  const radius = size / 2 - 46
  const n = PARAMETERS.length
  const levels = [2, 4, 6, 8, 10]

  const angle = (i) => (Math.PI * 2 * i) / n - Math.PI / 2
  const point = (i, value) => {
    const rr = (value / 10) * radius
    return [cx + rr * Math.cos(angle(i)), cy + rr * Math.sin(angle(i))]
  }

  const dataPoints = PARAMETERS.map((p, i) => point(i, Number(scores?.[p.key]) || 0))
  const dataPath = dataPoints.map((pt) => pt.join(',')).join(' ')

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label="Радарная диаграмма профиля партии"
      className="overflow-visible"
    >
      <defs>
        <radialGradient id="radarFill" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(224,192,116,0.55)" />
          <stop offset="100%" stopColor="rgba(200,155,60,0.30)" />
        </radialGradient>
        <filter id="radarGlow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* сетка-паутина */}
      {levels.map((lv) => {
        const poly = PARAMETERS.map((_, i) => point(i, lv).join(',')).join(' ')
        return (
          <polygon
            key={lv}
            points={poly}
            fill="none"
            stroke="rgba(111,78,55,0.13)"
            strokeWidth="1"
          />
        )
      })}

      {/* оси + подписи */}
      {PARAMETERS.map((p, i) => {
        const [x, y] = point(i, 10)
        const [lx, ly] = point(i, 12.1)
        const anchor = Math.abs(lx - cx) < 8 ? 'middle' : lx > cx ? 'start' : 'end'
        return (
          <g key={p.key}>
            <line x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(111,78,55,0.10)" strokeWidth="1" />
            <text
              x={lx}
              y={ly}
              textAnchor={anchor}
              dominantBaseline="middle"
              className="font-sans"
              style={{ fontSize: 11, fill: 'var(--color-coffee)', fontWeight: 500 }}
            >
              {p.short}
            </text>
          </g>
        )
      })}

      {/* данные */}
      <polygon
        points={dataPath}
        fill="url(#radarFill)"
        stroke="#c89b3c"
        strokeWidth="2"
        strokeLinejoin="round"
        filter="url(#radarGlow)"
        style={{ transition: 'all 0.45s var(--ease-out-soft)' }}
      />
      {dataPoints.map((pt, i) => (
        <circle
          key={i}
          cx={pt[0]}
          cy={pt[1]}
          r="3.5"
          fill="#fff"
          stroke="#b07d2b"
          strokeWidth="2"
          style={{ transition: 'all 0.45s var(--ease-out-soft)' }}
        />
      ))}
    </svg>
  )
}
