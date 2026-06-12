import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, ChevronLeft, ChevronRight, Check, FlaskRound, Droplets,
  Wine, StickyNote, ClipboardCheck, Target, AlertTriangle, CheckCircle2, Save, Aperture,
} from 'lucide-react'
import RadarChart from './RadarChart'
import ScoreBadge from './ScoreBadge'
import SliderRow from './SliderRow'
import VoiceInput from './VoiceInput'
import FlavorWheel, { FlavorChips } from './FlavorWheel'
import { PARAMETERS, PARAM_KEYS, LAB_METRICS, defaultLabData } from '../data/constants'
import { scoreSummary, validateBellwetherProfile, validateWeightLoss, weightLoss } from '../lib/scoring'

const STEPS = [
  { key: 'omix', title: 'Физика зерна', sub: 'DiFluid Omix Plus', Icon: FlaskRound, source: 'Omix Plus' },
  { key: 'extract', title: 'Экстракция', sub: 'DiFluid R2 Extract', Icon: Droplets, source: 'R2 Extract' },
  { key: 'sensory', title: 'Органолептика', sub: 'Дегустация · голос или ползунки', Icon: Wine },
  { key: 'notes', title: 'Заметки', sub: 'Свободные наблюдения', Icon: StickyNote },
  { key: 'review', title: 'Предпросмотр', sub: 'Проверьте и запишите', Icon: ClipboardCheck },
]

const field =
  'w-full rounded-xl border border-coffee/15 bg-white/70 py-2 pl-3 pr-12 text-sm tabular-nums text-espresso outline-none transition focus:border-gold/60 focus:bg-white focus:ring-2 focus:ring-gold/25'

const VERDICT = {
  success: { color: '#4f8a5b', Icon: CheckCircle2 },
  warning: { color: '#b07d2b', Icon: AlertTriangle },
  danger: { color: '#c0392b', Icon: AlertTriangle },
  pending: { color: '#8a6a4f', Icon: Target },
  unknown: { color: '#9b8266', Icon: Target },
}

