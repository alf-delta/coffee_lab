export default function SliderRow({ label, value, onChange }) {
  const pct = ((value - 1) / 9) * 100
  return (
    <div className="group">
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-sm font-medium text-espresso/85">{label}</span>
        <span
          className="font-display text-lg tabular-nums leading-none"
          style={{ color: 'var(--color-amber)' }}
        >
          {value}
        </span>
      </div>
      <input
        type="range"
        min="1"
        max="10"
        step="1"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
        className="mb-range w-full"
        style={{
          background: `linear-gradient(90deg, #c89b3c 0%, #e0c074 ${pct}%, rgba(111,78,55,0.14) ${pct}%, rgba(111,78,55,0.14) 100%)`,
        }}
      />
    </div>
  )
}
