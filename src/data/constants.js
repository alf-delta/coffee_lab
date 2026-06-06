// ── 10 органолептических параметров (шкала 1–10) ──────────────
export const PARAMETERS = [
  { key: 'aroma', label: 'Аромат', short: 'Аром.' },
  { key: 'flavor', label: 'Вкус', short: 'Вкус' },
  { key: 'aftertaste', label: 'Послевкусие', short: 'Послевк.' },
  { key: 'acidity', label: 'Кислотность', short: 'Кисл.' },
  { key: 'body', label: 'Тело', short: 'Тело' },
  { key: 'balance', label: 'Баланс', short: 'Баланс' },
  { key: 'sweetness', label: 'Сладость', short: 'Слад.' },
  { key: 'cleanliness', label: 'Чистота чашки', short: 'Чистота' },
  { key: 'uniformity', label: 'Однородность', short: 'Одн.' },
  { key: 'overall', label: 'Общее впечатление', short: 'Общее' },
]

export const PARAM_KEYS = PARAMETERS.map((p) => p.key)

export const defaultScores = () =>
  Object.fromEntries(PARAM_KEYS.map((k) => [k, 5]))

// ── Статусы партии ────────────────────────────────────────────
export const STATUS = {
  OUTGASSING: 'outgassing',
  READY: 'ready',
  ANALYSIS: 'analysis',
  DONE: 'done',
}

export const STATUS_ORDER = [
  STATUS.OUTGASSING,
  STATUS.READY,
  STATUS.ANALYSIS,
  STATUS.DONE,
]

export const STATUS_META = {
  [STATUS.OUTGASSING]: {
    label: 'Outgassing',
    ru: 'Дегазация',
    color: 'var(--color-status-outgassing)',
    dot: '#b07d2b',
  },
  [STATUS.READY]: {
    label: 'Готово к анализу',
    ru: 'Готово',
    color: 'var(--color-status-ready)',
    dot: '#4f8a5b',
  },
  [STATUS.ANALYSIS]: {
    label: 'Анализ',
    ru: 'Анализ',
    color: 'var(--color-status-analysis)',
    dot: '#c89b3c',
  },
  [STATUS.DONE]: {
    label: 'Завершено',
    ru: 'Завершено',
    color: 'var(--color-status-done)',
    dot: '#6f4e37',
  },
}

// ── Уровни обжарки (со шкалой Agtron) ─────────────────────────
export const ROAST_LEVELS = {
  LIGHT: { label: 'Light', min_agtron: 85 },
  LIGHT_MEDIUM: { label: 'Light-Medium', min_agtron: 75 },
  MEDIUM: { label: 'Medium', min_agtron: 65 },
  MEDIUM_DARK: { label: 'Medium-Dark', min_agtron: 55 },
  DARK: { label: 'Dark', min_agtron: 45 },
}

// Плоский список ярлыков (для селектов и индексного доступа)
export const ROAST_LEVEL_LABELS = Object.values(ROAST_LEVELS).map((r) => r.label)

// Подбор уровня обжарки по измеренному Agtron (Omix Plus → авто-валидация)
export function roastLevelFromAgtron(agtron) {
  const v = Number(agtron)
  if (!v) return null
  const ordered = Object.values(ROAST_LEVELS).sort((a, b) => b.min_agtron - a.min_agtron)
  for (const lvl of ordered) if (v >= lvl.min_agtron) return lvl.label
  return ROAST_LEVELS.DARK.label
}

// ── Способы обработки ─────────────────────────────────────────
export const PROCESSING_METHODS = [
  'Washed',
  'Natural',
  'Honey',
  'Anaerobic',
  'Carbonic Maceration',
  'Wet-Hulled',
]

// ── Аппаратные (физические) метрики ───────────────────────────
// Omix Plus — экспресс-анализ сухого зерна; R2 Extract — анализ напитка.
export const LAB_METRICS = [
  { key: 'roast_color_whole', label: 'Agtron (Цельное)', unit: 'Agtron', source: 'Omix Plus', min: 0, max: 130, step: 1 },
  { key: 'roast_color_ground', label: 'Agtron (Молотое)', unit: 'Agtron', source: 'Omix Plus', min: 0, max: 130, step: 1 },
  { key: 'moisture', label: 'Влажность зерна', unit: '%', source: 'Omix Plus', min: 0, max: 15, step: 0.1 },
  { key: 'water_activity', label: 'Активность воды', unit: 'Aw', source: 'Omix Plus', min: 0, max: 1, step: 0.01 },
  { key: 'true_density', label: 'Истинная плотность', unit: 'г/л', source: 'Omix Plus', min: 0, max: 900, step: 1 },
  { key: 'brew_tds', label: 'TDS напитка', unit: '%', source: 'R2 Extract', min: 0, max: 5, step: 0.01 },
  { key: 'brew_ey', label: 'Extraction Yield', unit: '%', source: 'R2 Extract', min: 0, max: 30, step: 0.1 },
]

// Группировка метрик по прибору-источнику (для UI)
export const LAB_SOURCES = [...new Set(LAB_METRICS.map((m) => m.source))]

// Пустой набор лабораторных значений (пустые строки — поля не заполнены)
export const defaultLabData = () =>
  Object.fromEntries(LAB_METRICS.map((m) => [m.key, '']))

// ── Профили ростера Bellwether ────────────────────────────────
// Стартовый каталог целевых профилей обжарки (сид для хранилища).
// Дальше профили редактируются в приложении и хранятся в Supabase/localStorage.
export const DEFAULT_BELLWETHER_PROFILES = [
  {
    id: 'ethiopia_light_conv',
    coffee_name: 'Ethiopia Yirgacheffe Kochere',
    profile_name: 'Light — Expressive Citrus (v2)',
    target_agtron_whole: 85,
    target_agtron_ground: 98,
    expected_moisture_loss: 12.5,
  },
  {
    id: 'colombia_med_sweet',
    coffee_name: 'Colombia Huila Supremo',
    profile_name: 'Medium — Rich & Caramel',
    target_agtron_whole: 68,
    target_agtron_ground: 78,
    expected_moisture_loss: 13.2,
  },
  {
    id: 'kenya_aa_floral',
    coffee_name: 'Kenya Nyeri AA',
    profile_name: 'Light-Medium — Blackcurrant',
    target_agtron_whole: 78,
    target_agtron_ground: 90,
    expected_moisture_loss: 13.8,
  },
  {
    id: 'brazil_dark_nutty',
    coffee_name: 'Brazil Cerrado',
    profile_name: 'Medium-Dark — Nutty Chocolate',
    target_agtron_whole: 55,
    target_agtron_ground: 64,
    expected_moisture_loss: 14.5,
  },
]

// Заготовка нового профиля для формы создания
export const defaultProfile = () => ({
  coffee_name: '',
  profile_name: '',
  target_agtron_whole: 70,
  target_agtron_ground: 80,
  expected_moisture_loss: 13,
})

// Декларативное описание дополнительных полей формы новой партии
// (привязка к физическому процессу в ростере). Справочник для UI/валидации.
export const NEW_BATCH_FORM_FIELDS = [
  { key: 'bellwether_profile_id', label: 'Профиль Bellwether', type: 'select', required: true },
  { key: 'bellwether_batch_number', label: 'Номер батча из ростера', type: 'number', required: true },
  { key: 'green_weight_kg', label: 'Вес зелёного кофе (кг)', type: 'number', defaultValue: 2.7 },
  { key: 'roasted_weight_kg', label: 'Вес обжаренного кофе (кг)', type: 'number', required: false },
]
