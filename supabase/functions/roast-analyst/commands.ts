// Реестр команд оркестратора roast-analyst.
// Единый источник правды: какие задачи Claude умеет на базе корпуса roster_kno.
// Добавить команду = добавить запись; фронт не трогаем (зовётся по id).
//
// Каждая команда декларирует:
//   model       — какая модель (тиринг: Haiku дёшево, Sonnet средне, Opus синтез);
//   knowledge   — какие скиллы грузить в system (кэшируются);
//   instruction — постановка задачи;
//   tool        — имя + JSON-схема ответа (forced tool_use → строгий JSON);
//   maxTokens   — лимит ответа;
//   buildUser   — как собрать payload в текст для модели.
//
// Все аналитические команды отдают части контракта Q_REPORT (см. src/lib/qreport.js):
//   Finding = { key, domain, tone, title, value?, unit?, observation, meaning, source? }
//   Action  = { key, target, lever, direction, rationale?, priority }
//   Verdict = { decision, headline }   (score/grade считает КОД при сборке)

export type SkillId = 'sensory' | 'chemistry' | 'physics'
export type ModelId = 'claude-opus-4-8' | 'claude-sonnet-4-6' | 'claude-haiku-4-5-20251001'

export interface CommandSpec {
  id: string
  title: string
  model: ModelId
  knowledge: SkillId[]
  maxTokens: number
  instruction: string
  tool: { name: string; description: string; input_schema: Record<string, unknown> }
  buildUser: (payload: Record<string, any>) => string
}

// ── Схемы-фрагменты контракта Q_REPORT ──────────────────────────────────
const FINDING_ITEM = {
  type: 'object',
  additionalProperties: false,
  properties: {
    key: { type: 'string', description: 'уникальный slug, напр. "ror", "core", "extraction"' },
    domain: { type: 'string', enum: ['curve', 'chemistry', 'sensory', 'storage'] },
    tone: { type: 'string', enum: ['good', 'warn', 'bad', 'info'] },
    title: { type: 'string', description: 'короткий заголовок (1–3 слова)' },
    value: { type: ['number', 'string'], description: 'опц. крупная цифра для инфографики' },
    unit: { type: 'string', description: 'опц. единица (Agtron, % EY, °F/мин, дн)' },
    observation: { type: 'string', description: 'ФАКТ: что показал прибор/кривая/оценка' },
    meaning: { type: 'string', description: 'СМЫСЛ: что это значит для чашки' },
    source: { type: 'string', description: 'цитата блока корпуса, напр. "физика БЛОК 4.5"' },
  },
  required: ['key', 'domain', 'tone', 'title', 'observation', 'meaning'],
}

const ACTION_ITEM = {
  type: 'object',
  additionalProperties: false,
  properties: {
    key: { type: 'string' },
    target: { type: 'string', enum: ['roaster', 'barista', 'green', 'storage'] },
    lever: { type: 'string', description: 'что крутить: "газ перед FC", "помол", "целевой Agtron"…' },
    direction: { type: 'string', description: 'в какую сторону: "убрать за 30–60с до крэка", "тоньше"' },
    rationale: { type: 'string', description: 'опц. почему' },
    priority: { type: 'string', enum: ['high', 'med', 'low'] },
  },
  required: ['key', 'target', 'lever', 'direction', 'priority'],
}

// Доменная команда отдаёт срез контракта
const domainTool = (name: string, description: string) => ({
  name,
  description,
  input_schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      findings: { type: 'array', items: FINDING_ITEM },
      actions: { type: 'array', items: ACTION_ITEM },
      data_gaps: { type: 'array', items: { type: 'string' } },
    },
    required: ['findings'],
  },
})

