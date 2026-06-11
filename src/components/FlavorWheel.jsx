import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, RotateCcw, Check, ArrowLeft } from 'lucide-react'
import { FLAVOR_WHEEL, FLAVOR_INDEX, flavorColor } from '../data/flavorWheel'

// ── геометрия санбёрста (статична — считается один раз) ───────
const CX = 500
const CY = 500
const R_HOLE = 92
const R_CAT = 180
const R_SUB = 300
const R_CHIP0 = 302
const R_CHIP1 = 344
const R_LABEL = 352

const leafCount = (n) => (n.children ? n.children.reduce((s, c) => s + leafCount(c), 0) : 1)
const TOTAL_LEAVES = FLAVOR_WHEEL.reduce((s, c) => s + leafCount(c), 0)
const UNIT = (Math.PI * 2) / TOTAL_LEAVES

const polar = (r, a) => [CX + r * Math.cos(a), CY + r * Math.sin(a)]

function arcPath(r0, r1, a0, a1) {
  const large = a1 - a0 > Math.PI ? 1 : 0
  const [x0, y0] = polar(r1, a0)
  const [x1, y1] = polar(r1, a1)
  const [x2, y2] = polar(r0, a1)
  const [x3, y3] = polar(r0, a0)
  return `M${x0} ${y0}A${r1} ${r1} 0 ${large} 1 ${x1} ${y1}L${x2} ${y2}A${r0} ${r0} 0 ${large} 0 ${x3} ${y3}Z`
}

// Радиальная подпись: на левой половине текст переворачивается, чтобы читался
function radialLabel(aMid, r, centered = false) {
  const deg = (aMid * 180) / Math.PI
  const flip = Math.cos(aMid) < 0
  const [x, y] = polar(r, aMid)
  return {
    x,
    y,
    rotate: flip ? deg + 180 : deg,
    anchor: centered ? 'middle' : flip ? 'end' : 'start',
  }
}

// Тёмный текст для слишком светлых плашек снаружи колеса
function labelColor(hex) {
  const n = parseInt(hex.slice(1), 16)
  const lum = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255
  return lum > 0.72 ? '#8a6a4f' : hex
}

const SEGMENTS = (() => {
  const cats = []
  const subs = []
  const leaves = []
  let u = 0
  const ang = (units) => -Math.PI / 2 + units * UNIT
  for (const cat of FLAVOR_WHEEL) {
    const span = leafCount(cat)
    cats.push({ name: cat.name, color: cat.color, a0: ang(u), a1: ang(u + span) })
    for (const sub of cat.children) {
      const s = leafCount(sub)
      subs.push({
        name: sub.name,
        color: sub.color,
        a0: ang(u),
        a1: ang(u + s),
        selectable: !sub.children, // дескрипторы второго уровня («Чёрный чай», «Бобовый»…)
      })
      if (sub.children) {
        for (const leaf of sub.children) {
          leaves.push({ name: leaf.name, color: leaf.color, a0: ang(u), a1: ang(u + 1) })
          u += 1
        }
      } else {
        u += s
      }
    }
  }
  return { cats, subs, leaves }
})()

// Чипсы выбранных дескрипторов (используются в карточке, мастере и модалке колеса)
export function FlavorChips({ flavors = [], onRemove, className = '' }) {
  if (!flavors.length) return null
  return (
    <div className={`flex flex-wrap justify-center gap-1.5 ${className}`}>
      {flavors.map((f) => (
        <span
          key={f}
          className="inline-flex items-center gap-1.5 rounded-full bg-coffee/8 px-2.5 py-0.5 text-xs text-coffee"
        >
          <span className="size-2 shrink-0 rounded-full" style={{ background: flavorColor(f) }} />
          {f}
          {onRemove && (
            <button
              type="button"
              onClick={() => onRemove(f)}
              aria-label={`Убрать ${f}`}
              className="-mr-0.5 grid size-3.5 place-items-center rounded-full text-coffee-soft transition hover:bg-coffee/15 hover:text-coffee"
            >
              <X size={10} />
            </button>
          )}
        </span>
      ))}
    </div>
  )
}

