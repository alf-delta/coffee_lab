import {
  Sparkles, CheckCircle2, AlertTriangle, Info, Lightbulb, RefreshCw, Loader2, Wrench, ArrowRight,
} from 'lucide-react'
import { analyzeFallback, kbCitation } from '../lib/knowledge'
import { normalizeReport, groupByDomain, DECISIONS, ACTION_TARGETS } from '../lib/qreport'

const TONE = {
  good: { color: '#7cc18d', Icon: CheckCircle2 },
  warn: { color: '#e0c074', Icon: AlertTriangle },
  bad: { color: '#e89a92', Icon: AlertTriangle },
  info: { color: '#cdb79a', Icon: Info },
}
const PRIORITY = {
  high: { color: '#e0c074', label: 'высокий' },
  med: { color: '#cdb79a', label: 'средний' },
  low: { color: '#9b8266', label: 'низкий' },
}

const findingStyle = (color) => ({
  background: `color-mix(in srgb, ${color} 11%, transparent)`,
  borderLeft: `3px solid ${color}`,
})

export default function AiComment({ batch, profile, pending = false, onReanalyze = null }) {
  // Источник: персистентный разбор Monoblend Q (LLM/пайплайн) если есть,
  // иначе детерминированный fallback из knowledge.js. Обе формы → один контракт.
  const byClaude = Boolean(batch?.ai_analysis)
  const report = normalizeReport(batch?.ai_analysis) || normalizeReport(analyzeFallback(batch, profile))

  const verdict = report?.verdict
  const dec = verdict ? DECISIONS[verdict.decision] : null
  const groups = groupByDomain(report?.findings)
  const actions = report?.actions || []
  const gaps = report?.data_gaps || []

  return (
    <div className="glass-dark flex h-full min-h-0 flex-col rounded-[1.5rem] p-4">
      {/* шапка */}
      <div className="flex shrink-0 items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Sparkles size={15} className="text-gold-soft" />
            <h4 className="font-display text-base text-cream">Monoblend Q</h4>
            {pending && <Loader2 size={13} className="animate-spin text-gold-soft" />}
          </div>
          <p className="text-[11px] text-latte/70">
            {pending
              ? 'Q-движок анализирует партию по корпусу знаний…'
              : byClaude
                ? 'Q-движок · корпус знаний обжарки (сенсорика · химия · физика)'
                : 'Q-движок · правила знаний обжарки'}
          </p>
        </div>
        {onReanalyze && (
          <button
            type="button"
            onClick={onReanalyze}
            disabled={pending}
            title="Перезапустить анализ"
            aria-label="Перезапустить анализ"
            className="grid size-7 shrink-0 place-items-center rounded-full text-latte/70 transition hover:bg-white/10 hover:text-cream disabled:opacity-40"
          >
            <RefreshCw size={13} className={pending ? 'animate-spin' : ''} />
          </button>
        )}
      </div>

      {/* тело: вердикт → действия → доказательства → пробелы (внутренний скролл) */}
      <div className="-mr-1.5 mt-2.5 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1.5">
        {/* ── ВЕРДИКТ ── */}
        {verdict && (
          <div className="rounded-xl p-3" style={findingStyle(dec.tint)}>
            <div className="flex items-center gap-3">
              <div className="leading-none">
                <span className="font-display text-4xl tabular-nums" style={{ color: dec.tint }}>
                  {verdict.score || '—'}
                </span>
                <span className="ml-1 text-xs text-latte/70">/ 100</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                    style={{ background: `color-mix(in srgb, ${dec.tint} 22%, transparent)`, color: dec.tint }}
                  >
                    {dec.label}
                  </span>
                  {verdict.grade && <span className="text-[11px] text-latte/80">{verdict.grade}</span>}
                </div>
                {verdict.headline && (
                  <p className="mt-1 text-[12px] leading-snug text-cream">{verdict.headline}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── ДЕЙСТВИЯ — что крутить ── */}
        {actions.length > 0 && (
          <section>
            <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-gold-soft/90">
              <Wrench size={12} /> Что крутить
            </div>
            <div className="space-y-1.5">
              {actions.map((a) => {
                const pr = PRIORITY[a.priority] || PRIORITY.med
                return (
                  <div key={a.key} className="rounded-lg bg-white/[0.05] px-2.5 py-2" style={{ borderLeft: `3px solid ${pr.color}` }}>
                    <div className="flex flex-wrap items-center gap-1.5 text-[12px] text-cream">
                      <span className="rounded bg-white/10 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-latte/80">
                        {ACTION_TARGETS[a.target]}
                      </span>
                      <span className="font-medium">{a.lever}</span>
                      <ArrowRight size={11} className="text-latte/50" />
                      <span className="text-latte/90">{a.direction}</span>
                    </div>
                    {a.rationale && <p className="mt-0.5 text-[10px] leading-snug text-latte/60">{a.rationale}</p>}
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* ── ДОКАЗАТЕЛЬСТВА по доменам ── */}
        {groups.map((grp) => (
          <section key={grp.domain}>
            <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-latte/55">
              {grp.label}
            </div>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {grp.items.map((f) => {
                const t = TONE[f.tone] || TONE.info
                const cite = kbCitation(f.source)
                return (
                  <div key={f.key} className="rounded-xl p-2.5" style={findingStyle(t.color)}>
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-[12px] font-semibold" style={{ color: t.color }}>{f.title}</span>
                      {f.value != null && f.value !== '' && (
                        <span className="shrink-0 text-[11px] tabular-nums text-latte/80">
                          {f.value}<span className="ml-0.5 text-[9px] text-latte/50">{f.unit}</span>
                        </span>
                      )}
                    </div>
                    {f.observation && <p className="mt-0.5 text-[11px] leading-snug text-latte/70">{f.observation}</p>}
                    {f.meaning && <p className="mt-0.5 text-[11px] leading-snug text-latte/95">{f.meaning}</p>}
                    {cite && (
                      <p className="mt-1 text-[9px] uppercase tracking-wide text-latte/40">{cite}</p>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        ))}

        {/* ── ПРОБЕЛЫ ── */}
        {gaps.length > 0 && (
          <div className="flex gap-1.5 rounded-lg bg-white/[0.04] px-2.5 py-2">
            <Lightbulb size={12} className="mt-0.5 shrink-0 text-latte/40" />
            <div className="min-w-0">
              <span className="text-[9px] font-semibold uppercase tracking-wide text-latte/50">Не хватило данных</span>
              <p className="text-[10px] leading-snug text-latte/60">{gaps.join(' · ')}</p>
            </div>
          </div>
        )}

        {!report && (
          <p className="py-6 text-center text-xs text-latte/50">
            Запишите анализ — Monoblend Q соберёт вердикт.
          </p>
        )}
      </div>
    </div>
  )
}