// ── Сводки для модели ───────────────────────────────────────────────────
function batchDigest(p: Record<string, any>): string {
  const b = p.batch ?? {}
  const prof = p.profile ?? null
  const lab = b.lab_data ?? {}
  const log = prof?.roast_log ?? null
  const lines: string[] = []
  lines.push(`Партия: ${b.name ?? '—'} · ${b.origin ?? ''}`)
  lines.push(`Степень обжарки: ${b.roast_level ?? '—'} · обработка: ${b.process ?? '—'}`)
  lines.push(`Отдых после обжарки: ${b.outgassing_days ?? '—'} дн (порог анализа)`)
  if (b.green_weight_kg != null || b.roasted_weight_kg != null)
    lines.push(`Вес: зелёное ${b.green_weight_kg ?? '—'} кг → обжаренное ${b.roasted_weight_kg ?? '—'} кг`)
  if (b.green_moisture != null || b.green_water_activity != null || b.green_density != null)
    lines.push(`QC ЗЕЛЁНОГО на момент жарки: влажность ${b.green_moisture ?? '—'}% (норма 10–12), Aw ${b.green_water_activity ?? '—'} (норма 0.50–0.55), плотность ${b.green_density ?? '—'} г/л`)
  // ВАЖНО: lab_data.moisture — влажность ОБЖАРЕННОГО зерна (норма ~2–4%), НЕ зелёного (10–12%)
  lines.push('Приборы ОБЖАРЕННОГО зерна и напитка (DiFluid Omix Plus / R2 Extract; moisture = влажность обжаренного, норма ~2–4%): ' + JSON.stringify(lab))
  lines.push('Органолептика (1–10): ' + JSON.stringify(b.scores ?? {}))
  if (Array.isArray(b.flavors) && b.flavors.length) lines.push('Дескрипторы (колесо SCA): ' + b.flavors.join(', '))
  if (prof) {
    lines.push(`Профиль Bellwether: «${prof.profile_name}» · цель Agtron цельное ${prof.target_agtron_whole ?? '—'}, молотое ${prof.target_agtron_ground ?? '—'}; ожид. ужарка ${prof.expected_moisture_loss ?? '—'}%`)
  }
  if (log?.metrics) {
    const m = log.metrics
    lines.push(`Кривая: время ${Math.round(m.duration_s)}с, загрузка ${m.charge_f}°F, разворот ${m.turn_f}°F@${m.turn_s}с, выгрузка ${m.drop_f}°F`)
    if (Array.isArray(log.bean)) lines.push(`bean (°F, шаг ${log.step_s}с): [${log.bean.join(', ')}]`)
    if (Array.isArray(log.spf)) lines.push(`spf (°F): [${log.spf.join(', ')}]`)
  }
  return lines.join('\n')
}

function findingsDigest(findings: any[]): string {
  if (!Array.isArray(findings) || !findings.length) return '(находок нет)'
  return findings
    .map((f) => `- [${f.domain}/${f.tone}] ${f.title}: ${f.observation} → ${f.meaning}`)
    .join('\n')
}

const DISCIPLINE = `Дисциплина вывода: опирайся ТОЛЬКО на материал скиллов и данные партии; пороги бери из корпуса; если метрики нет — не выдумывай, пропусти и при необходимости верни data_gap. observation = ФАКТ (1 короткое предложение, без пересказа всех чисел), meaning = что это во вкусе (1 предложение). КРАТКО, без абзацев. Не дублируй данные между находками. Поля verdict (decision/headline) возвращай как ОБЪЕКТ, не как строку. Язык русский. Верни результат ТОЛЬКО через инструмент.`

