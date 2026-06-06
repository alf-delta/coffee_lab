import { PARAMETERS } from '../data/constants'
import { totalScore, grade as gradeOf, validateBellwetherProfile, weightLoss } from './scoring'

// ─────────────────────────────────────────────────────────────
// База знаний обжарки. Источник — материалы roster_kno:
//   01_sensory · каппинг SCA, Golden Zone TDS/EY, дефекты
//   02_chemistry · Майяр/карамелизация, ужарка, дегазация, Nordic/Italian
//   03_physics · Agtron→вкус (до 80%), DTR, недоразвитие сердцевины
// roastCommentary(batch, profile) → массив инсайтов:
//   { key, tone, title, text, advice?, value?, unit? }
// value/unit — крупная цифра для инфографики (если метрика числовая).
// Bellwether — автоматический ростер «по рецепту»: советы про калибровку
// профиля (target Agtron / развитие), загрузку и свежесть зелёного.
// ─────────────────────────────────────────────────────────────

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

export function roastCommentary(batch, profile) {
  const lab = batch?.lab_data || {}
  const scores = batch?.scores || {}
  const s = (k) => Number(scores[k]) || 0
  const out = []

  const whole = numOf(lab, 'roast_color_whole')
  const ground = numOf(lab, 'roast_color_ground')
  const aw = numOf(lab, 'water_activity')
  const moisture = numOf(lab, 'moisture')
  const ey = numOf(lab, 'brew_ey')
  const tds = numOf(lab, 'brew_tds')
  const level = batch?.roast_level
  const process = batch?.process

  // 1. Сверка с профилем Bellwether
  const verdict = validateBellwetherProfile(profile, lab)
  if (verdict.status === 'success') {
    out.push({
      key: 'profile', tone: 'good', title: 'В профиле', value: verdict.actual, unit: 'Agtron',
      text: `Точное попадание${profile ? ` в «${profile.profile_name}»` : ''}: цель ${verdict.target}. Цвет определяет до 80% вкуса.`,
    })
  } else if (verdict.status === 'warning') {
    out.push({
      key: 'profile', tone: 'warn', title: 'Недожар к профилю', value: verdict.actual, unit: 'Agtron',
      text: `Светлее цели ${verdict.target} на ${verdict.diff.toFixed(1)} Agtron. Сохранены ХГК и сахара → выше кислотность, риск травянистости и недораскрытой сладости.`,
      advice: `Bellwether: перезапустите батч; при систематическом недоборе сделайте целевой Agtron на ~${Math.abs(verdict.diff).toFixed(0)} темнее и проверьте влажность зелёного (высокая влага тормозит прогрев ядра).`,
    })
  } else if (verdict.status === 'danger') {
    out.push({
      key: 'profile', tone: 'bad', title: 'Пережар к профилю', value: verdict.actual, unit: 'Agtron',
      text: `Темнее цели ${verdict.target} на ${Math.abs(verdict.diff).toFixed(1)} Agtron. Пиролиз: фенилинданы/пиридин → жёсткая горечь, кислотность падает.`,
      advice: `Bellwether: поднимите целевой Agtron профиля на ~${Math.abs(verdict.diff).toFixed(0)} (светлее) или сократите фазу развития; проверьте штатную загрузку 2.7 кг.`,
    })
  }

  // 2. Класс обжарки (текстовый)
  const cls = roastClass(whole)
  if (cls) {
    const map = {
      light: 'Nordic-зона: сохранены ХГК и сахара, максимум фруктовых эфиров и яркой кислотности, тело лёгкое.',
      medium: 'Баланс Майяра и умеренной карамелизации — кислотность жива, появляются карамель/шоколад и тело.',
      'medium-dark': 'Карамелизация доминирует, кислотность снижается, тело растёт, первые дымные ноты.',
      dark: 'Italian-зона: глубокий пиролиз, фенилинданы и пиридин → жёсткая горечь, низкая кислотность, масло на поверхности.',
    }
    out.push({ key: 'class', tone: 'info', title: 'Степень обжарки', value: whole, unit: 'Agtron', text: map[cls] })
  }

  // 3. Развитие сердцевины (Δ цвета)
  if (whole != null && ground != null) {
    const d = Math.abs(whole - ground)
    out.push(
      d > 15
        ? {
            key: 'core', tone: 'bad', title: 'Недоразвитая сердцевина', value: d.toFixed(0), unit: 'ΔAgtron',
            text: `Тепло не дошло до ядра (маркер 2,5-диметилфуран): травянистость, вяжущесть, страдают сладость и тело.`,
            advice: `Bellwether: профиль с более длинной/мягкой фазой развития; проверьте штатную загрузку — недогруз ускоряет потемнение оболочки при холодном ядре.`,
          }
        : {
            key: 'core', tone: 'good', title: 'Развитие зерна', value: d.toFixed(0), unit: 'ΔAgtron',
            text: `Равномерное развитие — прожарка сердцевины в норме.`,
          }
    )
  }

  // 4. Ужарка
  const loss = weightLoss(batch?.green_weight_kg, batch?.roasted_weight_kg)
  if (loss != null) {
    const range = LOSS_RANGE[level]
    let tone = 'info', tail = '', advice
    if (range) {
      if (loss < range[0]) {
        tone = 'warn'; tail = ` Ниже нормы «${level}» (${range[0]}–${range[1]}%): недобор развития / ранняя выгрузка.`
        advice = `Bellwether: профиль с большим временем развития или чуть темнее целью; сверьте вес загрузки.`
      } else if (loss > range[1]) {
        tone = 'warn'; tail = ` Выше нормы «${level}» (${range[0]}–${range[1]}%): затянутая/тёмная обжарка, риск потери сортовых нот.`
        advice = `Bellwether: целевой профиль светлее или короче фаза развития.`
      } else {
        tone = 'good'; tail = ` В норме для «${level}» (${range[0]}–${range[1]}%).`
      }
    }
    const cmp = profile?.expected_moisture_loss != null ? ` Цель ≈ ${profile.expected_moisture_loss}%.` : ''
    out.push({ key: 'loss', tone, title: 'Ужарка', value: loss.toFixed(1), unit: '%', text: `Потеря массы.${tail}${cmp}`, advice })
  }

  // 5. Хранение и свежесть
  if (aw != null) {
    if (aw > 0.6)
      out.push({
        key: 'aw', tone: 'bad', title: 'Риск хранения', value: aw, unit: 'Aw',
        text: `Выше порога 0.60 — микробиологический риск (плесень) и ускоренное старение.`,
        advice: `Контролируйте зелёное на входе (Aw < 0.60), ускорьте охлаждение и фасуйте в упаковку с клапаном; не храните в тепле.`,
      })
    else
      out.push({
        key: 'aw', tone: 'info', title: 'Активность воды', value: aw, unit: 'Aw',
        text: aw >= 0.5 && aw <= 0.55 ? 'Идеальный диапазон 0.50–0.55.' : aw < 0.5 ? 'Суховато: вкус стабилен, но ароматика уходит быстрее.' : 'В пределах нормы.',
      })
  }
  if (moisture != null && moisture > 4)
    out.push({
      key: 'moisture', tone: 'warn', title: 'Влажность', value: moisture, unit: '%',
      text: `Повышена для обжаренного зерна.`,
      advice: `Проверьте охлаждение (<4 мин до <40 °C) и герметичность упаковки — влажная среда ускоряет затхлые тона (DMTS).`,
    })

  // 6. Экстракция (Golden Zone)
  if (ey != null) {
    if (ey >= 18 && ey <= 22) {
      const flat = s('flavor') <= 5 || s('sweetness') <= 5 || s('aftertaste') <= 5
      out.push(
        flat
          ? {
              key: 'extraction', tone: 'warn', title: 'Норма EY, но чашка плоская', value: ey, unit: '% EY',
              text: `Golden Zone (18–22%)${tds != null ? `, TDS ${tds}%` : ''}, но вкус пустой/бумажный — корень в обжарке (запекание/недоразвитие), не в проливе.`,
              advice: `Bellwether: профиль с более полной фазой развития, избегайте раннего плато (запекания); сверьте Agtron с целью.`,
            }
          : {
              key: 'extraction', tone: 'good', title: 'Экстракция', value: ey, unit: '% EY',
              text: `Golden Zone (18–22%)${tds != null ? `, TDS ${tds}%` : ''}: синергия сахаров и кислот, сиропистое тело, долгое послевкусие.`,
            }
      )
    } else if (ey > 22) {
      out.push({
        key: 'extraction', tone: 'warn', title: 'Переэкстракция', value: ey, unit: '% EY',
        text: `> 23% — горечь, зольность, астрингентность, сухость.`,
        advice: `Бариста: грубее помол, короче контакт, ниже температура. Не дефект обжарки.`,
      })
    } else {
      out.push({
        key: 'extraction', tone: 'warn', title: 'Недоэкстракция', value: ey, unit: '% EY',
        text: `< 18% — едкая кислотность, водянистость, пустое тело, короткое послевкусие.`,
        advice: `Бариста: тоньше помол, дольше контакт, выше температура; проверьте равномерность пролива.`,
      })
    }
  }

  // 7. Дегазация
  const rest = REST_RANGE[level]
  if (rest && batch?.outgassing_days != null) {
    const od = Number(batch.outgassing_days)
    const tooShort = od < rest[0]
    const natural = /natural/i.test(process || '')
    out.push({
      key: 'rest', tone: tooShort ? 'warn' : 'info', title: 'Дегазация', value: od, unit: 'дн',
      text: `Окно для «${level}» (фильтр): ${rest[0]}–${rest[1]} дн., пик вкуса ≈ 11 дн.${tooShort ? ' Короткий отдых → остаточный CO₂ мешает экстракции.' : ''}`,
      advice: tooShort
        ? `Дайте дойти хотя бы до ${rest[0]} дн.${natural ? ' Натуральная обработка — ближе к верхней границе.' : ''}`
        : natural ? `Натуральная обработка дегазирует медленнее — ориентир на верх окна.` : undefined,
    })
  }

  // 8. Сильные стороны / зоны роста (текстовые)
  const ranked = PARAMETERS.map((p) => ({ label: p.label, v: s(p.key) })).sort((a, b) => b.v - a.v)
  const tops = ranked.filter((x) => x.v >= 8).slice(0, 3).map((x) => x.label)
  const lows = ranked.filter((x) => x.v > 0 && x.v <= 4).map((x) => x.label)
  if (tops.length)
    out.push({ key: 'tops', tone: 'good', title: 'Сильные стороны', text: tops.join(', ') + '.' })
  if (lows.length)
    out.push({
      key: 'lows', tone: 'warn', title: 'Зоны роста', text: lows.join(', ') + '.',
      advice: `Bellwether: низкая сладость/тело → больше развития; резкая кислотность/травянистость → удлините развитие (недогрев ядра).`,
    })

  // 9. Итог QC (hero)
  const total = totalScore(scores)
  const g = gradeOf(total)
  const phrase =
    total >= 90 ? 'Выдающийся лот — референс сезона.'
      : total >= 86 ? 'Яркий сингл-ориджин.'
        : total >= 83 ? 'Основа для блендов.'
          : total >= 80 ? 'Базовый specialty.'
            : total >= 70 ? 'Ниже specialty — downgrade/бленд или корректировка профиля.'
              : 'Брак/переобжарка — изолировать батч.'
  out.push({
    key: 'total', tone: total >= 83 ? 'good' : total >= 80 ? 'info' : 'warn',
    title: g.label, value: total, unit: '/ 100', text: phrase,
    advice: total < 80 ? `Bellwether: пересоберите профиль (цель/развитие) и перепроверьте свежесть и влажность зелёного.` : undefined,
  })

  return out
}
