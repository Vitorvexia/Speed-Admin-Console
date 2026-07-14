'use client'
import type { DateRangePreset, DateRangeValue } from '@/lib/date-range'
import { PRESET_LABELS, PRESET_ORDER } from '@/lib/date-range'

type Props = {
  label: string
  value: DateRangeValue
  onChange: (value: DateRangeValue) => void
}

export default function DateRangeFilter({ label, value, onChange }: Props) {
  function handlePresetChange(preset: DateRangePreset) {
    if (preset === 'custom') {
      onChange({ preset, from: value.from, to: value.to })
    } else {
      onChange({ preset, from: null, to: null })
    }
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={value.preset}
        onChange={e => handlePresetChange(e.target.value as DateRangePreset)}
        className="sp-select font-data text-[13px] px-4 py-2"
      >
        {PRESET_ORDER.map(p => (
          <option key={p} value={p}>{label} — {PRESET_LABELS[p]}</option>
        ))}
      </select>
      {value.preset === 'custom' && (
        <>
          <input
            type="date"
            value={value.from ?? ''}
            onChange={e => onChange({ ...value, from: e.target.value || null })}
            className="sp-input font-data text-[13px] px-3 py-2"
          />
          <span className="font-data text-[12px] text-sp-muted">até</span>
          <input
            type="date"
            value={value.to ?? ''}
            onChange={e => onChange({ ...value, to: e.target.value || null })}
            className="sp-input font-data text-[13px] px-3 py-2"
          />
        </>
      )}
    </div>
  )
}
