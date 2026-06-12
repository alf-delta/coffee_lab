// Контракт вывода Monoblend Q — единый интерфейс анализа партии для ВСЕХ
// источников: детерминированный knowledge.js (fallback), LLM-команда, пайплайн.
// Любой источник нормализуется в эту форму, панель рендерит её одинаково.
//
// Структура «решение → доказательства → действия → пробелы»:
//   Q_REPORT = {
//     verdict:    { decision, score, grade, headline }
//     findings:   Finding[]   — доказательная база (факт + смысл), по доменам
//     actions:    Action[]     — что крутить (ростер/бариста/зелёное/хранение)
//     data_gaps:  string[]     — чего не хватило для полного вывода
//   }
//   Finding = { key, domain, tone, title, value?, unit?, observation, meaning, source? }
//   Action  = { key, target, lever, direction, rationale?, priority }

export const DOMAINS = ['curve', 'chemistry', 'sensory', 'storage']
export const DOMAIN_LABELS = {
  curve: 'Кривая обжарки',
  chemistry: 'Химия и приборы',
  sensory: 'Сенсорика и экстракция',
  storage: 'Хранение и свежесть',
}

export const TONES = ['good', 'warn', 'bad', 'info']
const TONE_SEVERITY = { bad: 0, warn: 1, info: 2, good: 3 }

// Дерево решений QC (сенсорика, БЛОК 5.3)
export const DECISIONS = {
  pass: { label: 'Одобрить', tint: '#7cc18d' },
  downgrade: { label: 'В бленд', tint: '#cdb79a' },
  adjust: { label: 'Поправить профиль', tint: '#e0c074' },
  reject: { label: 'Брак / переобжарка', tint: '#e89a92' },
}

export const ACTION_TARGETS = {
  roaster: 'Ростер',
  barista: 'Бариста',
  green: 'Зелёное',
  storage: 'Хранение',
}
export const PRIORITIES = { high: 3, med: 2, low: 1 }

const clampTone = (t) => (TONES.includes(t) ? t : 'info')
const clampDomain = (d) => (DOMAINS.includes(d) ? d : 'chemistry')
const str = (v) => (v == null ? '' : String(v))

// Решение по баллу + тяжести находок (используется и для legacy, и как дефолт)
export function deriveDecision(total, findings = []) {
  const hasBad = findings.some((f) => f.tone === 'bad')
  if (total > 0 && total < 70) return 'reject'
  if (hasBad) return total >= 80 ? 'adjust' : 'reject'
  if (total > 0 && total < 80) return 'adjust'
  if (total > 0 && total < 83) return 'downgrade'
  return 'pass'
}

function normFinding(raw, i) {
  return {
    key: str(raw.key) || `f${i}`,
    domain: clampDomain(raw.domain),
    tone: clampTone(raw.tone),
    title: str(raw.title),
    value: raw.value ?? null,
    unit: str(raw.unit),
    observation: str(raw.observation || raw.text),
    meaning: str(raw.meaning || (raw.observation ? '' : raw.text)),
    source: str(raw.source) || null,
  }
}

function normAction(raw, i) {
  return {
    key: str(raw.key) || `a${i}`,
    target: raw.target in ACTION_TARGETS ? raw.target : 'roaster',
    lever: str(raw.lever),
    direction: str(raw.direction),
    rationale: str(raw.rationale) || null,
    priority: raw.priority in PRIORITIES ? raw.priority : 'med',
  }
}

// Привести любой источник к Q_REPORT. Принимает:
//  - объект Q_REPORT (LLM/пайплайн/knowledge.js) → нормализует поля;
//  - массив legacy-инсайтов {key,tone,title,text,advice,value,unit} → конвертирует.
// Возвращает Q_REPORT либо null, если данных нет.
export function normalizeReport(raw) {
  if (!raw) return null

  // legacy: плоский массив инсайтов (старый формат roastCommentary)
  if (Array.isArray(raw)) {
    if (!raw.length) return null
    const totalItem = raw.find((i) => i.key === 'total')
    const findings = raw
      .filter((i) => i.key !== 'total')
      .map((i, idx) => normFinding(i, idx))
    const actions = raw
      .filter((i) => i.advice)
      .map((i, idx) => normAction({ key: `${i.key}-fix`, lever: i.title, direction: i.advice, priority: i.tone === 'bad' ? 'high' : 'med' }, idx))
    const score = Number(totalItem?.value) || 0
    return {
      verdict: {
        decision: deriveDecision(score, findings),
        score,
        grade: str(totalItem?.title),
        headline: str(totalItem?.text),
      },
      findings,
      actions,
      data_gaps: [],
    }
  }

  if (typeof raw !== 'object') return null
  const findings = Array.isArray(raw.findings) ? raw.findings.map(normFinding) : []
  const actions = Array.isArray(raw.actions) ? raw.actions.map(normAction) : []
  // verdict иногда приходит сериализованной строкой (модель стрингует вложенный объект)
  let v = raw.verdict || {}
  if (typeof v === 'string') { try { v = JSON.parse(v) } catch { v = {} } }
  if (typeof v !== 'object' || !v) v = {}
  const score = Number(v.score) || 0
  const verdict = {
    decision: v.decision in DECISIONS ? v.decision : deriveDecision(score, findings),
    score,
    grade: str(v.grade),
    headline: str(v.headline),
  }
  const data_gaps = Array.isArray(raw.data_gaps) ? raw.data_gaps.map(str).filter(Boolean) : []

  if (!findings.length && !actions.length && !verdict.score && !verdict.headline) return null

  // сортировка: доказательства по домену → тяжести; действия по приоритету
  findings.sort(
    (a, b) =>
      DOMAINS.indexOf(a.domain) - DOMAINS.indexOf(b.domain) ||
      TONE_SEVERITY[a.tone] - TONE_SEVERITY[b.tone]
  )
  actions.sort((a, b) => PRIORITIES[b.priority] - PRIORITIES[a.priority])

  return { verdict, findings, actions, data_gaps }
}

// Сгруппировать findings по домену (для рендера секциями)
export function groupByDomain(findings = []) {
  const groups = []
  for (const d of DOMAINS) {
    const items = findings.filter((f) => f.domain === d)
    if (items.length) groups.push({ domain: d, label: DOMAIN_LABELS[d], items })
  }
  return groups
}
