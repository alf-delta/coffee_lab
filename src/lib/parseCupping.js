import { SUPABASE_URL, SUPABASE_ANON_KEY, isSupabaseConfigured } from './supabase'
import { PARAM_KEYS, defaultScores } from '../data/constants'

// ── Словари для локального fallback-парсера (русская дегустационная лексика) ──
const POS = ['очень', 'невероятн', 'отличн', 'прекрасн', 'ярк', 'чист', 'богат', 'насыщен', 'глубок', 'долг', 'элегантн', 'сложн', 'комплексн', 'сбалансирован', 'идеальн', 'выраж', 'сочн']
const NEG = ['плоск', 'пуст', 'грязн', 'горч', 'вяж', 'дефект', 'слаб', 'коротк', 'тускл', 'резк', 'разбалансир', 'кисл'] // "кисл" как негатив только вне acidity, обрабатывается отдельно

const PARAM_LEX = {
  aroma: { hits: ['аромат', 'нос', 'запах', 'букет'], up: ['цветочн', 'фруктов', 'жасмин', 'ягодн', 'насыщен'] },
  flavor: { hits: ['вкус', 'flavor', 'тон', 'нот'], up: ['сложн', 'комплексн', 'богат', 'фруктов', 'ягодн'] },
  aftertaste: { hits: ['послевкус', 'финиш', 'финал', 'шлейф'], up: ['долг', 'длинн', 'тянет', 'какао'], down: ['коротк', 'быстро уход', 'обрыв'] },
  acidity: { hits: ['кислотн', 'кислинк', 'кислот'], up: ['ярк', 'искрист', 'жив', 'сочн', 'цитрус', 'лимон', 'ягодн'], down: ['низк', 'мягк', 'плоск', 'пресн'] },
  body: { hits: ['тело', 'плотн', 'текстур', 'вязк'], up: ['плотн', 'маслянист', 'обволакив', 'сироп', 'тяжёл'], down: ['лёгк', 'чайн', 'вод', 'жидк'] },
  balance: { hits: ['баланс', 'гармон', 'собран'], up: ['гармоничн', 'сбалансирован', 'цельн'], down: ['разбалансир', 'дисбаланс', 'перекос'] },
  sweetness: { hits: ['сладост', 'сладк'], up: ['карамель', 'мёд', 'мед', 'фрукт', 'сироп', 'сахар'], down: ['сух', 'несладк'] },
  cleanliness: { hits: ['чистот', 'чист чаш', 'чашк'], up: ['чист', 'прозрачн', 'кристальн'], down: ['грязн', 'мутн', 'дефект', 'землист'] },
  uniformity: { hits: ['однородн', 'ровн', 'стабильн'], up: ['ровн', 'однородн', 'стабильн'], down: ['неровн', 'разнобой', 'плавает'] },
  overall: { hits: ['общ', 'итог', 'в целом', 'впечатлен', 'понрав'], up: ['отличн', 'превосходн', 'топ', 'эталон', 'класс'], down: ['разочаров', 'средн', 'никак'] },
}

function clamp(v) {
  return Math.min(10, Math.max(1, Math.round(v)))
}

// Локальный эвристический парсер
export function localParse(transcriptRaw) {
  const t = (transcriptRaw || '').toLowerCase()
  const scores = defaultScores()
  if (!t.trim()) return { scores, notes: '' }

  const has = (arr) => arr.some((w) => t.includes(w))
  const count = (arr) => arr.reduce((n, w) => n + (t.includes(w) ? 1 : 0), 0)

  for (const key of PARAM_KEYS) {
    const lex = PARAM_LEX[key]
    let v = 5
    const mentioned = has(lex.hits)
    // профильные подъёмы/спады
    v += count(lex.up || []) * 1.6
    v -= count(lex.down || []) * 1.6
    // общий сентимент применяем только если параметр упомянут
    if (mentioned) {
      v += count(POS) * 0.5
      // "кисл" не считаем негативом для acidity
      const neg = key === 'acidity' ? NEG.filter((w) => w !== 'кисл') : NEG
      v -= count(neg) * 0.6
      if (v === 5) v = 6 // упомянули без модификаторов — лёгкий плюс
    }
    scores[key] = clamp(v)
  }

  return { scores, notes: transcriptRaw.trim().slice(0, 240) }
}

// Основной вызов: edge function → fallback на локальный парсер
export async function parseCupping(transcript) {
  if (isSupabaseConfigured) {
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/parse-cupping`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ transcript }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data?.scores) {
          // гарантируем все ключи
          const scores = { ...defaultScores(), ...data.scores }
          return { scores, notes: data.notes || '', source: 'claude' }
        }
      }
    } catch {
      /* падаем на локальный парсер */
    }
  }
  return { ...localParse(transcript), source: 'local' }
}
