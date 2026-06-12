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

// Плоский список ярлыков (для селектов и индексного доступа).
// 'Espresso' — стилевой уровень вне шкалы Agtron: выбирается вручную,
// в roastLevelFromAgtron не участвует. Добавлять новые уровни только в конец —
// по индексам списка живут дефолты форм и сид.
export const ROAST_LEVEL_LABELS = [...Object.values(ROAST_LEVELS).map((r) => r.label), 'Espresso']

// Подбор уровня обжарки по измеренному Agtron (Omix Plus → авто-валидация)
export function roastLevelFromAgtron(agtron) {
  const v = Number(agtron)
  if (!v) return null
  const ordered = Object.values(ROAST_LEVELS).sort((a, b) => b.min_agtron - a.min_agtron)
  for (const lvl of ordered) if (v >= lvl.min_agtron) return lvl.label
  return ROAST_LEVELS.DARK.label
}

// ── Пороги дегазации (дней от даты обжарки) ───────────────────
// Два независимых порога, оба настраиваются на партии:
// через ANALYSIS дней партия готова к лабораторному анализу,
// через SERVICE — допущена в работу в кофейне (после анализа отлёживается).
export const OUTGASSING_ANALYSIS_DAYS = 3
export const SERVICE_RELEASE_DAYS = 10

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
  { key: 'true_density', label: 'Истинная плотность', unit: 'г/л', source: 'Omix Plus', min: 0, step: 1 },
  { key: 'brew_tds', label: 'TDS напитка', unit: '%', source: 'R2 Extract', min: 0, max: 5, step: 0.01 },
  { key: 'brew_ey', label: 'Extraction Yield', unit: '%', source: 'R2 Extract', min: 0, max: 30, step: 0.1 },
]

// Группировка метрик по прибору-источнику (для UI)
export const LAB_SOURCES = [...new Set(LAB_METRICS.map((m) => m.source))]

// Пустой набор лабораторных значений (пустые строки — поля не заполнены)
export const defaultLabData = () =>
  Object.fromEntries(LAB_METRICS.map((m) => [m.key, '']))

// ── Профили ростера Bellwether ────────────────────────────────
// Профиль описывает поведение ростера и НЕ привязан к сорту кофе —
// применяется к любому зерну. Кривая (roast_log) импортируется из
// CSV-лога Bellwether в ProfilesModal (парсер — src/lib/roastLog.js).
//
// Пороги сверки «на входе в анализ» — зоны Bellwether Production
// (green/yellow/red) по двум метрикам: Agtron (цельное) и ужарка (%).
// Пресет (`zone_preset`) на профиле выбирает набор зон. Классификация —
// classifyZone в scoring.js: green→success, yellow→warning, red→danger.
export const BELLWETHER_ZONES = {
  filter: {
    label: 'Filter (light)',
    agtron: { target: 71.0, green: [68.0, 74.0], yellow: [[65.0, 67.9], [74.1, 77.0]] },
    loss: { target: 12.2, green: [11.5, 13.0], yellow: [[11.0, 11.4], [13.1, 13.5]] },
  },
  espresso: {
    label: 'Espresso (Modern/Medium)',
    agtron: { target: 58.3, green: [57.0, 62.0], yellow: [[54.0, 56.9], [62.1, 65.0]] },
    loss: { target: 13.3, green: [12.5, 14.0], yellow: [[12.0, 12.4], [14.1, 14.5]] },
  },
}
export const ZONE_PRESET_OPTIONS = Object.entries(BELLWETHER_ZONES).map(([id, z]) => ({ id, label: z.label }))

export const DEFAULT_BELLWETHER_PROFILES = [
  {
    id: 'bw_filter',
    profile_name: 'Filter Coffee',
    zone_preset: 'filter',
    target_agtron_whole: 71,
    target_agtron_ground: null,
    expected_moisture_loss: 12.2,
    roast_log: null,
  },
  {
    id: 'bw_espresso',
    profile_name: 'Espresso (Modern/Medium)',
    zone_preset: 'espresso',
    target_agtron_whole: 58.3,
    target_agtron_ground: null,
    expected_moisture_loss: 13.3,
    roast_log: null,
  },
]

