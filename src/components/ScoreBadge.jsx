import { grade as gradeOf } from '../lib/scoring'

// Кольцевой индикатор итогового балла + грейд
export default function ScoreBadge({ total, size = 132 }) {
  const g = gradeOf(total)
  const r = size / 2 - 9
  const c = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(1, total / 100))
  const dash = c * pct

  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(111,78,55,0.12)"
          strokeWidth="9"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={g.tint}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
          style={{ transition: 'stroke-dasharray 0.6s var(--ease-out-soft)' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span
          className="font-display leading-none"
          style={{ fontSize: size * 0.3, color: 'var(--color-espresso)' }}
        >
          {total}
        </span>
        <span className="text-[10px] uppercase tracking-wider text-coffee-soft/70">
          / 100
        </span>
      </div>
    </div>
  )
}
