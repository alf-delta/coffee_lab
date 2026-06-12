import { SUPABASE_URL, SUPABASE_ANON_KEY, isSupabaseConfigured } from './supabase'

// Клиент оркестратора roast-analyst (edge-функция на Claude, заземлённая на
// корпус roster_kno). Команды и их схемы живут на стороне функции —
// здесь только транспорт. Вызовы платные → дёргать осознанно (авто при
// записи анализа, см. AnalysisWizard), результат персистится на партию.

export const aiAnalystEnabled = isSupabaseConfigured

async function post(body, signal) {
  if (!isSupabaseConfigured) throw new Error('roast-analyst недоступен (нет ключей Supabase)')
  const res = await fetch(`${SUPABASE_URL}/functions/v1/roast-analyst`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(body),
    signal,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || data?.error) throw new Error(data?.error || `HTTP ${res.status}`)
  return data
}

// Одиночная команда → её result (строгий JSON по схеме команды).
export async function runCommand(command, payload, { signal } = {}) {
  const data = await post({ command, payload }, signal)
  return data.result
}

// Многомодельный пайплайн → { result, trace } (трейс по стадиям с usage).
export async function runPipeline(pipeline, payload, { signal } = {}) {
  return post({ pipeline, payload }, signal)
}

// Полный QC-разбор партии → контракт Q_REPORT (qreport.js). AiComment
// нормализует его наравне с детерминированным fallback. null при ошибке.
// Простой путь — одна команда (Sonnet), быстрый и связный.
export async function analyzeBatch(batch, profile, opts) {
  const result = await runCommand('analyze_batch', { batch, profile }, opts)
  return result && typeof result === 'object' ? result : null
}

// Тот же контракт Q_REPORT, но многомодельным пайплайном (curve→chemistry→
// sensory→synthesize, разные модели). Дороже/дольше, но с тирингом и трейсом.
export async function analyzeBatchPipeline(batch, profile, opts) {
  const { result } = await runPipeline('batch_full', { batch, profile }, opts)
  return result && typeof result === 'object' ? result : null
}

// Диагностика дефекта по сенсорному симптому (для будущей кнопки/чата).
export async function diagnoseDefect(symptom, { batch, profile } = {}, opts) {
  return runCommand('diagnose_defect', { symptom, batch, profile }, opts)
}