export default function FlavorWheel({ open, selected = [], onClose, onSave }) {
  const [sel, setSel] = useState(() => new Set(selected))
  // мобильный режим: null = колесо категорий, иначе — панель дескрипторов категории
  const [zoomCat, setZoomCat] = useState(null)

  // пересинхронизация черновика при каждом открытии
  useEffect(() => {
    if (open) {
      setSel(new Set(selected))
      setZoomCat(null)
    }
  }, [open]) // eslint-disable-line

  // сколько выбрано внутри категории (для бейджей на секторах)
  const catCount = (catName) => {
    let n = 0
    for (const name of sel) if (FLAVOR_INDEX[name]?.category === catName) n++
    return n
  }

  const toggle = (name) =>
    setSel((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })

  const save = () => onSave([...sel])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] grid place-items-center p-3 sm:p-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-espresso/55 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 12 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            className="glass-light relative z-10 flex max-h-[94dvh] w-full max-w-[900px] flex-col rounded-[1.75rem] p-5 sm:p-6"
          >
            {/* шапка */}
            <div className="mb-2 flex shrink-0 items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl leading-tight text-espresso">Колесо вкусов</h2>
                <p className="text-xs text-coffee-soft">
                  Кликайте по секторам и подписям — выбрано{' '}
                  <span className="font-semibold tabular-nums text-amber">{sel.size}</span>
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setSel(new Set())}
                  disabled={sel.size === 0}
                  className="inline-flex items-center gap-1.5 rounded-full border border-coffee/15 bg-white/40 px-3.5 py-2 text-xs font-medium text-coffee transition hover:bg-white/70 disabled:opacity-40"
                >
                  <RotateCcw size={13} /> Сбросить
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Закрыть"
                  className="grid size-9 place-items-center rounded-full text-coffee-soft transition hover:bg-coffee/10"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* ── Мобильный режим: колесо категорий → панель дескрипторов ── */}
            {/* короткие подписи для овервью: длинные не влезают радиально */}
            <div className="min-h-0 flex-1 overflow-y-auto sm:hidden">
              {!zoomCat ? (
                <>
                  <svg viewBox="0 0 1000 1000" className="mx-auto block w-full max-w-[420px]">
                    {SEGMENTS.cats.map((c) => {
                      const mid = (c.a0 + c.a1) / 2
                      const lb = radialLabel(mid, 295, true)
                      const n = catCount(c.name)
                      const [bx, by] = polar(395, mid)
                      return (
                        <g key={c.name} onClick={() => setZoomCat(c.name)} style={{ cursor: 'pointer' }}>
                          <path d={arcPath(150, 440, c.a0, c.a1)} fill={c.color} stroke="#fff" strokeWidth="3" />
                          <text
                            x={lb.x} y={lb.y}
                            transform={`rotate(${lb.rotate} ${lb.x} ${lb.y})`}
                            textAnchor={lb.anchor} dominantBaseline="middle"
                            fontSize="34" fontWeight="700" fill="#fff"
                            style={{ pointerEvents: 'none' }}
                          >
                            {c.name === 'Ореховый/Какао' ? 'Орех · какао' : c.name}
                          </text>
                          {n > 0 && (
                            <g style={{ pointerEvents: 'none' }}>
                              <circle cx={bx} cy={by} r="27" fill="#fff" />
                              <text x={bx} y={by + 1} textAnchor="middle" dominantBaseline="middle"
                                fontSize="30" fontWeight="700" fill={c.color}>
                                {n}
                              </text>
                            </g>
                          )}
                        </g>
                      )
                    })}
                  </svg>
                  <p className="mt-1 text-center text-xs text-coffee-soft">
                    Нажмите на категорию, чтобы выбрать дескрипторы
                  </p>
                </>
              ) : (
                (() => {
                  const cat = FLAVOR_WHEEL.find((c) => c.name === zoomCat)
                  if (!cat) return null
                  // листья 2-го уровня («Чёрный чай», «Бобовый»…) — одной строкой сверху
                  const looseLeaves = cat.children.filter((s) => !s.children)
                  const groups = cat.children.filter((s) => s.children)
                  const chip = (leaf) => {
                    const on = sel.has(leaf.name)
                    // на светлых плашках (Лимон, Бумажный…) — тёмный текст
                    const lightFill = labelColor(leaf.color) !== leaf.color
                    return (
                      <button
                        type="button"
                        key={leaf.name}
                        onClick={() => toggle(leaf.name)}
                        className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm transition"
                        style={
                          on
                            ? { background: leaf.color, color: lightFill ? '#4b3621' : '#fff', border: '1px solid transparent', fontWeight: 600 }
                            : { background: 'rgba(255,255,255,0.55)', color: '#3c2f25', border: '1px solid rgba(111,78,55,0.18)' }
                        }
                      >
                        {!on && (
                          <span className="size-2.5 shrink-0 rounded-full" style={{ background: leaf.color }} />
                        )}
                        {on && <Check size={14} className="shrink-0" />}
                        {leaf.name}
                      </button>
                    )
                  }
                  return (
                    <div className="space-y-4">
                      <button
                        type="button"
                        onClick={() => setZoomCat(null)}
                        className="inline-flex items-center gap-2 rounded-full bg-white/50 px-3.5 py-2 text-sm font-semibold text-espresso transition hover:bg-white/80"
                      >
                        <ArrowLeft size={15} />
                        <span className="size-3 rounded-full" style={{ background: cat.color }} />
                        {cat.name}
                        <span className="font-normal text-coffee-soft">· к категориям</span>
                      </button>
                      {looseLeaves.length > 0 && (
                        <div className="flex flex-wrap gap-2">{looseLeaves.map(chip)}</div>
                      )}
                      {groups.map((sub) => (
                        <div key={sub.name}>
                          <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-coffee-soft">
                            <span className="size-2.5 rounded-full" style={{ background: sub.color }} />
                            {sub.name}
                          </div>
                          <div className="flex flex-wrap gap-2">{sub.children.map(chip)}</div>
                        </div>
                      ))}
                    </div>
                  )
                })()
              )}
            </div>

            {/* ── Десктоп: полный санбёрст ── */}
            <div className="hidden min-h-0 flex-1 overflow-y-auto sm:block">
              <svg viewBox="0 0 1000 1000" className="mx-auto block w-full max-w-[760px]">
                {/* категории (внутреннее кольцо) — не выбираются */}
                {SEGMENTS.cats.map((c) => {
                  const lb = radialLabel((c.a0 + c.a1) / 2, (R_HOLE + R_CAT) / 2, true)
                  return (
                    <g key={c.name}>
                      <path d={arcPath(R_HOLE, R_CAT, c.a0, c.a1)} fill={c.color} stroke="#fff" strokeWidth="1.5" />
                      <text
                        x={lb.x} y={lb.y}
                        transform={`rotate(${lb.rotate} ${lb.x} ${lb.y})`}
                        textAnchor={lb.anchor} dominantBaseline="middle"
                        fontSize="15" fontWeight="700" fill="#fff"
                        style={{ pointerEvents: 'none' }}
                      >
                        {c.name}
                      </text>
                    </g>
                  )
                })}

                {/* подкатегории (среднее кольцо); листья 2-го уровня кликабельны */}
                {SEGMENTS.subs.map((s) => {
                  const on = s.selectable && sel.has(s.name)
                  const lb = radialLabel((s.a0 + s.a1) / 2, (R_CAT + R_SUB) / 2, true)
                  return (
                    <g
                      key={s.name}
                      onClick={s.selectable ? () => toggle(s.name) : undefined}
                      style={s.selectable ? { cursor: 'pointer' } : undefined}
                    >
                      <path
                        d={arcPath(R_CAT, s.selectable ? R_CHIP1 : R_SUB, s.a0, s.a1)}
                        fill={s.color}
                        stroke={on ? '#2b1d14' : '#fff'}
                        strokeWidth={on ? 3 : 1.5}
                      />
                      <text
                        x={lb.x} y={lb.y}
                        transform={`rotate(${lb.rotate} ${lb.x} ${lb.y})`}
                        textAnchor={lb.anchor} dominantBaseline="middle"
                        fontSize="13" fontWeight={on ? 700 : 500} fill="#fff"
                        style={{ pointerEvents: 'none' }}
                      >
                        {on ? `✓ ${s.name}` : s.name}
                      </text>
                    </g>
                  )
                })}

                {/* дескрипторы (внешние плашки + подписи снаружи) */}
                {SEGMENTS.leaves.map((l) => {
                  const on = sel.has(l.name)
                  const aMid = (l.a0 + l.a1) / 2
                  const lb = radialLabel(aMid, R_LABEL)
                  return (
                    <g key={l.name} onClick={() => toggle(l.name)} style={{ cursor: 'pointer' }}>
                      <path
                        d={arcPath(R_CHIP0, R_CHIP1, l.a0, l.a1)}
                        fill={l.color}
                        stroke={on ? '#2b1d14' : '#fff'}
                        strokeWidth={on ? 3 : 1}
                      />
                      <text
                        x={lb.x} y={lb.y}
                        transform={`rotate(${lb.rotate} ${lb.x} ${lb.y})`}
                        textAnchor={lb.anchor} dominantBaseline="middle"
                        fontSize="13" fontWeight={on ? 700 : 400}
                        fill={labelColor(l.color)}
                      >
                        {on ? `✓ ${l.name}` : l.name}
                      </text>
                    </g>
                  )
                })}
              </svg>
            </div>

            {/* выбранное + действия */}
            <div className="mt-3 shrink-0 space-y-3">
              {sel.size > 0 && (
                <FlavorChips flavors={[...sel]} onRemove={toggle} className="justify-start" />
              )}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-full border border-coffee/15 bg-white/40 py-3 text-sm font-medium text-coffee transition hover:bg-white/70"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={save}
                  className="btn-gold inline-flex flex-1 items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold transition hover:brightness-105"
                >
                  <Check size={17} /> Сохранить вкусы
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