// Заготовка нового профиля для формы создания
export const defaultProfile = () => ({
  profile_name: '',
  zone_preset: 'filter',
  target_agtron_whole: 71,
  target_agtron_ground: null,
  expected_moisture_loss: 12.2,
  roast_log: null,
  log_date: null,
})

// Декларативное описание дополнительных полей формы новой партии
// (привязка к физическому процессу в ростере). Справочник для UI/валидации.
export const NEW_BATCH_FORM_FIELDS = [
  { key: 'bellwether_profile_id', label: 'Профиль Bellwether', type: 'select', required: true },
  { key: 'green_weight_kg', label: 'Вес зелёного кофе (кг)', type: 'number', defaultValue: 2.7 },
  { key: 'roasted_weight_kg', label: 'Вес обжаренного кофе (кг)', type: 'number', required: false },
]

// ── Входной QC зелёного зерна ─────────────────────────────────
// Замеры Omix Plus по зелёному НА МОМЕНТ ЖАРКИ — живут на партии,
// не в каталоге: влажность/Aw меняются с возрастом и хранением зерна.
export const GREEN_QC_METRICS = [
  { key: 'green_moisture', label: 'Влажность', unit: '%', min: 0, max: 20, step: 0.1 },
  { key: 'green_water_activity', label: 'Активность воды', unit: 'Aw', min: 0, max: 1, step: 0.01 },
  { key: 'green_density', label: 'Плотность', unit: 'г/л', min: 0, step: 1 },
]

export const defaultGreenQC = () =>
  Object.fromEntries(GREEN_QC_METRICS.map((m) => [m.key, '']))

