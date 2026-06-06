import { STATUS_META } from '../data/constants'

export default function StatusBadge({ status, size = 'sm' }) {
  const meta = STATUS_META[status] || STATUS_META.outgassing
  const pad = size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-1.5 text-sm'
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${pad}`}
      style={{
        background: `color-mix(in srgb, ${meta.color} 14%, white)`,
        color: meta.color,
        border: `1px solid color-mix(in srgb, ${meta.color} 30%, transparent)`,
      }}
    >
      <span
        className="size-1.5 rounded-full"
        style={{ background: meta.dot }}
      />
      {meta.label}
    </span>
  )
}
