import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, Pencil, Trash2, Target, ArrowLeft } from 'lucide-react'
import { defaultProfile } from '../data/constants'

const field =
  'w-full rounded-2xl border border-white/60 bg-white/55 px-4 py-2.5 text-sm text-espresso outline-none transition focus:border-gold/60 focus:bg-white/80 focus:ring-2 focus:ring-gold/25 placeholder:text-coffee-soft/50'

export default function ProfilesModal({ open, profiles, onClose, onCreate, onUpdate, onDelete }) {
  // null = список, 'new' = создание, {...} = редактирование
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(null)

  const startNew = () => {
    setForm(defaultProfile())
    setEditing('new')
  }
  const startEdit = (p) => {
    setForm({ ...p })
    setEditing(p.id)
  }
  const backToList = () => {
    setEditing(null)
    setForm(null)
  }
  const close = () => {
    backToList()
    onClose()
  }

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const valid = form && form.coffee_name?.trim()

  const save = (e) => {
    e.preventDefault()
    if (!valid) return
    const payload = {
      coffee_name: form.coffee_name.trim(),
      profile_name: form.profile_name?.trim() || '',
      target_agtron_whole: Number(form.target_agtron_whole) || null,
      target_agtron_ground: Number(form.target_agtron_ground) || null,
      expected_moisture_loss: Number(form.expected_moisture_loss) || null,
    }
    if (editing === 'new') onCreate(payload)
    else onUpdate(editing, payload)
    backToList()
  }

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
            className="glass relative z-10 flex h-[88dvh] max-h-[760px] w-full max-w-3xl overflow-hidden rounded-[1.75rem]"
          >
            {/* левая колонка — брендовая картинка во всю высоту */}
            <div className="hidden w-[38%] max-w-[300px] shrink-0 sm:block">
              <img
                src="/bellwether_roster.png"
                alt="Ростер Bellwether"
                className="h-full w-full object-cover"
              />
            </div>

            {/* правая колонка */}
            <div className="flex min-w-0 flex-1 flex-col p-6 sm:p-7">
              {/* шапка */}
              <div className="mb-5 flex shrink-0 items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {editing && (
                    <button
                      type="button"
                      onClick={backToList}
                      aria-label="Назад"
                      className="grid size-8 place-items-center rounded-full text-coffee-soft transition hover:bg-coffee/10"
                    >
                      <ArrowLeft size={18} />
                    </button>
                  )}
                  <h2 className="font-display text-2xl leading-tight text-espresso">
                    {editing === 'new'
                      ? 'Новый профиль'
                      : editing
                        ? 'Профиль Bellwether'
                        : 'Каталог профилей'}
                  </h2>
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

              {/* ── Режим списка ── */}
              {!editing && (
                <>
                  <div className="-mr-1 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
                    {profiles.length === 0 && (
                      <p className="py-6 text-center text-sm text-coffee-soft">
                        Профилей пока нет. Создайте первый.
                      </p>
                    )}
                    {profiles.map((p) => (
                      <div
                        key={p.id}
                        className="glass-soft flex items-start justify-between gap-3 rounded-2xl p-4"
                      >
                        <div className="min-w-0">
                          <div className="truncate font-medium text-espresso">{p.coffee_name}</div>
                          <div className="mt-0.5 flex items-center gap-1 text-xs text-coffee-soft">
                            <Target size={12} /> {p.profile_name || '—'}
                          </div>
                          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-coffee-soft tabular-nums">
                            <span>цельное {p.target_agtron_whole ?? '—'}</span>
                            <span>молотое {p.target_agtron_ground ?? '—'}</span>
                            <span>потеря {p.expected_moisture_loss ?? '—'}%</span>
                          </div>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <button
                            type="button"
                            onClick={() => startEdit(p)}
                            aria-label="Редактировать"
                            className="grid size-8 place-items-center rounded-full text-coffee-soft transition hover:bg-coffee/10 hover:text-coffee"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Удалить профиль «${p.coffee_name}»?`)) onDelete(p.id)
                            }}
                            aria-label="Удалить"
                            className="grid size-8 place-items-center rounded-full text-coffee-soft transition hover:bg-red-500/10 hover:text-red-600"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
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

              {/* ── Режим формы (создание/редактирование) ── */}
              {editing && form && (
                <form onSubmit={save} className="flex min-h-0 flex-1 flex-col">
                  <div className="-mr-1 min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-coffee-soft">
                        Название кофе <span className="text-amber">*</span>
                      </label>
                      <input
                        autoFocus
                        className={field}
                        placeholder="Ethiopia Yirgacheffe Kochere"
                        value={form.coffee_name}
                        onChange={(e) => set('coffee_name', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-coffee-soft">
                        Название профиля
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
                  </div>

                  <div className="mt-5 flex shrink-0 gap-3">
                    <button
                      type="button"
                      onClick={backToList}
                      className="flex-1 rounded-full border border-coffee/15 bg-white/40 py-3 text-sm font-medium text-coffee transition hover:bg-white/70"
                    >
                      Отмена
                    </button>
                    <button
                      type="submit"
                      disabled={!valid}
                      className="btn-gold flex-1 rounded-full py-3 text-sm font-semibold transition hover:brightness-105 disabled:opacity-40"
                    >
                      {editing === 'new' ? 'Создать профиль' : 'Сохранить'}
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
