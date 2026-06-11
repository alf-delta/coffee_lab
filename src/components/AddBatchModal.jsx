import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Settings2, Bean, FlaskRound } from 'lucide-react'
import {
  ROAST_LEVEL_LABELS,
  PROCESSING_METHODS,
  STATUS,
  GREEN_QC_METRICS,
  OUTGASSING_ANALYSIS_DAYS,
  SERVICE_RELEASE_DAYS,
  defaultScores,
  defaultLabData,
  defaultGreenQC,
  roastLevelFromAgtron,
} from '../data/constants'

const today = () => new Date().toISOString().slice(0, 10)

const field =
  'w-full rounded-2xl border border-white/60 bg-white/55 px-4 py-2.5 text-sm text-espresso outline-none transition focus:border-gold/60 focus:bg-white/80 focus:ring-2 focus:ring-gold/25 placeholder:text-coffee-soft/50'

export default function AddBatchModal({
  open,
  profiles = [],
  beans = [],
  initialBeanId = '',
  onClose,
  onCreate,
  onManageProfiles,
  onManageBeans,
}) {
  const [form, setForm] = useState(null)

  // лениво инициализируем форму при открытии (с предвыбранным зерном из каталога)
  if (open && !form) {
    const b = beans.find((x) => x.id === initialBeanId)
    setForm({
      name: b ? b.name : '',
      origin: b ? b.origin || '' : '',
      roast_date: today(),
      roast_level: ROAST_LEVEL_LABELS[2],
      process: b?.process || PROCESSING_METHODS[0],
      outgassing_days: OUTGASSING_ANALYSIS_DAYS,
      service_days: SERVICE_RELEASE_DAYS,
      green_bean_id: b ? b.id : '',
      bellwether_profile_id: '',
      green_weight_kg: 2.7,
      roasted_weight_kg: '',
      ...defaultGreenQC(),
    })
  }

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  // Выбор зерна из каталога автозаполняет название, происхождение и обработку
  const selectBean = (id) => {
    const b = beans.find((x) => x.id === id)
    setForm((f) => ({
      ...f,
      green_bean_id: id,
      name: b && !f.name.trim() ? b.name : f.name,
      origin: b ? b.origin || f.origin : f.origin,
      process: b && b.process ? b.process : f.process,
    }))
  }

  // Выбор профиля Bellwether автозаполняет уровень обжарки по целевому Agtron
  // (профиль не привязан к сорту — название партии приходит из зерна)
  const selectProfile = (id) => {
    const p = profiles.find((x) => x.id === id)
    setForm((f) => ({
      ...f,
      bellwether_profile_id: id,
      roast_level: p ? roastLevelFromAgtron(p.target_agtron_whole) || f.roast_level : f.roast_level,
    }))
  }

  const valid = form && form.name.trim() && form.bellwether_profile_id

  const submit = (e) => {
    e.preventDefault()
    if (!valid) return
    const greenQC = Object.fromEntries(
      GREEN_QC_METRICS.map((m) => [m.key, Number(form[m.key]) || null])
    )
    onCreate({
      ...form,
      ...greenQC,
      outgassing_days: Number(form.outgassing_days) || 0,
      service_days: Number(form.service_days) || SERVICE_RELEASE_DAYS,
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
              {/* ── Зерно из каталога ── */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="flex items-center gap-1.5 text-xs font-medium text-coffee-soft">
                    <Bean size={13} className="text-amber" /> Зерно из каталога
                  </label>
                  {onManageBeans && (
                    <button
                      type="button"
                      onClick={onManageBeans}
                      className="inline-flex items-center gap-1 text-xs text-amber transition hover:underline"
                    >
                      <Settings2 size={12} /> каталог
                    </button>
                  )}
                </div>
                <select
                  className={field}
                  value={form.green_bean_id}
                  onChange={(e) => selectBean(e.target.value)}
                >
                  <option value="">— не из каталога —</option>
                  {beans.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                      {b.origin ? ` · ${b.origin}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* ── Входной QC зелёного (замеры на момент жарки) ── */}
              <div className="rounded-2xl border border-coffee/12 bg-white/30 p-4">
                <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-coffee-soft">
                  <FlaskRound size={13} className="text-amber" /> Анализ зелёного · Omix Plus
                </div>
                <p className="mb-3 text-[11px] leading-snug text-coffee-soft/70">
                  Замеры этой закладки перед жаркой — влажность и Aw зависят от возраста и хранения зерна.
                </p>
                <div className="grid grid-cols-3 items-end gap-3">
                  {GREEN_QC_METRICS.map((m) => (
                    <div key={m.key}>
                      <label className="mb-1.5 block text-xs font-medium text-coffee-soft">
                        {m.label}
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          inputMode="decimal"
                          min={m.min}
                          max={m.max}
                          step={m.step}
                          className={field}
                          placeholder="—"
                          value={form[m.key] ?? ''}
                          onChange={(e) => set(m.key, e.target.value)}
                        />
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-coffee-soft/60">
                          {m.unit}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

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
                          {p.profile_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
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

              {/* два порога дегазации: до анализа и до допуска в работу */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-coffee-soft">
                    Дегазация до анализа, дней
                  </label>
                  <input
                    type="number"
                    min="0"
                    className={field}
                    value={form.outgassing_days}
                    onChange={(e) => set('outgassing_days', e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-coffee-soft">
                    Допуск в работу, дней
                  </label>
                  <input
                    type="number"
                    min="0"
                    className={field}
                    value={form.service_days}
                    onChange={(e) => set('service_days', e.target.value)}
                  />
                </div>
              </div>
              <p className="-mt-2 text-[11px] leading-snug text-coffee-soft/70">
                Оба срока считаются от даты обжарки: через {form.outgassing_days || '—'} дн. партия
                готова к анализу, через {form.service_days || '—'} дн. — допущена в работу в кофейне.
              </p>
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
                className="btn-gold flex-1 whitespace-nowrap rounded-full py-3 text-sm font-semibold transition hover:brightness-105 disabled:opacity-40"
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
