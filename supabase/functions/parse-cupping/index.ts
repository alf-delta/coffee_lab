// Supabase Edge Function: parse-cupping
// Принимает транскрипт дегустации, возвращает 10 параметров (1–10) + заметки.
// Деплой:  supabase functions deploy parse-cupping --no-verify-jwt
// Секрет:  supabase secrets set ANTHROPIC_API_KEY=sk-ant-...

import Anthropic from 'npm:@anthropic-ai/sdk@0.32.1'

const PARAMS = [
  'aroma', 'flavor', 'aftertaste', 'acidity', 'body',
  'balance', 'sweetness', 'cleanliness', 'uniformity', 'overall',
]

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const SYSTEM = `Ты — Q-grader, ассистент кофейной лаборатории Monoblend.
На вход — расшифровка устных наблюдений дегустатора о партии кофе (русский язык).
Оцени партию по 10 параметрам строго по шкале 1–10 (целые числа):
aroma (аромат), flavor (вкус), aftertaste (послевкусие), acidity (кислотность),
body (тело), balance (баланс), sweetness (сладость), cleanliness (чистота чашки),
uniformity (однородность), overall (общее впечатление).

Правила:
- Опирайся только на сказанное. Если параметр явно не упомянут — оцени нейтрально (5).
- Усиливающие слова ("очень", "невероятный", "чистейший") поднимают балл к 8–10.
- Негатив ("плоский", "грязный", "горчит", "пустой") опускает к 1–4.
- Верни ТОЛЬКО валидный JSON без markdown, без пояснений.

Формат:
{"scores":{"aroma":int,...,"overall":int},"notes":"краткое резюме одной строкой"}`

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { transcript } = await req.json()
    if (!transcript || typeof transcript !== 'string') {
      return json({ error: 'transcript required' }, 400)
    }

    const client = new Anthropic({
      apiKey: Deno.env.get('ANTHROPIC_API_KEY'),
    })

    const msg = await client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 512,
      system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: `Наблюдения дегустатора:\n"""${transcript}"""` }],
    })

    const text = msg.content.find((b) => b.type === 'text')?.text ?? '{}'
    const parsed = JSON.parse(stripFences(text))

    // нормализация
    const scores: Record<string, number> = {}
    for (const k of PARAMS) {
      const v = Math.round(Number(parsed?.scores?.[k]))
      scores[k] = Number.isFinite(v) ? Math.min(10, Math.max(1, v)) : 5
    }

    return json({ scores, notes: parsed?.notes ?? '' })
  } catch (e) {
    return json({ error: String(e?.message ?? e) }, 500)
  }
})

function stripFences(s: string) {
  return s.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim()
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
