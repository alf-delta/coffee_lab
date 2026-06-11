import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Plus, Pencil, Trash2, ArrowLeft, MapPin, Star, Flame,
  Mountain, Truck, Sprout, Tractor, CalendarDays, FlaskConical,
} from 'lucide-react'
import { defaultBean, PROCESSING_METHODS } from '../data/constants'
import { totalScore } from '../lib/scoring'
import { formatDate } from '../lib/outgassing'

const field =
  'w-full rounded-2xl border border-white/60 bg-white/55 px-4 py-2.5 text-sm text-espresso outline-none transition focus:border-gold/60 focus:bg-white/80 focus:ring-2 focus:ring-gold/25 placeholder:text-coffee-soft/50'

const splitNotes = (s) =>
  String(s || '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)

// Сводка обжарок по зерну: кол-во, средний скор по проанализированным, последняя дата
function roastStats(bean, batches) {
  const own = batches
    .filter((b) => b.green_bean_id === bean.id)
    .sort((a, b) => String(a.roast_date).localeCompare(String(b.roast_date)))
  const scored = own.filter((b) => b.analyzed_at).map((b) => totalScore(b.scores))
  return {
    batches: own,
    count: own.length,
    avg: scored.length ? Math.round(scored.reduce((s, v) => s + v, 0) / scored.length) : null,
    scores: scored,
    last: own.length ? own[own.length - 1].roast_date : null,
  }
}

function Sparkline({ values }) {
  if (values.length < 2) return null
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = Math.max(1, max - min)
  const pts = values
    .map((v, i) => `${(i / (values.length - 1)) * 64 + 2},${20 - ((v - min) / span) * 16}`)
    .join(' ')
  return (
    <svg width="68" height="22" viewBox="0 0 68 22" aria-hidden="true" className="shrink-0">
      <polyline points={pts} fill="none" stroke="var(--color-gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function NoteChips({ notes, max = 99, className = '' }) {
  const tags = splitNotes(notes).slice(0, max)
  if (!tags.length) return null
  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {tags.map((t) => (
        <span key={t} className="rounded-full bg-coffee/8 px-2.5 py-0.5 text-xs text-coffee">
          {t}
        </span>
      ))}
    </div>
  )
}

export default function BeansModal({ open, beans, batches = [], onClose, onCreate, onUpdate, onDelete, onRoast }) {
  // view: { mode: 'list' } | { mode: 'detail', id } | { mode: 'form', id: 'new' | id }
  const [view, setView] = useState({ mode: 'list' })
  const [form, setForm] = useState(null)

  const startNew = () => {
    setForm(defaultBean())
    setView({ mode: 'form', id: 'new' })
  }
  const startEdit = (b) => {
    setForm({ ...defaultBean(), ...b })
    setView({ mode: 'form', id: b.id })
  }
  const backToList = () => {
    setView({ mode: 'list' })
    setForm(null)
  }
  const close = () => {
    backToList()
    onClose()
  }
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const valid = form && form.name?.trim()

  const save = (e) => {
    e.preventDefault()
    if (!valid) return
    const payload = {
      name: form.name.trim(),
      supplier: form.supplier?.trim() || '',
      origin: form.origin?.trim() || '',
      farm: form.farm?.trim() || '',
      variety: form.variety?.trim() || '',
      process: form.process || '',
      process_detail: form.process_detail?.trim() || '',
      altitude: form.altitude?.trim() || '',
      harvest: form.harvest?.trim() || '',
      sca: form.sca?.trim() || '',
      flavor_notes: form.flavor_notes?.trim() || '',
      role: form.role?.trim() || '',
      story: form.story?.trim() || '',
      hero: !!form.hero,
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

  const removeBean = (b) => {
    if (!confirm(`Удалить зерно «${b.name}» из каталога?`)) return
    onDelete(b.id)
    backToList()
  }

  const detailBean = view.mode === 'detail' ? beans.find((b) => b.id === view.id) : null
  const title =
    view.mode === 'list' ? 'Каталог зерна'
    : view.mode === 'detail' ? detailBean?.name || 'Зерно'
    : view.id === 'new' ? 'Новое зерно' : 'Редактирование'

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
            className="glass relative z-10 flex max-h-[88dvh] w-full max-w-3xl flex-col overflow-hidden rounded-[1.75rem] p-6 sm:p-7"
          >
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
                <h2 className="truncate font-display text-2xl leading-tight text-espresso">
                  {title}
                </h2>
                {detailBean?.hero && (
                  <Star size={18} className="shrink-0 fill-current text-gold" aria-label="Hero bean" />
                )}
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

            {/* ── список: карточки линейки ── */}
            {view.mode === 'list' && (
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="-mr-1 min-h-0 flex-1 overflow-y-auto pr-1">
                  {beans.length === 0 && (
                    <p className="py-6 text-center text-sm text-coffee-soft">
                      Зёрен пока нет. Добавьте первое.
                    </p>
                  )}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {beans.map((b) => {
                      const st = roastStats(b, batches)
                      const openDetail = () => setView({ mode: 'detail', id: b.id })
                      return (
                        // div вместо button: внутри живёт собственная кнопка «обжарить»
                        <div
                          key={b.id}
                          role="button"
                          tabIndex={0}
                          onClick={openDetail}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              openDetail()
                            }
                          }}
                          className="glass-soft group flex cursor-pointer flex-col rounded-2xl p-4 text-left transition hover:bg-white/70"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex min-w-0 items-center gap-1.5">
                              {b.hero && <Star size={14} className="shrink-0 fill-current text-gold" />}
                              <span className="truncate font-medium text-espresso">{b.name}</span>
                            </div>
                            {b.sca && (
                              <span className="shrink-0 rounded-full bg-gold/15 px-2 py-0.5 text-xs font-semibold tabular-nums text-amber">
                                SCA {b.sca}
                              </span>
                            )}
                          </div>
                          <div className="mt-0.5 flex items-center gap-1 text-xs text-coffee-soft">
                            <MapPin size={12} className="shrink-0" />
                            <span className="truncate">{b.origin || '—'}</span>
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                            <span className="rounded-full bg-coffee/10 px-2.5 py-0.5 font-medium text-coffee">
                              {b.process || '—'}
                            </span>
                            {b.role && <span className="truncate text-coffee-soft">{b.role}</span>}
                          </div>
                          <NoteChips notes={b.flavor_notes} max={4} className="mt-2" />
                          <div className="mt-3 flex items-center justify-between gap-2 border-t border-coffee/10 pt-2.5 text-xs text-coffee-soft tabular-nums">
                            <span className="min-w-0 truncate">
                              {st.count === 0
                                ? 'обжарок ещё не было'
                                : `${st.count} обж.${st.avg != null ? ` · ср. ${st.avg}` : ''}${st.last ? ` · ${formatDate(st.last)}` : ''}`}
                            </span>
                            <div className="flex shrink-0 items-center gap-2">
                              <Sparkline values={st.scores} />
                              {onRoast && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    onRoast(b.id)
                                  }}
                                  aria-label={`Обжарить ${b.name}`}
                                  title="Обжарить это зерно"
                                  className="btn-gold grid size-8 place-items-center rounded-full transition hover:brightness-105"
                                >
                                  <Flame size={15} />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={startNew}
                  className="btn-gold mt-4 inline-flex shrink-0 items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold transition hover:brightness-105"
                >
                  <Plus size={18} /> Добавить зерно
                </button>
              </div>
            )}

            {/* ── деталка: паспорт зерна + история обжарок ── */}
            {view.mode === 'detail' && detailBean && (() => {
              const b = detailBean
              const st = roastStats(b, batches)
              const passport = [
                { icon: Sprout, label: 'Сорт', value: b.variety },
                { icon: Mountain, label: 'Высота', value: b.altitude },
                { icon: Truck, label: 'Поставщик', value: b.supplier },
                { icon: Tractor, label: 'Ферма / проект', value: b.farm },
                { icon: CalendarDays, label: 'Урожай', value: b.harvest },
                { icon: FlaskConical, label: 'Обработка', value: [b.process, b.process_detail].filter(Boolean).join(' · ') },
              ].filter((r) => r.value)
              return (
                <div className="flex min-h-0 flex-1 flex-col">
                  <div className="-mr-1 min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
                    <div className="flex flex-wrap items-center gap-2 text-sm text-coffee-soft">
                      <MapPin size={14} className="shrink-0" /> {b.origin || '—'}
                      {b.sca && (
                        <span className="rounded-full bg-gold/15 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-amber">
                          SCA {b.sca}
                        </span>
                      )}
                      {b.role && (
                        <span className="rounded-full bg-coffee/10 px-2.5 py-0.5 text-xs font-medium text-coffee">
                          {b.role}
                        </span>
                      )}
                    </div>

                    <NoteChips notes={b.flavor_notes} />

                    {passport.length > 0 && (
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {passport.map(({ icon: Icon, label, value }) => (
                          <div key={label} className="glass-soft flex items-start gap-2.5 rounded-2xl px-3.5 py-2.5">
                            <Icon size={15} className="mt-0.5 shrink-0 text-amber" />
                            <div className="min-w-0">
                              <div className="text-[10px] uppercase tracking-wide text-coffee-soft/70">{label}</div>
                              <div className="text-sm leading-snug text-espresso">{value}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {b.story && (
                      <p className="text-sm leading-relaxed text-coffee">{b.story}</p>
                    )}

                    <div>
                      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-coffee-soft">
                        Обжарки из этого зерна
                        {st.avg != null && <span className="ml-2 text-amber">средний скор {st.avg}</span>}
                      </div>
                      {st.count === 0 ? (
                        <p className="text-sm text-coffee-soft">Партий пока не было — самое время обжарить первую.</p>
                      ) : (
                        <div className="space-y-1.5">
                          {[...st.batches].reverse().map((batch) => (
                            <div key={batch.id} className="glass-soft flex items-center justify-between gap-3 rounded-xl px-3.5 py-2 text-sm">
                              <span className="text-espresso">{formatDate(batch.roast_date)}</span>
                              <span className="text-xs text-coffee-soft">
                                {batch.bellwether_batch_number != null ? `Bellwether #${batch.bellwether_batch_number} · ` : ''}
                                {batch.roast_level}
                              </span>
                              <span className="tabular-nums font-medium text-coffee">
                                {batch.analyzed_at ? totalScore(batch.scores) : '—'}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-5 flex shrink-0 items-center gap-2">
                    {onRoast && (
                      <button
                        type="button"
                        onClick={() => onRoast(b.id)}
                        className="btn-gold inline-flex flex-1 items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold transition hover:brightness-105"
                      >
                        <Flame size={17} /> Обжарить это зерно
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => startEdit(b)}
                      aria-label="Редактировать"
                      className="grid size-11 shrink-0 place-items-center rounded-full border border-coffee/15 bg-white/40 text-coffee transition hover:bg-white/70"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeBean(b)}
                      aria-label="Удалить"
                      className="grid size-11 shrink-0 place-items-center rounded-full border border-coffee/15 bg-white/40 text-coffee-soft transition hover:bg-red-500/10 hover:text-red-600"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              )
            })()}

            {/* ── форма: паспорт без QC (замеры зелёного вводятся при назначении жарки) ── */}
            {view.mode === 'form' && form && (
              <form onSubmit={save} className="flex min-h-0 flex-1 flex-col">
                <div className="-mr-1 min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-coffee-soft">
                        Название <span className="text-amber">*</span>
                      </label>
                      <input
                        autoFocus
                        className={field}
                        placeholder="Wush Wush"
                        value={form.name}
                        onChange={(e) => set('name', e.target.value)}
                      />
                    </div>
                    <label className="flex cursor-pointer items-center gap-2 self-end rounded-2xl border border-white/60 bg-white/55 px-4 py-2.5 text-sm text-coffee">
                      <input
                        type="checkbox"
                        checked={!!form.hero}
                        onChange={(e) => set('hero', e.target.checked)}
                        className="accent-(--color-gold)"
                      />
                      <Star size={14} className={form.hero ? 'fill-current text-gold' : 'text-coffee-soft'} />
                      Hero bean
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { key: 'origin', label: 'Происхождение', placeholder: 'Колумбия, Антиокия' },
                      { key: 'supplier', label: 'Поставщик', placeholder: 'Those Coffee People' },
                      { key: 'farm', label: 'Ферма / проект', placeholder: 'Las Nubes · Марко Эчеверри' },
                      { key: 'variety', label: 'Сорт / вариетет', placeholder: 'Caturra Chiroso' },
                      { key: 'altitude', label: 'Высота', placeholder: '1950–2100 MASL' },
                      { key: 'harvest', label: 'Урожай', placeholder: '2025/26' },
                      { key: 'sca', label: 'Балл SCA', placeholder: '87' },
                    ].map((sp) => (
                      <div key={sp.key}>
                        <label className="mb-1.5 block text-xs font-medium text-coffee-soft">
                          {sp.label}
                        </label>
                        <input
                          className={field}
                          placeholder={sp.placeholder}
                          value={form[sp.key]}
                          onChange={(e) => set(sp.key, e.target.value)}
                        />
                      </div>
                    ))}
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-coffee-soft">
                        Обработка
                      </label>
                      <select
                        className={field}
                        value={form.process}
                        onChange={(e) => set('process', e.target.value)}
                      >
                        {PROCESSING_METHODS.map((p) => (
                          <option key={p}>{p}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-coffee-soft">
                      Детали обработки
                    </label>
                    <input
                      className={field}
                      placeholder="150-часовая анаэробная ферментация"
                      value={form.process_detail}
                      onChange={(e) => set('process_detail', e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-coffee-soft">
                      Вкусовые ноты <span className="font-normal text-coffee-soft/60">(через запятую)</span>
                    </label>
                    <input
                      className={field}
                      placeholder="какао, смородина, тропические фрукты, ромашка"
                      value={form.flavor_notes}
                      onChange={(e) => set('flavor_notes', e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-coffee-soft">
                      Роль в линейке
                    </label>
                    <input
                      className={field}
                      placeholder="Daily driver · база эспрессо"
                      value={form.role}
                      onChange={(e) => set('role', e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-coffee-soft">
                      История / контекст
                    </label>
                    <textarea
                      rows={4}
                      className={`${field} resize-none`}
                      placeholder="Происхождение лота, кооператив, почему он в линейке…"
                      value={form.story}
                      onChange={(e) => set('story', e.target.value)}
                    />
                  </div>

                  <p className="text-[11px] leading-snug text-coffee-soft/70">
                    Влажность, активность воды и плотность зелёного вводятся при назначении жарки —
                    они меняются с возрастом зерна и относятся к конкретной закладке, а не к каталогу.
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
                    className="btn-gold flex-1 rounded-full py-3 text-sm font-semibold transition hover:brightness-105 disabled:opacity-40"
                  >
                    {view.id === 'new' ? 'Создать зерно' : 'Сохранить'}
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
