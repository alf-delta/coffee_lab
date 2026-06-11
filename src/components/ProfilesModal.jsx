import { useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Plus, Pencil, Trash2, Target, ArrowLeft, Upload, FileSpreadsheet,
  Clock, Flame, CornerRightDown, LogOut,
} from 'lucide-react'
import { defaultProfile } from '../data/constants'
import { parseRoastLog, formatRoastTime } from '../lib/roastLog'
import RoastCurve, { CurveLegend } from './RoastCurve'

const field =
  'w-full rounded-2xl border border-white/60 bg-white/55 px-4 py-2.5 text-sm text-espresso outline-none transition focus:border-gold/60 focus:bg-white/80 focus:ring-2 focus:ring-gold/25 placeholder:text-coffee-soft/50'

// Мини-кривая для карточки списка
function MiniCurve({ log }) {
  if (!log?.bean?.length) return null
  const { bean } = log
  const min = Math.min(...bean)
  const max = Math.max(...bean)
  const span = Math.max(1, max - min)
  const pts = bean
    .map((v, i) => `${(i / (bean.length - 1)) * 96 + 2},${26 - ((v - min) / span) * 22}`)
    .join(' ')
  return (
    <svg width="100" height="30" viewBox="0 0 100 30" aria-hidden="true" className="shrink-0">
      <polyline points={pts} fill="none" stroke="#b6451f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function MetricIsland({ icon: Icon, label, value }) {
  return (
    <div className="glass-soft flex items-start gap-2 rounded-2xl px-3 py-2.5">
      <Icon size={14} className="mt-0.5 shrink-0 text-amber" />
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wide text-coffee-soft/70">{label}</div>
        <div className="text-sm tabular-nums text-espresso">{value}</div>
      </div>
    </div>
  )
}

export default function ProfilesModal({ open, profiles, onClose, onCreate, onUpdate, onDelete }) {
  // view: { mode: 'list' } | { mode: 'detail', id } | { mode: 'form', id: 'new' | id }
  const [view, setView] = useState({ mode: 'list' })
  const [form, setForm] = useState(null)
  const [parseError, setParseError] = useState('')
  const fileRef = useRef(null)

  const startNew = () => {
    setForm(defaultProfile())
    setParseError('')
    setView({ mode: 'form', id: 'new' })
  }
  const startEdit = (p) => {
    setForm({ ...defaultProfile(), ...p })
    setParseError('')
    setView({ mode: 'form', id: p.id })
  }
  const backToList = () => {
    setView({ mode: 'list' })
    setForm(null)
    setParseError('')
  }
  const close = () => {
    backToList()
    onClose()
  }
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const valid = form && form.profile_name?.trim()

  // загрузка CSV-лога: парсим и автозаполняем всё, что можно
  const onFile = async (file) => {
    if (!file) return
    setParseError('')
    try {
      const text = await file.text()
      const { roast_log, roast_date } = parseRoastLog(text)
      setForm((f) => {
        const auto = `Bellwether · ${formatRoastTime(roast_log.metrics.duration_s)} · выгрузка ${Math.round(roast_log.metrics.drop_f)}°F`
        return {
          ...f,
          roast_log,
          log_date: roast_date,
          profile_name: f.profile_name?.trim() ? f.profile_name : auto,
        }
      })
    } catch (e) {
      setParseError(e.message || 'Не удалось разобрать файл')
    }
    if (fileRef.current) fileRef.current.value = ''
  }

  const save = (e) => {
    e.preventDefault()
    if (!valid) return
    const payload = {
      profile_name: form.profile_name.trim(),
      target_agtron_whole: Number(form.target_agtron_whole) || null,
      target_agtron_ground: Number(form.target_agtron_ground) || null,
      expected_moisture_loss: Number(form.expected_moisture_loss) || null,
      roast_log: form.roast_log || null,
      log_date: form.log_date || null,
    }
    if (view.id === 'new') {
      onCreate(payload)
      backToList()
    } else {
      onUpdate(view.id, payload)
      setView({ mode: 'detail', id: view.id })
      setForm(null)
    }
  }

  const removeProfile = (p) => {
    if (!confirm(`Удалить профиль «${p.profile_name}»?`)) return
    onDelete(p.id)
    backToList()
  }

  const detail = view.mode === 'detail' ? profiles.find((p) => p.id === view.id) : null
  const title =
    view.mode === 'list' ? 'Каталог профилей'
    : view.mode === 'detail' ? detail?.profile_name || 'Профиль'
    : view.id === 'new' ? 'Новый профиль' : 'Редактирование'

  const num = [
    { key: 'target_agtron_whole', label: 'Agtron цельное', step: 1 },
    { key: 'target_agtron_ground', label: 'Agtron молотое', step: 1 },
    { key: 'expected_moisture_loss', label: 'Потеря массы, %', step: 0.1 },
  ]

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-espresso/35 backdrop-blur-sm" onClick={close} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            className="glass relative z-10 flex h-[88dvh] max-h-[800px] w-full max-w-4xl overflow-hidden rounded-[1.75rem]"
          >
            {/* левая колонка — брендовая картинка во всю высоту.
                Фото на белом фоне, поэтому object-contain на белой подложке:
                машина всегда видна целиком и не обрезается по бокам */}
            <div className="hidden w-[30%] max-w-[260px] shrink-0 bg-white sm:block">
              <img
                src="/bellwether_roster.png"
                alt="Ростер Bellwether"
                className="h-full w-full object-contain p-3"
              />
            </div>

            {/* правая колонка */}
            <div className="flex min-w-0 flex-1 flex-col p-6 sm:p-7">
              {/* шапка */}
              <div className="mb-5 flex shrink-0 items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  {view.mode !== 'list' && (
                    <button
                      type="button"
                      onClick={view.mode === 'form' && view.id !== 'new'
                        ? () => { setView({ mode: 'detail', id: view.id }); setForm(null) }
                        : backToList}
                      aria-label="Назад"
                      className="grid size-8 shrink-0 place-items-center rounded-full text-coffee-soft transition hover:bg-coffee/10"
                    >
                      <ArrowLeft size={18} />
                    </button>
                  )}
                  <h2 className="truncate font-display text-2xl leading-tight text-espresso">{title}</h2>
                </div>
                <button
                  type="button"
                  onClick={close}
                  aria-label="Закрыть"
                  className="grid size-9 shrink-0 place-items-center rounded-full text-coffee-soft transition hover:bg-coffee/10"
                >
                  <X size={18} />
                </button>
              </div>

              {/* ── список: карточки профилей ── */}
              {view.mode === 'list' && (
                <>
                  <div className="-mr-1 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
                    {profiles.length === 0 && (
                      <p className="py-6 text-center text-sm text-coffee-soft">
                        Профилей пока нет. Создайте первый — можно сразу из CSV-лога ростера.
                      </p>
                    )}
                    {profiles.map((p) => (
                      <button
                        type="button"
                        key={p.id}
                        onClick={() => setView({ mode: 'detail', id: p.id })}
                        className="glass-soft flex w-full items-center justify-between gap-3 rounded-2xl p-4 text-left transition hover:bg-white/70"
                      >
                        <div className="min-w-0">
                          <div className="truncate font-medium text-espresso">{p.profile_name}</div>
                          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-coffee-soft tabular-nums">
                            {p.roast_log ? (
                              <>
                                <span className="inline-flex items-center gap-1 text-amber">
                                  <Clock size={11} /> {formatRoastTime(p.roast_log.metrics.duration_s)}
                                </span>
                                <span>выгрузка {Math.round(p.roast_log.metrics.drop_f)}°F</span>
                              </>
                            ) : (
                              <span className="inline-flex items-center gap-1">
                                <Target size={11} /> без лога
                              </span>
                            )}
                            <span>цельное {p.target_agtron_whole ?? '—'}</span>
                            <span>молотое {p.target_agtron_ground ?? '—'}</span>
                          </div>
                        </div>
                        <MiniCurve log={p.roast_log} />
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={startNew}
                    className="btn-gold mt-4 inline-flex shrink-0 items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold transition hover:brightness-105"
                  >
                    <Plus size={18} /> Добавить профиль
                  </button>
                </>
              )}

              {/* ── деталка: график + метрики ── */}
              {view.mode === 'detail' && detail && (
                <div className="flex min-h-0 flex-1 flex-col">
                  <div className="-mr-1 min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
                    {detail.roast_log ? (
                      <>
                        <div className="glass-soft rounded-2xl p-3">
                          <RoastCurve log={detail.roast_log} />
                          <CurveLegend className="mt-1 justify-center" />
                        </div>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                          <MetricIsland icon={Clock} label="Время жарки"
                            value={formatRoastTime(detail.roast_log.metrics.duration_s)} />
                          <MetricIsland icon={Flame} label="Загрузка"
                            value={`${Math.round(detail.roast_log.metrics.charge_f)}°F`} />
                          <MetricIsland icon={CornerRightDown} label="Разворот"
                            value={`${Math.round(detail.roast_log.metrics.turn_f)}°F · ${formatRoastTime(detail.roast_log.metrics.turn_s)}`} />
                          <MetricIsland icon={LogOut} label="Выгрузка"
                            value={`${Math.round(detail.roast_log.metrics.drop_f)}°F`} />
                        </div>
                      </>
                    ) : (
                      <p className="rounded-2xl bg-coffee/8 px-4 py-3 text-sm text-coffee-soft">
                        У профиля нет кривой — загрузите CSV-лог Bellwether в режиме редактирования.
                      </p>
                    )}

                    <div className="grid grid-cols-3 gap-2">
                      <MetricIsland icon={Target} label="Agtron цельное" value={detail.target_agtron_whole ?? '—'} />
                      <MetricIsland icon={Target} label="Agtron молотое" value={detail.target_agtron_ground ?? '—'} />
                      <MetricIsland icon={Target} label="Потеря массы" value={detail.expected_moisture_loss != null ? `${detail.expected_moisture_loss}%` : '—'} />
                    </div>
                    {detail.log_date && (
                      <p className="text-xs text-coffee-soft">
                        {/* T00:00:00 — иначе YYYY-MM-DD парсится как UTC и дата уезжает на день */}
                        Эталонная жарка записана {new Date(`${detail.log_date}T00:00:00`).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' })}.
                        Профиль не привязан к сорту — применяйте к любому зерну.
                      </p>
                    )}
                  </div>

                  <div className="mt-5 flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(detail)}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-coffee/15 bg-white/40 py-3 text-sm font-medium text-coffee transition hover:bg-white/70"
                    >
                      <Pencil size={15} /> Редактировать
                    </button>
                    <button
                      type="button"
                      onClick={() => removeProfile(detail)}
                      aria-label="Удалить"
                      className="grid size-11 shrink-0 place-items-center rounded-full border border-coffee/15 bg-white/40 text-coffee-soft transition hover:bg-red-500/10 hover:text-red-600"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              )}

              {/* ── форма: загрузка CSV + параметры ── */}
              {view.mode === 'form' && form && (
                <form onSubmit={save} className="flex min-h-0 flex-1 flex-col">
                  <div className="-mr-1 min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
                    {/* зона загрузки лога */}
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".csv,text/csv"
                      className="hidden"
                      onChange={(e) => onFile(e.target.files?.[0])}
                    />
                    {form.roast_log ? (
                      <div className="glass-soft rounded-2xl p-3">
                        <RoastCurve log={form.roast_log} height={210} />
                        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                          <CurveLegend />
                          <button
                            type="button"
                            onClick={() => fileRef.current?.click()}
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-amber transition hover:underline"
                          >
                            <Upload size={13} /> заменить лог
                          </button>
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                          <MetricIsland icon={Clock} label="Время жарки" value={formatRoastTime(form.roast_log.metrics.duration_s)} />
                          <MetricIsland icon={Flame} label="Загрузка" value={`${Math.round(form.roast_log.metrics.charge_f)}°F`} />
                          <MetricIsland icon={CornerRightDown} label="Разворот" value={`${Math.round(form.roast_log.metrics.turn_f)}°F · ${formatRoastTime(form.roast_log.metrics.turn_s)}`} />
                          <MetricIsland icon={LogOut} label="Выгрузка" value={`${Math.round(form.roast_log.metrics.drop_f)}°F`} />
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        className="flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-gold/40 bg-gold/5 px-4 py-7 text-center transition hover:bg-gold/10"
                      >
                        <FileSpreadsheet size={26} className="text-amber" />
                        <span className="text-sm font-semibold text-coffee">
                          Загрузить CSV-лог Bellwether
                        </span>
                        <span className="text-xs text-coffee-soft">
                          roaster-log-data-…csv — кривая и параметры заполнятся автоматически
                        </span>
                      </button>
                    )}
                    {parseError && (
                      <p className="rounded-xl border border-red-500/20 bg-red-500/8 px-3 py-2 text-xs text-red-700">
                        {parseError}
                      </p>
                    )}

                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-coffee-soft">
                        Название профиля <span className="text-amber">*</span>
                      </label>
                      <input
                        className={field}
                        placeholder="Light — Expressive Citrus (v2)"
                        value={form.profile_name}
                        onChange={(e) => set('profile_name', e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {num.map((n) => (
                        <div key={n.key}>
                          <label className="mb-1.5 block text-xs font-medium text-coffee-soft">
                            {n.label}
                          </label>
                          <input
                            type="number"
                            step={n.step}
                            className={field}
                            value={form[n.key] ?? ''}
                            onChange={(e) => set(n.key, e.target.value)}
                          />
                        </div>
                      ))}
                    </div>
                    <p className="text-[11px] leading-snug text-coffee-soft/70">
                      Профиль не привязан к сорту кофе — он описывает поведение ростера и применяется
                      к любому зерну при создании партии.
                    </p>
                  </div>

                  <div className="mt-5 flex shrink-0 gap-3">
                    <button
                      type="button"
                      onClick={view.id === 'new' ? backToList : () => { setView({ mode: 'detail', id: view.id }); setForm(null) }}
                      className="flex-1 rounded-full border border-coffee/15 bg-white/40 py-3 text-sm font-medium text-coffee transition hover:bg-white/70"
                    >
                      Отмена
                    </button>
                    <button
                      type="submit"
                      disabled={!valid}
                      className="btn-gold flex-1 whitespace-nowrap rounded-full py-3 text-sm font-semibold transition hover:brightness-105 disabled:opacity-40"
                    >
                      {view.id === 'new' ? 'Сохранить профиль' : 'Сохранить'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