export const COMMANDS: Record<string, CommandSpec> = {
  // ── Одиночный полный разбор (быстрый/связный путь) ──────────────────────
  analyze_batch: {
    id: 'analyze_batch',
    title: 'Полный анализ партии',
    model: 'claude-sonnet-4-6',
    knowledge: ['sensory', 'chemistry', 'physics'],
    maxTokens: 3200,
    instruction: `Ты — QC-аналитик и Q-grader лаборатории Monoblend. Разбери партию ЦЕЛИКОМ и собери отчёт Q_REPORT: verdict, findings, actions, data_gaps. Свяжи химию → кривую обжарки → сенсорику.
- verdict.decision — дерево QC (сенсорика БЛОК 5.3): pass | downgrade | adjust | reject. verdict.headline — одна фраза для жарщика. НЕ выставляй score (его считает система).
- findings — по доменам (curve/chemistry/sensory/storage), НЕ больше 6–7 самых значимых, каждая с observation (факт) и meaning (вкус) и source (блок корпуса).
- actions — что крутить: roaster (воздух/RPM/Charge/газ/DTR/выгрузка), barista (помол/контакт/T), green, storage; с приоритетом. Различай вину обжарщик↔бариста (Golden Zone + плоско = дефект обжарки).
- Не путай sour-недодегазацию с сортовой кислотностью; горечь многокомпонентна; квакеры — агрономия.
${DISCIPLINE}`,
    tool: {
      name: 'record_report',
      description: 'Записать полный отчёт Q_REPORT',
      input_schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          verdict: {
            type: 'object',
            additionalProperties: false,
            properties: {
              decision: { type: 'string', enum: ['pass', 'downgrade', 'adjust', 'reject'] },
              headline: { type: 'string' },
            },
            required: ['decision', 'headline'],
          },
          findings: { type: 'array', minItems: 2, items: FINDING_ITEM },
          actions: { type: 'array', items: ACTION_ITEM },
          data_gaps: { type: 'array', items: { type: 'string' } },
        },
        required: ['verdict', 'findings'],
      },
    },
    buildUser: (p) => `Разбери партию и верни Q_REPORT.\n\n${batchDigest(p)}`,
  },

  // ── Доменная стадия: кривая обжарки ─────────────────────────────────────
  analyze_curve: {
    id: 'analyze_curve',
    title: 'Разбор кривой',
    model: 'claude-sonnet-4-6',
    knowledge: ['physics'],
    maxTokens: 1600,
    instruction: `Разбери ТОЛЬКО эталонную кривую обжарки (roast_log) по материалу физики. findings домена "curve": время жарки (рабочее окно барабана ~7:30–13:00), точка разворота (TP норм. 60–90с), траектория RoR (плавный спад = эталон; рост к выгрузке = «флик» → недоразвитие/неравномерность). value+unit где уместно. actions для roaster при флике/аномалии (напр. lever «газ перед FC»). Если кривой нет — пустой findings + data_gap.
${DISCIPLINE}`,
    tool: domainTool('record_curve', 'Находки по кривой обжарки'),
    buildUser: (p) => `Разбери кривую этой партии.\n\n${batchDigest(p)}`,
  },

  // ── Доменная стадия: химия/приборы/хранение ─────────────────────────────
  analyze_chemistry: {
    id: 'analyze_chemistry',
    title: 'Разбор химии и приборов',
    model: 'claude-sonnet-4-6',
    knowledge: ['chemistry', 'physics'],
    maxTokens: 2200,
    instruction: `Разбери химию, приборные метрики и хранение. findings:
- домен "chemistry": сверка Agtron с целью профиля; класс обжарки (Nordic↔Italian, БЛОК 10); развитие сердцевины (ΔAgtron цельное↔молотое > 15 → недоразвитие, маркер 2,5-диметилфуран); ужарка vs норма степени (light 12–14 / medium 14–17 / dark 18–22 %).
- домен "storage": активность воды (идеал 0.50–0.55, >0.60 риск плесени), влажность обжаренного (>4% риск DMTS), окно дегазации по степени.
actions для roaster/green/storage с приоритетом. observation=факт, meaning=вкус, source=блок.
${DISCIPLINE}`,
    tool: domainTool('record_chemistry', 'Находки по химии/приборам/хранению'),
    buildUser: (p) => `Разбери химию/приборы/хранение этой партии.\n\n${batchDigest(p)}`,
  },

  // ── Доменная стадия: сенсорика и экстракция ─────────────────────────────
  analyze_sensory: {
    id: 'analyze_sensory',
    title: 'Разбор сенсорики',
    model: 'claude-haiku-4-5-20251001',
    knowledge: ['sensory'],
    maxTokens: 1700,
    instruction: `Разбери сенсорику и экстракцию. findings домена "sensory":
- сильные стороны (оценки ≥8) и зоны роста (≤4) из 10 органолептических параметров;
- экстракция EY/TDS: Golden Zone 18–22%; >22 переэкстракция; <18 недоэкстракция; если EY в норме, но чашка плоская (flavor/sweetness/aftertaste ≤5) → корень в обжарке (запекание/недоразвитие), НЕ бариста.
actions: barista (помол/контакт/T) при экстракции; roaster если корень в обжарке. observation=факт, meaning=вкус, source=блок (напр. «сенсорика БЛОК 3.2»).
${DISCIPLINE}`,
    tool: domainTool('record_sensory', 'Находки по сенсорике/экстракции'),
    buildUser: (p) => `Разбери сенсорику этой партии.\n\n${batchDigest(p)}`,
  },

  // ── Стадия синтеза: вердикт поверх всех находок (Opus) ───────────────────
  synthesize_verdict: {
    id: 'synthesize_verdict',
    title: 'Синтез вердикта',
    model: 'claude-opus-4-8',
    knowledge: ['sensory'],
    maxTokens: 1200,
    instruction: `На вход — находки доменных стадий (curve/chemistry/sensory/storage) и органолептика партии. Прими РЕШЕНИЕ по дереву QC (сенсорика БЛОК 5.3): decision = pass | downgrade | adjust | reject, и сформулируй headline — одну ёмкую фразу для жарщика, связывающую главную причину и решение. НЕ считай балл (его считает система). Добавь до 2 КРОСС-доменных actions, если видишь связь находок разных доменов (напр. флик кривой + плоская чашка → один корень). Различай sour-недодегазацию vs сортовую кислотность; горечь многокомпонентна.
${DISCIPLINE}`,
    tool: {
      name: 'record_verdict',
      description: 'Решение QC + кросс-доменные действия',
      input_schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          verdict: {
            type: 'object',
            additionalProperties: false,
            properties: {
              decision: { type: 'string', enum: ['pass', 'downgrade', 'adjust', 'reject'] },
              headline: { type: 'string' },
            },
            required: ['decision', 'headline'],
          },
          actions: { type: 'array', items: ACTION_ITEM },
        },
        required: ['verdict'],
      },
    },
    buildUser: (p) =>
      `Органолептика (1–10): ${JSON.stringify(p.batch?.scores ?? {})}\n` +
      `Степень: ${p.batch?.roast_level ?? '—'} · обработка: ${p.batch?.process ?? '—'}\n\n` +
      `Находки доменных стадий:\n${findingsDigest(p.findings)}\n\nПрими решение и сформулируй вердикт.`,
  },

  // ── Диагностика дефекта по симптому (для будущей кнопки/чата) ────────────
  diagnose_defect: {
    id: 'diagnose_defect',
    title: 'Диагностика дефекта',
    model: 'claude-sonnet-4-6',
    knowledge: ['chemistry', 'physics', 'sensory'],
    maxTokens: 1300,
    instruction: `Ты — технолог обжарки Monoblend. На вход — сенсорный симптом (как пьётся) и опц. контекст партии. Определи вероятную причину: механизм (термодинамика/химия), маркерное соединение, что крутить на ростере. Различай близкие дефекты (baking vs underdevelopment vs scorching vs tipping vs flick). Если неоднозначно — 2–3 гипотезы с критерием различения. ${DISCIPLINE}`,
    tool: {
      name: 'record_diagnosis',
      description: 'Диагноз дефекта',
      input_schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          likely_cause: { type: 'string' },
          mechanism: { type: 'string' },
          marker_compound: { type: 'string' },
          fix: { type: 'string' },
          alternatives: { type: 'array', items: { type: 'string' } },
        },
        required: ['likely_cause', 'mechanism', 'fix'],
      },
    },
    buildUser: (p) => {
      const sym = String(p.symptom ?? '').trim()
      const ctx = p.batch ? `\n\nКонтекст партии:\n${batchDigest(p)}` : ''
      return `Симптом (как пьётся): "${sym}"${ctx}`
    },
  },
}
