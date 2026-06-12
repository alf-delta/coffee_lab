import { PARAMETERS } from '../data/constants'
import { totalScore, grade as gradeOf, validateBellwetherProfile, weightLoss } from './scoring'
import { rorSeries, formatRoastTime } from './roastLog'

// ─────────────────────────────────────────────────────────────
// knowledge.js — ЗНАНИЕВЫЙ слой Monoblend Q (одна ответственность).
// Направляет по корпусу roster_kno и применяет ДЕТЕРМИНИРОВАННЫЕ правила:
//   analyzeFallback(batch, profile) → Q_REPORT (см. qreport.js).
// Это offline-фундамент: тот же контракт, что у LLM-команд/пайплайна, но без
// сети — один вход даёт один и тот же маршрут. Здесь НЕТ выбора модели,
// вызовов API и сборки пайплайна — это забота оркестратора.
//
// Источники правил — материалы roster_kno (сенсорика/химия/физика).
// `source` у находки = маршрут-цитата в корпус (карта KB ниже).
// ─────────────────────────────────────────────────────────────

// Карта маршрутов: id источника → читаемая цитата в корпус roster_kno
const KB = {
  'physics:tp': 'Физика · БЛОК 2 — точка разворота',
  'physics:dtr': 'Физика · БЛОК 6 — DTR, Agtron→вкус, момент выгрузки',
  'physics:ror': 'Физика · БЛОК 4.5 / 9.1 — траектория RoR, запекание',
  'physics:core': 'Физика · БЛОК 11 — недоразвитие ядра (2,5-диметилфуран)',
  'chem:loss': 'Химия · БЛОК 1.1 — ужарка по степеням',
  'chem:class': 'Химия · БЛОК 10 — Nordic ↔ Italian',
  'chem:core': 'Химия · БЛОК 4 — деградация ХГК, развитие',
  'chem:degas': 'Химия · БЛОК 8 — дегазация CO₂, окна отдыха',
  'chem:storage': 'Химия · БЛОК 7 — летучие серные, свежесть',
  'sens:extraction': 'Сенсорика · БЛОК 3.2 — TDS/EY Golden Zone',
  'sens:decision': 'Сенсорика · БЛОК 5.3 — Pass/Downgrade/Adjust/Reject',
  'sens:cupping': 'Сенсорика · БЛОК 2 — оценка и сильные/слабые стороны',
}

const numOf = (lab, k) => {
  const v = Number(lab?.[k])
  return lab?.[k] !== '' && lab?.[k] != null && Number.isFinite(v) ? v : null
}

function roastClass(agtron) {
  if (agtron == null) return null
  if (agtron >= 80) return 'light'
  if (agtron >= 60) return 'medium'
  if (agtron >= 45) return 'medium-dark'
  return 'dark'
}

const LOSS_RANGE = {
  Light: [12, 14], 'Light-Medium': [12, 15], Medium: [14, 17],
  'Medium-Dark': [16, 19], Dark: [18, 22],
}
const REST_RANGE = {
  Light: [4, 10], 'Light-Medium': [3, 9], Medium: [2, 5],
  'Medium-Dark': [2, 5], Dark: [2, 4],
}

const cF = (f) => Math.round(((f - 32) * 5) / 9) // °F → °C

