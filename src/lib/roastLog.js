// Парсер CSV-логов ростера Bellwether (выгрузка roaster-log-data-*.csv).
// Лог — посекундная телеметрия всей сессии (Preheat → Roast → Cool).
// Берём только окно Roast, прореживаем до шага STEP_S и извлекаем метрики.

const STEP_S = 5 // шаг хранения кривой, сек (1 точка из 5 — ~115 точек на жарку)

// Разбор строки CSV с учётом кавычек (timestamp содержит запятую)
function splitCsvLine(line) {
  const out = []
  let cur = ''
  let q = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') q = !q
    else if (ch === ',' && !q) {
      out.push(cur)
      cur = ''
    } else cur += ch
  }
  out.push(cur)
  return out
}

const mmssToSeconds = (s) => {
  const [m, sec] = String(s).split(':').map(Number)
  return (m || 0) * 60 + (sec || 0)
}

const secondsToMmss = (s) =>
  `${Math.floor(s / 60)}:${String(Math.round(s) % 60).padStart(2, '0')}`

// text → { roast_log, roast_date } | бросает Error с понятным сообщением
export function parseRoastLog(text) {
  const lines = String(text).replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 10) throw new Error('Файл слишком короткий — это не лог Bellwether')

  const header = splitCsvLine(lines[0]).map((h) => h.trim().toLowerCase())
  const col = (name) => header.indexOf(name)
  const iTime = col('time_mmss')
  const iStamp = col('timestamp')
  const iState = col('state')
  const iBean = col('bean_front')
  const iSpf = col('roast_spf')
  const iInlet = col('inlet')
  if (iState < 0 || iBean < 0 || iSpf < 0)
    throw new Error('Не найдены колонки state/bean_front/roast_spf — это не лог Bellwether')

  // строки фазы Roast
  const rows = []
  for (let i = 1; i < lines.length; i++) {
    const f = splitCsvLine(lines[i])
    if ((f[iState] || '').trim() !== 'Roast') continue
    rows.push({
      t: mmssToSeconds(f[iTime]),
      stamp: f[iStamp],
      bean: Number(f[iBean]),
      spf: Number(f[iSpf]),
      inlet: iInlet >= 0 ? Number(f[iInlet]) : null,
    })
  }
  if (rows.length < 30) throw new Error('В логе не нашлось фазы Roast — жарка не записана')

  const t0 = rows[0].t
  const duration_s = rows[rows.length - 1].t - t0

  // прореженная кривая (время — от начала жарки)
  const bean = []
  const spf = []
  const inlet = []
  for (let i = 0; i < rows.length; i += STEP_S) {
    bean.push(Math.round(rows[i].bean * 10) / 10)
    spf.push(Math.round(rows[i].spf * 10) / 10)
    inlet.push(rows[i].inlet != null ? Math.round(rows[i].inlet * 10) / 10 : null)
  }

  // метрики: загрузка, точка разворота (минимум после загрузки), выгрузка
  let turnIdx = 0
  for (let i = 1; i < rows.length; i++) if (rows[i].bean < rows[turnIdx].bean) turnIdx = i
  const metrics = {
    charge_f: Math.round(rows[0].bean * 10) / 10,
    turn_f: Math.round(rows[turnIdx].bean * 10) / 10,
    turn_s: rows[turnIdx].t - t0,
    drop_f: Math.round(rows[rows.length - 1].bean * 10) / 10,
    duration_s,
  }

  // дата жарки из timestamp ("6/5/2026, 3:00:00 PM" → YYYY-MM-DD)
  let roast_date = null
  const d = new Date(rows[0].stamp)
  if (!Number.isNaN(d.getTime())) {
    const pad = (n) => String(n).padStart(2, '0')
    roast_date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  }

  return {
    roast_log: { step_s: STEP_S, bean, spf, inlet, metrics },
    roast_date,
  }
}

// Скорость роста температуры, °F/мин, сглаженная окном ~30 сек
export function rorSeries(log) {
  const { bean, step_s } = log
  const w = Math.max(1, Math.round(30 / step_s))
  return bean.map((v, i) => {
    if (i < w) return null
    return ((v - bean[i - w]) / (w * step_s)) * 60
  })
}

export const formatRoastTime = secondsToMmss
