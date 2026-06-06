import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { Settings2 } from 'lucide-react'
import {
  ROAST_LEVEL_LABELS,
  PROCESSING_METHODS,
  STATUS,
  defaultScores,
  defaultLabData,
  roastLevelFromAgtron,
} from '../data/constants'

const today = () => new Date().toISOString().slice(0, 10)

const field =
  'w-full rounded-2xl border border-white/60 bg-white/55 px-4 py-2.5 text-sm text-espresso outline-none transition focus:border-gold/60 focus:bg-white/80 focus:ring-2 focus:ring-gold/25 placeholder:text-coffee-soft/50'

export default function AddBatchModal({ open, profiles = [], onClose, onCreate, onManageProfiles }) {
  const [form, setForm] = useState(null)

  // лениво инициализируем форму при открытии
  if (open && !form) {
    setForm({
      name: '',
      origin: '',
      roast_date: today(),
      weight_g: 1000,
      roast_level: ROAST_LEVEL_LABELS[2],
      process: PROCESSING_METHODS[0],
      outgassing_days: 7,
      bellwether_profile_id: '',
      bellwether_batch_number: '',
      green_weight_kg: 2.7,
      roasted_weight_kg: '',
    })
  }

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  // Выбор профиля Bellwether автозаполняет название и уровень обжарки
  const selectProfile = (id) => {
    const p = profiles.find((x) => x.id === id)
    setForm((f) => ({
      ...f,
      bellwether_profile_id: id,
      name: p && (!f.name || f.name === '') ? p.coffee_name : f.name,
      roast_level: p ? roastLevelFromAgtron(p.target_agtron_whole) || f.roast_level : f.roast_level,
    }))
  }

  const valid =
    form && form.name.trim() && form.bellwether_profile_id && String(form.bellwether_batch_number).trim()

  const submit = (e) => {
    e.preventDefault()
    if (!valid) return
    onCreate({
      ...form,
      weight_g: Number(form.weight_g) || 0,
      outgassing_days: Number(form.outgassing_days) || 0,
      bellwether_batch_number: Number(form.bellwether_batch_number) || null,
      green_weight_kg: Number(form.green_weight_kg) || null,
      roasted_weight_kg: Number(form.roasted_weight_kg) || null,
      status: STATUS.OUTGASSING,
      scores: defaultScores(),
      lab_data: defaultLabData(),
      notes: '',
      transcript: '',
    })
    setForm(null)
  }

  const close = () => {
    setForm(null)
    onClose()
  }

  return (
    <AnimatePresence>
      {open && form && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div
            className="absolute inset-0 bg-espresso/35 backdrop-blur-sm"
            onClick={close}
          />
          <motion.form
            onSubmit={submit}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            className="glass relative z-10 max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-[1.75rem] p-6 sm:p-7"
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-display text-2xl text-espresso">Новая партия</h2>
              <button
                type="button"
                onClick={close}
                aria-label="Закрыть"
                className="grid size-9 place-items-center rounded-full text-coffee-soft transition hover:bg-coffee/10"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              {/* ── Ростер Bellwether ── */}
              <div className="rounded-2xl border border-gold/25 bg-gold/5 p-4">
                <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-amber">
                  Ростер Bellwether
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <label className="block text-xs font-medium text-coffee-soft">
                        Профиль Bellwether <span className="text-amber">*</span>
                      </label>
                      {onManageProfiles && (
                        <button
                          type="button"
                          onClick={onManageProfiles}
                          className="inline-flex items-center gap-1 text-xs text-amber transition hover:underline"
                        >
                          <Settings2 size={12} /> управлять
                        </button>
                      )}
                    </div>
                    <select
                      className={field}
                      value={form.bellwether_profile_id}
                      onChange={(e) => selectProfile(e.target.value)}
                    >
                      <option value="">— выберите профиль —</option>
                      {profiles.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.coffee_name}
                          {p.profile_name ? ` · ${p.profile_name}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-coffee-soft">
                        № батча <span className="text-amber">*</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        className={field}
                        placeholder="1024"
                        value={form.bellwether_batch_number}
                        onChange={(e) => set('bellwether_batch_number', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-coffee-soft">
                        Зелёный, кг
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        className={field}
                        value={form.green_weight_kg}
                        onChange={(e) => set('green_weight_kg', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-coffee-soft">
                        Обжарен., кг
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        className={field}
                        placeholder="—"
                        value={form.roasted_weight_kg}
                        onChange={(e) => set('roasted_weight_kg', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-coffee-soft">
                  Название кофе <span className="text-amber">*</span>
                </label>
                <input
                  className={field}
                  placeholder="Ethiopia Guji Natural"
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-coffee-soft">
                  Происхождение
                </label>
                <input
                  className={field}
                  placeholder="Эфиопия, Гуджи"
                  value={form.origin}
                  onChange={(e) => set('origin', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-coffee-soft">
                    Дата обжарки
                  </label>
                  <input
                    type="date"
                    className={field}
                    value={form.roast_date}
                    onChange={(e) => set('roast_date', e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-coffee-soft">
                    Вес, г
                  </label>
                  <input
                    type="number"
                    min="0"
                    className={field}
                    value={form.weight_g}
                    onChange={(e) => set('weight_g', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-coffee-soft">
                    Уровень обжарки
                  </label>
                  <select
                    className={field}
                    value={form.roast_level}
                    onChange={(e) => set('roast_level', e.target.value)}
                  >
                    {ROAST_LEVEL_LABELS.map((r) => (
                      <option key={r}>{r}</option>
                    ))}
                  </select>
                </div>
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
                  Срок дегазации, дней
                </label>
                <input
                  type="number"
                  min="0"
                  className={field}
                  value={form.outgassing_days}
                  onChange={(e) => set('outgassing_days', e.target.value)}
                />
              </div>
            </div>

            <div className="mt-7 flex gap-3">
              <button
                type="button"
                onClick={close}
                className="flex-1 rounded-full border border-coffee/15 bg-white/40 py-3 text-sm font-medium text-coffee transition hover:bg-white/70"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={!valid}
                className="btn-gold flex-1 rounded-full py-3 text-sm font-semibold transition hover:brightness-105 disabled:opacity-40"
              >
                Добавить партию
              </button>
            </div>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
