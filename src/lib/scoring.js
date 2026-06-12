import { PARAM_KEYS, BELLWETHER_ZONES } from '../data/constants'

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)

// Классификация значения по зонам Bellwether (green/yellow/red).
// z = { green: [min,max], yellow: [[lmin,lmax],[hmin,hmax]] }.
export function classifyZone(value, z) {
  if (value == null || !z) return null
  const v = Number(value)
  if (!Number.isFinite(v)) return null
  const [gmin, gmax] = z.green
  if (v >= gmin && v <= gmax) return { zone: 'green', status: 'success', side: 'in' }
  const [yl, yh] = z.yellow
  if (v >= yl[0] && v <= yl[1]) return { zone: 'yellow', status: 'warning', side: 'low' }
  if (v >= yh[0] && v <= yh[1]) return { zone: 'yellow', status: 'warning', side: 'high' }
  return v < gmin ? { zone: 'red', status: 'danger', side: 'low' } : { zone: 'red', status: 'danger', side: 'high' }
}

// Сумма 10 параметров (1–10) → итоговый балл 0–100
export function totalScore(scores) {
  return PARAM_KEYS.reduce((sum, k) => sum + (Number(scores?.[k]) || 0), 0)
}

// Грейд по итоговому баллу
export function grade(total) {
  if (total >= 90) return { key: 'outstanding', label: 'Outstanding', tint: '#9a6b00' }
  if (total >= 85) return { key: 'excellent', label: 'Excellent', tint: '#b07d2b' }
  if (total >= 80) return { key: 'specialty', label: 'Specialty Grade', tint: '#c89b3c' }
  if (total >= 70) return { key: 'good', label: 'Good', tint: '#8a6a4f' }
  if (total >= 60) return { key: 'fair', label: 'Fair', tint: '#a9856a' }
  return { key: 'below', label: 'Below Specialty', tint: '#9b8266' }
}

// Текстовое описание профиля на основе оценок
export function profileDescription(scores) {
  const s = (k) => Number(scores?.[k]) || 0
  const parts = []

  // Кислотность
  if (s('acidity') >= 8) parts.push('яркая, искристая кислотность')
  else if (s('acidity') >= 6) parts.push('сбалансированная кислотность')
  else if (s('acidity') <= 3) parts.push('низкая, мягкая кислотность')

  // Тело
  if (s('body') >= 8) parts.push('плотное обволакивающее тело')
  else if (s('body') >= 6) parts.push('среднее тело')
  else if (s('body') <= 3) parts.push('лёгкое, чайное тело')

  // Сладость
  if (s('sweetness') >= 8) parts.push('выраженная сладость')
  else if (s('sweetness') <= 3) parts.push('сдержанная сладость')

  // Послевкусие
  if (s('aftertaste') >= 8) parts.push('долгое чистое послевкусие')
  else if (s('aftertaste') <= 3) parts.push('короткое послевкусие')

  // Баланс / общее
  if (s('balance') >= 8 && s('overall') >= 8)
    parts.push('гармоничный, отлично собранный профиль')
  else if (s('balance') <= 4)
    parts.push('профиль с заметным дисбалансом')

  if (parts.length === 0) return 'Ровный, сдержанный профиль без выраженных доминант.'
  const text = parts.join('; ')
  return text.charAt(0).toUpperCase() + text.slice(1) + '.'
}

// Автоматический контроль качества по физическим метрикам (Omix Plus).
// Возвращает массив предупреждений о дефектах обжарки/хранения.
export function analyzeLabData(labData) {
  const alerts = []
  const colorDiff = Math.abs(
    (Number(labData?.roast_color_whole) || 0) - (Number(labData?.roast_color_ground) || 0)
  )
  // оба значения должны быть заданы, иначе разница ложно сработает
  if (labData?.roast_color_whole && labData?.roast_color_ground && colorDiff > 15)
    alerts.push('Внимание: высокий риск недожаренной сердцевины (under-roasted core) или чрезмерно агрессивного температурного профиля.')
  if (Number(labData?.water_activity) > 0.62)
    alerts.push('Критический уровень активности воды! Батч подвержен ускоренному старению и потере вкусоароматики.')
  if (Number(labData?.moisture) > 4.0)
    alerts.push('Повышенная влажность обжаренного зерна: проверьте герметичность упаковки или параметры охлаждения.')
  return alerts
}

