// A number input where "empty" means null (e.g. "no minimum").
import { useEffect, useState } from 'react'

interface Props {
  value: number | null
  onChange: (value: number | null) => void
  min?: number
  max?: number
  step?: number
  placeholder?: string
  ariaLabel?: string
  className?: string
}

export default function NumberField({ value, onChange, min = 0, max, step = 0.5, placeholder, ariaLabel, className }: Props) {
  // Keep the typed text locally so "1." or "" can be typed without jumping.
  const [text, setText] = useState(value === null ? '' : String(value))
  useEffect(() => {
    if (value !== (text === '' ? null : Number(text))) setText(value === null ? '' : String(value))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return (
    <input
      type="number"
      inputMode="decimal"
      className={className ?? 'num'}
      value={text}
      min={min}
      max={max}
      step={step}
      placeholder={placeholder}
      aria-label={ariaLabel}
      onChange={(e) => {
        setText(e.target.value)
        const n = e.target.value === '' ? null : Number(e.target.value)
        onChange(n === null || Number.isNaN(n) ? null : n)
      }}
    />
  )
}
