// Экспорт готовой карточки анализа в PDF (формат А4).
// Подход: самодостаточный печатный HTML-документ в новом окне → window.print()
// → «Сохранить как PDF». Векторный текст, корректная кириллица, без зависимостей.
// Это НЕ скриншот тёмного UI, а светлый протокол под бумагу.

import { PARAMETERS, LAB_METRICS, GREEN_QC_METRICS } from '../data/constants'
import { totalScore, grade as gradeOf, weightLoss } from './scoring'
import { readyDate, serviceDate } from './outgassing'
import { formatRoastTime } from './roastLog'
import { analyzeFallback, kbCitation } from './knowledge'
import { normalizeReport, groupByDomain, DECISIONS, ACTION_TARGETS } from './qreport'

// тона под печать на белом (UI-тона слишком светлые для бумаги)
const TONE = { good: '#3f7a4f', warn: '#9a6b1f', bad: '#b3372b', info: '#7a6248' }
const PRIO = { high: 'высокий', med: 'средний', low: 'низкий' }

const esc = (v) =>
  String(v ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const fmtDate = (v) => {
  if (!v) return '—'
  const d = new Date(typeof v === 'string' && v.length === 10 ? `${v}T00:00:00` : v)
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' })
}

const num = (lab, k) => {
  const v = lab?.[k]
  return v === '' || v == null || Number.isNaN(Number(v)) ? null : Number(v)
}

// островок «метка / значение»
const island = (label, value) =>
  value == null || value === '' || value === '—'
    ? ''
    : `<div class="isl"><div class="isl-l">${esc(label)}</div><div class="isl-v">${esc(value)}</div></div>`

function buildHtml(batch, profile) {
  const report = normalizeReport(batch?.ai_analysis) || normalizeReport(analyzeFallback(batch, profile))
  const lab = batch?.lab_data || {}
  const total = totalScore(batch?.scores || {})
  const g = gradeOf(total)
  const loss = weightLoss(batch?.green_weight_kg, batch?.roasted_weight_kg)

  // ── тех-данные (островки) ──
  const techIslands = [
    island('Степень обжарки', batch?.roast_level),
    island('Обработка', batch?.process),
    ...LAB_METRICS.map((m) => {
      const v = num(lab, m.key)
      return v == null ? '' : island(m.label, `${v} ${m.unit}`)
    }),
    loss != null ? island('Ужарка', `${loss.toFixed(1)} %`) : '',
    batch?.green_weight_kg ? island('Вес зелёного', `${batch.green_weight_kg} кг`) : '',
    batch?.roasted_weight_kg ? island('Вес обжаренного', `${batch.roasted_weight_kg} кг`) : '',
    ...GREEN_QC_METRICS.map((m) => {
      const v = num(batch, m.key)
      return v == null ? '' : island(`Зелёное · ${m.label}`, `${v} ${m.unit}`)
    }),
  ].filter(Boolean).join('')

  // ── профиль ──
  let profileBlock = ''
  if (profile) {
    const m = profile.roast_log?.metrics
    const pIsl = [
      island('Профиль', profile.profile_name),
      island('Agtron цельное (цель)', profile.target_agtron_whole),
      island('Agtron молотое (цель)', profile.target_agtron_ground),
      profile.expected_moisture_loss != null ? island('Ожид. ужарка', `${profile.expected_moisture_loss} %`) : '',
      m ? island('Время жарки', formatRoastTime(m.duration_s)) : '',
      m ? island('Выгрузка', `${Math.round(m.drop_f)} °F`) : '',
    ].filter(Boolean).join('')
    profileBlock = `<h2>Профиль Bellwether</h2><div class="grid">${pIsl}</div>`
  }

  // ── Monoblend Q ──
  let qBlock = ''
  if (report) {
    const dec = DECISIONS[report.verdict.decision] || DECISIONS.pass
    const verdict = `
      <div class="verdict" style="border-color:${dec.tint}">
        <div class="v-score" style="color:${dec.tint}">${total || '—'}<span>/ 100</span></div>
        <div class="v-body">
          <div><span class="v-dec" style="background:${dec.tint}1f;color:${dec.tint}">${esc(dec.label)}</span>
          <span class="v-grade">${esc(g.label)}</span></div>
          ${report.verdict.headline ? `<p class="v-head">${esc(report.verdict.headline)}</p>` : ''}
        </div>
      </div>`

    const actions = report.actions.length
      ? `<h3>Что крутить</h3><table class="acts"><tbody>${report.actions
          .map(
            (a) => `<tr>
              <td class="a-t">${esc(ACTION_TARGETS[a.target] || a.target)}</td>
              <td class="a-l"><b>${esc(a.lever)}</b> → ${esc(a.direction)}${a.rationale ? `<span class="a-r">${esc(a.rationale)}</span>` : ''}</td>
              <td class="a-p">${esc(PRIO[a.priority] || a.priority)}</td>
            </tr>`
          )
          .join('')}</tbody></table>`
      : ''

    const groups = groupByDomain(report.findings)
      .map(
        (grp) => `<div class="dom"><div class="dom-h">${esc(grp.label)}</div>${grp.items
          .map((f) => {
            const c = TONE[f.tone] || TONE.info
            const cite = kbCitation(f.source)
            return `<div class="find" style="border-color:${c}">
              <div class="f-top"><span class="f-title" style="color:${c}">${esc(f.title)}</span>${
                f.value != null && f.value !== '' ? `<span class="f-val">${esc(f.value)} ${esc(f.unit)}</span>` : ''
              }</div>
              ${f.observation ? `<div class="f-obs">${esc(f.observation)}</div>` : ''}
              ${f.meaning ? `<div class="f-mean">${esc(f.meaning)}</div>` : ''}
              ${cite ? `<div class="f-cite">${esc(cite)}</div>` : ''}
            </div>`
          })
          .join('')}</div>`
      )
      .join('')

    const gaps = report.data_gaps.length
      ? `<div class="gaps"><b>Не хватило данных:</b> ${esc(report.data_gaps.join(' · '))}</div>`
      : ''

    qBlock = `<h2>Monoblend Q · разбор</h2>${verdict}${actions}<h3>Доказательная база</h3>${groups}${gaps}`
  }

  // ── органолептика ──
  const scoreRows = PARAMETERS.map((p) => {
    const v = Number(batch?.scores?.[p.key]) || 0
    return `<div class="sc"><span class="sc-l">${esc(p.label)}</span><span class="sc-bar"><span style="width:${v * 10}%"></span></span><span class="sc-v">${v}</span></div>`
  }).join('')

  const flavors = Array.isArray(batch?.flavors) && batch.flavors.length
    ? `<div class="flav">${batch.flavors.map((f) => `<span>${esc(f)}</span>`).join('')}</div>`
    : ''

  const notes = batch?.notes ? `<h2>Заметки</h2><p class="notes">${esc(batch.notes)}</p>` : ''

  const ready = batch?.roast_date ? fmtDate(readyDate(batch.roast_date, batch.outgassing_days)) : '—'
  const svc = fmtDate(serviceDate(batch))

  return `<!doctype html><html lang="ru"><head><meta charset="utf-8">
<title>Monoblend QC · ${esc(batch?.name || '')}</title>
<style>
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: -apple-system, "Segoe UI", Inter, Roboto, sans-serif; color: #2b1d14; font-size: 11px; line-height: 1.4; }
  h1 { font-family: Georgia, "Times New Roman", serif; font-size: 22px; margin: 0; letter-spacing: .5px; }
  h2 { font-family: Georgia, serif; font-size: 15px; margin: 16px 0 7px; color: #6f4a2a; border-bottom: 1px solid #e6dcc9; padding-bottom: 3px; }
  h3 { font-size: 11px; text-transform: uppercase; letter-spacing: .06em; color: #9a7b53; margin: 12px 0 6px; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #c89b3c; padding-bottom: 8px; }
  .head .sub { color: #9a7b53; font-size: 10px; margin-top: 2px; }
  .head .r { text-align: right; }
  .head .r .nm { font-family: Georgia, serif; font-size: 14px; }
  .head .r .or { color: #6f4a2a; font-size: 10px; }
  .meta { display: flex; flex-wrap: wrap; gap: 4px 16px; margin: 8px 0 2px; font-size: 10px; color: #6f4a2a; }
  .meta b { color: #2b1d14; }
  .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
  .isl { background: #f7f2e9; border: 1px solid #ece3d2; border-radius: 7px; padding: 5px 8px; }
  .isl-l { font-size: 8px; text-transform: uppercase; letter-spacing: .04em; color: #9a7b53; }
  .isl-v { font-size: 12px; font-variant-numeric: tabular-nums; }
  .verdict { display: flex; gap: 12px; align-items: center; border-left: 4px solid; background: #faf6ef; border-radius: 8px; padding: 9px 12px; }
  .v-score { font-family: Georgia, serif; font-size: 30px; font-variant-numeric: tabular-nums; line-height: 1; }
  .v-score span { font-size: 11px; color: #9a7b53; margin-left: 3px; }
  .v-dec { font-weight: 700; font-size: 11px; padding: 1px 8px; border-radius: 20px; }
  .v-grade { font-size: 10px; color: #6f4a2a; margin-left: 6px; }
  .v-head { margin: 4px 0 0; font-size: 12px; }
  .acts { width: 100%; border-collapse: collapse; }
  .acts td { border-top: 1px solid #ece3d2; padding: 4px 6px; vertical-align: top; }
  .a-t { white-space: nowrap; font-size: 8px; text-transform: uppercase; color: #9a7b53; width: 1%; letter-spacing: .04em; }
  .a-l { font-size: 11px; }
  .a-r { display: block; color: #9a7b53; font-size: 9px; }
  .a-p { white-space: nowrap; font-size: 9px; color: #6f4a2a; width: 1%; text-align: right; }
  .dom { margin-bottom: 8px; break-inside: avoid; }
  .dom-h { font-size: 9px; text-transform: uppercase; letter-spacing: .05em; color: #9a7b53; margin-bottom: 4px; }
  .find { border-left: 3px solid; background: #faf7f1; border-radius: 6px; padding: 5px 9px; margin-bottom: 5px; break-inside: avoid; }
  .f-top { display: flex; justify-content: space-between; gap: 8px; }
  .f-title { font-weight: 700; font-size: 11px; }
  .f-val { font-size: 10px; color: #6f4a2a; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .f-obs { color: #6f4a2a; font-size: 10px; margin-top: 1px; }
  .f-mean { font-size: 10px; margin-top: 1px; }
  .f-cite { font-size: 8px; text-transform: uppercase; letter-spacing: .03em; color: #b09a76; margin-top: 3px; }
  .gaps { font-size: 9px; color: #6f4a2a; background: #f4efe5; border-radius: 6px; padding: 5px 9px; margin-top: 6px; }
  .sc { display: flex; align-items: center; gap: 8px; margin: 2px 0; }
  .sc-l { width: 130px; font-size: 10px; }
  .sc-bar { flex: 1; height: 6px; background: #ece3d2; border-radius: 4px; overflow: hidden; }
  .sc-bar span { display: block; height: 100%; background: #c89b3c; }
  .sc-v { width: 18px; text-align: right; font-variant-numeric: tabular-nums; font-size: 10px; }
  .flav { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; }
  .flav span { background: #f1e7d4; border-radius: 20px; padding: 1px 9px; font-size: 9px; }
  .notes { background: #faf7f1; border-radius: 6px; padding: 7px 10px; font-size: 11px; white-space: pre-wrap; }
  .two { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; align-items: start; }
  .foot { margin-top: 14px; border-top: 1px solid #e6dcc9; padding-top: 6px; font-size: 8px; color: #b09a76; display: flex; justify-content: space-between; }
</style></head><body>
  <div class="head">
    <div><h1>MONOBLEND</h1><div class="sub">Протокол контроля качества обжарки</div></div>
    <div class="r"><div class="nm">${esc(batch?.name || '—')}</div>
      <div class="or">${esc(batch?.origin || '')}${batch?.bellwether_batch_number != null ? ` · Bellwether #${esc(batch.bellwether_batch_number)}` : ''}</div></div>
  </div>
  <div class="meta">
    <span>Обжарка: <b>${fmtDate(batch?.roast_date)}</b></span>
    <span>Готовность к анализу: <b>${ready}</b></span>
    <span>Анализ: <b>${fmtDate(batch?.analyzed_at)}</b></span>
    <span>Допуск в работу: <b>${svc}</b></span>
    ${batch?.in_service_at ? `<span>В работе с: <b>${fmtDate(batch.in_service_at)}</b></span>` : ''}
  </div>

  <h2>Технические данные</h2>
  <div class="grid">${techIslands}</div>
  ${profileBlock}
  ${qBlock}

  <h2>Органолептический профиль</h2>
  <div class="two">
    <div>${scoreRows}</div>
    <div>
      <div class="isl" style="text-align:center"><div class="isl-l">Итоговый балл · ${esc(g.label)}</div><div class="isl-v" style="font-size:24px;font-family:Georgia,serif">${total} / 100</div></div>
      ${flavors}
    </div>
  </div>
  ${notes}

  <div class="foot"><span>Сформировано Monoblend Q · ${fmtDate(new Date().toISOString())}</span><span>monoblend · кофейная лаборатория</span></div>
</body></html>`
}

// Печать протокола через скрытый iframe (без всплывающих окон → не блокируется
// попап-блокировщиком, работает на десктопе и мобильных). Печать → «Сохранить как PDF».
export function printBatchReport(batch, profile) {
  const html = buildHtml(batch, profile)
  const iframe = document.createElement('iframe')
  iframe.setAttribute('aria-hidden', 'true')
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;'
  document.body.appendChild(iframe)

  const win = iframe.contentWindow
  win.document.open()
  win.document.write(html)
  win.document.close()

  const remove = () => {
    if (iframe.parentNode) iframe.parentNode.removeChild(iframe)
  }
  let done = false
  const fire = () => {
    if (done) return
    done = true
    try {
      win.focus()
      win.print()
    } catch {
      /* ignore */
    }
  }
  // убрать iframe после печати; подстраховки по таймеру
  win.onafterprint = () => setTimeout(remove, 500)
  iframe.onload = () => setTimeout(fire, 250)
  setTimeout(fire, 800)
  setTimeout(remove, 120000)
}