// Технологические теги экстракции на основе данных рефрактометра R2 Extract.
export function extractionTags(labData) {
  const ey = Number(labData?.brew_ey) || 0
  const tags = []
  if (ey >= 18 && ey <= 22) tags.push('оптимальная экстракция')
  else if (ey > 22) tags.push('переэкстракция / горечь')
  else if (ey < 18 && ey > 0) tags.push('недоэкстракция / травянистость')
  return tags
}

// Сверка фактической обжарки (Omix Plus) с целевым профилем Bellwether.
// profile — resolved-объект профиля (или null), labData — измерения партии.
export function validateBellwetherProfile(profile, labData) {
  if (!profile) return { status: 'unknown', message: 'Профиль Bellwether не выбран', profile: null }

  const raw = labData?.roast_color_whole
  if (raw === '' || raw == null || Number.isNaN(Number(raw))) {
    return {
      status: 'pending',
      message: 'Ожидается замер Agtron (цельное зерно) на Omix Plus',
      profile,
      target: profile.target_agtron_whole,
      actual: null,
      diff: null,
    }
  }

  const actual = Number(raw)
  const target = profile.target_agtron_whole
  const diff = target != null ? actual - target : null
  const base = { profile, target, actual, diff }

  // Зоны Bellwether по пресету профиля (точные пороги «на входе в анализ»)
  const zones = BELLWETHER_ZONES[profile.zone_preset]
  if (zones?.agtron) {
    const c = classifyZone(actual, zones.agtron)
    if (!c) return { ...base, status: 'unknown', message: 'Не удалось классифицировать Agtron' }
    if (c.status === 'success')
      return { ...base, status: 'success', zone: c.zone, message: 'Agtron в зелёной зоне профиля' }
    // высокое Agtron = светлее (недожар), низкое = темнее (пережар)
    const lighter = c.side === 'high'
    const word = c.status === 'warning' ? 'жёлтая зона' : 'красная зона'
    return {
      ...base, status: c.status, zone: c.zone,
      message: `${cap(word)}: ${lighter ? 'светлее' : 'темнее'} цели (${actual} vs ${target} Agtron)`,
    }
  }

  // fallback ±3 (профиль без пресета зон)
  if (diff == null) return { ...base, status: 'unknown', message: 'У профиля не задана цель Agtron' }
  if (Math.abs(diff) <= 3)
    return { ...base, status: 'success', message: 'Идеальное попадание в профиль Bellwether' }
  if (diff > 3)
    return { ...base, status: 'warning', message: `Недожар: кофе светлее целевого профиля на ${diff.toFixed(1)} Agtron` }
  return { ...base, status: 'danger', message: `Пережар: кофе темнее целевого профиля на ${Math.abs(diff).toFixed(1)} Agtron` }
}

// Сверка ужарки (%) с зонами профиля Bellwether (для VerdictBar/анализа).
export function validateWeightLoss(profile, lossPct) {
  if (lossPct == null) return { status: 'pending', message: 'Нет данных по ужарке', target: null, actual: null }
  const zones = BELLWETHER_ZONES[profile?.zone_preset]
  const target = zones?.loss?.target ?? (profile?.expected_moisture_loss ?? null)
  const base = { target, actual: lossPct }
  if (zones?.loss) {
    const c = classifyZone(lossPct, zones.loss)
    if (c.status === 'success') return { ...base, status: 'success', zone: c.zone, message: 'Ужарка в зелёной зоне профиля' }
    const high = c.side === 'high'
    const word = c.status === 'warning' ? 'жёлтая зона' : 'красная зона'
    return { ...base, status: c.status, zone: c.zone, message: `${cap(word)} ужарки: ${high ? 'выше' : 'ниже'} цели (${lossPct.toFixed(1)}% vs ${target}%)` }
  }
  return { ...base, status: 'unknown', message: 'У профиля нет зон ужарки' }
}

// Фактическая потеря массы при обжарке, % (зелёный → обжаренный)
export function weightLoss(greenKg, roastedKg) {
  const g = Number(greenKg)
  const r = Number(roastedKg)
  if (!g || !r || r > g) return null
  return ((g - r) / g) * 100
}

// Вкусовые дескрипторы выбираются вручную в колесе вкусов (batch.flavors);
// в tags остались только технологические теги экстракции с рефрактометра.
export function scoreSummary(scores, labData) {
  const total = totalScore(scores)
  return {
    total,
    grade: grade(total),
    description: profileDescription(scores),
    tags: extractionTags(labData),
    alerts: analyzeLabData(labData),
  }
}
