// Генератор бандлящегося модуля знаний для edge-функции roast-analyst.
// Edge-бандлер Supabase НЕ пакует .md, читаемые через Deno.readTextFile, —
// поэтому вшиваем корпус как base64-строки в _knowledge.ts (импортируется → бандлится).
// .md в knowledge/ остаются источником правды; при правке корпуса перегенерировать:
//   node scripts/build-knowledge.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dir = join(root, 'supabase/functions/roast-analyst/knowledge')
const files = { sensory: '01_sensory.md', chemistry: '02_chemistry.md', physics: '03_physics.md' }

const b64 = Object.fromEntries(
  Object.entries(files).map(([k, f]) => [k, readFileSync(join(dir, f)).toString('base64')])
)

const out = `// АВТОГЕНЕРАЦИЯ из knowledge/*.md — не править руками.
// Перегенерация: node scripts/build-knowledge.mjs
// base64 корректно переносит кириллицу/спецсимволы корпуса.
const B64: Record<string, string> = ${JSON.stringify(b64, null, 2)}

function dec(b: string): string {
  return new TextDecoder().decode(Uint8Array.from(atob(b), (c) => c.charCodeAt(0)))
}

export const KNOWLEDGE: Record<string, string> = {
  sensory: dec(B64.sensory),
  chemistry: dec(B64.chemistry),
  physics: dec(B64.physics),
}
`

const target = join(root, 'supabase/functions/roast-analyst/_knowledge.ts')
writeFileSync(target, out)
const kb = (s) => Math.round(Buffer.byteLength(s) / 1024)
console.log('written _knowledge.ts:', Object.entries(b64).map(([k, v]) => `${k} ${kb(Buffer.from(v, 'base64').toString())}KB`).join(', '))
