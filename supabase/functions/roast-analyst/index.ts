// Supabase Edge Function: roast-analyst
// Оркестратор анализа обжарки на Claude, заземлённый на корпус roster_kno.
// Принимает либо { command, payload } (одиночная команда), либо
// { pipeline, payload } (многомодельный пайплайн). Возвращает строгий JSON
// (через forced tool_use) + трейс по стадиям.
//
// Деплой:  supabase functions deploy roast-analyst --no-verify-jwt
// Секрет:  supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
//
// Знания (knowledge/*.md) вендорены в каталог функции, грузятся при холодном
// старте, уходят в system отдельными блоками с cache_control (кэш ~5 мин).

import Anthropic from 'npm:@anthropic-ai/sdk@0.32.1'
import { COMMANDS, type CommandSpec, type SkillId } from './commands.ts'
import { PIPELINES } from './pipelines.ts'
import { KNOWLEDGE } from './_knowledge.ts'

const DEFAULT_MODEL = 'claude-sonnet-4-6'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const GLOBAL_SYSTEM = `Ты — экспертная система кофейной лаборатории Monoblend (бренд анализа — «Monoblend Q»): Q-grader, химик обжарки и технолог процесса. Ниже обучающие скиллы — ЕДИНСТВЕННЫЙ источник правды. Не выходи за пределы материала, не выдумывай числа. Связывай химию зерна ↔ форму кривой обжарки ↔ восприятие в чашке. Соблюдай раздел «Частые ошибки» каждого скилла. Отвечай по-русски, строго через предоставленный инструмент.`

// system: общий промпт + выбранные скиллы (каждый кэшируется) + задача команды.
// Знания вшиты в _knowledge.ts (бандлится; .md edge-рантайм не пакует).
function buildSystem(skills: SkillId[], instruction: string) {
  const blocks: Array<Record<string, unknown>> = [{ type: 'text', text: GLOBAL_SYSTEM }]
  const ordered: SkillId[] = (['sensory', 'chemistry', 'physics'] as SkillId[]).filter((s) => skills.includes(s))
  for (const id of ordered) {
    blocks.push({ type: 'text', text: KNOWLEDGE[id], cache_control: { type: 'ephemeral' } })
  }
  blocks.push({ type: 'text', text: `ЗАДАЧА КОМАНДЫ:\n${instruction}` })
  return blocks
}

// Один вызов команды → { input (tool_use), usage }
async function runCommand(client: Anthropic, spec: CommandSpec, payload: Record<string, any>) {
  const system = buildSystem(spec.knowledge, spec.instruction)
  const msg = await client.messages.create({
    model: spec.model || DEFAULT_MODEL,
    max_tokens: spec.maxTokens,
    system: system as any,
    tools: [spec.tool as any],
    tool_choice: { type: 'tool', name: spec.tool.name },
    messages: [{ role: 'user', content: spec.buildUser(payload) }],
  })
  const block = msg.content.find((b: any) => b.type === 'tool_use') as any
  return { input: block?.input ?? null, usage: msg.usage }
}

// Исполнитель пайплайна: стадии по порядку, накопление ctx, трейс, сборка
async function runPipeline(client: Anthropic, pipelineId: string, payload: Record<string, any>) {
  const pipe = PIPELINES[pipelineId]
  if (!pipe) throw new Error(`unknown pipeline: ${pipelineId}`)
  const ctx: Record<string, any> = {}
  const trace: any[] = []
  for (const stage of pipe.stages) {
    if (stage.when && !stage.when(payload)) {
      trace.push({ id: stage.id, skipped: true })
      ctx[stage.id] = null
      continue
    }
    const spec = COMMANDS[stage.command]
    if (!spec) throw new Error(`unknown command in pipeline: ${stage.command}`)
    try {
      const { input, usage } = await runCommand(client, spec, stage.input(payload, ctx))
      ctx[stage.id] = input
      trace.push({ id: stage.id, command: stage.command, model: spec.model, usage })
    } catch (e) {
      if (!stage.optional) throw e
      ctx[stage.id] = null
      trace.push({ id: stage.id, command: stage.command, error: String((e as any)?.message ?? e) })
    }
  }
  return { result: pipe.assemble(ctx, payload), trace }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const body = await req.json()
    const { command, pipeline, payload } = body ?? {}
    if (!payload || typeof payload !== 'object') return json({ error: 'payload required' }, 400)

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) return json({ error: 'ANTHROPIC_API_KEY not set' }, 500)
    const client = new Anthropic({ apiKey })

    if (pipeline) {
      const { result, trace } = await runPipeline(client, pipeline, payload)
      return json({ pipeline, result, trace })
    }

    const spec = COMMANDS[command]
    if (!spec) return json({ error: `unknown command: ${command}` }, 400)
    const { input, usage } = await runCommand(client, spec, payload)
    if (!input) return json({ error: 'no tool_use in response' }, 502)
    return json({ command, result: input, usage })
  } catch (e) {
    return json({ error: String((e as any)?.message ?? e) }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