// ── Каталог зерна (паспорта линейки) ──────────────────────────
// Стартовый лайнап Monoblend на открытие; дальше редактируется в приложении.
export const DEFAULT_GREEN_BEANS = [
  {
    id: 'caicedo_washed',
    name: 'Caicedo Washed',
    supplier: 'Those Coffee People',
    origin: 'Колумбия, Кайседо (Антиокия)',
    farm: 'Кооператив Aprokafes · Элкин Диоса',
    variety: 'Castillo, Colombia, Caturra',
    process: 'Washed',
    process_detail: '',
    altitude: '1950–2100 MASL',
    harvest: '',
    sca: '84+',
    flavor_notes: 'молочный шоколад, мёд, жёлтые фрукты, ваниль',
    role: 'Daily driver · база эспрессо',
    story:
      'Также называется «Resiliencia» («Стойкость»). Кооператив Aprokafes объединяет мелких фермеров Кайседо под общим покупочным центром с контролем качества. Кайседо — отдалённый горный городок с историей кофеводства с 1872 года. Baseline VIP-дегустации: задаёт точку отсчёта линейки.',
    hero: false,
  },
  {
    id: 'black_honey',
    name: 'Black Honey',
    supplier: 'Those Coffee People',
    origin: 'Колумбия, Фредония (Антиокия)',
    farm: 'Семья Барриентос',
    variety: '',
    process: 'Honey',
    process_detail: 'Black Honey · 80–100% слизи при сушке',
    altitude: '',
    harvest: '',
    sca: '86+',
    flavor_notes: 'коричневый сахар, тёмный шоколад, персик, чёрный чай',
    role: 'Сладкий якорь меню · к выпечке',
    story:
      'Семья Барриентос связана с наследием федерации колумбийских кофеводов. Black Honey — максимальная степень оставленной слизи (80–100%): больше тела и ферментированной сладости, чем у Yellow/Red Honey, самый «natural-like» из Honey-процессов. Меню-сюрприз зала.',
    hero: false,
  },
  {
    id: 'caturra_chiroso',
    name: 'Caturra Chiroso',
    supplier: 'Those Coffee People',
    origin: 'Колумбия',
    farm: '',
    variety: 'Caturra Chiroso',
    process: 'Washed',
    process_detail: '',
    altitude: '',
    harvest: '',
    sca: '87',
    flavor_notes: 'флоральный, мандарин, лимонная трава, мёд',
    role: 'Bright morning pour-over',
    story:
      'Chiroso — колумбийская мутация Caturra с удлинёнными зёрнами, долгое время считавшаяся разновидностью Geisha. Более высокий SCA, чем у Caicedo Washed, при заметно более сложном, прозрачном профиле. Редкий сорт, набирающий популярность у specialty-роастеров. Меню-сюрприз зала.',
    hero: false,
  },
  {
    id: 'wush_wush',
    name: 'Wush Wush',
    supplier: 'Those Coffee People',
    origin: 'Колумбия (сорт эфиопского происхождения)',
    farm: 'Las Nubes · Марко Эчеверри',
    variety: 'Wush Wush (эфиопский heirloom)',
    process: 'Natural',
    process_detail: '150-часовая анаэробная ферментация',
    altitude: '~1950 MASL',
    harvest: '',
    sca: '90',
    flavor_notes: 'какао, смородина, тропические фрукты, ромашка',
    role: 'Hero bean · паринг с чёрной икрой',
    story:
      'Главный продукт Monoblend и финал VIP-сессии: соло → с чёрной икрой. 150-часовая анаэробная ферментация даёт глубокую funky-сладость с ягодно-тропическим DNA; иодные ноты икры усиливают её через умами-синергию, соль подавляет горечь, жир удлиняет послевкусие. Wush Wush — редкий низкоурожайный сорт родом из Эфиопии, конкурент Panama Geisha; Марко Эчеверри одним из первых внедрил его в Колумбии.',
    hero: true,
  },
  {
    id: 'maximinos_maceration',
    name: "Maximino's Maceration",
    supplier: 'Gold Mountain Coffee Growers',
    origin: 'Никарагуа, Хинотега',
    farm: 'Finca Santa Adela · Максимино Палациос и Марлен Эрнандес',
    variety: 'Red Catuaí',
    process: 'Carbonic Maceration',
    process_detail: '118-часовая двойная анаэробная ферментация',
    altitude: '1100–1240 MASL',
    harvest: '',
    sca: '',
    flavor_notes: 'красное яблоко, розовые флоральные ноты, мармелад, белый виноград',
    role: 'Funky «wow» tasting',
    story:
      'Многократный лауреат Golden Bean Award. Карбоническая мацерация заимствована из виноделия: зёрна ферментируются в герметичной среде с CO₂. Gold Mountain — кооператив из 70+ фермеров Никарагуа; во время сбора на фермах дежурят «ripeness staff» с рефрактометрами. Самый «дикий» профиль линейки. Меню-сюрприз зала.',
    hero: false,
  },
  {
    id: 'decaf_elixir',
    name: 'Decaf Elixir',
    supplier: 'Gold Mountain × Swiss Water',
    origin: 'Никарагуа, Хинотега',
    farm: '70+ малых фермеров Gold Mountain (вкл. Finca Idealista)',
    variety: 'Bourbon, Catuaí, Caturra, Pacamara, Maracaturra…',
    process: 'Carbonic Maceration',
    process_detail: 'CM Natural → Swiss Water Decaf (без растворителей)',
    altitude: '1300–1600 MASL',
    harvest: '',
    sca: '',
    flavor_notes: 'красное яблоко, тростниковый сахар, золотой киви, малина, слива',
    role: 'Decaf без компромиссов',
    story:
      'Swiss Water — 100% химически чистая декофеинизация: первый батч насыщает воду ароматами и вымывает кофеин, последующие теряют только кофеин — ароматический профиль сохраняется полностью. Omni roast: подходит и для фильтра, и для эспрессо. Фактор удивления для гостей, ожидающих плоский decaf. Меню-сюрприз зала.',
    hero: false,
  },
]

export const defaultBean = () => ({
  name: '',
  supplier: '',
  origin: '',
  farm: '',
  variety: '',
  process: PROCESSING_METHODS[0],
  process_detail: '',
  altitude: '',
  harvest: '',
  sca: '',
  flavor_notes: '',
  role: '',
  story: '',
  hero: false,
  low_stock_kg: 2, // порог уведомления «заканчивается», правится при приходе
})

// ── Учёт зерна: лот (партия прихода) ──────────────────────────
// Зерно хранится маленькими партиями; при приходе фиксируем массу + замеры
// зелёного (влажность/Aw/плотность). Остаток списывается жаркой и правится
// вручную (масса и влажность меняются со временем).
export const defaultLot = () => ({
  received_at: new Date().toISOString().slice(0, 10),
  received_kg: '',
  moisture: '',
  water_activity: '',
  density: '',
  note: '',
})