export default function AnalysisWizard({ batch, profile, onClose, onRecord }) {
  const [step, setStep] = useState(0)
  const [labData, setLabData] = useState(batch.lab_data || defaultLabData())
  const [scores, setScores] = useState({}) // пусто — без предзаполнения
  const [notes, setNotes] = useState('')
  const [flavors, setFlavors] = useState(batch.flavors || [])
  const [wheelOpen, setWheelOpen] = useState(false)

  const setMetric = (k, v) => setLabData((d) => ({ ...d, [k]: v }))
  const setScore = (k, v) => setScores((s) => ({ ...s, [k]: v }))

  const ratedCount = PARAM_KEYS.filter((k) => scores[k] != null).length
  const allRated = ratedCount === PARAM_KEYS.length
  const summary = scoreSummary(scores, labData)
  const verdict = validateBellwetherProfile(profile, labData)
  const loss = weightLoss(batch.green_weight_kg, batch.roasted_weight_kg)
  const lossVerdict = validateWeightLoss(profile, loss)

  const applyParsed = (result) => {
    setScores(result.scores) // голос заполняет все 10
    if (result.notes) setNotes((n) => (n ? n + '\n' : '') + result.notes)
  }

  const last = STEPS.length - 1
  const cur = STEPS[step]
  const labGroup = (source) => LAB_METRICS.filter((m) => m.source === source)

  const record = () => {
    if (!allRated) return
    onRecord({ scores, lab_data: labData, notes, flavors })
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-3xl flex-col">
      {/* шапка */}
      <div className="mb-3 flex shrink-0 items-start justify-between gap-4 px-1">
        <div className="min-w-0">
          <div className="text-xs font-medium uppercase tracking-wide text-gold-soft">
            Анализ партии
          </div>
          <h2 className="truncate font-display text-2xl leading-tight text-cream sm:text-3xl">
            {batch.name}
          </h2>
        </div>
        <button
          onClick={onClose}
          aria-label="Закрыть"
          className="grid size-11 shrink-0 place-items-center rounded-full bg-white/10 text-cream transition hover:bg-white/20"
        >
          <X size={20} />
        </button>
      </div>

      {/* степпер */}
      <div className="mb-3 flex shrink-0 gap-1.5">
        {STEPS.map((s, i) => {
          const done = i < step
          const active = i === step
          return (
            <button
              key={s.key}
              onClick={() => setStep(i)}
              className="flex flex-1 items-center gap-2 rounded-2xl px-3 py-2 text-left transition"
              style={{
                background: active
                  ? 'var(--color-gold)'
                  : done
                    ? 'rgba(200,155,60,0.22)'
                    : 'rgba(255,255,255,0.08)',
              }}
            >
              <span
                className="grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold"
                style={{
                  background: active ? '#2b1d14' : done ? '#4f8a5b' : 'rgba(255,255,255,0.15)',
                  color: active ? 'var(--color-gold)' : '#fff',
                }}
              >
                {done ? <Check size={13} /> : i + 1}
              </span>
              <span
                className="hidden truncate text-xs font-semibold sm:block"
                style={{ color: active ? '#2b1d14' : 'var(--color-cream)' }}
              >
                {s.title}
              </span>
            </button>
          )
        })}
      </div>

      {/* контент шага */}
      <div className="glass-light min-h-0 flex-1 overflow-y-auto rounded-[1.75rem] p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-2.5">
          <span className="grid size-10 place-items-center rounded-2xl bg-gold/15 text-amber">
            <cur.Icon size={20} />
          </span>
          <div>
            <div className="font-display text-xl text-espresso">{cur.title}</div>
            <div className="text-xs text-coffee-soft">{cur.sub}</div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={cur.key}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.22 }}
          >
            {/* ── Omix Plus ── */}
            {cur.key === 'omix' && (
              <>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {labGroup('Omix Plus').map((m) => (
                    <label key={m.key} className="block">
                      <span className="mb-1 block text-xs text-coffee-soft">{m.label}</span>
                      <div className="relative">
                        <input
                          type="number" inputMode="decimal"
                          min={m.min} max={m.max} step={m.step}
                          value={labData[m.key] ?? ''}
                          onChange={(e) => setMetric(m.key, e.target.value)}
                          placeholder="—"
                          className={field}
                        />
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-coffee-soft/60">
                          {m.unit}
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
                <VerdictBar verdict={verdict} lossVerdict={lossVerdict} loss={loss} />
              </>
            )}

            {/* ── R2 Extract ── */}
            {cur.key === 'extract' && (
              <div className="grid grid-cols-2 gap-3">
                {labGroup('R2 Extract').map((m) => (
                  <label key={m.key} className="block">
                    <span className="mb-1 block text-xs text-coffee-soft">{m.label}</span>
                    <div className="relative">
                      <input
                        type="number" inputMode="decimal"
                        min={m.min} max={m.max} step={m.step}
                        value={labData[m.key] ?? ''}
                        onChange={(e) => setMetric(m.key, e.target.value)}
                        placeholder="—"
                        className={field}
                      />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-coffee-soft/60">
                        {m.unit}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            )}

            {/* ── Органолептика: голос + ползунки ── */}
            {cur.key === 'sensory' && (
              <div className="space-y-4">
                <VoiceInput onParsed={applyParsed} />

                {/* колесо вкусов SCA: дескрипторы чашки */}
                <div className="rounded-2xl border border-gold/25 bg-gold/5 p-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xs text-coffee-soft">
                      Вкусовые дескрипторы
                      {flavors.length > 0 && (
                        <span className="ml-1.5 font-semibold tabular-nums text-amber">
                          {flavors.length}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setWheelOpen(true)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-gold/15 px-3 py-1.5 text-xs font-semibold text-amber transition hover:bg-gold/25"
                    >
                      <Aperture size={14} /> Колесо вкусов
                    </button>
                  </div>
                  {flavors.length > 0 && (
                    <FlavorChips
                      flavors={flavors}
                      onRemove={(f) => setFlavors((prev) => prev.filter((x) => x !== f))}
                      className="mt-2.5 justify-start"
                    />
                  )}
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-coffee-soft">Оценено параметров</span>
                  <span className="font-display text-base tabular-nums text-amber">
                    {ratedCount} / {PARAM_KEYS.length}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
                  {PARAMETERS.map((p) => {
                    const set = scores[p.key] != null
                    return (
                      <div key={p.key} className="px-1" style={{ opacity: set ? 1 : 0.55 }}>
                        <SliderRow
                          label={p.label}
                          value={scores[p.key] ?? 5}
                          onChange={(v) => setScore(p.key, v)}
                        />
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ── Заметки ── */}
            {cur.key === 'notes' && (
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={7}
                placeholder="Свободные наблюдения дегустатора по этой партии…"
                className="w-full resize-none rounded-2xl border border-coffee/15 bg-white/70 px-4 py-3 text-sm text-espresso outline-none transition focus:border-gold/60 focus:bg-white focus:ring-2 focus:ring-gold/25 placeholder:text-coffee-soft/50"
              />
            )}

            {/* ── Предпросмотр ── */}
            {cur.key === 'review' && (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="mx-auto w-full max-w-[230px]">
                  <RadarChart scores={scores} />
                </div>
                <div className="flex flex-col items-center gap-2.5">
                  <ScoreBadge total={summary.total} size={120} />
                  <div
                    className="rounded-full px-4 py-1 text-sm font-semibold"
                    style={{
                      background: `color-mix(in srgb, ${summary.grade.tint} 16%, white)`,
                      color: summary.grade.tint,
                    }}
                  >
                    {summary.grade.label}
                  </div>
                  <p className="text-center text-xs leading-relaxed text-coffee">
                    {summary.description}
                  </p>
                  {summary.tags.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-1.5">
                      {summary.tags.map((t) => (
                        <span key={t} className="rounded-full bg-coffee/8 px-2.5 py-0.5 text-xs text-coffee">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                  <FlavorChips flavors={flavors} />
                </div>

                <div className="sm:col-span-2">
                  <VerdictBar verdict={verdict} lossVerdict={lossVerdict} loss={loss} />
                  {summary.alerts.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {summary.alerts.map((a, i) => (
                        <div key={i} className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/8 px-3 py-2.5 text-xs leading-relaxed text-red-700">
                          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                          <span>{a}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {!allRated && (
                    <div className="mt-3 rounded-xl bg-amber/10 px-3 py-2 text-xs text-amber">
                      Оцените все 10 параметров на шаге «Органолептика» ({ratedCount}/{PARAM_KEYS.length}).
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* навигация */}
      <div className="mt-3 flex shrink-0 items-center justify-between gap-3">
        <button
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-white/10 px-5 py-3 text-sm font-medium text-cream transition hover:bg-white/20 disabled:opacity-30"
        >
          <ChevronLeft size={18} /> Назад
        </button>

        {step < last ? (
          <button
            onClick={() => setStep((s) => Math.min(last, s + 1))}
            className="btn-gold inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-6 py-3 text-sm font-semibold transition hover:brightness-105"
          >
            Далее <ChevronRight size={18} />
          </button>
        ) : (
          <button
            onClick={record}
            disabled={!allRated}
            className="btn-gold inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-6 py-3 text-sm font-semibold transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Save size={17} /> Записать анализ
          </button>
        )}
      </div>

      {/* интерактивное колесо вкусов SCA */}
      <FlavorWheel
        open={wheelOpen}
        selected={flavors}
        onClose={() => setWheelOpen(false)}
        onSave={(next) => {
          setFlavors(next)
          setWheelOpen(false)
        }}
      />
    </div>
  )
}

function MetricVerdict({ v, label, unit, actual }) {
  const s = VERDICT[v.status] || VERDICT.unknown
  return (
    <div
      className="rounded-xl px-3 py-2.5"
      style={{
        background: `color-mix(in srgb, ${s.color} 12%, white)`,
        border: `1px solid color-mix(in srgb, ${s.color} 30%, transparent)`,
      }}
    >
      <div className="flex items-start gap-2">
        <s.Icon size={16} className="mt-0.5 shrink-0" style={{ color: s.color }} />
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-wide text-coffee-soft/70">{label}</div>
          <div className="text-sm font-medium leading-snug" style={{ color: s.color }}>{v.message}</div>
          {v.target != null && (
            <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-coffee-soft tabular-nums">
              <span>цель {v.target}{unit}</span>
              {actual != null && <span>факт {actual}{unit}</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function VerdictBar({ verdict, lossVerdict, loss }) {
  return (
    <div className="mt-4">
      <div className="mb-1.5 flex items-center gap-1.5 text-xs text-coffee-soft">
        <Target size={12} />
        {verdict.profile ? verdict.profile.profile_name : 'Профиль Bellwether'}
        <span className="text-coffee-soft/50">· зоны Bellwether</span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <MetricVerdict v={verdict} label="Agtron · цельное" unit=" Agtron" actual={verdict.actual} />
        <MetricVerdict v={lossVerdict} label="Ужарка" unit="%" actual={loss != null ? Number(loss.toFixed(1)) : null} />
      </div>
    </div>
  )
}
