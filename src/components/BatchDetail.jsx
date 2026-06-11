import { useState, useEffect, useRef, useLayoutEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Calendar, Hourglass, Coffee, Aperture } from 'lucide-react'
import RadarChart from './RadarChart'
import ScoreBadge from './ScoreBadge'
import SliderRow from './SliderRow'
import OutgassingProgress from './OutgassingProgress'
import AnalysisWizard from './AnalysisWizard'
import AiComment from './AiComment'
import LabReadings from './LabReadings'
import FlavorWheel, { FlavorChips } from './FlavorWheel'
import { PARAMETERS, defaultLabData, STATUS } from '../data/constants'
import { scoreSummary } from '../lib/scoring'
import { formatDate, readyDate, daysRemaining, serviceDate, isInService } from '../lib/outgassing'

export default function BatchDetail({ batch, profiles = [], beans = [], onClose, onUpdate }) {
  const [scores, setScores] = useState(batch?.scores || {})
  const [notes, setNotes] = useState(batch?.notes || '')
  const [labData, setLabData] = useState(batch?.lab_data || defaultLabData())
  const [flavors, setFlavors] = useState(batch?.flavors || [])
  const [wheelOpen, setWheelOpen] = useState(false)

  // пересинхронизация при смене партии
  useEffect(() => {
    if (!batch) return
    setScores(batch.scores || {})
    setNotes(batch.notes || '')
    setLabData(batch.lab_data || defaultLabData())
    setFlavors(batch.flavors || [])
    setWheelOpen(false)
  }, [batch?.id]) // eslint-disable-line

  if (!batch) return null

  const profile = profiles.find((p) => p.id === batch.bellwether_profile_id) || null
  const bean = beans.find((b) => b.id === batch.green_bean_id) || null
  const summary = scoreSummary(scores, labData)

  const setScore = (key, value) => {
    const next = { ...scores, [key]: value }
    setScores(next)
    onUpdate(batch.id, { scores: next })
  }

  const saveNotes = (v) => {
    setNotes(v)
    onUpdate(batch.id, { notes: v })
  }

  const saveFlavors = (next) => {
    setFlavors(next)
    setWheelOpen(false)
    onUpdate(batch.id, { flavors: next })
  }

  // Запись анализа из мастера (статус READY → DONE)
  const recordAnalysis = ({ scores: sc, lab_data, notes: nt, flavors: fl = [] }) => {
    setScores(sc)
    setLabData(lab_data)
    setNotes(nt)
    setFlavors(fl)
    onUpdate(batch.id, {
      scores: sc,
      lab_data,
      notes: nt,
      flavors: fl,
      status: STATUS.DONE,
      analyzed_at: new Date().toISOString(),
    })
  }

  const isReady = batch._status === STATUS.READY
  const isOutgassing = batch._status === STATUS.OUTGASSING

  return (
    <AnimatePresence>
      {batch && (
        <motion.div
          className="fixed inset-0 z-40 flex flex-col p-3 sm:p-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-espresso/55 backdrop-blur-lg" onClick={onClose} />

          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 16 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="relative z-10 mx-auto flex h-full w-full max-w-[1600px] flex-col gap-3"
          >
            {isReady ? (
              <AnalysisWizard
                batch={batch}
                profile={profile}
                onClose={onClose}
                onRecord={recordAnalysis}
              />
            ) : (
              <>
            {/* ── Шапка: без подложки, светлый текст на размытом фоне ── */}
            <div className="flex shrink-0 items-start justify-between gap-4 px-1">
              <div className="min-w-0">
                <h2 className="font-display text-2xl leading-tight text-cream sm:text-3xl">
                  {batch.name}
                </h2>
                <div className="mt-1.5 text-sm text-latte">
                  {batch.origin || '—'}
                  {batch.bellwether_batch_number != null && (
                    <span className="text-gold-soft"> · Bellwether #{batch.bellwether_batch_number}</span>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {/* запуск в работу: доступен после анализа и 10-дневного допуска */}
                {!isOutgassing && isInService(batch) && !batch.in_service_at && (
                  <button
                    onClick={() => onUpdate(batch.id, { in_service_at: new Date().toISOString() })}
                    className="btn-gold inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition hover:brightness-105"
                  >
                    <Coffee size={16} /> Запущено в работу
                  </button>
                )}
                {/* на мобильных не показываем — дата есть в островке «В работе с» */}
                {batch.in_service_at && (
                  <span
                    className="hidden items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-medium sm:inline-flex"
                    style={{ background: 'rgba(79,138,91,0.18)', color: '#9fd3ab' }}
                  >
                    <Coffee size={15} /> В работе с {formatDate(batch.in_service_at)}
                  </span>
                )}
                <button
                  onClick={onClose}
                  aria-label="Закрыть"
                  className="grid size-11 shrink-0 place-items-center rounded-full bg-white/10 text-cream transition hover:bg-white/20"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* ── Островки тех-данных + важные даты ── */}
            <div
              className="grid shrink-0 gap-2"
              style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(118px, 1fr))' }}
            >
              {bean && <Island label="Зерно" value={bean.name} />}
              <Island label="Происхождение" value={batch.origin || '—'} />
              {bean?.variety && <Island label="Сорт" value={bean.variety} />}
              <Island label="Обжарка" value={batch.roast_level} />
              <Island label="Обработка" value={batch.process} />
              {bean?.altitude && <Island label="Высота" value={bean.altitude} />}
              {bean?.supplier && <Island label="Поставщик" value={bean.supplier} />}
              {!!batch.weight_g && <Island label="Вес" value={`${batch.weight_g} г`} />}
              {batch.green_weight_kg != null && (
                <Island label="Зелёный" value={`${batch.green_weight_kg} кг`} />
              )}
              {batch.roasted_weight_kg != null && (
                <Island label="Обжаренный" value={`${batch.roasted_weight_kg} кг`} />
              )}
              {profile && <Island label="Профиль" value={profile.profile_name} />}
              <Island label="Обжарка от" value={formatDate(batch.roast_date)} accent />
              <Island
                label="Готово к анализу"
                value={formatDate(readyDate(batch.roast_date, batch.outgassing_days))}
                accent
              />
              <Island
                label={batch.in_service_at ? 'В работе с' : 'Допуск в работу'}
                value={formatDate(batch.in_service_at || serviceDate(batch))}
                accent
              />
              {batch.analyzed_at && (
                <Island label="Проанализировано" value={formatDate(batch.analyzed_at)} accent />
              )}
              {batch.created_at && (
                <Island label="Добавлено" value={formatDate(batch.created_at)} accent />
              )}
            </div>

            {isOutgassing ? (
              /* ── Партия ещё дегазирует: отсчёт до анализа ── */
              <div className="flex min-h-0 flex-1 items-center justify-center py-4">
                <OutgassingCountdown batch={batch} />
              </div>
            ) : (
            <>
            {/* ── Две зоны: исследование (тёмное, слева) / профиль (светлое, справа) ── */}
            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto lg:grid lg:grid-cols-2 lg:overflow-hidden">
              {/* ЛЕВАЯ ЗОНА — исследование (лента без собственного скролла) */}
              <div className="flex min-h-0 flex-col gap-3 lg:h-full">
                {/* ИИ-комментарий занимает всю свободную высоту, скролл внутри */}
                <div className="flex min-h-0 flex-1 flex-col">
                  <AiComment batch={batch} profile={profile} />
                </div>

                {/* показатели анализаторов + входные замеры зелёного — read-only */}
                <LabReadings lab={labData} green={batch} />
              </div>

              {/* ПРАВАЯ ЗОНА — вкусовой профиль */}
              <div className="flex min-h-0 flex-col gap-3 lg:h-full lg:overflow-y-auto lg:pr-1">
                {/* радар + скор/грейд (объединённый верхний блок) */}
                <section className="glass-light relative grid shrink-0 items-center gap-3 rounded-[1.5rem] p-4 sm:grid-cols-2">
                  {/* кнопка колеса вкусов — в углу, рядом со скором */}
                  <button
                    type="button"
                    onClick={() => setWheelOpen(true)}
                    title="Колесо вкусов SCA"
                    className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-gold/15 px-3 py-1.5 text-xs font-semibold text-amber transition hover:bg-gold/25"
                  >
                    <Aperture size={14} /> Колесо вкусов
                    {flavors.length > 0 && <span className="tabular-nums">· {flavors.length}</span>}
                  </button>
                  <div>
                    <div className="mb-1 font-display text-base text-espresso">Профиль чашки</div>
                    <div className="mx-auto w-full max-w-[230px]">
                      <RadarChart scores={scores} />
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-2.5 pt-4">
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
                          <span
                            key={t}
                            className="rounded-full bg-coffee/8 px-2.5 py-0.5 text-xs text-coffee"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                    <FlavorChips flavors={flavors} />
                  </div>
                </section>

                {/* ползунки */}
                <section className="glass-light shrink-0 rounded-[1.5rem] p-4">
                  <div className="mb-3 font-display text-base text-espresso">
                    Органолептическая оценка
                  </div>
                  <div className="grid grid-cols-1 gap-x-8 gap-y-2.5 sm:grid-cols-2">
                    {PARAMETERS.map((p) => (
                      <SliderRow
                        key={p.key}
                        label={p.label}
                        value={Number(scores[p.key]) || 5}
                        onChange={(v) => setScore(p.key, v)}
                      />
                    ))}
                  </div>
                </section>

                {/* заметки — растягиваются, заполняя низ колонки */}
                <section className="glass-light flex min-h-[110px] flex-1 flex-col rounded-[1.5rem] p-4">
                  <div className="mb-2 font-display text-base text-espresso">Заметки</div>
                  <textarea
                    value={notes}
                    onChange={(e) => saveNotes(e.target.value)}
                    placeholder="Свободные наблюдения дегустатора по этой партии…"
                    className="w-full flex-1 resize-none rounded-2xl border border-white/60 bg-white/55 px-4 py-2.5 text-sm text-espresso outline-none transition focus:border-gold/60 focus:bg-white/80 focus:ring-2 focus:ring-gold/25 placeholder:text-coffee-soft/50"
                  />
                </section>
              </div>
            </div>
              </>
            )}
              </>
            )}

            {/* интерактивное колесо вкусов SCA */}
            <FlavorWheel
              open={wheelOpen}
              selected={flavors}
              onClose={() => setWheelOpen(false)}
              onSave={saveFlavors}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Фокус-экран для дегазирующейся партии: отсчёт времени + дата готовности
function OutgassingCountdown({ batch }) {
  const days = Math.max(0, daysRemaining(batch.roast_date, batch.outgassing_days))
  const ready = readyDate(batch.roast_date, batch.outgassing_days)
  const hours = Math.max(0, Math.ceil((ready.getTime() - Date.now()) / 3600000))
  const plural = days % 10 === 1 && days % 100 !== 11 ? 'день' : 'дн.'

  return (
    <section className="glass-light w-full max-w-md rounded-[2rem] p-7 text-center">
      <span
        className="mx-auto grid size-14 place-items-center rounded-2xl"
        style={{ background: 'color-mix(in srgb, #b07d2b 16%, white)', color: '#b07d2b' }}
      >
        <Hourglass size={26} />
      </span>

      <div className="mt-4 font-display text-7xl leading-none tabular-nums text-espresso">
        {days}
      </div>
      <div className="mt-1 text-sm text-coffee-soft">
        {plural} до готовности к анализу{days <= 2 ? ` · ≈ ${hours} ч.` : ''}
      </div>

      <div className="mx-auto mt-6 max-w-xs">
        <OutgassingProgress batch={batch} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="rounded-2xl bg-coffee/8 px-4 py-3">
          <div className="text-[11px] uppercase tracking-wide text-coffee-soft/70">
            Можно приступить к анализу
          </div>
          <div className="mt-1 flex items-center justify-center gap-2 font-display text-xl text-espresso">
            <Calendar size={17} className="text-amber" />
            {formatDate(ready)}
          </div>
        </div>
        <div className="rounded-2xl bg-coffee/8 px-4 py-3">
          <div className="text-[11px] uppercase tracking-wide text-coffee-soft/70">
            Допуск в работу в кофейне
          </div>
          <div className="mt-1 flex items-center justify-center gap-2 font-display text-xl text-espresso">
            <Coffee size={17} className="text-amber" />
            {formatDate(serviceDate(batch))}
          </div>
        </div>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-coffee-soft">
        Партия дегазируется. Анализ станет доступен автоматически после завершения срока —
        статус сменится на «Готово к анализу».
      </p>
    </section>
  )
}

function Island({ label, value, accent = false }) {
  return (
    <div
      className="min-w-0 glass-dark rounded-2xl px-3 py-2"
      style={accent ? { borderLeft: '3px solid var(--color-gold)' } : undefined}
    >
      <div className="text-[10px] uppercase tracking-wide text-latte/55">{label}</div>
      <Marquee text={String(value)} className="text-sm leading-tight text-cream" />
    </div>
  )
}

// Бегущая строка: одна строка; анимируется только если текст не влезает
function Marquee({ text, className = '' }) {
  const wrapRef = useRef(null)
  const textRef = useRef(null)
  const [over, setOver] = useState(0)
  const reduce =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  useLayoutEffect(() => {
    const measure = () => {
      const w = wrapRef.current
      const t = textRef.current
      if (!w || !t) return
      setOver(Math.max(0, t.scrollWidth - w.clientWidth))
    }
    measure()
    const ro = new ResizeObserver(measure)
    if (wrapRef.current) ro.observe(wrapRef.current)
    return () => ro.disconnect()
  }, [text])

  const animate = over > 1 && !reduce
  // цикл: пауза в начале → прокрутка до конца → пауза → мгновенный возврат в начало
  const scroll = Math.max(3, over / 35)
  const pause = 1.2
  const dur = scroll + pause * 2
  const times = [0, pause / dur, (pause + scroll) / dur, 1]

  return (
    <div ref={wrapRef} className={`overflow-hidden ${className}`} title={text}>
      <motion.span
        ref={textRef}
        className="inline-block whitespace-nowrap"
        animate={animate ? { x: [0, 0, -over, -over] } : { x: 0 }}
        transition={
          animate
            ? { duration: dur, times, ease: 'linear', repeat: Infinity, repeatType: 'loop' }
            : { duration: 0 }
        }
      >
        {text}
      </motion.span>
    </div>
  )
}
