import { Sparkles, CheckCircle2, AlertTriangle, Info, Lightbulb } from 'lucide-react'
import { roastCommentary } from '../lib/knowledge'

const TONE = {
  good: { color: '#7cc18d', Icon: CheckCircle2 },
  warn: { color: '#e0c074', Icon: AlertTriangle },
  bad: { color: '#e89a92', Icon: AlertTriangle },
  info: { color: '#cdb79a', Icon: Info },
}

const cardStyle = (color) => ({
  background: `color-mix(in srgb, ${color} 12%, transparent)`,
  borderLeft: `3px solid ${color}`,
})

function Advice({ text }) {
  return (
    <div className="mt-1.5 flex gap-1.5 rounded-lg bg-white/[0.06] px-2 py-1.5">
      <Lightbulb size={12} className="mt-0.5 shrink-0 text-gold-soft" />
      <div className="min-w-0">
        <span className="text-[9px] font-semibold uppercase tracking-wide text-gold-soft/90">
          Совет · Bellwether
        </span>
        <p className="text-[11px] leading-snug text-latte/90">{text}</p>
      </div>
    </div>
  )
}

export default function AiComment({ batch, profile }) {
  const insights = roastCommentary(batch, profile)
  const hero = insights.find((i) => i.key === 'total')
  const others = insights.filter((i) => i.key !== 'total')
  // плитки: есть число и нет совета; остальное — широкие карточки
  const tiles = others.filter((i) => i.value != null && i.value !== '' && !i.advice)
  const wide = others.filter((i) => !(i.value != null && i.value !== '' && !i.advice))

  return (
    <div className="glass-dark flex h-full min-h-0 flex-col rounded-[1.5rem] p-4">
      {/* шапка */}
      <div className="shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles size={15} className="text-gold-soft" />
          <h4 className="font-display text-base text-cream">Комментарий ИИ</h4>
        </div>
        <p className="text-[11px] text-latte/70">База знаний обжарки + ростер Bellwether</p>
      </div>

      {/* инфографическая сетка, внутренний скролл */}
      <div className="-mr-1.5 mt-2.5 grid min-h-0 flex-1 content-start grid-cols-1 gap-2 overflow-y-auto pr-1.5 sm:grid-cols-2">
        {/* hero — итог */}
        {hero && (
          <div className="rounded-xl p-3 sm:col-span-2" style={cardStyle(TONE[hero.tone].color)}>
            <div className="flex items-center gap-3">
              <div className="leading-none">
                <span
                  className="font-display text-4xl tabular-nums"
                  style={{ color: TONE[hero.tone].color }}
                >
                  {hero.value}
                </span>
                <span className="ml-1 text-xs text-latte/70">{hero.unit}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-display text-base text-cream">{hero.title}</div>
                <p className="text-[11px] leading-snug text-latte">{hero.text}</p>
              </div>
            </div>
            {hero.advice && <Advice text={hero.advice} />}
          </div>
        )}

        {/* плитки-метрики */}
        {tiles.map((it) => {
          const t = TONE[it.tone] || TONE.info
          return (
            <div key={it.key} className="rounded-xl p-2.5" style={cardStyle(t.color)}>
              <div className="leading-none">
                <span className="font-display text-2xl tabular-nums" style={{ color: t.color }}>
                  {it.value}
                </span>
                <span className="ml-1 text-[10px] text-latte/70">{it.unit}</span>
              </div>
              <div className="mt-1 text-[11px] font-semibold" style={{ color: t.color }}>
                {it.title}
              </div>
              <p className="text-[11px] leading-snug text-latte/90">{it.text}</p>
            </div>
          )
        })}

        {/* широкие карточки с разбором/советом */}
        {wide.map((it) => {
          const t = TONE[it.tone] || TONE.info
          const hasValue = it.value != null && it.value !== ''
          return (
            <div key={it.key} className="rounded-xl p-2.5 sm:col-span-2" style={cardStyle(t.color)}>
              <div className="flex gap-2.5">
                {hasValue ? (
                  <div className="shrink-0 text-center leading-none">
                    <div className="font-display text-2xl tabular-nums" style={{ color: t.color }}>
                      {it.value}
                    </div>
                    <div className="mt-0.5 text-[9px] text-latte/70">{it.unit}</div>
                  </div>
                ) : (
                  <t.Icon size={15} className="mt-0.5 shrink-0" style={{ color: t.color }} />
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold" style={{ color: t.color }}>
                    {it.title}
                  </div>
                  <p className="text-[11px] leading-snug text-latte">{it.text}</p>
                  {it.advice && <Advice text={it.advice} />}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