// Диагностика эталонной кривой профиля (roast_log из CSV-лога Bellwether).
// Пишет находки домена curve и, при флике, действие для ростера.
function pushCurve(log, F, A) {
  if (!log?.bean?.length || !log?.metrics) return
  const m = log.metrics
  const dur = Number(m.duration_s)

  if (Number.isFinite(dur) && dur > 0) {
    let tone = 'good', meaning = 'В рабочем окне барабанной жарки (7:30–13:00).'
    if (dur < 450) { tone = 'warn'; meaning = 'Короткая жарка (<7:30) — риск недоразвитой сердцевины при светлой оболочке: травянистость, резкая кислотность.' }
    else if (dur > 780) { tone = 'warn'; meaning = 'Затянутая жарка (>13:00) — риск «запекания»: вкус глохнет, теряются сортовые ноты.' }
    F({
      key: 'roast_time', domain: 'curve', tone, title: 'Время жарки',
      value: formatRoastTime(dur), unit: 'мин', source: 'physics:dtr',
      observation: `Загрузка→выгрузка ${formatRoastTime(dur)}${Number.isFinite(m.drop_f) ? `, выгрузка ${cF(m.drop_f)} °C` : ''}.`,
      meaning,
    })
    if (dur < 450) A({ key: 'time-dev', target: 'roaster', lever: 'фаза развития', direction: 'удлинить', rationale: 'короткая жарка → недоразвитие ядра', priority: 'med' })
  }

  if (Number.isFinite(m.turn_s)) {
    let tone = 'info', meaning = 'В норме для барабана.'
    if (m.turn_s < 45) meaning = 'Ранний разворот — агрессивный старт или малая загрузка; следить за равномерностью прогрева ядра.'
    else if (m.turn_s > 120) { tone = 'warn'; meaning = 'Поздний разворот — вялый подвод тепла, риск «запекания» начала.' }
    F({
      key: 'turn', domain: 'curve', tone, title: 'Точка разворота',
      value: formatRoastTime(m.turn_s), unit: 'мин', source: 'physics:tp',
      observation: `Минимум зерна${Number.isFinite(m.turn_f) ? ` ${cF(m.turn_f)} °C` : ''} на ${formatRoastTime(m.turn_s)}.`,
      meaning,
    })
  }

  const ror = rorSeries(log).filter((v) => v != null && Number.isFinite(v))
  if (ror.length >= 12) {
    const win = Math.min(8, Math.floor(ror.length / 3))
    const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length
    const mLast = mean(ror.slice(-win))
    const mPrev = mean(ror.slice(-2 * win, -win))
    const peak = Math.max(...ror)
    if (mLast > mPrev + 2) {
      F({
        key: 'ror', domain: 'curve', tone: 'warn', title: 'RoR растёт к выгрузке',
        value: Math.round(mLast), unit: '°F/мин', source: 'physics:ror',
        observation: 'Скорость нагрева идёт вверх перед выгрузкой («флик»).',
        meaning: 'Маркер недоразвитой сердцевины и неравномерности: чашка плоская, вяжущая.',
      })
      A({ key: 'ror-fix', target: 'roaster', lever: 'газ перед FC', direction: 'плавно убрать за 30–60 с до крэка', rationale: 'убрать флик → ровное развитие ядра', priority: 'high' })
    } else {
      F({
        key: 'ror', domain: 'curve', tone: 'good', title: 'RoR плавно падает',
        value: Math.round(mLast), unit: '°F/мин', source: 'physics:ror',
        observation: `Скорость нагрева снижается к выгрузке (пик ≈ ${Math.round(peak)} °F/мин).`,
        meaning: 'Эталонная траектория: ровное развитие без «флика» и кроша.',
      })
    }
  }
}

