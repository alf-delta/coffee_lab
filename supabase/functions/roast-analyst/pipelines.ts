// Реестр пайплайнов оркестратора Monoblend Q.
// Пайплайн = последовательность стадий (каждая = команда из COMMANDS, т.е. своя
// модель), исполняемая server-side по порядку с накоплением контекста, плюс
// ДЕТЕРМИНИРОВАННАЯ сборка (assemble) финального Q_REPORT.
//
// Принцип: числа, что вычислимы (балл/грейд), считает КОД здесь; суждение
// (decision/headline/actions) — модели. Стадия optional/упавшая не рушит
// пайплайн — assemble собирает из того, что есть, и пишет это в data_gaps.

const PARAM_KEYS = [
  'aroma', 'flavor', 'aftertaste', 'acidity', 'body',
  'balance', 'sweetness', 'cleanliness', 'uniformity', 'overall',
]

// зеркало src/lib/scoring.js (edge-сторона не может импортировать из src/)
function qScore(scores: Record<string, any> = {}): number {
  return PARAM_KEYS.reduce((s, k) => s + (Number(scores?.[k]) || 0), 0)
}
function qGrade(total: number): string {
  if (total >= 90) return 'Outstanding'
  if (total >= 85) return 'Excellent'
  if (total >= 80) return 'Specialty Grade'
  if (total >= 70) return 'Good'
  if (total >= 60) return 'Fair'
  return 'Below Specialty'
}
function deriveDecision(total: number, findings: any[]): string {
  const hasBad = findings.some((f) => f?.tone === 'bad')
  if (total > 0 && total < 70) return 'reject'
  if (hasBad) return total >= 80 ? 'adjust' : 'reject'
  if (total > 0 && total < 80) return 'adjust'
  if (total > 0 && total < 83) return 'downgrade'
  return 'pass'
}

export interface Stage {
  id: string
  command: string
  // когда стадию выполнять (напр. кривая — только если есть roast_log)
  when?: (payload: Record<string, any>) => boolean
  // вход стадии из исходного payload + выходов прошлых стадий (ctx)
  input: (payload: Record<string, any>, ctx: Record<string, any>) => Record<string, any>
  // не обязательная: падение/пропуск не рушит пайплайн
  optional?: boolean
}

export interface PipelineSpec {
  id: string
  title: string
  stages: Stage[]
  assemble: (ctx: Record<string, any>, payload: Record<string, any>) => Record<string, any>
}

// verdict иногда приходит сериализованной строкой — распарсить
function parseMaybe(v: any): any {
  if (typeof v === 'string') { try { return JSON.parse(v) } catch { return {} } }
  return v && typeof v === 'object' ? v : {}
}

const collectFindings = (ctx: Record<string, any>, ids: string[]) =>
  ids.flatMap((id) => (Array.isArray(ctx[id]?.findings) ? ctx[id].findings : []))
const collectActions = (ctx: Record<string, any>, ids: string[]) =>
  ids.flatMap((id) => (Array.isArray(ctx[id]?.actions) ? ctx[id].actions : []))
const collectGaps = (ctx: Record<string, any>, ids: string[]) =>
  ids.flatMap((id) => (Array.isArray(ctx[id]?.data_gaps) ? ctx[id].data_gaps : []))

export const PIPELINES: Record<string, PipelineSpec> = {
  // Полный многомодельный разбор партии → Q_REPORT
  batch_full: {
    id: 'batch_full',
    title: 'Полный разбор партии (multi-model)',
    stages: [
      {
        id: 'curve',
        command: 'analyze_curve',
        when: (p) => Boolean(p.profile?.roast_log),
        optional: true,
        input: (p) => ({ batch: p.batch, profile: p.profile }),
      },
      {
        id: 'chemistry',
        command: 'analyze_chemistry',
        optional: true,
        input: (p) => ({ batch: p.batch, profile: p.profile }),
      },
      {
        id: 'sensory',
        command: 'analyze_sensory',
        optional: true,
        input: (p) => ({ batch: p.batch, profile: p.profile }),
      },
      {
        id: 'verdict',
        command: 'synthesize_verdict',
        optional: true,
        // синтез видит все находки предыдущих стадий
        input: (p, ctx) => ({
          batch: p.batch,
          profile: p.profile,
          findings: collectFindings(ctx, ['curve', 'chemistry', 'sensory']),
        }),
      },
    ],
    assemble: (ctx, p) => {
      const findings = collectFindings(ctx, ['curve', 'chemistry', 'sensory'])
      const actions = [
        ...collectActions(ctx, ['curve', 'chemistry', 'sensory']),
        ...(Array.isArray(ctx.verdict?.actions) ? ctx.verdict.actions : []),
      ]
      const gaps = collectGaps(ctx, ['curve', 'chemistry', 'sensory'])

      const total = qScore(p.batch?.scores)
      const v = parseMaybe(ctx.verdict?.verdict)
      const decision = v.decision ?? deriveDecision(total, findings)
      const headline = v.headline ?? ''

      // деградация: какие стадии не отработали
      for (const [id, label] of [['chemistry', 'химия/приборы'], ['sensory', 'сенсорика']] as const) {
        if (ctx[id] == null) gaps.push(`стадия «${label}» не отработала`)
      }

      return {
        verdict: { decision, score: total, grade: qGrade(total), headline },
        findings,
        actions,
        data_gaps: gaps,
      }
    },
  },
}