// Главная функция знаниевого слоя: партия+профиль → Q_REPORT (детерминированно)
export function analyzeFallback(batch, profile) {
  const lab = batch?.lab_data || {}
  const scores = batch?.scores || {}
  const s = (k) => Number(scores[k]) || 0
  const findings = []
  const actions = []
  const gaps = []
  const F = (o) => findings.push({ observation: '', meaning: '', ...o })
  const A = (o) => actions.push({ priority: 'med', ...o })

  const whole = numOf(lab, 'roast_color_whole')
  const ground = numOf(lab, 'roast_color_ground')
  const aw = numOf(lab, 'water_activity')
  const moisture = numOf(lab, 'moisture')
  const ey = numOf(lab, 'brew_ey')
  const tds = numOf(lab, 'brew_tds')
  const level = batch?.roast_level
  const process = batch?.process

  // 1. Сверка с профилем Bellwether (Agtron)
  const v = validateBellwetherProfile(profile, lab)
  if (v.status === 'success') {
    F({ key: 'profile', domain: 'chemistry', tone: 'good', title: 'В профиле', value: v.actual, unit: 'Agtron', source: 'physics:dtr',
      observation: `Факт ${v.actual} при цели ${v.target}.`, meaning: `Точное попадание${profile ? ` в «${profile.profile_name}»` : ''}; цвет определяет до 80% вкуса.` })
  } else if (v.status === 'warning') {
    F({ key: 'profile', domain: 'chemistry', tone: 'warn', title: 'Недожар к профилю', value: v.actual, unit: 'Agtron', source: 'physics:dtr',
      observation: `Светлее цели ${v.target} на ${v.diff.toFixed(1)} Agtron.`, meaning: 'Сохранены ХГК и сахара → выше кислотность, риск травянистости и недораскрытой сладости.' })
    A({ key: 'profile-fix', target: 'roaster', lever: 'целевой Agtron / влажность зелёного', direction: `темнее на ~${Math.abs(v.diff).toFixed(0)} Agtron`, rationale: 'систематический недобор к профилю', priority: 'high' })
  } else if (v.status === 'danger') {
    F({ key: 'profile', domain: 'chemistry', tone: 'bad', title: 'Пережар к профилю', value: v.actual, unit: 'Agtron', source: 'physics:dtr',
      observation: `Темнее цели ${v.target} на ${Math.abs(v.diff).toFixed(1)} Agtron.`, meaning: 'Пиролиз: фенилинданы/пиридин → жёсткая горечь, кислотность падает.' })
    A({ key: 'profile-fix', target: 'roaster', lever: 'целевой Agtron / фаза развития', direction: `светлее на ~${Math.abs(v.diff).toFixed(0)} Agtron или короче развитие`, rationale: 'перебор к профилю', priority: 'high' })
  }
  if (!profile) gaps.push('партия без профиля Bellwether — нет эталона Agtron')

  // 1b. Кривая профиля
  if (profile?.roast_log) pushCurve(profile.roast_log, F, A)
  else if (profile) gaps.push('у профиля нет кривой — траектория жарки не разобрана')

  // 2. Класс обжарки (Nordic↔Italian)
  const cls = roastClass(whole)
  if (cls) {
    const map = {
      light: 'Nordic-зона: сохранены ХГК и сахара, максимум фруктовых эфиров и яркой кислотности, тело лёгкое.',
      medium: 'Баланс Майяра и умеренной карамелизации — кислотность жива, появляются карамель/шоколад и тело.',
      'medium-dark': 'Карамелизация доминирует, кислотность снижается, тело растёт, первые дымные ноты.',
      dark: 'Italian-зона: глубокий пиролиз, фенилинданы и пиридин → жёсткая горечь, низкая кислотность, масло на поверхности.',
    }
    F({ key: 'class', domain: 'chemistry', tone: 'info', title: 'Степень обжарки', value: whole, unit: 'Agtron', source: 'chem:class',
      observation: `Agtron цельного ${whole}.`, meaning: map[cls] })
  }

  // 3. Развитие сердцевины (Δ цвета)
  if (whole != null && ground != null) {
    const d = Math.abs(whole - ground)
    if (d > 15) {
      F({ key: 'core', domain: 'chemistry', tone: 'bad', title: 'Недоразвитая сердцевина', value: d.toFixed(0), unit: 'ΔAgtron', source: 'physics:core',
        observation: `Разрыв цвета цельное↔молотое ${d.toFixed(0)} Agtron.`, meaning: 'Тепло не дошло до ядра (маркер 2,5-диметилфуран): травянистость, вяжущесть, страдают сладость и тело.' })
      A({ key: 'core-fix', target: 'roaster', lever: 'фаза развития / загрузка', direction: 'длиннее и мягче; проверить штатный вес загрузки', rationale: 'недогрев ядра при тёмной оболочке', priority: 'high' })
    } else {
      F({ key: 'core', domain: 'chemistry', tone: 'good', title: 'Развитие зерна', value: d.toFixed(0), unit: 'ΔAgtron', source: 'physics:core',
        observation: `Разрыв цвета ${d.toFixed(0)} Agtron.`, meaning: 'Равномерное развитие — прожарка сердцевины в норме.' })
    }
  } else if (whole != null && ground == null) {
    gaps.push('нет Agtron молотого — развитие сердцевины не оценено')
  }

  // 4. Ужарка
  const loss = weightLoss(batch?.green_weight_kg, batch?.roasted_weight_kg)
  if (loss != null) {
    const range = LOSS_RANGE[level]
    let tone = 'info', meaning = 'Потеря массы при обжарке.'
    if (range) {
      if (loss < range[0]) {
        tone = 'warn'; meaning = `Ниже нормы «${level}» (${range[0]}–${range[1]}%): недобор развития / ранняя выгрузка.`
        A({ key: 'loss-fix', target: 'roaster', lever: 'развитие / вес загрузки', direction: 'больше времени развития; сверить вес', rationale: 'низкая ужарка', priority: 'med' })
      } else if (loss > range[1]) {
        tone = 'warn'; meaning = `Выше нормы «${level}» (${range[0]}–${range[1]}%): затянутая/тёмная обжарка, риск потери сортовых нот.`
        A({ key: 'loss-fix', target: 'roaster', lever: 'цель / фаза развития', direction: 'светлее цель или короче развитие', rationale: 'высокая ужарка', priority: 'med' })
      } else {
        tone = 'good'; meaning = `В норме для «${level}» (${range[0]}–${range[1]}%).`
      }
    }
    const cmp = profile?.expected_moisture_loss != null ? ` Цель ≈ ${profile.expected_moisture_loss}%.` : ''
    F({ key: 'loss', domain: 'chemistry', tone, title: 'Ужарка', value: loss.toFixed(1), unit: '%', source: 'chem:loss',
      observation: `Потеря массы ${loss.toFixed(1)}%.${cmp}`, meaning })
  } else {
    gaps.push('нет весов зелёное/обжаренное — ужарка не посчитана')
  }

  // 5. Хранение и свежесть
  if (aw != null) {
    if (aw > 0.6) {
      F({ key: 'aw', domain: 'storage', tone: 'bad', title: 'Риск хранения', value: aw, unit: 'Aw', source: 'chem:storage',
        observation: `Активность воды ${aw} — выше порога 0.60.`, meaning: 'Микробиологический риск (плесень) и ускоренное старение.' })
      A({ key: 'aw-fix', target: 'green', lever: 'входной Aw / охлаждение / упаковка', direction: 'Aw < 0.60, быстрое охлаждение, упаковка с клапаном', rationale: 'высокая активность воды', priority: 'high' })
    } else {
      F({ key: 'aw', domain: 'storage', tone: 'info', title: 'Активность воды', value: aw, unit: 'Aw', source: 'chem:storage',
        observation: `Aw ${aw}.`, meaning: aw >= 0.5 && aw <= 0.55 ? 'Идеальный диапазон 0.50–0.55.' : aw < 0.5 ? 'Суховато: вкус стабилен, но ароматика уходит быстрее.' : 'В пределах нормы.' })
    }
  }
  if (moisture != null && moisture > 4) {
    F({ key: 'moisture', domain: 'storage', tone: 'warn', title: 'Влажность', value: moisture, unit: '%', source: 'chem:storage',
      observation: `Влажность обжаренного ${moisture}%.`, meaning: 'Повышена — влажная среда ускоряет затхлые тона (DMTS).' })
    A({ key: 'moisture-fix', target: 'storage', lever: 'охлаждение / упаковка', direction: '<4 мин до <40 °C, герметичная упаковка', rationale: 'высокая влажность', priority: 'med' })
  }

  // 6. Экстракция (Golden Zone)
  if (ey != null) {
    const tdsTxt = tds != null ? `, TDS ${tds}%` : ''
    if (ey >= 18 && ey <= 22) {
      const flat = s('flavor') <= 5 || s('sweetness') <= 5 || s('aftertaste') <= 5
      if (flat) {
        F({ key: 'extraction', domain: 'sensory', tone: 'warn', title: 'Норма EY, но чашка плоская', value: ey, unit: '% EY', source: 'sens:extraction',
          observation: `Golden Zone (18–22%)${tdsTxt}, но вкус пустой/бумажный.`, meaning: 'Корень в обжарке (запекание/недоразвитие), не в проливе.' })
        A({ key: 'extraction-fix', target: 'roaster', lever: 'фаза развития', direction: 'полнее развитие, избегать раннего плато (запекания)', rationale: 'дефект обжарки при нормальной экстракции', priority: 'high' })
      } else {
        F({ key: 'extraction', domain: 'sensory', tone: 'good', title: 'Экстракция', value: ey, unit: '% EY', source: 'sens:extraction',
          observation: `Golden Zone (18–22%)${tdsTxt}.`, meaning: 'Синергия сахаров и кислот, сиропистое тело, долгое послевкусие.' })
      }
    } else if (ey > 22) {
      F({ key: 'extraction', domain: 'sensory', tone: 'warn', title: 'Переэкстракция', value: ey, unit: '% EY', source: 'sens:extraction',
        observation: `${ey}% — выше Golden Zone (18–22%)${tdsTxt}.`, meaning: 'Горечь, зольность, астрингентность, сухость; критично от 23%.' })
      A({ key: 'extraction-fix', target: 'barista', lever: 'помол / контакт / температура', direction: 'грубее помол, короче контакт, ниже T', rationale: 'переэкстракция (не дефект обжарки)', priority: 'med' })
    } else {
      F({ key: 'extraction', domain: 'sensory', tone: 'warn', title: 'Недоэкстракция', value: ey, unit: '% EY', source: 'sens:extraction',
        observation: `${ey}% — ниже Golden Zone (18–22%)${tdsTxt}.`, meaning: 'Едкая кислотность, водянистость, пустое тело, короткое послевкусие.' })
      A({ key: 'extraction-fix', target: 'barista', lever: 'помол / контакт / температура', direction: 'тоньше помол, дольше контакт, выше T; проверить равномерность пролива', rationale: 'недоэкстракция', priority: 'med' })
    }
  } else {
    gaps.push('нет EY/TDS — экстракция не оценена')
  }

  // 7. Дегазация
  const rest = REST_RANGE[level]
  if (rest && batch?.outgassing_days != null) {
    const od = Number(batch.outgassing_days)
    const tooShort = od < rest[0]
    const natural = /natural/i.test(process || '')
    F({ key: 'rest', domain: 'storage', tone: tooShort ? 'warn' : 'info', title: 'Дегазация', value: od, unit: 'дн', source: 'chem:degas',
      observation: `Отдых ${od} дн; окно для «${level}» (фильтр) ${rest[0]}–${rest[1]} дн, пик вкуса ≈ 11 дн.`,
      meaning: tooShort ? 'Короткий отдых → остаточный CO₂ мешает экстракции.' : 'В окне отдыха.' })
    if (tooShort) A({ key: 'rest-fix', target: 'storage', lever: 'отдых перед работой', direction: `дать дойти до ${rest[0]}+ дн${natural ? ' (натуральная — ближе к верху окна)' : ''}`, rationale: 'остаточный CO₂', priority: 'med' })
  }

  // 8. Сильные стороны / зоны роста (органолептика)
  const ranked = PARAMETERS.map((p) => ({ label: p.label, v: s(p.key) })).sort((a, b) => b.v - a.v)
  const tops = ranked.filter((x) => x.v >= 8).slice(0, 3).map((x) => x.label)
  const lows = ranked.filter((x) => x.v > 0 && x.v <= 4).map((x) => x.label)
  if (tops.length)
    F({ key: 'tops', domain: 'sensory', tone: 'good', title: 'Сильные стороны', source: 'sens:cupping', observation: tops.join(', ') + '.', meaning: 'Опорные атрибуты профиля чашки.' })
  if (lows.length) {
    F({ key: 'lows', domain: 'sensory', tone: 'warn', title: 'Зоны роста', source: 'sens:cupping', observation: lows.join(', ') + '.', meaning: 'Атрибуты ниже нормы — кандидаты на коррекцию профиля.' })
    A({ key: 'lows-fix', target: 'roaster', lever: 'фаза развития', direction: 'низкая сладость/тело → больше развития; резкая кислотность/травянистость → удлинить развитие', rationale: 'слабые органолептические атрибуты', priority: 'med' })
  }

  // 9. Вердикт
  const total = totalScore(scores)
  const g = gradeOf(total)
  const decision = deriveDecisionLocal(total, findings)
  if (total > 0 && total < 80)
    A({ key: 'qc-fix', target: 'roaster', lever: 'профиль (цель/развитие) + свежесть зелёного', direction: 'пересобрать профиль и перепроверить влажность зелёного', rationale: 'итоговый балл ниже specialty', priority: 'high' })

  return {
    verdict: { decision, score: total, grade: g.label, headline: buildHeadline(decision, total, findings) },
    findings,
    actions,
    data_gaps: gaps,
  }
}

// Решение QC по баллу + тяжести находок (дерево БЛОК 5.3)
function deriveDecisionLocal(total, findings) {
  const hasBad = findings.some((f) => f.tone === 'bad')
  if (total > 0 && total < 70) return 'reject'
  if (hasBad) return total >= 80 ? 'adjust' : 'reject'
  if (total > 0 && total < 80) return 'adjust'
  if (total > 0 && total < 83) return 'downgrade'
  return 'pass'
}

function buildHeadline(decision, total, findings) {
  const worst = findings.find((f) => f.tone === 'bad') || findings.find((f) => f.tone === 'warn')
  const base = {
    pass: 'Партия в профиле — одобрено',
    downgrade: 'Чистая, но не яркая — в бленд',
    adjust: 'Поправить профиль обжарки',
    reject: total > 0 && total < 70 ? 'Ниже specialty — изолировать батч' : 'Дефект — изолировать батч',
  }[decision]
  return worst && decision !== 'pass' ? `${base}: ${worst.title.toLowerCase()}` : base
}

// Цитата-маршрут в корпус по id источника (для подписи находки)
export function kbCitation(source) {
  return KB[source] || null
}
